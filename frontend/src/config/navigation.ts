import {
  Activity,
  BarChart3,
  BrainCircuit,
  Database,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'

/**
 * RESEARCH navigation.
 *
 * The patient-facing navigation lives in `config/patientNavigation.ts`. These
 * technical screens are intentionally kept out of the patient journey and are
 * only reachable from Research Mode.
 */
export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Research',
    items: [
      {
        to: '/research',
        label: 'Research Overview',
        icon: LayoutDashboard,
        description: 'Project status and evaluation summary',
      },
      {
        to: '/research/models',
        label: 'Model Performance',
        icon: BrainCircuit,
        description: 'Model comparison and confusion matrices',
      },
      {
        to: '/research/explainable-ai',
        label: 'XAI / SHAP',
        icon: Activity,
        description: 'Technical attribution outputs',
      },
      {
        to: '/research/datasets',
        label: 'Dataset Information',
        icon: Database,
        description: 'Dataset metadata and distributions',
      },
      {
        to: '/research/model-insights',
        label: 'Model Training',
        icon: BarChart3,
        description: 'Training pipeline and evaluation detail',
      },
      {
        to: '/research/reports',
        label: 'Research Logs',
        icon: FileText,
        description: 'Stored technical analysis records',
      },
      {
        to: '/research/assessment',
        label: 'Technical Assessment',
        icon: Stethoscope,
        description: 'Raw feature-level screening input form',
      },
      {
        to: '/research/about',
        label: 'About Project',
        icon: Info,
        description: 'Architecture, scope and limitations',
      },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = {
  to: '/research',
  label: 'Back to Patient App',
  icon: Home,
  description: 'Return to the patient experience',
}

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  SETTINGS_ITEM,
]

/** Compact labels for the research mobile bottom bar. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_GROUPS[0].items[0],
  NAV_GROUPS[0].items[1],
  NAV_GROUPS[0].items[2],
  NAV_GROUPS[0].items[4],
  NAV_GROUPS[0].items[7],
]

export const CLINICAL_BADGES = [{ label: 'Research mode', icon: ShieldCheck }]

