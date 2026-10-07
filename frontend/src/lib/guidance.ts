/**
 * Personalised supportive-health guidance.
 *
 * Every item here is derived from information the person actually entered, or
 * from their own symptom entries. Nothing is invented, and nothing here is a
 * medical instruction: each suggestion is framed as something to raise with a
 * healthcare professional.
 */
import type {
  HealthProfile,
  HealthyStep,
  StepCategory,
  SafetyNote,
  SymptomEntry,
  SymptomKey,
  SymptomSeverity,
} from '@/types/health'
import type { PredictionResult } from '@/types'

/* ------------------------------------------------------------------ labels */

export const SYMPTOM_LABELS: Record<SymptomKey, { label: string; question: string }> = {
  cough: {
    label: 'Cough',
    question: 'Have you had a cough?',
  },
  shortness_of_breath: {
    label: 'Shortness of breath',
    question: 'Has your breathing felt strained?',
  },
  chest_discomfort: {
    label: 'Chest discomfort',
    question: 'Have you felt any chest discomfort?',
  },
  fatigue: {
    label: 'Fatigue',
    question: 'Have you felt unusually tired?',
  },
  appetite: {
    label: 'Appetite',
    question: 'How has your appetite been?',
  },
  sleep: {
    label: 'Sleep',
    question: 'How have you been sleeping?',
  },
}

export const SEVERITY_LABELS: Record<SymptomSeverity, string> = {
  none: 'None',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
}

export const SEVERITY_TONE: Record<SymptomSeverity, 'success' | 'warning' | 'danger'> = {
  none: 'success',
  mild: 'medical',
  moderate: 'warning',
  severe: 'danger',
} as never

/* ------------------------------------------------------------- risk reading */

/** Plain-language reading of a screening result. Never diagnostic. */
export interface RiskReading {
  level: 'lower' | 'moderate' | 'elevated'
  headline: string
  /** One-sentence meaning, written for a patient. */
  meaning: string
  scoreLabel: string
}

export function describeRisk(prediction: PredictionResult | null): RiskReading {
  if (!prediction) {
    return {
      level: 'moderate',
      headline: 'No screening result yet',
      meaning:
        'Complete your health assessment to receive an AI-assisted screening result you can discuss with your healthcare professional.',
      scoreLabel: 'Not available',
    }
  }

  const level = prediction.riskLevel
  if (level === 'low') {
    return {
      level: 'lower',
      headline: 'Lower predicted risk',
      meaning:
        'Based on the information you entered, the model placed you in a lower predicted-risk range. This is not a diagnosis and does not rule out any condition.',
      scoreLabel: 'Lower predicted risk range',
    }
  }
  if (level === 'moderate') {
    return {
      level: 'moderate',
      headline: 'Moderate predicted risk',
      meaning:
        'Based on the information you entered, the model placed you in a moderate predicted-risk range. Several factors you reported contributed to this. Discuss it with your healthcare professional.',
      scoreLabel: 'Moderate predicted risk range',
    }
  }
  return {
    level: 'elevated',
    headline: 'Elevated predicted risk',
    meaning:
      'Based on the information you entered, the model placed you in an elevated predicted-risk range. This is a prompt to speak with your healthcare professional — it is not a diagnosis.',
    scoreLabel: 'Elevated predicted risk range',
  }
}

/* ------------------------------------------------- contributing factor copy */

export interface PersonalFactor {
  key: string
  icon: 'cigarette' | 'users' | 'wind' | 'helmet' | 'lungs' | 'heart' | 'clock' | 'stethoscope'
  title: string
  message: string
  direction: 'raised' | 'lowered' | 'neutral'
}

