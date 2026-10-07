import { useEffect, useRef, useState } from 'react'
import { Info, ScanLine, Upload, X } from 'lucide-react'
import { PatientPageHeader, SectionHeading, SafetyNote, PatientDisclaimer } from '@/components/patient/Safety'
import { CTComparison, CTViewer } from '@/components/patient/CTViewer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { ErrorState, EmptyState, LoadingState } from '@/components/ui/StatusStates'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import { formatBytes, formatInt } from '@/lib/format'
import { env } from '@/config/env'
import { cn } from '@/lib/cn'

const STAGE_LABELS: Record<string, string> = {
  load: 'Reading your image',
  grayscale: 'Preparing the image',
  denoise: 'Reducing image noise',
  histogram: 'Studying brightness patterns',
  threshold: 'Separating structures',
  segmentation: 'Separating regions',
  roi: 'Finding areas of interest',
}

export function CtScanPage() {
  const { notify } = useToast()
  const { ctResult, isAnalyzingCt, ctActiveStep, ctError, runCtAnalysis, clearCt, mode } = useApp()
  const { profile } = useHealth()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isPreparingSample, setIsPreparingSample] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const acceptFile = (candidate: File | null) => {
    setFileError(null)
    if (!candidate) return
    if (/\.dcm$/i.test(candidate.name) || candidate.type === 'image/dicom') {
      setFileError('DICOM files cannot be opened here.')
      setFile(null)
      return
    }
    if (!candidate.type.startsWith('image/')) {
      setFileError('That file type is not supported. Please choose a JPG or PNG image.')
      return
    }
    if (candidate.size > env.maxUploadBytes) {
      setFileError(`That image is larger than ${formatBytes(env.maxUploadBytes)}. Please choose a smaller file.`)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(candidate)
    setPreviewUrl(URL.createObjectURL(candidate))
  }

  const analyze = async () => {
    if (!file) return
    const result = await runCtAnalysis(file)
    if (result) {
      notify({
        tone: 'success',
        title: 'Your image has been processed',
        description: 'Scroll down to see the comparison and the areas highlighted.',
      })
    }
  }

  const loadSample = async () => {
    setIsPreparingSample(true)
    try {
      const { createSampleCtFile } = await import('@/services/samples/sampleCt')
      acceptFile(await createSampleCtFile())
      notify({
        tone: 'info',
        title: 'Sample image ready',
        description: 'A synthetic sample was created so you can try this feature.',
      })
    } catch {
      notify({ tone: 'warning', title: 'Could not create the sample image' })
    } finally {
      setIsPreparingSample(false)
    }
  }

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="CT Scan Analysis"
        subtitle="Upload a lung CT image for AI-assisted image analysis. The tool highlights areas for you to look at — it does not read the scan for medical conditions."
        actions={
          <Button
            variant="secondary"
            onClick={loadSample}
            loading={isPreparingSample}
            loadingLabel="Preparing…"
          >
            Try with a sample image
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* ------------------------------------------------------- upload */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Choose a CT image</CardTitle>
              <CardDescription>JPG, JPEG or PNG. Up to {formatBytes(env.maxUploadBytes)}.</CardDescription>
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
                'flex flex-col items-center justify-center rounded-card border-2 border-dashed px-5 py-10 text-center transition-colors duration-200',
                dragActive
                  ? 'border-medical-400 bg-medical-50'
                  : 'border-medical-200 bg-surface-subtle hover:border-medical-300',
              )}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-medical-500 shadow-card ring-1 ring-inset ring-hairline">
                <Upload className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-3.5 text-[0.88rem] font-semibold text-ink">Drag &amp; drop CT image here</p>
              <p className="mt-1 text-2xs text-ink-muted">or choose one from your device</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
                aria-label="Choose a CT image"
              />
              <Button variant="secondary" className="mt-4" icon={ScanLine} onClick={() => inputRef.current?.click()}>
                Choose CT Image
              </Button>
            </div>

            {fileError ? (
              <p role="alert" className="rounded-input border border-danger/25 bg-tint-danger px-3.5 py-2.5 text-2xs text-danger-ink">
                {fileError}
              </p>
            ) : null}

            {file ? (
              <div className="flex items-center gap-3 rounded-input border border-hairline bg-surface p-3">
                <img
                  src={previewUrl ?? undefined}
                  alt={`Preview of ${file.name}`}
                  className="h-12 w-12 rounded-lg border border-hairline object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.82rem] font-semibold text-ink">{file.name}</p>
                  <p className="text-2xs text-ink-muted">
                    {file.type} · {formatBytes(file.size)}
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
                  aria-label="Remove the selected image"
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-medical-50 hover:text-medical-600"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}

            <Button
              fullWidth
              size="lg"
              icon={ScanLine}
              disabled={!file}
              loading={isAnalyzingCt}
              loadingLabel="Processing your image…"
              onClick={analyze}
            >
              Analyze My CT Image
            </Button>

            <div className="flex items-start gap-2.5 rounded-input border border-teal-100 bg-tint-teal p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
              <p className="text-2xs leading-relaxed text-teal-700 dark:text-teal-300">
                Your image is processed so that areas of interest can be highlighted. It is not
                analysed for medical conditions, and nothing you upload is used to train a model.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------ preview */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your image</CardTitle>
              <CardDescription>
                {ctResult ? 'Use the controls to zoom in and look closely.' : 'This is the image you selected.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isAnalyzingCt && !ctResult ? (
              <LoadingState
                title="Processing your image…"
                description={STAGE_LABELS[ctActiveStep ?? 'load'] ?? 'Analysing the image'}
                className="border-dashed"
              />
            ) : previewUrl ? (
              <CTViewer
                src={previewUrl}
                alt={`The CT image you selected${file ? `, named ${file.name}` : ''}`}
                label="Selected image"
                caption="This is the image exactly as it was uploaded."
              />
            ) : (
              <EmptyState
                icon={ScanLine}
                title="No CT image uploaded"
                description="Upload a lung CT image to begin the AI-assisted analysis."
                action={
                  <Button variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()}>
                    Choose CT Image
                  </Button>
                }
                className="border-0 bg-transparent"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {ctError ? <ErrorState error={ctError} onRetry={analyze} /> : null}

      {isAnalyzingCt ? (
        <div className="flex items-center gap-3 rounded-card border border-medical-200 bg-medical-50 px-4 py-3.5">
          <span className="relative grid h-9 w-9 place-items-center">
            <span
              className="absolute inset-0 rounded-lg bg-surface"
              style={{ animation: 'breathe 2.4s ease-in-out infinite' }}
              aria-hidden
            />
            <ScanLine className="relative h-4 w-4 text-medical-500" aria-hidden />
          </span>
          <div>
            <p className="text-[0.82rem] font-semibold text-ink">Processing your image…</p>
            <p className="text-2xs text-ink-muted">{STAGE_LABELS[ctActiveStep ?? 'load']}</p>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------- results */}
      {ctResult ? (
        <div className="space-y-5">
          <SectionHeading
            title="Original and AI-assisted analysis"
            description="Compare the two views using the zoom controls."
          />

          <CTComparison
            original={{
              src: ctResult.images.original,
              alt: `Original CT image, ${ctResult.width} by ${ctResult.height} pixels`,
              label: 'Original Image',
              caption: 'Exactly as you uploaded it.',
            }}
            analysed={{
              src: ctResult.images.overlay,
              alt: `AI-assisted analysis of the CT image showing ${ctResult.regions.length} highlighted area(s) of interest`,
              label: 'AI-Assisted Analysis',
              caption:
                'The highlighted area represents a region identified during image processing. This does not confirm cancer or another medical condition.',
            }}
          />

          <div className="flex flex-wrap gap-2">
            <CTViewer
              className="flex-1 min-w-[260px]"
              src={ctResult.images.segmented}
              alt="The CT image with separated regions shown in different shades"
              label="Separated regions"
              caption="The image divided into brightness regions during processing."
            />
            <CTViewer
              className="flex-1 min-w-[260px]"
              src={ctResult.images.denoised}
              alt="The CT image after noise reduction and contrast adjustment"
              label="Enhanced view"
              caption="A cleaner version used to highlight the regions."
            />
          </div>

          <div className="rounded-card border border-teal-100 bg-tint-teal p-4">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
              <div>
                <p className="text-[0.82rem] font-semibold text-teal-700 dark:text-teal-300">
                  Discuss imaging findings with a qualified healthcare professional
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  This tool highlights regions identified while processing your image. It does not
                  identify conditions, and it cannot replace a radiologist or any other clinician.
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>What was done to your image</CardTitle>
                <CardDescription>A simple summary of the processing steps.</CardDescription>
              </div>
              <Badge tone="outline">
                {mode === 'live' ? 'Processed by the analysis service' : 'Processed on your device'}
              </Badge>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                <SummaryItem label="Image size" value={`${ctResult.width} × ${ctResult.height}`} />
                <SummaryItem label="Areas highlighted" value={formatInt(ctResult.regions.length)} />
                <SummaryItem label="Processing time" value={`${formatInt(ctResult.processingMs)} ms`} />
                <SummaryItem label="Your file" value={ctResult.fileName} truncate />
              </dl>
            </CardContent>
          </Card>

          {profile.age ? (
            <p className="text-2xs text-ink-muted">
              You can raise this image analysis with your healthcare professional using the questions
              prepared for you.
            </p>
          ) : null}
        </div>
      ) : null}

      <PatientDisclaimer />
      <SafetyNote />
    </div>
  )
}

function SummaryItem({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={cn('text-[0.85rem] font-semibold text-ink', truncate && 'truncate')}>{value}</dd>
    </div>
  )
}
