"""Server-side CT image processing (OpenCV implementation of the browser pipeline).

Stages mirror the in-browser pipeline exactly:

    load → grayscale → median denoise → histogram → Otsu → K-Means → ROI

Segmentation highlights regions of interest. It is **not** a tumour detector.
"""

from __future__ import annotations

import base64
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import cv2
import numpy as np

from .config import settings

MAX_WORK_SIZE = 1024
MIN_REGION_AREA_FRACTION = 0.002
MAX_REGIONS = 8

PIPELINE_STEPS = [
    ("load", "Image loading", "Decode and normalise the uploaded slice"),
    ("grayscale", "Grayscale conversion", "Luminance-weighted intensity projection"),
    ("denoise", "Noise reduction", "3×3 median filter for speckle suppression"),
    ("histogram", "Histogram analysis", "256-bin intensity distribution"),
    ("threshold", "Otsu thresholding", "Automatic between-class threshold selection"),
    ("segmentation", "K-Means segmentation", "Intensity clustering of the parenchyma"),
    ("roi", "Region of interest", "Connected-component contour extraction"),
]

SEGMENTATION_COLORS = [
    (11, 32, 48),
    (15, 139, 141),
    (176, 206, 226),
    (236, 244, 251),
]


def _encode(image: np.ndarray) -> str:
    success, buffer = cv2.imencode(".png", image)
    if not success:  # pragma: no cover
        raise RuntimeError("Unable to encode the processed image.")
    return f"data:image/png;base64,{base64.b64encode(buffer.tobytes()).decode('ascii')}"


def _percentile_stretch(gray: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(gray, [1, 99])
    if hi <= lo:
        return gray
    stretched = (gray.astype(np.float32) - lo) / (hi - lo) * 255.0
    return np.clip(stretched, 0, 255).astype(np.uint8)


def _kmeans(gray: np.ndarray, k: int = 3, seed: int = 42) -> tuple[np.ndarray, list[int]]:
    pixels = gray.reshape(-1, 1).astype(np.float32)
    quantiles = [int(np.percentile(pixels, q)) for q in (20, 60, 90)][:k]
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        pixels, k, np.array(quantiles, dtype=np.float32), criteria, 3, cv2.KMEANS_PP_CENTERS
    )
    centers = sorted(int(round(center[0])) for center in centers)
    return labels.reshape(gray.shape), centers


