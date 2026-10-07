import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PatientShell } from '@/components/patient/PatientShell'
import { AppProvider, useApp } from '@/store/AppProvider'
import { HealthProvider } from '@/store/HealthProvider'
import { ToastProvider } from '@/components/ui/Toast'
import {
  ServiceConnectingScreen,
  ServiceOfflineScreen,
} from '@/components/system/ServiceStatusScreen'

/* Patient experience */
import { HomePage } from '@/pages/patient/HomePage'
import { MyRiskPage } from '@/pages/patient/MyRiskPage'
import { AssessmentWizardPage } from '@/pages/patient/AssessmentWizardPage'
import { MyLungHealthPage } from '@/pages/patient/MyLungHealthPage'
import { CtScanPage } from '@/pages/patient/CtScanPage'
import { MyHealthyStepsPage } from '@/pages/patient/MyHealthyStepsPage'
import { MyCarePage } from '@/pages/patient/MyCarePage'
import { UnderstandResultPage } from '@/pages/patient/UnderstandResultPage'
import { ReadMyReportPage } from '@/pages/patient/ReadMyReportPage'
import { AskAboutLungCancerPage } from '@/pages/patient/AskAboutLungCancerPage'
import { MyHealthReportPage } from '@/pages/patient/MyHealthReportPage'
import { DoctorQuestionsPage } from '@/pages/patient/DoctorQuestionsPage'
import { HealthInformationPage } from '@/pages/patient/HealthInformationPage'
import { PatientNotFoundPage } from '@/pages/patient/PatientNotFoundPage'

/* Research mode — the original technical screens, preserved unchanged */
import { DashboardPage } from '@/pages/DashboardPage'
import { PatientAssessmentPage } from '@/pages/PatientAssessmentPage'
import { CtAnalysisPage } from '@/pages/CtAnalysisPage'
import { ModelsPage } from '@/pages/ModelsPage'
import { ExplainableAiPage } from '@/pages/ExplainableAiPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { DatasetsPage } from '@/pages/DatasetsPage'
import { ModelInsightsPage } from '@/pages/ModelInsightsPage'
import { AboutPage } from '@/pages/AboutPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <HealthProvider>
          <ServiceGate />
        </HealthProvider>
      </AppProvider>
    </ToastProvider>
  )
}

/**
 * Live-only gate.
 *
 * The application requires a reachable ML service with trained artifacts. While
 * the first check runs we show a connecting screen; if the service is not
 * available we show the offline screen with instructions and a retry, rather
 * than rendering a product that cannot produce real results.
 */
function ServiceGate() {
  const { mode, isResolving, hasCompletedFirstCheck } = useApp()

  if (!hasCompletedFirstCheck || isResolving) return <ServiceConnectingScreen />
  if (mode === 'offline') return <ServiceOfflineScreen />

  return (
    <Routes>
      {/* ---------------------------------------- patient experience */}
      <Route element={<PatientShell />}>
        <Route index element={<HomePage />} />
        <Route path="my-risk" element={<MyRiskPage />} />
        <Route path="assessment" element={<AssessmentWizardPage />} />
        <Route path="my-lung-health" element={<MyLungHealthPage />} />
        <Route path="ct-scan" element={<CtScanPage />} />
        <Route path="my-healthy-steps" element={<MyHealthyStepsPage />} />
        <Route path="my-care" element={<MyCarePage />} />
        <Route path="understand-my-result" element={<UnderstandResultPage />} />
        <Route path="read-my-report" element={<ReadMyReportPage />} />
        <Route path="ask-about-lung-cancer" element={<AskAboutLungCancerPage />} />
        <Route path="my-health-report" element={<MyHealthReportPage />} />
        <Route path="questions-for-my-doctor" element={<DoctorQuestionsPage />} />
        <Route path="lung-health-information" element={<HealthInformationPage />} />
        <Route path="not-found" element={<PatientNotFoundPage />} />
      </Route>

      {/* --------------------------------------------- research mode */}
      <Route path="research" element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="explainable-ai" element={<ExplainableAiPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="model-insights" element={<ModelInsightsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:reportId" element={<ReportDetailPage />} />
        <Route path="assessment" element={<PatientAssessmentPage />} />
        <Route path="ct-analysis" element={<CtAnalysisPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* --------------------------------- legacy deep links & 404 */}
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  )
}
