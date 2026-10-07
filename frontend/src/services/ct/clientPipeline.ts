import type {
  CtAnalysisResult,
  HistogramBin,
  PipelineStep,
  RoiRegion,
} from '@/types'
import { AppError } from '@/types'
import { CT_PIPELINE } from '@/lib/clinical'
import { createId } from '@/lib/id'
import { clamp, round } from '@/lib/format'

/**
 * Deterministic lung-CT image-processing pipeline.
 *
 * This is genuine computer-vision code (grayscale projection, median denoising,
 * histogram analysis, Otsu thresholding, K-Means intensity segmentation and
 * connected-component contour extraction) executed in the browser so the CT
 * workflow is fully functional without a backend.
 *
 * It is **not** a tumour detector. Extracted regions are intensity-defined areas
 * of interest for human review.
 */

const MAX_WORK_SIZE = 1024

type StepKey = (typeof CT_PIPELINE)[number]['key']

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (file.type === 'image/dicom' || /\.dcm$/i.test(file.name)) {
    return Promise.reject(
      new AppError('DICOM files require a backend parser.', {
        hint: 'Export the CT slice as PNG or JPEG, then upload it again.',
        retryable: false,
      }),
    )
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new AppError('Unable to read the selected image.', {
          hint: 'Please choose a valid PNG or JPEG image and try again.',
        }),
      )
    }
    image.src = url
  })
}

function toGrayscale(rgba: Uint8ClampedArray, length: number): Uint8Array {
  const gray = new Uint8Array(length)
  for (let i = 0, p = 0; i < length; i += 1, p += 4) {
    gray[i] = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) | 0
  }
  return gray
}

/**
 * 3×3 median filter — removes speckle while keeping edges sharper than a box blur.
 * Uses a fixed-size insertion sort to avoid per-pixel allocation.
 */
function medianDenoise(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length)
  const window = new Int32Array(9)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let count = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        const row = ny * width
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          const value = gray[row + nx]
          let position = count++
          while (position > 0 && window[position - 1] > value) {
            window[position] = window[position - 1]
            position -= 1
          }
          window[position] = value
        }
      }
      out[y * width + x] = window[count >> 1]
    }
  }
  return out
}

function histogram(gray: Uint8Array): HistogramBin[] {
  const bins = new Array<number>(256).fill(0)
  for (let i = 0; i < gray.length; i += 1) bins[gray[i]] += 1
  return bins.map((count, bin) => ({ bin, count }))
}

/** Otsu's method: threshold maximising between-class variance. */
function otsuThreshold(hist: number[]): number {
  const total = hist.reduce((sum, value) => sum + value, 0)
  let sumAll = 0
  for (let t = 0; t < 256; t += 1) sumAll += t * hist[t]

  let sumB = 0
  let weightB = 0
  let best = 0
  let bestVariance = -1
  for (let t = 0; t < 256; t += 1) {
    weightB += hist[t]
    if (weightB === 0) continue
    const weightF = total - weightB
    if (weightF === 0) break
    sumB += t * hist[t]
    const meanB = sumB / weightB
    const meanF = (sumAll - sumB) / weightF
    const variance = weightB * weightF * (meanB - meanF) ** 2
    if (variance > bestVariance) {
      bestVariance = variance
      best = t
    }
  }
  return best
}

/** K-Means over intensity values, seeded from histogram quantiles. */
function kmeans(
  gray: Uint8Array,
  k: number,
  seedCentroids: number[],
): { labels: Int8Array; centers: number[] } {
  let centers = [...seedCentroids]
  const labels = new Int8Array(gray.length)

  for (let iteration = 0; iteration < 10; iteration += 1) {
    for (let i = 0; i < gray.length; i += 1) {
      let bestIndex = 0
      let bestDistance = Infinity
      for (let c = 0; c < centers.length; c += 1) {
        const distance = (gray[i] - centers[c]) ** 2
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = c
        }
      }
      labels[i] = bestIndex
    }
    const sums = new Array<number>(k).fill(0)
    const counts = new Array<number>(k).fill(0)
    for (let i = 0; i < gray.length; i += 1) {
      const index = labels[i]
      sums[index] += gray[i]
      counts[index] += 1
    }
    const next = centers.map((center, index) =>
      counts[index] > 0 ? sums[index] / counts[index] : center,
    )
    const shift = next.reduce((acc, value, index) => acc + Math.abs(value - centers[index]), 0)
    centers = next
    if (shift < 0.5) break
  }

  return { labels, centers: [...centers].sort((a, b) => a - b) }
}

