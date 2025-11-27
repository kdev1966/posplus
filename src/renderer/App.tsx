import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useSessionStore } from './store/sessionStore'
import { useThemeStore } from './store/themeStore'
import { useLicenseStore } from './store/licenseStore'
import { ToastContainer } from './components/ui/ToastContainer'
import { PrintPreviewModal } from './components/print/PrintPreviewModal'

// Pages
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { POS } from './pages/POS'
import { Products } from './pages/Products'
import { Categories } from './pages/Categories'
import { Stock } from './pages/Stock'
import { History } from './pages/History'
import { Users } from './pages/Users'
import { Settings } from './pages/Settings'
import { CustomerDisplay } from './pages/CustomerDisplay'
import { Activation } from './pages/Activation'

// Route protégée par licence
const LicensedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isChecked, isLicensed, isLoading } = useLicenseStore()

  if (!isChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="spinner mb-4" />
          <p className="text-gray-400">Vérification de la licence...</p>
        </div>
      </div>
    )
  }

  if (!isLicensed) {
    return <Navigate to="/activation" replace />
  }

  return <>{children}</>
}

// Route protégée par authentification (et licence)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { isChecked, isLicensed, isLoading: licenseLoading } = useLicenseStore()

  if (!isChecked || licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="spinner mb-4" />
          <p className="text-gray-400">Vérification de la licence...</p>
        </div>
      </div>
    )
  }

  if (!isLicensed) {
    return <Navigate to="/activation" replace />
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore()
  const { fetchCurrentSession } = useSessionStore()
  const { resolvedTheme } = useThemeStore()
  const { checkLicense, isChecked } = useLicenseStore()

  // Initialize theme on app load
  useEffect(() => {
    // Apply theme class to html element
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    root.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  // Vérifier la licence au démarrage
  useEffect(() => {
    checkLicense()
  }, [])

  // Vérifier l'authentification après la licence
  useEffect(() => {
    if (isChecked) {
      checkAuth().then(() => {
        fetchCurrentSession()
      })
    }
  }, [isChecked])

  return (
    <>
      <HashRouter>
        <Routes>
          {/* Route d'activation (accessible sans licence) */}
          <Route path="/activation" element={<Activation />} />

          {/* Route de login (nécessite une licence) */}
          <Route
            path="/login"
            element={
              <LicensedRoute>
                <Login />
              </LicensedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <POS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/customer" element={<CustomerDisplay />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
      <ToastContainer />
      <PrintPreviewModal />
    </>
  )
}
