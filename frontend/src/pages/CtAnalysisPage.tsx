import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileImage,
  Info,
  ScanLine,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, ProvenanceChip } from '@/components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StatusStates'
import { InlineDisclaimer, ResearchDisclaimer, SegmentationNotice } from '@/components/medical/Disclaimer'
import { CT_PIPELINE } from '@/lib/clinical'
import { env } from '@/config/env'
import { formatBytes, formatDecimal, formatInt } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { createSampleCtFile } from '@/services/samples/sampleCt'
import type { CtImageSet } from '@/types'
import { HistogramChart } from '@/components/results/HistogramChart'

const VIEW_OPTIONS: { key: keyof CtImageSet; label: string; description: string }[] = [
  { key: 'original', label: 'Original Image', description: 'Uploaded slice, unmodified' },
  { key: 'grayscale', label: 'Grayscale', description: 'Luminance-weighted projection' },
  { key: 'denoised', label: 'Denoised', description: '3×3 median filter result' },
  { key: 'segmented', label: 'Segmented Region', description: 'K-Means intensity clusters' },
  { key: 'overlay', label: 'Region of Interest', description: 'Extracted contours and bounds' },
]

export function CtAnalysisPage() {
  const { notify } = useToast()
  const { ctResult, isAnalyzingCt, ctActiveStep, ctError, runCtAnalysis, clearCt, mode } = useApp()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [view, setView] = useState<keyof CtImageSet>('overlay')
  const [isPreparingSample, setIsPreparingSample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (ctResult) setView('overlay')
  }, [ctResult])

  const acceptFile = (candidate: File | null) => {
    setFileError(null)
    if (!candidate) return
    if (/\.dcm$/i.test(candidate.name) || candidate.type === 'image/dicom') {
      setFileError('DICOM files require a backend parser.')
      setFile(null)
      return
    }
    if (!candidate.type.startsWith('image/')) {
      setFileError('Unsupported file type. Please choose a PNG or JPEG image.')
      return
    }
    if (candidate.size > env.maxUploadBytes) {
      setFileError(`File is larger than ${formatBytes(env.maxUploadBytes)}.`)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(candidate)
    setPreviewUrl(URL.createObjectURL(candidate))
  }

  const loadSample = async () => {
    setIsPreparingSample(true)
    try {
      const sample = await createSampleCtFile()
      acceptFile(sample)
      notify({
        tone: 'info',
        title: 'Sample phantom loaded',
        description: 'A synthetic CT phantom was generated locally for demonstration.',
      })
    } catch {
      notify({
        tone: 'warning',
        title: 'Unable to build the sample image',
        description: 'Please choose a PNG or JPEG image instead.',
      })
    } finally {
      setIsPreparingSample(false)
    }
  }

  const analyze = async () => {
    if (!file) return
    const result = await runCtAnalysis(file)
    if (result) {
      notify({
        tone: 'success',
        title: 'CT processing complete',
        description: `${result.regions.length} region(s) of interest extracted in ${result.processingMs} ms.`,
      })
    }
  }

  const images = ctResult?.images
  const currentImage = images ? images[view] : previewUrl

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Medical imaging"
        title="CT Image Analysis"
        subtitle="Upload a lung CT slice to run grayscale conversion, denoising, histogram analysis, Otsu thresholding, K-Means segmentation and region-of-interest extraction."
        actions={
          <Button
            variant="secondary"
            icon={Wand2}
            loading={isPreparingSample}
            loadingLabel="Preparing sample…"
            onClick={loadSample}
          >
            Use sample CT slice
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ------------------------------------------------- upload panel */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upload Lung CT Image</CardTitle>
              <CardDescription>PNG or JPEG, up to {formatBytes(env.maxUploadBytes)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragActive(false)
                acceptFile(event.dataTransfer.files?.[0] ?? null)
              }}
              className={cn(
                'flex flex-col items-center justify-center rounded-card border-2 border-dashed px-5 py-9 text-center transition-colors duration-200',
                dragActive
                  ? 'border-medical-400 bg-medical-50'
                  : 'border-medical-200 bg-surface-subtle hover:border-medical-300',
              )}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-medical-500 shadow-card ring-1 ring-inset ring-hairline">
                <Upload className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-3.5 text-[0.85rem] font-semibold text-ink">
                Drag &amp; drop a CT image here
              </p>
              <p className="mt-1 text-2xs text-ink-muted">
                or select a file from your computer
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,.dcm"
                className="sr-only"
                onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
                aria-label="Upload a CT image"
              />
              <Button
                variant="secondary"
                className="mt-4"
                icon={FileImage}
                onClick={() => inputRef.current?.click()}
              >
                Choose Image
              </Button>
            </div>

            {fileError ? (
              <div
                role="alert"
                className="rounded-input border border-danger/25 bg-tint-danger px-3.5 py-3 text-2xs text-danger-ink"
              >
                {fileError}{' '}
                <span className="text-danger-ink">DICOM (.dcm) support requires a connected backend.</span>
              </div>
            ) : null}

            {file ? (
              <div className="flex items-center gap-3 rounded-input border border-hairline bg-surface p-3">
                <img
                  src={previewUrl ?? undefined}
                  alt={`Preview of ${file.name}`}
                  className="h-12 w-12 rounded-lg border border-hairline object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8rem] font-semibold text-ink">{file.name}</p>
                  <p className="text-2xs text-ink-muted">
                    {file.type || 'image'} · {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                    setFile(null)
                    setPreviewUrl(null)
                    setFileError(null)
                    clearCt()
                  }}
                  aria-label="Remove selected image"
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-medical-50 hover:text-medical-600"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}

            <div className="rounded-input border border-teal-100 bg-tint-teal p-3.5">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                <p className="text-2xs leading-relaxed text-teal-700 dark:text-teal-300">
                  Processing runs entirely in your browser with a deterministic pipeline
                  (median filter → Otsu threshold → K-Means → connected components). Connect the
                  FastAPI service to run the reference OpenCV implementation instead.
                </p>
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              icon={ScanLine}
              disabled={!file}
              loading={isAnalyzingCt}
              loadingLabel="Processing CT image…"
              onClick={analyze}
            >
              Analyze CT Image
            </Button>
          </CardContent>
        </Card>

        {/* ------------------------------------------------ preview panel */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Image Preview</CardTitle>
              <CardDescription>
                {ctResult
                  ? 'Switch between processing stages of the same slice.'
                  : 'The uploaded image appears here at its original aspect ratio.'}
              </CardDescription>
            </div>
            {ctResult ? <ProvenanceChip provenance={ctResult.provenance} compact /> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {isAnalyzingCt && !ctResult ? (
              <LoadingState
                title="Processing CT image…"
                description="Running grayscale conversion, denoising and segmentation."
                className="border-dashed"
              />
            ) : currentImage ? (
              <>
                <div className="relative overflow-hidden rounded-card border border-hairline bg-viewer">
                  <img
                    src={currentImage}
                    alt={
                      ctResult
                        ? `${VIEW_OPTIONS.find((option) => option.key === view)?.label} of the uploaded CT slice`
                        : `Uploaded CT slice ${file?.name ?? ''}`
                    }
                    className="block h-auto w-full object-contain"
                  />
                  <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-viewer/70 px-2 py-1 text-[0.65rem] font-semibold text-white backdrop-blur-sm">
                    {ctResult
                      ? VIEW_OPTIONS.find((option) => option.key === view)?.label
                      : 'Uploaded image'}
                  </span>
                </div>

                {ctResult ? (
                  <div className="flex flex-wrap gap-1.5">
                    {VIEW_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setView(option.key)}
                        aria-pressed={view === option.key}
                        title={option.description}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-2xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                          view === option.key
                            ? 'bg-medical-500 text-white shadow-[0_4px_12px_rgba(11,92,173,0.25)]'
                            : 'bg-surface text-ink-soft ring-1 ring-inset ring-hairline hover:bg-medical-50 hover:text-medical-600',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                <p className="flex items-start gap-1.5 text-2xs text-ink-muted">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  {ctResult
                    ? `${ctResult.fileName} · ${ctResult.width}×${ctResult.height} px · processed in ${ctResult.processingMs} ms (${ctResult.engine === 'client' ? 'in-browser' : 'server'}).`
                    : 'Image is displayed with its original aspect ratio and is not analysed until you run the pipeline.'}
                </p>
              </>
            ) : (
              <EmptyState
                icon={FileImage}
                title="No CT image uploaded"
                description="Upload a lung CT image to begin analysis."
                action={
                  <Button
                    variant="secondary"
                    icon={Upload}
                    loading={isPreparingSample}
                    loadingLabel="Preparing sample…"
                    onClick={loadSample}
                  >
                    Use sample CT slice
                  </Button>
                }
                className="border-0 bg-transparent"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {ctError ? <ErrorState error={ctError} onRetry={analyze} /> : null}

      {/* ---------------------------------------------- processing indicator */}
      {isAnalyzingCt ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Processing pipeline</CardTitle>
              <CardDescription>Each stage reports when it completes.</CardDescription>
            </div>
            <Badge tone="medical">Running</Badge>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {CT_PIPELINE.map((step) => {
                const currentIndex = CT_PIPELINE.findIndex((entry) => entry.key === ctActiveStep)
                const index = CT_PIPELINE.findIndex((entry) => entry.key === step.key)
                const done = ctResult
                  ? (ctResult.steps.find((entry) => entry.key === step.key)?.status ?? 'pending') === 'done'
                  : index < currentIndex
                const active = !ctResult && index === currentIndex
                return (
                  <li
                    key={step.key}
                    className={cn(
                      'rounded-input border px-3 py-2.5 transition-colors duration-200',
                      active
                        ? 'border-medical-300 bg-medical-50'
                        : done
                          ? 'border-success/25 bg-success/5'
                          : 'border-hairline bg-surface',
                    )}
                  >
                    <p
                      className={cn(
                        'text-[0.8rem] font-semibold',
                        active ? 'text-medical-600' : done ? 'text-success-ink' : 'text-ink-soft',
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{step.detail}</p>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {/* ------------------------------------------------------- results */}
      {ctResult ? (
        <div className="space-y-5">
          <SectionTitle
            title="Image Analysis Summary"
            description="Values reported by the pipeline that produced them."
            right={<ProvenanceChip provenance={ctResult.provenance} />}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Original Image</CardTitle>
                  <CardDescription>Uploaded slice</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-card border border-hairline bg-viewer">
                  <img
                    src={ctResult.images.original}
                    alt="Original uploaded CT slice"
                    className="block h-auto w-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    {view === 'segmented' ? 'Segmented Region' : 'Region of Interest'}
                  </CardTitle>
                  <CardDescription>
                    {view === 'segmented'
                      ? 'K-Means intensity clusters'
                      : 'Extracted contours with bounding boxes'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-card border border-hairline bg-viewer">
                  <img
                    src={images ? images[view] : ctResult.images.overlay}
                    alt={
                      view === 'segmented'
                        ? 'Segmented CT slice showing intensity clusters'
                        : 'CT slice with detected regions of interest outlined'
                    }
                    className="block h-auto w-full object-contain"
                  />
                </div>
                <SegmentationNotice className="mt-4" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Image metadata</CardTitle>
                  <CardDescription>Decoded from the uploaded file</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <KeyValue label="File name" value={ctResult.fileName} />
                  <KeyValue label="File size" value={formatBytes(ctResult.fileSizeBytes)} />
                  <KeyValue
                    label="Image dimensions"
                    value={`${ctResult.width} × ${ctResult.height} px`}
                  />
                  <KeyValue label="Format" value={ctResult.format.toUpperCase()} />
                  <KeyValue
                    label="Processing method"
                    value={<span className="text-[0.78rem] font-medium">{ctResult.processingMethod}</span>}
                  />
                  <KeyValue
                    label="Segmentation method"
                    value={<span className="text-[0.78rem] font-medium">{ctResult.segmentationMethod}</span>}
                  />
                  <KeyValue label="Otsu threshold" value={ctResult.otsuThreshold} />
                  <KeyValue
                    label="Cluster centres"
                    value={ctResult.clusterCenters.join(' · ')}
                    hint={`k = ${ctResult.clusterCount}`}
                  />
                  <KeyValue
                    label="Regions detected"
                    value={formatInt(ctResult.regions.length)}
                    hint={`${formatDecimal(ctResult.roiPixelShare)}% of pixels above threshold`}
                  />
                  <KeyValue
                    label="Processing time"
                    value={`${formatInt(ctResult.processingMs)} ms`}
                    hint={ctResult.engine === 'client' ? 'Browser pipeline' : 'Server pipeline'}
                  />
                </dl>
              </CardContent>
            </Card>

            <HistogramChart
              data={ctResult.histogram}
              threshold={ctResult.otsuThreshold}
              title="Intensity histogram"
              description="Greyscale distribution after denoising, with the automatic Otsu threshold."
              provenance={ctResult.provenance}
            />
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Detected regions of interest</CardTitle>
                <CardDescription>
                  Intensity-defined areas extracted for human review. These are not tumour
                  detections.
                </CardDescription>
              </div>
              <Badge tone="teal">{ctResult.regions.length} regions</Badge>
            </CardHeader>
            <CardContent>
              {ctResult.regions.length === 0 ? (
                <EmptyState
                  icon={ScanLine}
                  title="No regions above threshold"
                  description="The automatic threshold did not isolate any connected regions larger than 0.2% of the image. Try a different CT slice."
                  className="border-0 bg-transparent py-8"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-hairline text-2xs uppercase tracking-wide text-ink-muted">
                        <th className="pb-2 pr-4 font-semibold">Region</th>
                        <th className="pb-2 pr-4 font-semibold">Bounding box (x, y, w, h)</th>
                        <th className="pb-2 pr-4 text-right font-semibold">Area</th>
                        <th className="pb-2 pr-4 text-right font-semibold">Share</th>
                        <th className="pb-2 text-right font-semibold">Mean intensity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {ctResult.regions.map((region) => (
                        <tr key={region.id} className="text-ink-soft">
                          <td className="py-2.5 pr-4">
                            <span className="inline-flex items-center gap-2 font-semibold text-ink">
                              <span
                                className={cn(
                                  'h-2.5 w-2.5 rounded-sm',
                                  region.id === 1 ? 'bg-teal-500' : 'bg-medical-400',
                                )}
                                aria-hidden
                              />
                              ROI {region.id}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 tabular">
                            {region.x}, {region.y}, {region.width}, {region.height}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular">
                            {formatInt(region.areaPx)} px
                          </td>
                          <td className="py-2.5 pr-4 text-right font-semibold tabular text-ink">
                            {formatDecimal(region.areaPct)}%
                          </td>
                          <td className="py-2.5 text-right tabular">{region.meanIntensity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <ResearchDisclaimer />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-panel border border-dashed border-medical-200 bg-surface/60 p-6"
        >
          <SectionTitle
            title="What happens when you analyze a slice"
            description="A deterministic, inspectable computer-vision pipeline — no trained detector is involved."
          />
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CT_PIPELINE.map((step, index) => (
              <li
                key={step.key}
                className="rounded-card border border-hairline bg-surface p-4 shadow-card"
              >
                <span className="text-2xs font-bold text-medical-300 tabular">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-1.5 text-[0.85rem] font-semibold text-ink">{step.label}</p>
                <p className="mt-1 text-2xs leading-relaxed text-ink-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
          <InlineDisclaimer className="mt-5" />
        </motion.div>
      )}

      {mode === 'live' ? (
        <p className="text-2xs text-ink-muted">
          A trained backend is connected; CT processing will be executed by the server-side OpenCV
          pipeline.
        </p>
      ) : null}
    </div>
  )
}
