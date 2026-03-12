import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLE = {
    "Pending":     { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
    "In Progress": { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
    "Resolved":    { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
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
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}/>
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
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">assigned</text>
            </svg>
            <div className="space-y-2.5">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }}/>
                        <span className="text-xs text-slate-500">{s.label}</span>
                        <span className="text-xs font-bold text-slate-900 ml-auto pl-4">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}



export default function StaffDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const location = useLocation();

    const [activeTab, setActiveTab] = useState(location.state?.tab || "dashboard");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [toast, setToast] = useState("");
    const [toastType, setToastType] = useState("success");

    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass]         = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [savingPass, setSavingPass]   = useState(false);
    const [showPasses, setShowPasses]   = useState({ current: false, new: false, confirm: false });
    const [passMsg, setPassMsg]         = useState({ text: "", type: "" });

    const token   = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchComplaints(); }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("/api/complaints/all", { headers });
            const mine = (data.complaints || []).filter(
                c => Array.isArray(c.assignedTo) && c.assignedTo.some(s => s._id === user?._id)
            );
            setComplaints(mine);
        } catch { }
        finally { setLoading(false); }
    };

    const handleUpdateStatus = async (complaintId, status) => {
        setUpdating(complaintId);
        try {
            await axios.post("/api/complaints/update",
                { complaintId, status }, { headers });
            showToast(`Marked as ${status}!`, "success");
            fetchComplaints();
        } catch (err) {
            showToast(err.response?.data?.message || "Update failed.", "error");
        } finally { setUpdating(null); }
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

    const showToast = (msg, type = "success") => {
        setToast(msg);
        setToastType(type);
        setTimeout(() => setToast(""), 3000);
    };

    const stats = {
        total:      complaints.length,
        inProgress: complaints.filter(c => c.status === "In Progress").length,
        resolved:   complaints.filter(c => c.status === "Resolved").length,
        pending:    complaints.filter(c => c.status === "Pending").length,
    };

    const NAV = [
        { icon: "🏠", label: "Dashboard",    key: "dashboard" },
        { icon: "📋", label: "Complaints",   key: "complaints", badge: stats.pending },
        { icon: "🔍", label: "Lost & Found", key: "lostfound" },
        { icon: "📊", label: "Analytics",    key: "analytics" },
        { icon: "👤", label: "Profile",      key: "profile" },
    ];


    const resolutionRate = stats.total > 0
        ? Math.round((stats.resolved / stats.total) * 100)
        : 0;

    const donutSegments = [
        { label: "Pending",     value: stats.pending,    color: "#eab308" },
        { label: "In Progress", value: stats.inProgress, color: "#3b82f6" },
        { label: "Resolved",    value: stats.resolved,   color: "#10b981" },
    ];

    const EyeIcon = ({ show }) => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {!show
                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
        </svg>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {/* ── Mobile Backdrop ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }}
                    onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Sidebar (mobile: fixed slide-in, desktop: static) ── */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 shrink-0 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", minHeight: "100vh" }}>

                <div className="flex items-center justify-between px-6 py-5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <div>
                            <span className="text-white font-semibold text-sm tracking-tight">CampusDesk</span>
                            <div className="text-xs" style={{ color: "#f59e0b" }}>Staff Panel</div>
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
                        const isAct = activeTab === item.key;
                        return (
                            <button key={item.key}
                                onClick={() => {
                                    if (item.key === "lostfound") navigate("/staff/lost-and-found");
                                    else { setActiveTab(item.key); setSidebarOpen(false); }
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                                style={{
                                    background: isAct ? "rgba(245,158,11,0.15)" : "transparent",
                                    color:      isAct ? "#fcd34d" : "#64748b",
                                    border:     isAct ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
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
                            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                            {user?.name?.[0]?.toUpperCase() || "S"}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{user?.name || "Staff"}</div>
                            <div className="text-xs text-slate-500 truncate">{user?.email || ""}</div>
                        </div>
                    </div>
                    <button onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
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
                                {activeTab === "dashboard"  ? "Staff Dashboard"
                                 : activeTab === "complaints" ? "My Assigned Complaints"
                                 : activeTab === "analytics"  ? "My Analytics"
                                 : "Profile"}
                            </h1>
                            <p className="text-xs text-slate-400">Welcome, {user?.name?.split(" ")[0] || "Staff"} 👋</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: "#fffbeb", color: "#f59e0b", border: "1px solid #fde68a" }}>
                        👔 Staff Member
                    </div>
                </div>

                <div className="px-6 py-8">

                    {/* ── DASHBOARD TAB ── */}
                    {activeTab === "dashboard" && (
                        <div className="max-w-5xl">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Assigned",    value: stats.total,      color: "#f59e0b", bg: "#fffbeb", icon: "📋" },
                                    { label: "In Progress", value: stats.inProgress, color: "#3b82f6", bg: "#eff6ff", icon: "🔧" },
                                    { label: "Resolved",    value: stats.resolved,   color: "#10b981", bg: "#ecfdf5", icon: "✅" },
                                    { label: "Pending",     value: stats.pending,    color: "#ef4444", bg: "#fef2f2", icon: "⏳" },
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

                            <button onClick={() => setActiveTab("complaints")}
                                className="group flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:shadow-md w-full max-w-sm"
                                style={{ background: "white", border: "1.5px solid #e2e8f0" }}>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all"
                                    style={{ background: "#fff7ed", border: "1.5px solid #f59e0b30" }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                        <path d="M9 11l3 3L22 4"/>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900 mb-0.5">View Assigned Complaints</div>
                                    <div className="text-xs text-slate-500">{stats.inProgress} in progress · {stats.resolved} resolved</div>
                                </div>
                                <svg className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>

                            {complaints.length > 0 && (
                                <div className="mt-8">
                                    <h2 className="text-sm font-bold text-slate-900 mb-4">Recent Assignments</h2>
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
                                <h2 className="text-sm font-bold text-slate-900">Assigned to Me</h2>
                                <button onClick={fetchComplaints}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                                    style={{ background: "white", border: "1.5px solid #e2e8f0", color: "#64748b" }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10"/>
                                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {loading ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="animate-pulse rounded-2xl p-5" style={{ background: "white", border: "1px solid #e2e8f0" }}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-4 bg-slate-200 rounded w-1/2" />
                                                <div className="h-5 bg-slate-100 rounded-full w-16 ml-auto" />
                                            </div>
                                            <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                                            <div className="h-3 bg-slate-100 rounded w-2/3" />
                                        </div>
                                    ))}
                                </div>
                            ) : complaints.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
                                    style={{ background: "white", border: "1px dashed #e2e8f0" }}>
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#fffbeb" }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700 mb-1">No complaints assigned yet</p>
                                    <p className="text-xs text-slate-400 text-center px-8">The admin will assign complaints to you. Check back soon!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {complaints.map(c => {
                                        const s = STATUS_STYLE[c.status] || STATUS_STYLE["Pending"];
                                        return (
                                            <div key={c._id} className="rounded-2xl p-5"
                                                style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <span className="text-sm font-bold text-slate-900">{c.title}</span>
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                                                                style={{ background: s.bg, color: s.color }}>
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: s.dot }}></span>
                                                                {c.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-2 leading-relaxed">{c.description}</p>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <span className="text-xs px-2 py-0.5 rounded-full"
                                                                style={{ background: "#f1f5f9", color: "#64748b" }}>
                                                                📍 {c.location}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                By: <strong className="text-slate-600">{c.createdBy?.name || "Student"}</strong>
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {c.status !== "Resolved" && (
                                                    <div className="pt-3 mt-1 flex items-center gap-2 flex-wrap"
                                                        style={{ borderTop: "1px solid #f1f5f9" }}>
                                                        <span className="text-xs text-slate-400 mr-1">Update status:</span>
                                                        {c.status !== "In Progress" && (
                                                            <button onClick={() => handleUpdateStatus(c._id, "In Progress")}
                                                                disabled={updating === c._id}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                                                style={{
                                                                    background: "#eff6ff", color: "#1e40af", border: "1.5px solid #bfdbfe",
                                                                    cursor: updating === c._id ? "not-allowed" : "pointer",
                                                                    opacity: updating === c._id ? 0.6 : 1,
                                                                }}>
                                                                🔧 Mark In Progress
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleUpdateStatus(c._id, "Resolved")}
                                                            disabled={updating === c._id}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                                            style={{
                                                                background: "linear-gradient(135deg, #10b981, #059669)", color: "white",
                                                                boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
                                                                cursor: updating === c._id ? "not-allowed" : "pointer",
                                                                opacity: updating === c._id ? 0.6 : 1,
                                                            }}>
                                                            {updating === c._id ? "Updating..." : "✅ Mark Resolved"}
                                                        </button>
                                                    </div>
                                                )}

                                                {c.status === "Resolved" && (
                                                    <div className="pt-3 mt-1 flex items-center gap-2"
                                                        style={{ borderTop: "1px solid #f1f5f9" }}>
                                                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <polyline points="20 6 9 17 4 12"/>
                                                            </svg>
                                                            Complaint resolved
                                                        </span>
                                                    </div>
                                                )}
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
                                    { label: "Total Assigned",  value: stats.total,         color: "#f59e0b", bg: "#fffbeb" },
                                    { label: "Resolution Rate", value: `${resolutionRate}%`, color: "#10b981", bg: "#ecfdf5" },
                                    { label: "Still Open",      value: stats.pending + stats.inProgress, color: "#ef4444", bg: "#fef2f2" },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-5 text-center"
                                        style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                                        <div className="text-xs text-slate-500">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Donut */}
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <h3 className="text-sm font-bold text-slate-900 mb-5">Assignment Breakdown</h3>
                                <DonutChart segments={donutSegments} />
                            </div>

                            {/* Progress bars */}
                            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <h3 className="text-sm font-bold text-slate-900 mb-5">Status Breakdown</h3>
                                {stats.total === 0 ? (
                                    <p className="text-xs text-slate-400">No complaints assigned yet.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {[
                                            { label: "Pending",     value: stats.pending,    color: "#eab308" },
                                            { label: "In Progress", value: stats.inProgress, color: "#3b82f6" },
                                            { label: "Resolved",    value: stats.resolved,   color: "#10b981" },
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
                                                        }}/>
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
                                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                                        {user?.name?.[0]?.toUpperCase() || "S"}
                                    </div>
                                    <div>
                                        <div className="text-base font-bold text-slate-900">{user?.name}</div>
                                        <div className="text-sm text-slate-500">{user?.email}</div>
                                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                            style={{ background: "#fffbeb", color: "#f59e0b", border: "1px solid #fde68a" }}>
                                            👔 Staff
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: "Total Assigned", value: stats.total },
                                        { label: "Resolved",       value: stats.resolved },
                                        { label: "In Progress",    value: stats.inProgress },
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
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                                        <p className="text-xs text-slate-400">Update your staff account password</p>
                                    </div>
                                </div>

                                {passMsg.text && (
                                    <div className="mb-4 px-4 py-2.5 rounded-xl text-xs font-medium"
                                        style={{
                                            background: passMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                                            color:      passMsg.type === "success" ? "#166534"  : "#dc2626",
                                            border:     `1px solid ${passMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                                        }}>
                                        {passMsg.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {[
                                        { label: "Current Password", val: currentPass, set: setCurrentPass, key: "current" },
                                        { label: "New Password",     val: newPass,     set: setNewPass,     key: "new" },
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
                                                    onFocus={e => e.target.style.borderColor = "#f59e0b"}
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

            {toast && (
                <div className="fixed bottom-6 right-6 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg z-50"
                    style={{
                        background: toastType === "success"
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "linear-gradient(135deg, #ef4444, #dc2626)",
                    }}>
                    {toast}
                </div>
            )}
        </div>
    );
}