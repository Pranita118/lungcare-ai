import {
  BookOpen,
  Brain,
  CalendarHeart,
  ClipboardList,
  FileSearch,
  FileText,
  HeartPulse,
  HelpCircle,
  Home,
  MessageCircleQuestion,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'

/**
 * Navigation is split in two.
 *
 * PATIENT MODE is the default and contains only things a person can act on.
 * RESEARCH MODE holds the original technical ML screens — they are kept intact
 * for project evaluation and demonstration, but they are never part of the
 * normal patient journey.
 */

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
  description: string
}

export const PATIENT_NAV: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    shortLabel: 'Home',
    icon: Home,
    description: 'Your lung health overview',
  },
  {
    to: '/my-risk',
    label: 'My Risk',
    shortLabel: 'My Risk',
    icon: Stethoscope,
    description: 'Your AI-assisted screening result',
  },
  {
    to: '/my-lung-health',
    label: 'My Lung Health',
    shortLabel: 'Lung Health',
    icon: HeartPulse,
    description: 'Track how you have been feeling',
  },
  {
    to: '/ct-scan',
    label: 'CT Scan',
    shortLabel: 'CT Scan',
    icon: ScanLine,
    description: 'AI-assisted analysis of a CT image',
  },
  {
    to: '/my-healthy-steps',
    label: 'My Healthy Steps',
    shortLabel: 'Steps',
    icon: ClipboardList,
    description: 'Small daily steps for your lung health',
  },
  {
    to: '/my-care',
    label: 'My Care',
    shortLabel: 'My Care',
    icon: CalendarHeart,
    description: 'Appointments and reminders',
  },
  {
    to: '/understand-my-result',
    label: 'Understand My Result',
    shortLabel: 'Understand',
    icon: Brain,
    description: 'What your result means in plain language',
  },
  {
    to: '/read-my-report',
    label: 'Read My Report',
    shortLabel: 'Read Report',
    icon: FileSearch,
    description: 'Understand the words in a scan or test report',
  },
  {
    to: '/ask-about-lung-cancer',
    label: 'Ask About Lung Cancer',
    shortLabel: 'Ask',
    icon: MessageCircleQuestion,
    description: 'Ask a question and get a plain-language answer',
  },
  {
    to: '/my-health-report',
    label: 'My Health Report',
    shortLabel: 'Report',
    icon: FileText,
    description: 'Download your health report',
  },
  {
    to: '/questions-for-my-doctor',
    label: 'Questions for My Doctor',
    shortLabel: 'Questions',
    icon: HelpCircle,
    description: 'Questions to raise at your appointment',
  },
  {
    to: '/lung-health-information',
    label: 'Lung Health Information',
    shortLabel: 'Information',
    icon: BookOpen,
    description: 'Trusted, plain-language information',
  },
]

/** Five highest-traffic destinations for the mobile bottom bar. */
export const MOBILE_NAV: NavItem[] = [
  PATIENT_NAV[0],
  PATIENT_NAV[1],
  PATIENT_NAV[2],
  PATIENT_NAV[4],
  PATIENT_NAV[6],
]

/**
 * The original technical screens. Preserved unchanged, relabelled as research,
 * and kept entirely outside the patient navigation.
 */
export const RESEARCH_NAV: NavItem[] = [
  {
    to: '/research',
    label: 'Research Overview',
    shortLabel: 'Overview',
    icon: ShieldCheck,
    description: 'Project status and evaluation summary',
  },
  {
    to: '/research/models',
    label: 'Model Performance',
    shortLabel: 'Models',
    icon: Stethoscope,
    description: 'Model comparison and confusion matrices',
  },
  {
    to: '/research/explainable-ai',
    label: 'XAI / SHAP',
    shortLabel: 'XAI',
    icon: Brain,
    description: 'Technical attribution outputs',
  },
  {
    to: '/research/datasets',
    label: 'Dataset Information',
    shortLabel: 'Datasets',
    icon: BookOpen,
    description: 'Dataset metadata and distributions',
  },
  {
    to: '/research/model-insights',
    label: 'Model Training',
    shortLabel: 'Training',
    icon: ClipboardList,
    description: 'Training pipeline and evaluation detail',
  },
  {
    to: '/research/reports',
    label: 'Research Logs',
    shortLabel: 'Logs',
    icon: FileText,
    description: 'Technical analysis records',
  },
  {
    to: '/research/assessment',
    label: 'Technical Assessment Form',
    shortLabel: 'Tech Form',
    icon: FileText,
    description: 'Raw feature-level screening input',
  },
  {
    to: '/research/about',
    label: 'About Project',
    shortLabel: 'About',
    icon: ShieldCheck,
    description: 'Project architecture and scope',
  },
]

export const RESEARCH_ROOT = '/research'