/** Connected-component labelling (4-connectivity, iterative stack flood fill). */
function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
): { regions: RoiRegion[]; maskArea: number } {
  const visited = new Uint8Array(mask.length)
  const regions: RoiRegion[] = []
  let maskArea = 0
  const stack: number[] = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    visited[start] = 1
    stack.length = 0
    stack.push(start)

    let area = 0
    let sumIntensity = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0

    while (stack.length > 0) {
      const index = stack.pop() as number
      const x = index % width
      const y = (index - x) / width
      area += 1
      sumIntensity += mask[index]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      if (x > 0 && mask[index - 1] && !visited[index - 1]) {
        visited[index - 1] = 1
        stack.push(index - 1)
      }
      if (x < width - 1 && mask[index + 1] && !visited[index + 1]) {
        visited[index + 1] = 1
        stack.push(index + 1)
      }
      if (y > 0 && mask[index - width] && !visited[index - width]) {
        visited[index - width] = 1
        stack.push(index - width)
      }
      if (y < height - 1 && mask[index + width] && !visited[index + width]) {
        visited[index + width] = 1
        stack.push(index + width)
      }
    }

    maskArea += area
    regions.push({
      id: regions.length + 1,
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      areaPx: area,
      areaPct: round((area / (width * height)) * 100, 2),
      meanIntensity: Math.round(sumIntensity / area),
    })
  }

  return { regions, maskArea }
}

function percentileStretch(gray: Uint8Array): { lo: number; hi: number } {
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < gray.length; i += 1) hist[gray[i]] += 1
  const total = gray.length
  const loTarget = total * 0.01
  const hiTarget = total * 0.99
  let acc = 0
  let lo = 0
  let hi = 255
  for (let value = 0; value < 256; value += 1) {
    acc += hist[value]
    if (acc >= loTarget) {
      lo = value
      break
    }
  }
  acc = 0
  for (let value = 0; value < 256; value += 1) {
    acc += hist[value]
    if (acc >= hiTarget) {
      hi = value
      break
    }
  }
  if (hi <= lo) hi = lo + 1
  return { lo, hi }
}

