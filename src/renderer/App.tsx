import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import LoginPage from './pages/LoginPage/LoginPage';
import POSScreen from './pages/POSScreen/POSScreen';
import ProductsPage from './pages/ProductsPage/ProductsPage';
import ReportsPage from './pages/ReportsPage/ReportsPage';
import UsersPage from './pages/UsersPage/UsersPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import Layout from './components/layout/Layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/pos" replace />} />
              <Route path="pos" element={<POSScreen />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
