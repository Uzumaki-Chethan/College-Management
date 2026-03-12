import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import StudentDashboard from "./pages/StudentDashboard";
import CreateComplaintPage from "./pages/CreateComplaintPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import LostAndFoundPage from "./pages/LostAndFoundPage";
// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

// Placeholder pages (replace with real pages as you build them)
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">{title}</h1>
      <p className="text-sm text-slate-500">This page is coming in the next step.</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={loading ? null : user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <LoginPage />} />
      <Route path="/signup" element={loading ? null : user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <SignupPage />} />

      {/* Student */}
      <Route path="/student/dashboard" element={
        <ProtectedRoute allowedRoles={["student"]}>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/student/create-complaint" element={
        <ProtectedRoute allowedRoles={["student"]}>
          <CreateComplaintPage />
        </ProtectedRoute>
      } />

      <Route path="/student/lost-and-found" element={
        <ProtectedRoute allowedRoles={["student"]}>
          <LostAndFoundPage />
        </ProtectedRoute>
      } />

      <Route path="/staff/lost-and-found" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <LostAndFoundPage />
        </ProtectedRoute>
      } />

      <Route path="/staff/dashboard" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <StaffDashboard />
        </ProtectedRoute>
      } />
      {/* Admin */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      } />


      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}