/**
 * App Component
 * Main router with protected routes and layout
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import TransactionsPage from './pages/TransactionsPage';
import InventoryPage from './pages/InventoryPage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';

/** Protected route wrapper */
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  
  console.log('ProtectedRoute Check:', { user: !!user, loading, isAdmin, adminOnly, path: window.location.pathname });

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!user) {
    console.log('No user in ProtectedRoute, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    console.log('Not admin in ProtectedRoute, redirecting to /');
    return <Navigate to="/" replace />;
  }

  return children;
}

/** Main layout with sidebar */
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading" style={{ height: '100vh' }}><div className="spinner" /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/clients" element={
        <ProtectedRoute>
          <AppLayout><ClientsPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/transactions" element={
        <ProtectedRoute>
          <AppLayout><TransactionsPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory" element={
        <ProtectedRoute>
          <AppLayout><InventoryPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/payments" element={
        <ProtectedRoute>
          <AppLayout><PaymentsPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <AppLayout><ReportsPage /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute adminOnly>
          <AppLayout><UsersPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
