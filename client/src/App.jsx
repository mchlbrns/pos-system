import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import TransactionsPage from './pages/TransactionsPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const user = useStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
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
        <Route path="pos" element={<POSPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
