import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLE = {
    "Pending": { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
    "In Progress": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    "Resolved": { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
};

// ── Donut Chart ──
function DonutChart({ segments, size = 130 }) {
    const total = segments.reduce((s, i) => s + i.value, 0);
    if (total === 0) return (
        <div className="flex items-center justify-center h-32 text-xs text-slate-400">No data yet</div>
    );
    const r = 44, cx = 60, cy = 60, sw = 14, circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="flex items-center gap-6">
            <svg width={size} height={size} viewBox="0 0 120 120">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
                {segments.map((s, i) => {
                    if (!s.value) return null;
                    const dash = (s.value / total) * circ;
                    const el = (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                            stroke={s.color} strokeWidth={sw}
                            strokeDasharray={`${dash} ${circ - dash}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="butt"
                            style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
                        />
                    );
                    offset += dash;
                    return el;
                })}
                <text x={cx} y={cy - 5} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">total</text>
            </svg>
            <div className="space-y-2.5">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                        <span className="text-xs text-slate-500">{s.label}</span>
                        <span className="text-xs font-bold text-slate-900 ml-auto pl-4">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();


    const [activeTab, setActiveTab] = useState("dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [savingPass, setSavingPass] = useState(false);
    const [showPasses, setShowPasses] = useState({ current: false, new: false, confirm: false });
    const [passMsg, setPassMsg] = useState({ text: "", type: "" });

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchComplaints(); }, []);

    const fetchComplaints = async () => {
        setLoadingData(true);
        try {
            const { data } = await axios.get("/api/complaints/my", { headers });
            setComplaints(data.complaints || []);
        } catch { }
        finally { setLoadingData(false); }
    };

    const handleChangePassword = async () => {
        if (!currentPass || !newPass || !confirmPass) {
            setPassMsg({ text: "Please fill in all fields.", type: "error" }); return;
        }
        if (newPass !== confirmPass) {
            setPassMsg({ text: "New passwords do not match.", type: "error" }); return;
        }
        if (newPass.length < 6) {
            setPassMsg({ text: "Password must be at least 6 characters.", type: "error" }); return;
        }
        setSavingPass(true);
        try {
            await axios.post("/api/auth/update-password",
                { currentPassword: currentPass, newPassword: newPass }, { headers });
            setPassMsg({ text: "Password updated successfully!", type: "success" });
            setCurrentPass(""); setNewPass(""); setConfirmPass("");
        } catch (err) {
            setPassMsg({ text: err.response?.data?.message || "Failed to update password.", type: "error" });
        } finally {
            setSavingPass(false);
            setTimeout(() => setPassMsg({ text: "", type: "" }), 3000);
        }
    };

    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === "Pending").length,
        inProgress: complaints.filter(c => c.status === "In Progress").length,
        resolved: complaints.filter(c => c.status === "Resolved").length,
    };

    const NAV = [
        { icon: "🏠", label: "Dashboard", key: "dashboard", action: () => setActiveTab("dashboard") },
        { icon: "📋", label: "My Complaints", key: "complaints", action: () => setActiveTab("complaints") },
        { icon: "🔍", label: "Lost & Found", key: "lostfound", action: () => navigate("/student/lost-and-found") },
        { icon: "📊", label: "Analytics", key: "analytics", action: () => setActiveTab("analytics") },
        { icon: "👤", label: "Profile", key: "profile", action: () => setActiveTab("profile") },
    ];

    const EyeIcon = ({ show }) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {!show
                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
            }
        </svg>
    );

    // Analytics data
    const donutSegments = [
        { label: "Pending", value: stats.pending, color: "#eab308" },
        { label: "In Progress", value: stats.inProgress, color: "#3b82f6" },
        { label: "Resolved", value: stats.resolved, color: "#10b981" },
    ];

    const resolutionRate = stats.total > 0
        ? Math.round((stats.resolved / stats.total) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── Sidebar ── */}
            {/* ── Mobile Backdrop ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }}
                    onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Sidebar (mobile: fixed slide-in | desktop: static) ── */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 shrink-0 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", minHeight: "100vh" }}>

                <div className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-white font-semibold text-sm tracking-tight">CampusDesk</span>
                            <div className="text-xs" style={{ color: "#10b981" }}>Student Panel</div>
                        </div>
                    </div>
                    <button className="lg:hidden text-slate-400 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map(item => {
                        const isActive = activeTab === item.key;
                        return (
                            <button key={item.key} onClick={item.action}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                                style={{
                                    background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                                    color: isActive ? "#a5b4fc" : "#64748b",
                                    border: isActive ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
                                }}>
                                <span>{item.icon}</span>
                                <span className="flex-1">{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#ef4444", color: "white", minWidth: 18, textAlign: "center" }}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                            {user?.name?.[0]?.toUpperCase() || "S"}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{user?.name || "Student"}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email || ""}</div>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 overflow-auto">

                <div className="h-16 flex items-center justify-between px-6"
                    style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                            style={{ background: "#f1f5f9" }} onClick={() => setSidebarOpen(true)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">
                                {activeTab === "dashboard" ? "Student Dashboard"
                                    : activeTab === "complaints" ? "My Complaints"
                                        : activeTab === "analytics" ? "My Analytics"
                                            : "Profile"}
                            </h1>
                            <p className="text-xs text-slate-400">Welcome back, {user?.name?.split(" ")[0] || "Student"} 👋</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                            style={{ background: "#ecfdf5", color: "#10b981", border: "1px solid #a7f3d0" }}>
                            🎓 Student
                        </div>
                        {/* Hidden on mobile — student can use the Submit a Complaint card */}
                        <button onClick={() => navigate("/student/create-complaint")}
                            className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 15px rgba(99,102,241,0.3)" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            New Complaint
                        </button>
                    </div>
                </div>

                <div className="px-6 py-8">

                    {/* ── DASHBOARD TAB ── */}
                    {activeTab === "dashboard" && (
                        <div className="max-w-5xl">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Total", value: stats.total, color: "#6366f1", bg: "#eef2ff", icon: "📊" },
                                    { label: "Pending", value: stats.pending, color: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
                                    { label: "In Progress", value: stats.inProgress, color: "#3b82f6", bg: "#eff6ff", icon: "🔧" },
                                    { label: "Resolved", value: stats.resolved, color: "#10b981", bg: "#ecfdf5", icon: "✅" },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-5"
                                        style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xl">{s.icon}</span>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                                                <div className="w-2 h-2 rounded-full" style={{ background: s.color }}></div>
                                            </div>
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
                                        <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <button onClick={() => navigate("/student/create-complaint")}
                                    className="group flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:shadow-md"
                                    style={{ background: "white", border: "1.5px solid #e2e8f0" }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                                        style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe" }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 mb-0.5">Submit a Complaint</div>
                                        <div className="text-xs text-slate-500">Report an issue to the college admin</div>
                                    </div>
                                    <svg className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>

                                <button onClick={() => setActiveTab("complaints")}
                                    className="group flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:shadow-md"
                                    style={{ background: "white", border: "1.5px solid #e2e8f0" }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                                        style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0" }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                            <path d="M9 11l3 3L22 4" />
                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 mb-0.5">Track My Complaints</div>
                                        <div className="text-xs text-slate-500">{stats.total} total · {stats.pending} pending</div>
                                    </div>
                                    <svg className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>

                            {complaints.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-bold text-slate-900">Recent Complaints</h2>
                                        <button onClick={() => setActiveTab("complaints")}
                                            className="text-xs font-medium" style={{ color: "#6366f1" }}>
                                            View all →
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {complaints.slice(0, 3).map(c => {
                                            const s = STATUS_STYLE[c.status] || STATUS_STYLE["Pending"];
                                            return (
                                                <div key={c._id} className="flex items-center gap-3 p-4 rounded-2xl"
                                                    style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }}></div>
                                                    <span className="text-sm font-medium text-slate-800 flex-1 truncate">{c.title}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                                                        style={{ background: s.bg, color: s.color }}>{c.status}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── COMPLAINTS TAB ── */}
                    {activeTab === "complaints" && (
                        <div className="max-w-4xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-bold text-slate-900">My Complaints</h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{complaints.length} total</span>
                                    <button onClick={fetchComplaints}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                                        style={{ background: "white", border: "1.5px solid #e2e8f0", color: "#64748b" }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="23 4 23 10 17 10" />
                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                        </svg>
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {loadingData ? (
                                <div className="flex items-center justify-center py-16">
                                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                                    style={{ background: "white", border: "1px dashed #e2e8f0" }}>
                                    <span className="text-4xl mb-3">📭</span>
                                    <p className="text-sm font-medium text-slate-600 mb-1">No complaints yet</p>
                                    <p className="text-xs text-slate-400 mb-4">Submit your first complaint to get started</p>
                                    <button onClick={() => navigate("/student/create-complaint")}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                                        Submit Complaint
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {complaints.map(c => {
                                        const s = STATUS_STYLE[c.status] || STATUS_STYLE["Pending"];
                                        return (
                                            <div key={c._id} className="flex items-start gap-4 p-4 rounded-2xl"
                                                style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                                                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                                    📋
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-sm font-semibold text-slate-900 truncate">{c.title}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                                                            style={{ background: s.bg, color: s.color }}>
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: s.dot }}></span>
                                                            {c.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate mb-1">{c.description}</p>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <span className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{ background: "#f1f5f9", color: "#64748b" }}>
                                                            📍 {c.location}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ANALYTICS TAB ── */}
                    {activeTab === "analytics" && (
                        <div className="max-w-3xl mx-auto space-y-6">

                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: "Total Submitted", value: stats.total, color: "#6366f1", bg: "#eef2ff" },
                                    { label: "Resolution Rate", value: `${resolutionRate}%`, color: "#10b981", bg: "#ecfdf5" },
                                    { label: "Still Open", value: stats.pending + stats.inProgress, color: "#f59e0b", bg: "#fffbeb" },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-5 text-center"
                                        style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                                        <div className="text-xs text-slate-500">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Donut chart */}
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <h3 className="text-sm font-bold text-slate-900 mb-5">Complaint Breakdown</h3>
                                <DonutChart segments={donutSegments} />
                            </div>

                            {/* Progress bars */}
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <h3 className="text-sm font-bold text-slate-900 mb-5">Status Breakdown</h3>
                                {stats.total === 0 ? (
                                    <p className="text-xs text-slate-400">No complaints submitted yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {[
                                            { label: "Pending", value: stats.pending, color: "#eab308", bg: "#fef9c3" },
                                            { label: "In Progress", value: stats.inProgress, color: "#3b82f6", bg: "#dbeafe" },
                                            { label: "Resolved", value: stats.resolved, color: "#10b981", bg: "#dcfce7" },
                                        ].map(s => (
                                            <div key={s.label}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs font-medium text-slate-600">{s.label}</span>
                                                    <span className="text-xs font-bold text-slate-900">{s.value} <span className="font-normal text-slate-400">/ {stats.total}</span></span>
                                                </div>
                                                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f1f5f9" }}>
                                                    <div className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${stats.total > 0 ? (s.value / stats.total) * 100 : 0}%`,
                                                            background: s.color,
                                                        }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── PROFILE TAB ── */}
                    {activeTab === "profile" && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                                        {user?.name?.[0]?.toUpperCase() || "S"}
                                    </div>
                                    <div>
                                        <div className="text-base font-bold text-slate-900">{user?.name}</div>
                                        <div className="text-sm text-slate-500">{user?.email}</div>
                                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                            style={{ background: "#ecfdf5", color: "#10b981", border: "1px solid #a7f3d0" }}>
                                            🎓 Student
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: "Total Complaints", value: stats.total },
                                        { label: "Pending", value: stats.pending },
                                        { label: "In Progress", value: stats.inProgress },
                                        { label: "Resolved", value: stats.resolved },
                                    ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between py-2"
                                            style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <span className="text-xs text-slate-500">{r.label}</span>
                                            <span className="text-sm font-bold text-slate-900">{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                                        <p className="text-xs text-slate-400">Update your account password</p>
                                    </div>
                                </div>

                                {passMsg.text && (
                                    <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium"
                                        style={{
                                            background: passMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                                            color: passMsg.type === "success" ? "#166534" : "#dc2626",
                                            border: `1px solid ${passMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                                        }}>
                                        {passMsg.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {[
                                        { label: "Current Password", val: currentPass, set: setCurrentPass, key: "current" },
                                        { label: "New Password", val: newPass, set: setNewPass, key: "new" },
                                        { label: "Confirm Password", val: confirmPass, set: setConfirmPass, key: "confirm" },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{f.label}</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasses[f.key] ? "text" : "password"}
                                                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                                                    value={f.val}
                                                    onChange={e => f.set(e.target.value)}
                                                    className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm text-slate-900 outline-none"
                                                    style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                                                    onFocus={e => e.target.style.borderColor = "#6366f1"}
                                                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                                                />
                                                <button type="button"
                                                    onClick={() => setShowPasses(p => ({ ...p, [f.key]: !p[f.key] }))}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    <EyeIcon show={showPasses[f.key]} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={handleChangePassword} disabled={savingPass}
                                    className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{
                                        background: savingPass ? "#fca5a5" : "linear-gradient(135deg, #ef4444, #dc2626)",
                                        boxShadow: savingPass ? "none" : "0 4px 12px rgba(239,68,68,0.3)",
                                        cursor: savingPass ? "not-allowed" : "pointer",
                                    }}>
                                    {savingPass ? "Updating..." : "Change Password"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}