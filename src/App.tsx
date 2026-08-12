import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import ClientLayout from '@/components/layout/ClientLayout'
import InvestorLayout from '@/components/layout/InvestorLayout'
import RoleBasedRedirect from '@/components/layout/RoleBasedRedirect'
import InstallPrompt from '@/components/ui/InstallPrompt'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Companies from '@/pages/crm/Companies'
import MandatesList from '@/pages/mandates/MandatesList'
import MandateDetail from '@/pages/mandates/MandateDetail'
import DealPipeline from '@/pages/deals/DealPipeline'
import Investors from '@/pages/investors/Investors'
import DataRoom from '@/pages/dataroom/DataRoom'
import Users from '@/pages/admin/Users'
import Invoices from '@/pages/invoices/Invoices'
import FinancialAnalysis from '@/pages/financial/FinancialAnalysis'
import DueDiligence from '@/pages/duediligence/DueDiligence'
import RiskAssessment from '@/pages/risk/RiskAssessment'
import InvestmentMemos from '@/pages/memos/InvestmentMemos'

import ClientDashboard from '@/pages/client/ClientDashboard'
import ClientMandateDetail from '@/pages/client/ClientMandateDetail'
import ClientDocuments from '@/pages/client/ClientDocuments'
import ClientMessages from '@/pages/client/ClientMessages'
import SignatureRequests from '@/pages/signatures/SignatureRequests'
import SignPage from '@/pages/signatures/SignPage'
import AIAssistant from '@/pages/ai-assistant/AIAssistant'
import NoAccessYet from '@/pages/NoAccessYet'

import InvestorDashboard from '@/pages/investor-portal/InvestorDashboard'
import InvestorDealDetail from '@/pages/investor-portal/InvestorDealDetail'
import GroupDashboard from '@/pages/group/GroupDashboard'

const STAFF_ROLES = ['super_admin', 'partner', 'manager', 'analyst'] as const

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sign/:token" element={<SignPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/no-access" element={<NoAccessYet />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[...STAFF_ROLES]} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/mandates" element={<MandatesList />} />
              <Route path="/mandates/:id" element={<MandateDetail />} />
              <Route path="/deals" element={<DealPipeline />} />
              <Route path="/investors" element={<Investors />} />
              <Route path="/dataroom" element={<DataRoom />} />
              <Route path="/financial-analysis" element={<FinancialAnalysis />} />
              <Route path="/due-diligence" element={<DueDiligence />} />
              <Route path="/risk-assessment" element={<RiskAssessment />} />
              <Route path="/investment-memos" element={<InvestmentMemos />} />
              <Route path="/signatures" element={<SignatureRequests />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/group-dashboard" element={<GroupDashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['super_admin', 'partner', 'manager']} />}>
            <Route element={<AppLayout />}>
              <Route path="/invoices" element={<Invoices />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/users" element={<Users />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route element={<ClientLayout />}>
              <Route path="/client/dashboard" element={<ClientDashboard />} />
              <Route path="/client/mandates/:id" element={<ClientMandateDetail />} />
              <Route path="/client/documents" element={<ClientDocuments />} />
              <Route path="/client/messages" element={<ClientMessages />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['investor']} />}>
            <Route element={<InvestorLayout />}>
              <Route path="/investor/dashboard" element={<InvestorDashboard />} />
              <Route path="/investor/deals/:id" element={<InvestorDealDetail />} />
            </Route>
          </Route>

          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>

        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  )
}
