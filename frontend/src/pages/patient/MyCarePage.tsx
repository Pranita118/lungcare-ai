import { useState } from 'react'
import { CalendarHeart, CheckCircle2, Clock, Pill, Plus, ScanLine, Trash2 } from 'lucide-react'
import { PatientPageHeader, SafetyNote, PatientDisclaimer, SectionHeading } from '@/components/patient/Safety'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select, TextInput, Toggle } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/StatusStates'
import { Modal } from '@/components/ui/Modal'
import { useHealth, todayKey } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import type { CareItem } from '@/types/health'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const KIND_META: Record<CareItem['kind'], { label: string; icon: typeof Clock; tone: 'medical' | 'teal' | 'warning' | 'neutral' }> = {
  appointment: { label: 'Appointment', icon: CalendarHeart, tone: 'medical' },
  scan: { label: 'Scan', icon: ScanLine, tone: 'teal' },
  medication: { label: 'Medication reminder', icon: Pill, tone: 'warning' },
  'follow-up': { label: 'Follow-up', icon: Clock, tone: 'neutral' },
}

export function MyCarePage() {
  const { notify } = useToast()
  const {
    upcomingCareItems,
    addCareItem,
    updateCareItem,
    removeCareItem,
    toggleCareItem,
  } = useHealth()

  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<CareItem['kind']>('appointment')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [provider, setProvider] = useState('')
  const [notes, setNotes] = useState('')
  const [reminderOn, setReminderOn] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const reset = () => {
    setKind('appointment')
    setTitle('')
    setDate('')
    setTime('')
    setProvider('')
    setNotes('')
    setReminderOn(true)
    setErrors({})
  }

  const save = () => {
    const found: Record<string, string> = {}
    if (!title.trim()) found.title = 'Please give this item a name.'
    if (!date.trim() && kind !== 'medication') found.date = 'Please choose a date.'
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < todayKey())
      found.date = 'That date is in the past.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    addCareItem({
      kind,
      title: title.trim(),
      date: date || null,
      time: time || null,
      provider: provider.trim(),
      notes: notes.trim(),
      reminderOn,
      completed: false,
    })
    setIsSaving(false)
    setOpen(false)
    reset()
    notify({ tone: 'success', title: 'Saved to My Care' })
  }

  const groups: { key: CareItem['kind']; title: string }[] = [
    { key: 'appointment', title: 'Upcoming appointments' },
    { key: 'scan', title: 'Scans' },
    { key: 'medication', title: 'Medication reminders' },
    { key: 'follow-up', title: 'Follow-ups' },
  ]

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="My Care"
        subtitle="Keep track of your appointments, scans and reminders in one place. This is an organiser only — it does not suggest, change or review any medication."
        actions={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            Add Appointment
          </Button>
        }
      />

      <div className="flex items-start gap-2.5 rounded-card border border-teal-100 bg-tint-teal px-4 py-3.5">
        <Pill className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
        <p className="text-2xs leading-relaxed text-teal-700 dark:text-teal-300">
          <span className="font-semibold">Medication reminders are for your own reference.</span>{' '}
          Enter the medicines your healthcare professional has already prescribed. This application
          never recommends a medicine, changes a dose, or tells you to start or stop a treatment.
        </p>
      </div>

      {upcomingCareItems.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title="You have not added anything yet"
          description="Add an appointment, scan or reminder so it appears here and on your home page."
          action={
            <Button icon={Plus} onClick={() => setOpen(true)}>
              Add your first item
            </Button>
          }
          className="border-0 bg-transparent bg-surface/60"
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const items = upcomingCareItems.filter((item) => item.kind === group.key)
            if (items.length === 0) return null
            return (
              <section key={group.key} className="space-y-3">
                <SectionHeading
                  title={group.title}
                  action={
                    <Button size="sm" variant="secondary" icon={Plus} onClick={() => {
                      setKind(group.key)
                      setOpen(true)
                    }}>
                      Add
                    </Button>
                  }
                />
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <CareItemCard
                      key={item.id}
                      item={item}
                      onToggle={() => toggleCareItem(item.id)}
                      onDelete={() => {
                        removeCareItem(item.id)
                        notify({ tone: 'info', title: 'Item removed' })
                      }}
                      onRemind={(value) => updateCareItem(item.id, { reminderOn: value })}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <PatientDisclaimer />
      <SafetyNote />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add to My Care"
        description="Record an appointment, scan, follow-up or a reminder you have been given."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={isSaving} loadingLabel="Saving…">
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Type" htmlFor="kind">
            <Select
              id="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as CareItem['kind'])}
              options={[
                { value: 'appointment', label: 'Appointment' },
                { value: 'scan', label: 'Scan or imaging appointment' },
                { value: 'follow-up', label: 'Follow-up' },
                { value: 'medication', label: 'Medication reminder (as prescribed by my clinician)' },
              ]}
            />
          </Field>

          <Field label="Title" htmlFor="title" required error={errors.title ?? null}>
            <TextInput
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                kind === 'medication' ? 'e.g. Medicine name as prescribed' : 'e.g. Chest CT appointment'
              }
              invalid={Boolean(errors.title)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="date" required={kind !== 'medication'} error={errors.date ?? null}>
              <TextInput
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                invalid={Boolean(errors.date)}
              />
            </Field>
            <Field label="Time" htmlFor="time" helper="Optional">
              <TextInput id="time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </Field>
          </div>

          <Field label="Doctor or clinic" htmlFor="provider" helper="Optional">
            <TextInput
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="e.g. Dr Smith, Riverside Clinic"
            />
          </Field>

          <Field label="Notes" htmlFor="notes" helper="Optional">
            <TextInput
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything you want to remember"
            />
          </Field>

          <Toggle
            id="reminder"
            checked={reminderOn}
            onChange={setReminderOn}
            label="Show a reminder for this item"
            description="Reminders appear in your My Care list."
          />
        </div>
      </Modal>
    </div>
  )
}

