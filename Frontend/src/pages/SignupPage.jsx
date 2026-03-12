import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLES = [
    { value: "student", label: "Student", icon: "🎓", desc: "No secret key needed", color: "#10b981" },
    { value: "staff", label: "Staff", icon: "👔", desc: "Requires staff key", color: "#f59e0b" },
    { value: "admin", label: "Admin", icon: "🛡️", desc: "Requires admin key", color: "#6366f1" },
];

export default function SignupPage() {
    const { signup } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState("student");
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", secretKey: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    const needsKey = role === "staff" || role === "admin";
    const selectedRole = ROLES.find(r => r.value === role);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRoleChange = (val) => {
        setRole(val);
        setError("");
        setSuccess("");
        setForm({ name: "", email: "", password: "", confirmPassword: "", secretKey: "" });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
        if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (needsKey && !form.secretKey.trim()) { setError("Secret key is required for this role."); return; }

        setLoading(true);
        try {
            const payload = { name: form.name, email: form.email, password: form.password, role };
            if (needsKey) payload.secretKey = form.secretKey;

            await signup(payload);

            setSuccess("Account created successfully! Redirecting to login...");
            setLoading(true);

            setTimeout(() => navigate("/login"), 1500);
        } catch (err) {
            setError(err.response?.data?.message || "Signup failed. Please check your details.");
        } finally {
            setLoading(false);
        }
    };

    const EyeIcon = ({ open }) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open
                ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
            }
        </svg>
    );

    return (
        <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── Left dark sidebar ── */}
            <div className="hidden lg:flex flex-col justify-between w-2/5 px-12 py-16"
                style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)" }}>

                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-lg tracking-tight">CampusDesk</span>
                </div>

                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                        style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                        Create your account
                    </div>

                    <h2 className="text-3xl font-bold text-white leading-snug mb-4">
                        Choose your role,<br />
                        <span style={{ background: "linear-gradient(90deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            own your access
                        </span>
                    </h2>
                    <p className="text-sm leading-relaxed mb-8" style={{ color: "#94a3b8" }}>
                        Select your role during signup. Staff and Admin accounts require a secret key provided by your college administrator.
                    </p>

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
                                    <div className="text-xs" style={{ color: "#64748b" }}>{r.desc}</div>
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
                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="font-semibold text-slate-800">CampusDesk</span>
                    </div>

                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
                        <p className="text-sm text-slate-500">Select your role and fill in your details</p>
                    </div>

                    {/* ── Role selector ── */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
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

                    {/* Success message */}
                    {success && (
                        <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", color: "#065f46" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            {success}
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
                            <input type="text" name="name" value={form.name} onChange={handleChange} required
                                placeholder="Your full name"
                                className="w-full px-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                style={{ background: "white", border: "1.5px solid #e2e8f0" }}
                                onFocus={e => e.target.style.borderColor = selectedRole.color}
                                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                            />
                        </div>

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
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required
                                    placeholder="Min. 6 characters"
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                            <div className="relative">
                                <input type={showConfirmPass ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required
                                    placeholder="Re-enter password"
                                    className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                    style={{ background: "white", border: "1.5px solid #e2e8f0" }}
                                    onFocus={e => e.target.style.borderColor = selectedRole.color}
                                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                />
                                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <EyeIcon open={showConfirmPass} />
                                </button>
                            </div>
                        </div>

                        {/* Secret Key — only for staff / admin */}
                        {needsKey && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Secret key
                                    <span className="ml-2 text-xs font-normal text-slate-400">(required for {role})</span>
                                </label>
                                <div className="relative">
                                    <input type={showSecret ? "text" : "password"} name="secretKey" value={form.secretKey} onChange={handleChange} required
                                        placeholder={`Enter ${role} secret key`}
                                        className="w-full px-4 py-3 pr-10 rounded-xl text-sm text-slate-900 outline-none transition-all"
                                        style={{ background: "white", border: `1.5px solid ${selectedRole.color}55` }}
                                        onFocus={e => e.target.style.borderColor = selectedRole.color}
                                        onBlur={e => e.target.style.borderColor = `${selectedRole.color}55`}
                                    />
                                    <button type="button" onClick={() => setShowSecret(!showSecret)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <EyeIcon open={showSecret} />
                                    </button>
                                </div>
                                <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    Get this key from your college administrator
                                </p>
                            </div>
                        )}

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
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : `Sign up as ${selectedRole.label}`}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Already have an account?{" "}
                        <Link to="/login" className="font-semibold" style={{ color: selectedRole.color }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}