/** Human wording for each screening input, used across the patient interface. */
const FACTOR_COPY: Record<string, { icon: PersonalFactor['icon']; title: string; describe: (v: string) => string }> = {
  pack_years: {
    icon: 'cigarette',
    title: 'Smoking exposure',
    describe: (v) =>
      `You reported about ${v} pack-years of smoking. Pack-years are used by healthcare professionals to describe lifetime smoking exposure.`,
  },
  family_history: {
    icon: 'users',
    title: 'Family history',
    describe: (v) =>
      v === 'yes'
        ? 'You reported a family history of lung cancer.'
        : 'You reported no family history of lung cancer.',
  },
  copd_diagnosis: {
    icon: 'wind',
    title: 'COPD (breathing condition)',
    describe: (v) =>
      v === 'yes'
        ? 'You reported a history of COPD, a long-term breathing condition.'
        : 'You reported no history of COPD.',
  },
  radon_exposure: {
    icon: 'helmet',
    title: 'Radon exposure',
    describe: (v) => `You reported radon exposure level: ${v}.`,
  },
  asbestos_exposure: {
    icon: 'helmet',
    title: 'Asbestos exposure',
    describe: (v) => `You reported asbestos exposure level: ${v}.`,
  },
  secondhand_smoke_exposure: {
    icon: 'wind',
    title: 'Secondhand smoke',
    describe: (v) => `You reported secondhand smoke exposure level: ${v}.`,
  },
  age: {
    icon: 'clock',
    title: 'Age',
    describe: (v) => `Age is one of the inputs the screening model considers. You entered ${v}.`,
  },
  alcohol_consumption: {
    icon: 'heart',
    title: 'Alcohol use',
    describe: (v) => `You reported alcohol consumption level: ${v}.`,
  },
  gender: {
    icon: 'stethoscope',
    title: 'Gender',
    describe: (v) => `Gender is recorded as one of the screening inputs. You entered ${v}.`,
  },
}

/**
 * Turns the model output into friendly factor cards.
 * Only factors the person actually reported are shown.
 */
export function personalFactors(
  prediction: PredictionResult | null,
  profile: HealthProfile,
): PersonalFactor[] {
  if (!prediction) return []

  return prediction.contributions
    .filter((item) => item.feature in FACTOR_COPY)
    .slice(0, 6)
    .map((item) => {
      const copy = FACTOR_COPY[item.feature]
      const reported =
        item.feature === 'pack_years'
          ? formatPackYears(profile.packYears)
          : item.displayValue
      return {
        key: item.feature,
        icon: copy.icon,
        title: copy.title,
        message: copy.describe(String(reported).toLowerCase()),
        direction:
          item.contribution > 0.02
            ? ('raised' as const)
            : item.contribution < -0.02
              ? ('lowered' as const)
              : ('neutral' as const),
      }
    })
}

function formatPackYears(value: number | null): string {
  if (value === null) return 'not provided'
  if (value === 0) return '0'
  return String(value)
}

/* ------------------------------------------------------- supportive guidance */

export interface CareArea {
  id: StepCategory
  icon: PersonalFactor['icon']
  title: string
  guidance: string
  /** Why this area was raised for this person. */
  because: string
  priority: 'high' | 'medium' | 'routine'
}

/**
 * "Based on your information" — 3–5 areas, each with a supportive suggestion
 * and the reason it applies to this person.
 */
export function careAreas(profile: HealthProfile, prediction: PredictionResult | null): CareArea[] {
  const areas: CareArea[] = []
  const rank = new Map<string, number>()
  prediction?.contributions.forEach((item, index) => rank.set(item.feature, index))

  const priorityOf = (feature: string): CareArea['priority'] => {
    const position = rank.get(feature)
    if (position === undefined) return 'routine'
    if (position < 2) return 'high'
    if (position < 5) return 'medium'
    return 'routine'
  }

  /* ------------------------------------------------------------- tobacco */
  if (profile.smokingStatus === 'current') {
    areas.push({
      id: 'tobacco',
      icon: 'cigarette',
      title: 'Tobacco exposure',
      guidance:
        'Consider speaking with a healthcare professional about support to stop smoking. Quitting at any age can benefit lung health.',
      because: 'You told us you currently smoke.',
      priority: priorityOf('pack_years'),
    })
  } else if (profile.smokingStatus === 'former') {
    areas.push({
      id: 'tobacco',
      icon: 'cigarette',
      title: 'Tobacco exposure',
      guidance:
        'You have stopped smoking, which is a meaningful health decision. Share your history with your healthcare professional so they can advise on follow-up.',
      because: 'You told us you used to smoke.',
      priority: priorityOf('pack_years'),
    })
  }

  if (profile.secondhandSmokeExposure && profile.secondhandSmokeExposure !== 'none') {
    areas.push({
      id: 'tobacco',
      icon: 'wind',
      title: 'Secondhand smoke',
      guidance:
        'Try to reduce exposure to tobacco smoke and keep frequently used spaces smoke-free. Tell your healthcare professional about your exposure.',
      because: 'You reported secondhand smoke exposure.',
      priority: priorityOf('secondhand_smoke_exposure'),
    })
  }

  /* --------------------------------------------------------- environment */
  if (profile.radonExposure && profile.radonExposure !== 'none') {
    areas.push({
      id: 'wellbeing',
      icon: 'helmet',
      title: 'Home environment',
      guidance:
        'Ask your healthcare professional about radon testing for your home, and about reducing exposure where you spend time.',
      because: 'You reported radon exposure.',
      priority: priorityOf('radon_exposure'),
    })
  }
  if (profile.asbestosExposure && profile.asbestosExposure !== 'none') {
    areas.push({
      id: 'wellbeing',
      icon: 'helmet',
      title: 'Workplace exposure',
      guidance:
        'Mention any workplace or hobby exposure to your healthcare professional so they can advise whether any follow-up is appropriate.',
      because: 'You reported asbestos exposure.',
      priority: priorityOf('asbestos_exposure'),
    })
  }

  /* ------------------------------------------------------------- breathing */
  if (profile.copdDiagnosis === 'yes') {
    areas.push({
      id: 'routine',
      icon: 'lungs',
      title: 'Breathing health',
      guidance:
        'Keep your scheduled breathing-related appointments and ask your healthcare team how to monitor your symptoms between visits.',
      because: 'You reported a history of COPD.',
      priority: priorityOf('copd_diagnosis'),
    })
  }

  /* -------------------------------------------------------------- family */
  if (profile.familyHistory === 'yes') {
    areas.push({
      id: 'wellbeing',
      icon: 'users',
      title: 'Family history',
      guidance:
        'It is helpful to tell your healthcare professional which relatives were affected, so they can advise on whether any screening is appropriate for you.',
      because: 'You reported a family history of lung cancer.',
      priority: priorityOf('family_history'),
    })
  }

  /* ----------------------------------------------------------- lifestyle */
  areas.push(nutritionArea(profile))
  areas.push(activityArea(profile))
  areas.push(restArea(profile))
  areas.push(wellbeingArea(profile))

  const weight = { high: 0, medium: 1, routine: 2 }
  return areas
    .sort((a, b) => weight[a.priority] - weight[b.priority])
    .slice(0, 5)
}