function CareItemCard({
  item,
  onToggle,
  onDelete,
  onRemind,
}: {
  item: CareItem
  onToggle: () => void
  onDelete: () => void
  onRemind: (value: boolean) => void
}) {
  const meta = KIND_META[item.kind]
  const Icon = meta.icon
  const isOverdue =
    !item.completed && item.date && item.date < todayKey()

  return (
    <li
      className={cn(
        'rounded-card border bg-surface p-4 shadow-card transition-colors',
        item.completed ? 'border-hairline opacity-70' : isOverdue ? 'border-warning/30' : 'border-hairline',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={item.completed}
          aria-label={item.completed ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
          className={cn(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
            item.completed ? 'border-success bg-success text-white' : 'border-hairline-strong bg-surface hover:border-medical-300',
          )}
        >
          {item.completed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>
              <Icon className="h-3 w-3" aria-hidden />
              {meta.label}
            </Badge>
            {item.reminderOn ? <Badge tone="outline">Reminder on</Badge> : null}
            {isOverdue ? <Badge tone="warning">Past date</Badge> : null}
          </div>
          <p
            className={cn(
              'mt-2 text-[0.9rem] font-semibold text-ink',
              item.completed && 'line-through decoration-ink-muted/40',
            )}
          >
            {item.title}
          </p>
          {item.date ? (
            <p className="mt-0.5 text-2xs text-ink-muted">
              {formatDate(`${item.date}T00:00:00`)}
              {item.time ? ` at ${item.time}` : ''}
            </p>
          ) : null}
          {item.provider ? <p className="text-2xs text-ink-muted">{item.provider}</p> : null}
          {item.notes ? (
            <p className="mt-1.5 text-2xs leading-relaxed text-ink-soft">{item.notes}</p>
          ) : null}
          {item.date ? (
            <p className="mt-1 text-[0.65rem] text-ink-muted">
              Added {formatDateTime(item.createdAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-2.5">
        <button
          type="button"
          onClick={() => onRemind(!item.reminderOn)}
          className="rounded-md px-1.5 py-1 text-2xs font-semibold text-medical-600 transition-colors hover:bg-medical-50"
        >
          {item.reminderOn ? 'Turn reminder off' : 'Turn reminder on'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${item.title}`}
          className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-4 focus-visible:ring-medical-500/15"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </li>
  )
}