function renderGray(gray: Uint8Array, width: number, height: number, stretch = true): string {
  const canvas = makeCanvas(width, height)
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const image = context.createImageData(width, height)
  const { lo, hi } = stretch ? percentileStretch(gray) : { lo: 0, hi: 255 }
  for (let i = 0, p = 0; i < gray.length; i += 1, p += 4) {
    const value = stretch ? clamp(((gray[i] - lo) / (hi - lo)) * 255, 0, 255) : gray[i]
    image.data[p] = value
    image.data[p + 1] = value
    image.data[p + 2] = value
    image.data[p + 3] = 255
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

/** Clinical colour map for the segmentation view: air → soft tissue → dense. */
const CLUSTER_COLORS = [
  [11, 32, 48],
  [15, 139, 141],
  [176, 206, 226],
  [236, 244, 251],
]

function renderSegmented(
  labels: Int8Array,
  width: number,
  height: number,
): string {
  const canvas = makeCanvas(width, height)
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const image = context.createImageData(width, height)
  for (let i = 0, p = 0; i < labels.length; i += 1, p += 4) {
    const color = CLUSTER_COLORS[labels[i] % CLUSTER_COLORS.length]
    image.data[p] = color[0]
    image.data[p + 1] = color[1]
    image.data[p + 2] = color[2]
    image.data[p + 3] = 255
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

function renderOverlay(
  source: CanvasImageSource,
  width: number,
  height: number,
  regions: RoiRegion[],
): string {
  const canvas = makeCanvas(width, height)
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  context.drawImage(source, 0, 0, width, height)

  context.save()
  regions.forEach((region, index) => {
    const inset = 2
    const x = region.x + inset
    const y = region.y + inset
    const w = Math.max(4, region.width - inset * 2)
    const h = Math.max(4, region.height - inset * 2)
    context.fillStyle = index === 0 ? 'rgba(15, 139, 141, 0.16)' : 'rgba(11, 92, 173, 0.10)'
    context.fillRect(x, y, w, h)
    context.strokeStyle = index === 0 ? 'rgba(15, 139, 141, 0.95)' : 'rgba(11, 92, 173, 0.7)'
    context.lineWidth = index === 0 ? 2 : 1
    context.setLineDash(index === 0 ? [] : [5, 4])
    context.strokeRect(x, y, w, h)
    context.setLineDash([])

    const label = `ROI ${index + 1}`
    context.font = '600 12px Inter, sans-serif'
    const textWidth = context.measureText(label).width
    const labelY = y > 18 ? y - 6 : y + 16
    context.fillStyle = 'rgba(255,255,255,0.92)'
    context.fillRect(x, labelY - 12, textWidth + 10, 16)
    context.fillStyle = index === 0 ? '#0C7173' : '#0A4F96'
    context.fillText(label, x + 5, labelY)
  })
  context.restore()
  return canvas.toDataURL('image/png')
}

export interface CtRunCallbacks {
  onStep?: (stepKey: string) => void
}

export async function runClientCtPipeline(
  file: File,
  callbacks: CtRunCallbacks = {},
): Promise<CtAnalysisResult> {
  const startedAt = performance.now()
  const steps: PipelineStep[] = CT_PIPELINE.map((step) => ({
    key: step.key,
    label: step.label,
    detail: step.detail,
    status: 'pending',
  }))

  const markStep = (key: StepKey, status: PipelineStep['status'], durationMs?: number) => {
    const step = steps.find((entry) => entry.key === key)
    if (step) {
      step.status = status
      if (durationMs !== undefined) step.durationMs = Math.round(durationMs)
    }
    if (status === 'running') callbacks.onStep?.(key)
  }

  const setAll = (status: PipelineStep['status'], from: number) => {
    steps.forEach((step, index) => {
      if (index >= from && step.status === 'pending') step.status = status
    })
  }

  setAll('skipped', 0)
  steps[0].status = 'running'
  callbacks.onStep?.('load')

  let bitmap: ImageBitmap | HTMLImageElement
  let sourceCanvas: HTMLCanvasElement
  let width: number
  let height: number
  let gray: Uint8Array
  let denoised: Uint8Array
  let hist: HistogramBin[]
  let threshold: number
  let segmentation: { labels: Int8Array; centers: number[] }
  let regions: RoiRegion[] = []
  let maskArea = 0

  try {
    bitmap = await loadBitmap(file)
    const naturalWidth = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
    const naturalHeight = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height
    if (!naturalWidth || !naturalHeight) {
      throw new AppError('The selected image could not be decoded.', {
        hint: 'Please choose a valid PNG or JPEG image.',
      })
    }
    const scale = Math.min(1, MAX_WORK_SIZE / Math.max(naturalWidth, naturalHeight))
    width = Math.max(1, Math.round(naturalWidth * scale))
    height = Math.max(1, Math.round(naturalHeight * scale))

    sourceCanvas = makeCanvas(width, height)
    const context = sourceCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
    context.drawImage(bitmap, 0, 0, width, height)
    steps[0].status = 'done'
    steps[0].durationMs = Math.round(performance.now() - startedAt)
  } catch (error) {
    steps[0].status = 'pending'
    if (error instanceof AppError) throw error
    throw new AppError('Unable to load the image for analysis.', {
      hint: 'Please verify the file and try again.',
      cause: error,
    })
  }

  await frame()
  markStep('grayscale', 'running')
  const tGray = performance.now()
  const pixels = (sourceCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D).getImageData(0, 0, width, height)
    .data
  gray = toGrayscale(pixels, width * height)
  markStep('grayscale', 'done', performance.now() - tGray)

  await frame()
  markStep('denoise', 'running')
  const tDenoise = performance.now()
  denoised = medianDenoise(gray, width, height)
  markStep('denoise', 'done', performance.now() - tDenoise)

  await frame()
  markStep('histogram', 'running')
  const tHist = performance.now()
  hist = histogram(denoised)
  markStep('histogram', 'done', performance.now() - tHist)

  await frame()
  markStep('threshold', 'running')
  const tThreshold = performance.now()
  threshold = otsuThreshold(hist.map((entry) => entry.count))
  markStep('threshold', 'done', performance.now() - tThreshold)

  await frame()
  markStep('segmentation', 'running')
  const tSegment = performance.now()
  const totalPixels = hist.reduce((sum, entry) => sum + entry.count, 0)
  const quantile = (fraction: number) => {
    let acc = 0
    for (let value = 0; value < 256; value += 1) {
      acc += hist[value].count
      if (acc >= totalPixels * fraction) return value
    }
    return 255
  }
  segmentation = kmeans(denoised, 3, [quantile(0.2), quantile(0.6), quantile(0.9)])
  markStep('segmentation', 'done', performance.now() - tSegment)

  await frame()
  markStep('roi', 'running')
  const tRoi = performance.now()
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < denoised.length; i += 1) mask[i] = denoised[i] > threshold ? 1 : 0
  const components = connectedComponents(mask, width, height)
  maskArea = components.maskArea
  const minArea = Math.max(24, Math.round(width * height * 0.002))
  regions = components.regions
    .filter((region) => region.areaPx >= minArea)
    .sort((a, b) => b.areaPx - a.areaPx)
    .slice(0, 8)
    .map((region, index) => ({ ...region, id: index + 1 }))
  markStep('roi', 'done', performance.now() - tRoi)

  const original = sourceCanvas.toDataURL('image/png')

  return {
    id: createId('CT'),
    createdAt: new Date().toISOString(),
    fileName: file.name,
    fileSizeBytes: file.size,
    width,
    height,
    format: file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpeg' : 'unknown',
    steps,
    histogram: hist,
    otsuThreshold: threshold,
    clusterCount: segmentation.centers.length,
    clusterCenters: segmentation.centers.map((center) => Math.round(center)),
    regions,
    roiPixelShare: round((maskArea / (width * height)) * 100, 2),
    processingMethod: 'Luminance projection → 3×3 median filter → percentile contrast stretch',
    segmentationMethod: `Otsu threshold (t=${threshold}) + K-Means (k=${segmentation.centers.length}) + 4-connected components`,
    engine: 'client',
    provenance: 'unavailable',
    processingMs: Math.round(performance.now() - startedAt),
    images: {
      original,
      grayscale: renderGray(gray, width, height, false),
      denoised: renderGray(denoised, width, height, true),
      segmented: renderSegmented(segmentation.labels, width, height),
      overlay: renderOverlay(sourceCanvas, width, height, regions),
    },
    notes: [
      'All processing runs locally in your browser using a deterministic pipeline.',
      'Regions are intensity-defined areas of interest for human review, not tumour detections.',
      'Connect the FastAPI service to run the reference OpenCV implementation instead.',
    ],
  }
}

/**
 * Yields control so the progress indicator can paint between pipeline stages.
 * Uses setTimeout rather than requestAnimationFrame so the pipeline still runs to
 * completion when the tab is in the background.
 */
function frame(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}