function nutritionArea(profile: HealthProfile): CareArea {
  if (profile.appetite === 'reduced') {
    return {
      id: 'nutrition',
      icon: 'heart',
      title: 'Nutrition',
      guidance:
        'Consider smaller, balanced meals, and discuss ongoing appetite or weight changes with your healthcare team.',
      because: 'You told us your appetite has been reduced.',
      priority: 'medium',
    }
  }
  return {
    id: 'nutrition',
    icon: 'heart',
    title: 'Nutrition',
    guidance:
      'Maintain balanced nutrition with a variety of vegetables, fruit and whole foods, and discuss significant appetite or weight changes with your healthcare team.',
    because: 'General lung health support.',
    priority: 'routine',
  }
}

function activityArea(profile: HealthProfile): CareArea {
  if (profile.activityLevel === 'low') {
    return {
      id: 'activity',
      icon: 'stethoscope',
      title: 'Activity',
      guidance:
        'Ask your healthcare team what level of physical activity is appropriate for you, and start gently if they approve.',
      because: 'You described your activity level as low.',
      priority: 'medium',
    }
  }
  return {
    id: 'activity',
    icon: 'stethoscope',
    title: 'Activity',
    guidance:
      'Ask your healthcare team what level of physical activity is safe for you, and keep up any movement that feels comfortable.',
    because: 'General lung health support.',
    priority: 'routine',
  }
}

function restArea(profile: HealthProfile): CareArea {
  if (profile.sleepQuality === 'poor') {
    return {
      id: 'rest',
      icon: 'clock',
      title: 'Rest',
      guidance:
        'Maintain a consistent sleep routine, and discuss persistent sleep problems with a healthcare professional.',
      because: 'You described your sleep as poor.',
      priority: 'medium',
    }
  }
  return {
    id: 'rest',
    icon: 'clock',
    title: 'Rest',
    guidance:
      'Prioritise adequate rest. If you are sleeping poorly for a sustained period, mention it at your next appointment.',
    because: 'General lung health support.',
    priority: 'routine',
  }
}

function wellbeingArea(profile: HealthProfile): CareArea {
  if (profile.stressLevel === 'high') {
    return {
      id: 'wellbeing',
      icon: 'wind',
      title: 'Emotional well-being',
      guidance:
        'Try a short relaxation or breathing activity, and consider discussing persistent stress with your healthcare team or a support service.',
      because: 'You described your stress level as high.',
      priority: 'medium',
    }
  }
  return {
    id: 'wellbeing',
    icon: 'wind',
    title: 'Emotional well-being',
    guidance:
      'Consider relaxation techniques and support resources if you feel stressed. Lung health and general wellbeing are closely connected.',
    because: 'General wellbeing support.',
    priority: 'routine',
  }
}