def analyse(file_name: str, payload: bytes) -> dict:
    started = time.perf_counter()
    steps = [
        {"key": key, "label": label, "detail": detail, "status": "pending", "durationMs": None}
        for key, label, detail in PIPELINE_STEPS
    ]

    def mark(index: int, duration_ms: Optional[float] = None) -> None:
        steps[index]["status"] = "done"
        if duration_ms is not None:
            steps[index]["durationMs"] = int(duration_ms)

    # ------------------------------------------------------------------ load
    buffer = np.frombuffer(payload, dtype=np.uint8)
    decoded = cv2.imdecode(buffer, cv2.IMREAD_UNCHANGED)
    if decoded is None:
        raise ValueError("The uploaded file could not be decoded as an image.")

    # Normalise every accepted channel layout to a 3-channel BGR image, and keep
    # a single-channel luminance view for the analysis steps.
    if decoded.ndim == 2:
        gray = decoded
        bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    elif decoded.shape[2] == 1:
        gray = decoded[:, :, 0]
        bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    elif decoded.shape[2] == 3:
        bgr = decoded
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    elif decoded.shape[2] == 4:
        bgr = cv2.cvtColor(decoded, cv2.COLOR_BGRA2BGR)
        gray = cv2.cvtColor(decoded, cv2.COLOR_BGRA2GRAY)
    else:
        raise ValueError(f"Unsupported channel count: {decoded.shape[2]}.")

    # Channel normalisation above *is* the luminance projection, so the
    # grayscale stage is already complete at this point.
    mark(1)

    scale = min(1.0, MAX_WORK_SIZE / max(bgr.shape[:2]))
    if scale < 1.0:
        bgr = cv2.resize(
            bgr,
            (int(bgr.shape[1] * scale), int(bgr.shape[0] * scale)),
            interpolation=cv2.INTER_AREA,
        )
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    mark(0, (time.perf_counter() - started) * 1000)

    mark(0, (time.perf_counter() - started) * 1000)
    height, width = gray.shape[:2]

    # --------------------------------------------------------------- denoise
    step_start = time.perf_counter()
    denoised = cv2.medianBlur(gray, 3)
    mark(2, (time.perf_counter() - step_start) * 1000)

    # ------------------------------------------------------------- histogram
    step_start = time.perf_counter()
    counts = np.bincount(denoised.ravel(), minlength=256)
    mark(3, (time.perf_counter() - step_start) * 1000)

    # ------------------------------------------------------------- threshold
    step_start = time.perf_counter()
    threshold_value, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mark(4, (time.perf_counter() - step_start) * 1000)

    # ---------------------------------------------------------- segmentation
    step_start = time.perf_counter()
    labels, centers = _kmeans(denoised)
    mark(5, (time.perf_counter() - step_start) * 1000)

    # ------------------------------------------------------------------- roi
    step_start = time.perf_counter()
    mask = (denoised > threshold_value).astype(np.uint8)
    count, component_labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=4)
    min_area = max(24, int(width * height * MIN_REGION_AREA_FRACTION))

    candidates = []
    for index in range(1, count):
        x, y, w, h, area = stats[index]
        if area < min_area:
            continue
        component_mask = component_labels[y : y + h, x : x + w] == index
        candidates.append(
            {
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "areaPx": int(area),
                "areaPct": round(area / (width * height) * 100, 2),
                "meanIntensity": int(denoised[y : y + h, x : x + w][component_mask].mean()),
            }
        )
    candidates.sort(key=lambda item: item["areaPx"], reverse=True)
    regions = [
        {**item, "id": index + 1} for index, item in enumerate(candidates[:MAX_REGIONS])
    ]
    mark(6, (time.perf_counter() - step_start) * 1000)

    # -------------------------------------------------------------- rendering
    stretched = _percentile_stretch(denoised)
    segmented_rgb = np.zeros((height, width, 3), dtype=np.uint8)
    for index, color in enumerate(SEGMENTATION_COLORS):
        segmented_rgb[labels == index % len(SEGMENTATION_COLORS)] = color

    overlay = bgr.copy()
    for index, region in enumerate(regions):
        x, y, w, h = region["x"], region["y"], region["width"], region["height"]
        if index == 0:
            tint = np.zeros_like(overlay)
            tint[:, :] = (141, 139, 15)
            overlay = cv2.addWeighted(overlay, 1.0, tint, 0.16, 0)
            cv2.rectangle(overlay, (x + 2, y + 2), (x + w - 2, y + h - 2), (141, 139, 15), 2)
            cv2.putText(
                overlay,
                "ROI 1",
                (x + 6, max(16, y - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (113, 113, 12),
                1,
                cv2.LINE_AA,
            )
        else:
            cv2.rectangle(overlay, (x + 2, y + 2), (x + w - 2, y + h - 2), (173, 92, 11), 1)

    return {
        "id": f"CT-{uuid.uuid4().hex[:8].upper()}",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "fileName": file_name,
        "fileSizeBytes": len(payload),
        "width": int(width),
        "height": int(height),
        "format": "png" if file_name.lower().endswith(".png") else "jpeg",
        "steps": steps,
        "histogram": [
            {"bin": int(index), "count": int(count)} for index, count in enumerate(counts)
        ],
        "otsuThreshold": int(threshold_value),
        "clusterCount": len(centers),
        "clusterCenters": centers,
        "regions": regions,
        "roiPixelShare": round(float(mask.sum()) / float(width * height) * 100, 2),
        "processingMethod": "Luminance projection → 3×3 median filter → percentile contrast stretch",
        "segmentationMethod": (
            f"Otsu threshold (t={int(threshold_value)}) + K-Means (k={len(centers)}) "
            "+ 4-connected components"
        ),
        "engine": "server",
        "provenance": "trained-model",
        "processingMs": int((time.perf_counter() - started) * 1000),
        "images": {
            "original": _encode(bgr),
            "grayscale": _encode(gray),
            "denoised": _encode(stretched),
            "segmented": _encode(cv2.cvtColor(segmented_rgb, cv2.COLOR_RGB2BGR)),
            "overlay": _encode(overlay),
        },
        "notes": [
            "Processed server-side with the reference OpenCV implementation.",
            "Regions are intensity-defined areas of interest for human review, not tumour detections.",
        ],
    }


__all__ = ["analyse", "PIPELINE_STEPS", "settings"]
