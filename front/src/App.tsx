import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { AccountGate } from './components/AccountGate'
import { Header } from './components/Header'
import { Toaster } from '@/components/ui/sonner'
import { AuthPage } from './pages/AuthPage'
import { CaseDetailPage } from './pages/CaseDetailPage'
import { CasesPage } from './pages/CasesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TermsPage } from './pages/TermsPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <AccountGate />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/:slug" element={<CaseDetailPage />} />
            <Route path="login" element={<AuthPage mode="login" />} />
            <Route path="register" element={<AuthPage mode="register" />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            {/* Chemins fixés par les liens envoyés par mail (APP_URL = URL du front) */}
            <Route path="auth/verify" element={<VerifyEmailPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