/* -------------------------------------------------------------- daily steps */

const BASE_STEP_DETAIL: Record<string, string> = {
  'avoid-tobacco-smoke': 'Keep your home and usual spaces free of tobacco smoke.',
  'follow-routine': 'Follow the health routine you agreed with your healthcare team.',
  'balanced-meal': 'Eat at least one balanced meal today.',
  'stay-hydrated': 'Drink fluids regularly through the day.',
  'safe-activity': 'Complete a safe amount of movement today, if your healthcare team has said this is fine for you.',
  relax: 'Take a few minutes for a calm, relaxing activity.',
  'attend-appointments': 'Keep any healthcare appointments you have scheduled.',
}

const CATEGORY_FOR_STEP: Record<string, StepCategory> = {
  'avoid-tobacco-smoke': 'tobacco',
  'follow-routine': 'routine',
  'balanced-meal': 'nutrition',
  'stay-hydrated': 'hydration',
  'safe-activity': 'activity',
  relax: 'wellbeing',
  'attend-appointments': 'appointments',
}

/** The daily checklist, with titles adapted to this person's own answers. */
export function healthySteps(profile: HealthProfile): HealthyStep[] {
  const smoked = profile.smokingStatus === 'current' || profile.smokingStatus === 'former'
  const secondHand = Boolean(profile.secondhandSmokeExposure && profile.secondhandSmokeExposure !== 'none')
  const reducedActivity = profile.activityLevel === 'low'

  const titles: Record<string, string> = {
    'avoid-tobacco-smoke':
      smoked || secondHand ? 'Stay away from tobacco smoke' : 'Keep your space smoke-free',
    'follow-routine': reducedActivity
      ? 'Follow the activity guidance from my healthcare team'
      : 'Follow my planned health routine',
    'balanced-meal': profile.appetite === 'reduced' ? 'Have a small balanced meal' : 'Eat a balanced meal',
    'stay-hydrated': 'Stay hydrated',
    'safe-activity': reducedActivity
      ? 'Move gently within what my healthcare team advised'
      : 'Complete safe physical activity if permitted',
    relax: profile.stressLevel === 'high' ? 'Take time to relax and breathe' : 'Take time to relax',
    'attend-appointments': 'Keep my scheduled healthcare appointments',
  }

  return [
    'avoid-tobacco-smoke',
    'follow-routine',
    'balanced-meal',
    'stay-hydrated',
    'safe-activity',
    'relax',
    'attend-appointments',
  ].map((id) => ({
    id,
    title: titles[id],
    detail: BASE_STEP_DETAIL[id],
    category: CATEGORY_FOR_STEP[id],
    cadence: 'daily' as const,
    personalised: smoked && id === 'avoid-tobacco-smoke' ? true : reducedActivity && id === 'safe-activity' ? true : profile.appetite === 'reduced' && id === 'balanced-meal' ? true : profile.stressLevel === 'high' && id === 'relax' ? true : false,
  }))
}

