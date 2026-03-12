import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student", icon: "🎓", color: "#10b981" },
  { value: "staff",   label: "Staff",   icon: "👔", color: "#f59e0b" },
  { value: "admin",   label: "Admin",   icon: "🛡️", color: "#6366f1" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const selectedRole = ROLES.find(r => r.value === role);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRoleChange = (val) => {
  setRole(val);
  setError("");
  setForm({ email: "", password: "" });
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password, role);
      const r = user.role;
      if (r === "admin") navigate("/admin/dashboard");
      else if (r === "staff") navigate("/staff/complaints");
      else navigate("/student/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
        : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
      }
    </svg>
  );

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Left dark sidebar ── */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 px-12 py-16"
        style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">CampusDesk</span>
        </div>

        {/* Center */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            College Management System
          </div>

          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            One platform for<br/>
            <span style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              every campus need
            </span>
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#94a3b8" }}>
            Submit complaints, track lost items, and manage campus issues — all in one unified dashboard.
          </p>

          {/* Role cards — highlight active */}
          <div className="space-y-3">
            {ROLES.map(r => (
              <div key={r.value} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: role === r.value ? `${r.color}18` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${role === r.value ? r.color + "55" : "rgba(255,255,255,0.07)"}`,
                }}>
                <span className="text-xl">{r.icon}</span>
                <div>
                  <div className="text-sm font-medium" style={{ color: role === r.value ? r.color : "#cbd5e1" }}>{r.label}</div>
                  <div className="text-xs" style={{ color: "#64748b" }}>
                    {r.value === "student" ? "Submit complaints & post items"
                      : r.value === "staff" ? "Manage assigned complaints"
                      : "Full system access"}
                  </div>
                </div>
                {role === r.value && (
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ background: r.color }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "#334155" }}>© 2025 CampusDesk. All rights reserved.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-semibold text-slate-800">CampusDesk</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-sm text-slate-500">Sign in to your campus account</p>
          </div>

          {/* ── Role selector (UI only) ── */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Signing in as...</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => handleRoleChange(r.value)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: role === r.value ? `${r.color}12` : "white",
                    border: `2px solid ${role === r.value ? r.color : "#e2e8f0"}`,
                    color: role === r.value ? r.color : "#64748b",
                    boxShadow: role === r.value ? `0 0 0 3px ${r.color}20` : "0 1px 2px rgba(0,0,0,0.04)",
                  }}>
                  <span className="text-lg">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                placeholder="you@college.edu"
                className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all"
                style={{ background: "white", border: "1.5px solid #e2e8f0" }}
                onFocus={e => e.target.style.borderColor = selectedRole.color}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium" style={{ color: selectedRole.color }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-slate-900 outline-none transition-all"
                  style={{ background: "white", border: "1.5px solid #e2e8f0" }}
                  onFocus={e => e.target.style.borderColor = selectedRole.color}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all mt-2"
              style={{
                background: loading ? "#a5b4fc" : `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)`,
                boxShadow: loading ? "none" : `0 4px 15px ${selectedRole.color}40`,
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Signing in...
                </span>
              ) : `Sign in as ${selectedRole.label}`}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold" style={{ color: selectedRole.color }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}