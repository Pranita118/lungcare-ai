/**
 * Question generator for appointments.
 *
 * Questions are selected from the person's own answers and their own symptom
 * entries — nothing is invented, and nothing is a suggestion of diagnosis.
 */
import type { DoctorQuestion, HealthProfile, SymptomEntry } from '@/types/health'
import { CLINICIAN_QUESTIONS } from '@/types/health'
import type { PredictionResult, ReportReading } from '@/types'
import { createId } from '@/lib/id'

interface Draft {
  text: string
  reason: string
  personalised: boolean
}

export function buildQuestions(
  profile: HealthProfile,
  prediction: PredictionResult | null,
  symptoms: SymptomEntry[],
  reading?: ReportReading | null,
): DoctorQuestion[] {
  const drafts: Draft[] = []

  // Questions raised by the person's own report come first: they are the most
  // specific thing they can take to an appointment.
  if (reading && reading.findings.length > 0) {
    for (const finding of reading.findings) {
      drafts.push({
        text: finding.question,
        reason: `Your report uses the term "${finding.title}"${
          finding.measurement ? ` (${finding.measurement})` : ''
        }.`,
        personalised: true,
      })
    }
  }

  if (prediction) {
    drafts.push({
      text: 'Should I have further evaluation based on my screening result?',
      reason: 'You have an AI-assisted screening result to discuss.',
      personalised: true,
    })
  }

  if (profile.copdDiagnosis === 'yes') {
    drafts.push({
      text: 'How should I monitor my breathing between appointments?',
      reason: 'You reported a history of COPD.',
      personalised: true,
    })
  }

  if (profile.smokingStatus === 'current') {
    drafts.push({
      text: 'Could you offer me support to stop smoking?',
      reason: 'You told us you currently smoke.',
      personalised: true,
    })
  }

  const raisedSmoke = Boolean(
    profile.secondhandSmokeExposure && profile.secondhandSmokeExposure !== 'none',
  )
  if (raisedSmoke) {
    drafts.push({
      text: 'Is my secondhand smoke exposure relevant to my lung health?',
      reason: 'You reported secondhand smoke exposure.',
      personalised: true,
    })
  }

  if (profile.asbestosExposure && profile.asbestosExposure !== 'none') {
    drafts.push({
      text: 'Could my past exposure history be relevant to my lung health?',
      reason: 'You reported asbestos exposure.',
      personalised: true,
    })
  }

  if (profile.radonExposure && profile.radonExposure !== 'none') {
    drafts.push({
      text: 'Should I be concerned about radon exposure at home?',
      reason: 'You reported radon exposure.',
      personalised: true,
    })
  }

  if (profile.familyHistory === 'yes') {
    drafts.push({
      text: 'Given my family history, is any screening appropriate for me?',
      reason: 'You reported a family history of lung cancer.',
      personalised: true,
    })
  }

  if (profile.activityLevel === 'low' || profile.smokingStatus === 'current') {
    drafts.push({
      text: 'What level of physical activity is safe for me?',
      reason: 'Your answers suggest a conversation about safe activity would be useful.',
      personalised: true,
    })
  }

  if (profile.appetite === 'reduced') {
    drafts.push({
      text: 'My appetite has been reduced — should this be investigated?',
      reason: 'You told us your appetite has been reduced.',
      personalised: true,
    })
  }

  if (profile.sleepQuality === 'poor') {
    drafts.push({
      text: 'I am sleeping poorly — could you suggest anything to help?',
      reason: 'You described your sleep as poor.',
      personalised: true,
    })
  }

  if (symptoms.length > 0) {
    const latest = symptoms[0]
    const reported = Object.entries(latest.values).filter(([, value]) => value !== 'none')
    if (reported.length > 0) {
      drafts.push({
        text: 'Should the symptoms I have recorded be investigated further?',
        reason: `Your latest symptom entry records: ${reported
          .map(([key]) => key.replace(/_/g, ' '))
          .join(', ')}.`,
        personalised: true,
      })
    }
  }

  drafts.push({
    text: 'Is CT imaging appropriate for me at this time?',
    reason: 'You can ask whether imaging would be useful for your situation.',
    personalised: true,
  })

  drafts.push({
    text: 'When should I schedule my next follow-up?',
    reason: 'Useful for planning your ongoing care.',
    personalised: true,
  })

  drafts.push({ text: 'Should I speak with a dietitian?', reason: 'Nutrition support can be part of care.', personalised: false })

  for (const generic of CLINICIAN_QUESTIONS) {
    drafts.push({ text: generic, reason: 'General question worth asking.', personalised: false })
  }

  const seen = new Set<string>()
  return drafts
    .filter((draft) => {
      const key = draft.text.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, reading && reading.findings.length > 0 ? 14 : 10)
    .map<DoctorQuestion>((draft) => ({
      id: createId('Q'),
      text: draft.text,
      reason: draft.reason,
      discussed: false,
      personalised: draft.personalised,
    }))
}

/** Plain-text export for the "Download Questions" action. */
export function questionsToText(questions: DoctorQuestion[], profile: HealthProfile): string {
  const lines: string[] = []
  lines.push('QUESTIONS FOR MY DOCTOR')
  lines.push('LungCare AI — educational and research prototype')
  lines.push('')
  if (profile.displayName) lines.push(`Prepared for: ${profile.displayName}`)
  lines.push(`Prepared: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('These questions are prompts to discuss with a healthcare professional.')
  lines.push('They are not medical advice and do not replace professional assessment.')
  lines.push('')
  questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.text}`)
    lines.push(`   Why: ${question.reason}`)
    lines.push(`   Discussed: ${question.discussed ? 'yes' : 'not yet'}`)
    lines.push('')
  })
  lines.push('Important: LungCare AI is an educational and research prototype and does not')
  lines.push('provide a medical diagnosis. Please discuss your health with a qualified')
  lines.push('healthcare professional.')
  return lines.join('\n')
}