/** Additional steps that only apply to this person, shown above the checklist. */
export function extraSteps(profile: HealthProfile, prediction: PredictionResult | null): HealthyStep[] {
  const steps: HealthyStep[] = []
  const rank = new Map<string, number>()
  prediction?.contributions.forEach((item, index) => rank.set(item.feature, index))

  if (profile.smokingStatus === 'current') {
    steps.push({
      id: 'speak-about-quitting',
      title: 'Ask about support to stop smoking',
      detail: 'Bring up smoking cessation support at your next appointment.',
      category: 'tobacco',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.secondhandSmokeExposure && profile.secondhandSmokeExposure !== 'none') {
    steps.push({
      id: 'smoke-free-home',
      title: 'Make one frequently used space smoke-free',
      detail: 'Choose a room or vehicle you use often and keep it smoke-free.',
      category: 'tobacco',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.radonExposure && profile.radonExposure !== 'none') {
    steps.push({
      id: 'ask-about-radon',
      title: 'Ask about radon testing',
      detail: 'Mention your radon exposure when you next speak with your healthcare professional.',
      category: 'wellbeing',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.asbestosExposure && profile.asbestosExposure !== 'none') {
    steps.push({
      id: 'note-exposures',
      title: 'Write down your exposure history',
      detail: 'Note where and when you were exposed, so you can share it clearly with a clinician.',
      category: 'wellbeing',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.activityLevel === 'low') {
    steps.push({
      id: 'ask-about-activity',
      title: 'Ask what activity is safe for me',
      detail: 'Your healthcare team can advise on an appropriate level of movement for you.',
      category: 'activity',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.appetite === 'reduced') {
    steps.push({
      id: 'small-meals',
      title: 'Try smaller balanced meals',
      detail: 'If your appetite stays low, mention it to your healthcare team.',
      category: 'nutrition',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.sleepQuality === 'poor') {
    steps.push({
      id: 'sleep-routine',
      title: 'Keep a consistent sleep routine',
      detail: 'Same bedtime each night, and mention ongoing sleep problems to a clinician.',
      category: 'rest',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.stressLevel === 'high') {
    steps.push({
      id: 'relax-practice',
      title: 'Try a short relaxation practice',
      detail: 'Even a few slow breaths can help. Consider support resources if stress continues.',
      category: 'wellbeing',
      cadence: 'weekly',
      personalised: true,
    })
  }
  if (profile.copdDiagnosis === 'yes') {
    steps.push({
      id: 'breathing-technique',
      title: 'Ask about breathing techniques',
      detail: 'A clinician can tell you which techniques are appropriate for you.',
      category: 'routine',
      cadence: 'weekly',
      personalised: true,
    })
  }

  void rank
  return steps
}

/* --------------------------------------------------------------- next steps */

export const NEXT_STEPS: { title: string; detail: string }[] = [
  {
    title: 'Discuss this result with your healthcare professional',
    detail: 'Bring the report to your appointment so you can talk it through together.',
  },
  {
    title: 'Keep your medical appointments',
    detail: 'Continue any scheduled reviews, even when you feel well.',
  },
  {
    title: 'Follow healthy lifestyle guidance',
    detail: 'Use your daily healthy steps as a simple, realistic starting point.',
  },
  {
    title: 'Avoid tobacco smoke exposure',
    detail: 'Reducing exposure to smoke, in any setting, supports lung health.',
  },
]

/* ------------------------------------------------------------ safety notes */

const SEVERE_SYMPTOMS: SymptomKey[] = [
  'shortness_of_breath',
  'chest_discomfort',
]

/**
 * Non-diagnostic safety guidance.
 * This never identifies a condition; it only encourages appropriate care.
 */
export function safetyNotes(entries: SymptomEntry[]): SafetyNote[] {
  if (entries.length === 0) return []
  const latest = entries[0]
  const notes: SafetyNote[] = []

  const severe = SEVERE_SYMPTOMS.filter(
    (key) => latest.values[key] === 'moderate' || latest.values[key] === 'severe',
  )
  const worsening = latest.values.shortness_of_breath === 'severe' || latest.values.chest_discomfort === 'severe'

  if (worsening) {
    notes.push({
      level: 'urgent',
      title: 'Seek urgent medical attention',
      message:
        'You have recorded severe breathing or chest symptoms. Please seek urgent medical attention or contact local emergency services.',
    })
  } else if (severe.length > 0) {
    notes.push({
      level: 'discuss',
      title: 'Your symptoms may be worth discussing with a healthcare professional',
      message:
        'You have recorded moderate or worse breathing-related symptoms. These may be worth discussing at your next appointment, and sooner if they are new or getting worse.',
    })
  }

  const persistentCough = latest.values.cough === 'moderate' || latest.values.cough === 'severe'
  if (persistentCough && !notes.some((note) => note.level !== 'routine')) {
    notes.push({
      level: 'discuss',
      title: 'Your symptoms may be worth discussing with a healthcare professional',
      message:
        'You have recorded a cough that is moderate or worse. If it persists or changes, mention it to a healthcare professional.',
    })
  }

  if (notes.length === 0) {
    notes.push({
      level: 'routine',
      title: 'Keep tracking how you feel',
      message:
        'Nothing you recorded today suggests a need for urgent attention. Keep recording how you feel, and speak to a healthcare professional if anything changes.',
    })
  }

  return notes
}

/** Compares the two most recent entries to describe change over time. */
export function symptomTrend(entries: SymptomEntry[]): {
  key: SymptomKey
  label: string
  change: 'better' | 'same' | 'worse'
}[] {
  if (entries.length < 2) return []
  const [current, previous] = entries
  const rank: Record<SymptomSeverity, number> = { none: 0, mild: 1, moderate: 2, severe: 3 }
  return (Object.keys(current.values) as SymptomKey[])
    .map((key) => {
      const now = rank[current.values[key]]
      const before = rank[previous.values[key]]
      return {
        key,
        label: SYMPTOM_LABELS[key].label,
        change: now > before ? ('worse' as const) : now < before ? ('better' as const) : ('same' as const),
      }
    })
    .filter((item) => item.change !== 'same')
}
