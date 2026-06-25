import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Loader2 } from 'lucide-react';

const Login       = lazy(() => import('./pages/Login'));
const AcceptInvite= lazy(() => import('./pages/AcceptInvite'));
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Contacts    = lazy(() => import('./pages/Contacts'));
const Companies   = lazy(() => import('./pages/Companies'));
const Pipeline    = lazy(() => import('./pages/Pipeline'));
const Tickets     = lazy(() => import('./pages/Tickets'));
const Reminders   = lazy(() => import('./pages/Reminders'));
const Automations = lazy(() => import('./pages/Automations'));
const Analytics   = lazy(() => import('./pages/Analytics'));
const AiHub       = lazy(() => import('./pages/AiHub'));
const Team        = lazy(() => import('./pages/Team'));
const Integrations= lazy(() => import('./pages/Integrations'));
const AuditLog    = lazy(() => import('./pages/AuditLog'));
const Settings    = lazy(() => import('./pages/Settings'));
const Contracts   = lazy(() => import('./pages/Contracts'));
const Deadlines   = lazy(() => import('./pages/Deadlines'));
const Invoices    = lazy(() => import('./pages/Invoices'));
const Documents   = lazy(() => import('./pages/Documents'));
const Marketing   = lazy(() => import('./pages/Marketing'));
const FormDemoPage= lazy(() => import('./pages/FormDemoPage'));
const PublicLandingPage = lazy(() => import('./pages/PublicLandingPage'));
const QuantumInbox = lazy(() => import('./pages/QuantumInbox'));
const Tasks       = lazy(() => import('./pages/Tasks'));
const PublicDocumentGate = lazy(() => import('./pages/PublicDocumentGate'));
const PublicBooking = lazy(() => import('./pages/PublicBooking'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const PublicConsent = lazy(() => import('./pages/PublicConsent'));
const LeadScoring = lazy(() => import('./pages/LeadScoring'));
const Sequences   = lazy(() => import('./pages/Sequences'));
const Quotes      = lazy(() => import('./pages/Quotes'));
const Forecast    = lazy(() => import('./pages/Forecast'));
const Broadcast   = lazy(() => import('./pages/Broadcast'));
const Social      = lazy(() => import('./pages/Social'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[40vh]">
      <Loader2 className="animate-spin text-brand-500" size={28} />
    </div>
  );
}

const page = (El: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}><El /></Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={page(Login)} />
        <Route path="/invite/:token" element={page(AcceptInvite)} />
        <Route path="/form-demo/:id" element={page(FormDemoPage)} />
        <Route path="/landing/:slug" element={page(PublicLandingPage)} />
        <Route path="/document/:id" element={page(PublicDocumentGate)} />
        <Route path="/book/:memberId" element={page(PublicBooking)} />
        <Route path="/privacy" element={page(PrivacyPolicy)} />
        <Route path="/consent/:token" element={page(PublicConsent)} />
        <Route path="/book/team/:teamId" element={page(PublicBooking)} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={page(Dashboard)} />
            <Route path="contacts" element={page(Contacts)} />
            <Route path="companies" element={page(Companies)} />
            <Route path="pipeline" element={page(Pipeline)} />
            <Route path="tickets" element={page(Tickets)} />
            <Route path="inbox" element={page(QuantumInbox)} />
            <Route path="tasks" element={page(Tasks)} />
            <Route path="reminders" element={page(Reminders)} />
            <Route path="automations" element={page(Automations)} />
            <Route path="analytics" element={page(Analytics)} />
            <Route path="ai" element={page(AiHub)} />
            <Route path="team" element={page(Team)} />
            <Route path="integrations" element={page(Integrations)} />
            <Route path="contracts" element={page(Contracts)} />
            <Route path="marketing" element={page(Marketing)} />
            <Route path="broadcast" element={page(Broadcast)} />
            <Route path="social" element={page(Social)} />
            <Route path="deadlines" element={page(Deadlines)} />
            <Route path="invoices" element={page(Invoices)} />
            <Route path="quotes" element={page(Quotes)} />
            <Route path="documents" element={page(Documents)} />
            <Route path="audit" element={page(AuditLog)} />
            <Route path="settings" element={page(Settings)} />
            <Route path="forecast" element={page(Forecast)} />
            <Route path="lead-scoring" element={page(LeadScoring)} />
            <Route path="sequences" element={page(Sequences)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
