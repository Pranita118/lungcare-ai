"""In-memory report store for the ML service.

Reports are held in memory and are not persisted to disk.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from .schemas import GenerateReportRequest

_MAX_REPORTS = 50
_store: dict[str, dict] = {}
_order: list[str] = []


class ReportStore:
    def list(self) -> list[dict]:
        return [_store[report_id]["record"] for report_id in _order if report_id in _store]

    def get(self, report_id: str) -> Optional[dict]:
        entry = _store.get(report_id)
        return entry["record"] if entry else None

    def document(self, report_id: str) -> Optional[dict]:
        entry = _store.get(report_id)
        if entry is None:
            return None
        return {"record": entry["record"], "payload": entry["payload"]}

    def create(self, payload: GenerateReportRequest) -> dict:
        prediction = payload.prediction
        includes_ct = payload.ct is not None

        record = {
            "id": f"RPT-{uuid.uuid4().hex[:8].upper()}",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "patientId": payload.patient.patientId or "Unassigned",
            "patientLabel": (
                f"Case {payload.patient.patientId}" if payload.patient.patientId else "Unassigned case"
            ),
            "analysisType": (
                "Combined screening"
                if includes_ct and prediction
                else "CT segmentation"
                if includes_ct
                else "Risk assessment"
            ),
            "resultLabel": (
                prediction.riskCategoryLabel
                if prediction
                else f"{len(payload.ct.regions)} region(s) of interest"
                if payload.ct
                else "No prediction available"
            ),
            "riskLevel": prediction.riskLevel if prediction else "low",
            "modelName": prediction.model.name if prediction else "Image processing pipeline",
            "status": "generated",
            "provenance": prediction.provenance if prediction else "trained-model",
            "includesCt": includes_ct,
            "score": prediction.riskScore if prediction else None,
        }

        _store[record["id"]] = {
            "record": record,
            "payload": payload.model_dump(mode="json"),
        }
        _order.insert(0, record["id"])
        while len(_order) > _MAX_REPORTS:
            _store.pop(_order.pop(), None)
        return record
