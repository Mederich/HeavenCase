import { BrowserRouter, Outlet, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { Header } from './components/Header'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
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
            <Route path="connexion" element={<AuthPage mode="login" />} />
            <Route path="inscription" element={<AuthPage mode="register" />} />
            {/* Chemin fixé par le lien envoyé par mail (APP_URL = URL du front) */}
            <Route path="auth/verify" element={<VerifyEmailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
