import { useState, useEffect, useRef } from "react";
import * as api from "./utils/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_QUESTIONS = [
  "Hi there! I'm ARIA, your AI recruitment assistant. Could you start by telling me about yourself and your career so far?",
  "Can you walk me through a challenging project you've worked on?",
  "How do you handle tight deadlines or high-pressure situations?",
  "What motivates you most in your work?",
  "Where do you see yourself professionally in the next 3 years?",
];

const MOCK_CANDIDATES = [
  { id: "1", name: "Arjun Mehta", role: "Backend Engineer", score: 94, psychology_rating: 8.7, skills: ["Python", "AWS", "REST API", "Docker"], status: "shortlisted", avatar: "AM", email: "arjun@example.com", experience: "5 years", location: "Mumbai, IN", lastMsg: "I'm very excited about this opportunity!", lastTime: "2m ago", unread: 2, chat_completed: true },
  { id: "2", name: "Priya Sharma", role: "ML Engineer", score: 88, psychology_rating: 7.9, skills: ["TensorFlow", "Python", "Keras", "SQL"], status: "shortlisted", avatar: "PS", email: "priya@example.com", experience: "3 years", location: "Bangalore, IN", lastMsg: "When can we schedule the interview?", lastTime: "15m ago", unread: 0, chat_completed: true },
  { id: "3", name: "Rohan Das", role: "DevOps Engineer", score: 81, psychology_rating: null, skills: ["Kubernetes", "CI/CD", "Terraform"], status: "in_review", avatar: "RD", email: "rohan@example.com", experience: "4 years", location: "Hyderabad, IN", lastMsg: "I have 4 years of DevOps experience.", lastTime: "1h ago", unread: 1, chat_completed: false },
  { id: "4", name: "Ananya Iyer", role: "Frontend Dev", score: 76, psychology_rating: null, skills: ["React", "TypeScript", "CSS"], status: "in_review", avatar: "AI", email: "ananya@example.com", experience: "2 years", location: "Pune, IN", lastMsg: "Here's my portfolio link.", lastTime: "3h ago", unread: 0, chat_completed: false },
  { id: "5", name: "Karan Bose", role: "Data Analyst", score: 68, psychology_rating: null, skills: ["SQL", "Power BI", "Excel"], status: "pending", avatar: "KB", email: "karan@example.com", experience: "1 year", location: "Delhi, IN", lastMsg: "Just submitted my application.", lastTime: "1d ago", unread: 0, chat_completed: false },
];

const CHAT_HISTORY = {
  "1": [
    { role: "ai", text: "Hi Arjun! Thanks for applying. I'm ARIA. I've reviewed your resume — impressive background!", time: "10:01 AM" },
    { role: "user", text: "Thank you! I'm very excited about this opportunity!", time: "10:03 AM" },
    { role: "ai", text: "Great! Can you walk me through a challenging project involving AWS and REST APIs?", time: "10:04 AM" },
    { role: "user", text: "Sure! I built a microservices platform on AWS ECS that handled 50k req/sec...", time: "10:06 AM" },
  ],
  "2": [
    { role: "ai", text: "Hello Priya! Your ML background is very relevant. Let's start with a quick assessment.", time: "9:30 AM" },
    { role: "user", text: "Sure, I'm ready!", time: "9:32 AM" },
    { role: "ai", text: "Describe your experience with model deployment in production environments.", time: "9:33 AM" },
    { role: "user", text: "When can we schedule the interview?", time: "9:45 AM" },
  ],
};

const SLOTS = [
  { id: 1, day: "Mon, May 12", time: "10:00 AM", available: true },
  { id: 2, day: "Mon, May 12", time: "2:00 PM", available: true },
  { id: 3, day: "Tue, May 13", time: "11:00 AM", available: false },
  { id: 4, day: "Wed, May 14", time: "3:00 PM", available: true },
  { id: 5, day: "Thu, May 15", time: "10:00 AM", available: true },
];

const KOLKATA_COLLEGES = [
  "Jadavpur University",
  "University of Calcutta",
  "Presidency University",
  "IIT Kharagpur",
  "IEM Kolkata",
  "IIEST Shibpur",
  "St. Xavier's College",
  "Heritage Institute of Technology",
  "Techno Main Salt Lake",
  "MAKAUT (Maulana Abul Kalam Azad University of Technology)",
  "Techno India University",
  "Brainware University",
  "Sister Nivedita University",
  "Narula Institute of Technology",
  "Academy of Technology",
  "JIS University",
  "Adamas University",
  "University of Engineering and Management (UEM)",
];

const GOOGLE_CLIENT_ID = "971282716814-4gu0sfa6r49stvgkjag27uja8agsnmjq.apps.googleusercontent.com";

function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

const S = {
  bg: "#080C14",
  surface: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  blue: "#0070F3",
  cyan: "#4FFFE3",
  text: "#e2e8f0",
  muted: "#64748b",
  dim: "#2d3748",
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function GlowBg() {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,112,243,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,112,243,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: "10%", left: "10%", width: 500, height: 500, borderRadius: "50%", background: "rgba(0,112,243,0.06)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "rgba(79,255,227,0.04)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />
    </>
  );
}

function Logo({ size = "md" }) {
  const sz = size === "lg" ? 52 : 38;
  const fs = size === "lg" ? 28 : 18;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: sz, height: sz, borderRadius: sz * 0.28, background: "linear-gradient(135deg, #0070F3, #4FFFE3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.44, fontWeight: 800, color: S.bg }}>A</div>
      <span style={{ fontSize: fs, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>ARIA</span>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", style: extra = {} }) {
  const base = { padding: "12px 24px", borderRadius: 11, border: "none", fontSize: 14, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", transition: "opacity 0.2s", ...extra };
  const variants = {
    primary: { background: disabled ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, color: disabled ? S.muted : S.bg },
    ghost: { background: "rgba(255,255,255,0.05)", border: `1px solid ${S.border}`, color: S.muted },
    danger: { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" },
  };
  return <button onClick={!disabled ? onClick : undefined} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, ...props }) {
  return (
    <label style={{ display: "block" }}>
      {label && <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>{label}</span>}
      <input {...props} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", ...props.style }} />
    </label>
  );
}

const statusColor = { applied: S.muted, engaged: "#F59E0B", in_review: "#F59E0B", shortlisted: S.cyan, interview_scheduled: "#10B981", pending: S.muted, rejected: "#f87171" };
const statusLabel = { applied: "Applied", engaged: "Engaged", in_review: "In Review", shortlisted: "Shortlisted", interview_scheduled: "Scheduled", pending: "Pending", rejected: "Rejected" };

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen({ matchScore, onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { label: "Parsing resume structure", icon: "📄" },
    { label: "Extracting skills & experience", icon: "🔍" },
    { label: "Running semantic analysis", icon: "🧠" },
    { label: "Scoring against job profile", icon: "📊" },
    { label: "Preparing your interview", icon: "✅" },
  ];

  useEffect(() => {
    if (step < steps.length) {
      const t = setTimeout(() => setStep(s => s + 1), 900);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onDone, 1200);
      return () => clearTimeout(t);
    }
  }, [step]);

  const done = step >= steps.length;
  const score = matchScore != null ? matchScore : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: S.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ position: "relative", width: 160, height: 160, marginBottom: 40 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #4FFFE3, #0070F3, #080C14)", animation: "pulse 2s ease-in-out infinite", boxShadow: "0 0 60px rgba(0,112,243,0.6), 0 0 120px rgba(79,255,227,0.2)" }} />
        <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "1px solid rgba(79,255,227,0.3)", animation: "spin 3s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {done ? (
            <>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{score}<span style={{ fontSize: 14 }}>/100</span></span>
              <span style={{ fontSize: 10, color: S.cyan, letterSpacing: 1 }}>MATCH</span>
            </>
          ) : (
            <span style={{ fontSize: 36 }}>{steps[Math.max(0, step - 1)]?.icon}</span>
          )}
        </div>
      </div>

      {done && (
        <div style={{ marginBottom: 24, padding: "10px 24px", borderRadius: 20, background: score >= 80 ? "rgba(79,255,227,0.1)" : "rgba(0,112,243,0.1)", border: `1px solid ${score >= 80 ? "rgba(79,255,227,0.3)" : "rgba(0,112,243,0.3)"}` }}>
          <span style={{ color: score >= 80 ? S.cyan : "#60a5fa", fontWeight: 700, fontSize: 14 }}>
            {score >= 80 ? "🎉 Strong Match!" : score >= 60 ? "✅ Good Match" : "🔄 Partial Match"}
          </span>
        </div>
      )}

      <h2 style={{ color: S.cyan, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 28 }}>
        {done ? "Analysis complete" : "ARIA is analyzing your profile"}
      </h2>

      <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 11 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i < step ? 1 : 0.2, transition: "all 0.5s ease", transform: i < step ? "translateX(0)" : "translateX(-8px)" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: i < step ? `linear-gradient(135deg, ${S.cyan}, ${S.blue})` : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: S.bg, fontWeight: 700 }}>
              {i < step ? "✓" : ""}
            </div>
            <span style={{ color: i < step ? S.text : S.muted, fontSize: 13 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 36, width: 360, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
        <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${S.blue}, ${S.cyan})`, width: `${(step / steps.length) * 100}%`, transition: "width 0.8s ease", boxShadow: `0 0 10px rgba(79,255,227,0.5)` }} />
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── PERFORMANCE REPORT ───────────────────────────────────────────────────────
function PerformanceReport({ report, matchScore, onHome }) {
  const r = report || { psychology_rating: 7.4, communication_score: 6.8, confidence_score: 7.8, clarity_score: 7.1, total_responses: 5, avg_response_length: 24, strengths: ["Clear communication", "Technical depth", "Enthusiasm"], improvements: ["Provide more specific examples", "Expand on leadership experience"], summary: "The candidate demonstrated good communication skills with consistent and thoughtful responses. Overall a strong profile for further consideration." };

  const rating = r.psychology_rating;
  const pct = (rating / 10) * 100;

  const bars = [
    { label: "Communication", score: r.communication_score, color: S.blue },
    { label: "Confidence", score: r.confidence_score, color: S.cyan },
    { label: "Clarity", score: r.clarity_score, color: "#F59E0B" },
    { label: "Overall Rating", score: rating, color: "#10B981" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <GlowBg />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 680 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Logo size="md" />
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, marginTop: 16, marginBottom: 6 }}>Your Interview Report</h1>
          <p style={{ color: S.muted, fontSize: 14 }}>Here's how you performed in the AI screening</p>
        </div>

        {/* Big score ring */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", width: 160, height: 160 }}>
            <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle cx="80" cy="80" r="68" fill="none" stroke="url(#grad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 68}`} strokeDashoffset={`${2 * Math.PI * 68 * (1 - pct / 100)}`} style={{ transition: "stroke-dashoffset 1.5s ease" }} />
              <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={S.blue} /><stop offset="100%" stopColor={S.cyan} /></linearGradient></defs>
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{rating.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: S.muted }}>out of 10</span>
            </div>
          </div>
        </div>

        {/* Match score badge */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ padding: "8px 20px", borderRadius: 20, background: "rgba(0,112,243,0.1)", border: "1px solid rgba(0,112,243,0.3)" }}>
            <span style={{ color: "#60a5fa", fontSize: 13, fontWeight: 600 }}>Resume Match: {matchScore != null ? matchScore : 0}/100</span>
          </div>
          <div style={{ padding: "8px 20px", borderRadius: 20, background: "rgba(79,255,227,0.08)", border: "1px solid rgba(79,255,227,0.25)" }}>
            <span style={{ color: S.cyan, fontSize: 13, fontWeight: 600 }}>Responses: {r.total_responses} questions</span>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>Score Breakdown</p>
          {bars.map(b => (
            <div key={b.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ color: S.text, fontSize: 13 }}>{b.label}</span>
                <span style={{ color: b.color, fontSize: 13, fontWeight: 700 }}>{b.score.toFixed(1)}/10</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                <div style={{ height: "100%", borderRadius: 4, background: b.color, width: `${(b.score / 10) * 100}%`, boxShadow: `0 0 8px ${b.color}66`, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Strengths + improvements */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "rgba(79,255,227,0.04)", border: "1px solid rgba(79,255,227,0.15)", borderRadius: 14, padding: 20 }}>
            <p style={{ color: S.cyan, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>✦ Strengths</p>
            {r.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.cyan, marginTop: 5, flexShrink: 0 }} />
                <span style={{ color: S.text, fontSize: 13, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14, padding: 20 }}>
            <p style={{ color: "#F59E0B", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>△ Areas to Improve</p>
            {r.improvements.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", marginTop: 5, flexShrink: 0 }} />
                <span style={{ color: S.text, fontSize: 13, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: 20, marginBottom: 28 }}>
          <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Summary</p>
          <p style={{ color: S.text, fontSize: 14, lineHeight: 1.7 }}>{r.summary}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Btn onClick={onHome} style={{ padding: "14px 48px", fontSize: 15 }}>← Back to Home</Btn>
        </div>
      </div>
      <style>{`input::placeholder{color:#2d3748;}`}</style>
    </div>
  );
}

// ─── HOME / LOGIN ─────────────────────────────────────────────────────────────
function HomeScreen({ onApplicant, onHR, onApplicantReturn }) {
  const [mode, setMode] = useState("applicant");
  // Step 1: Google sign-in state
  const [step, setStep] = useState(1); // 1 = Google sign-in, 2 = profile + resume
  const [googleUser, setGoogleUser] = useState(null); // { google_id, email, name, picture }
  // Step 2: Profile form state
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [college, setCollege] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [preferredDate1, setPreferredDate1] = useState("");
  const [preferredDate2, setPreferredDate2] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  // Jobs state
  const [availableJobs, setAvailableJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  // HR login state
  const [hrEmail, setHrEmail] = useState("");
  const [password, setPassword] = useState("");
  // Shared
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // Fetch available jobs
  useEffect(() => {
    api.listJobs().then(jobs => {
      setAvailableJobs(jobs || []);
      if (jobs?.length === 1) setSelectedJobId(jobs[0].id);
      setJobsLoading(false);
    }).catch(() => setJobsLoading(false));
  }, []);

  // Initialize Google Sign-In
  useEffect(() => {
    if (mode !== "applicant" || step !== 1) return;
    const timer = setTimeout(() => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_black",
          size: "large",
          width: 380,
          text: "signin_with",
          shape: "pill",
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, step]);

  const handleGoogleResponse = async (response) => {
    setError(""); setLoading(true);
    try {
      const res = await api.verifyGoogleToken(response.credential);
      localStorage.setItem("aria_token", res.access_token);
      const gUser = { google_id: res.google_id, email: res.email, name: res.name, picture: res.picture };

      // Check if this applicant already submitted an application
      try {
        const existing = await api.getMyProfile(res.google_id);
        if (existing && existing.id) {
          // Returning applicant — go to dashboard
          onApplicantReturn(gUser);
          return;
        }
      } catch (_) {
        // 404 = new applicant, continue to profile form
      }

      setGoogleUser(gUser);
      setName(res.name || "");
      setStep(2);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleSubmitProfile = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!dob) { setError("Please enter your date of birth."); return; }
    if (!college) { setError("Please select your college."); return; }
    if (!file) { setError("Please upload your resume."); return; }
    if (availableJobs.length > 0 && !selectedJobId) { setError("Please select a position to apply for."); return; }
    setError(""); setLoading(true);
    try {
      const selectedJob = availableJobs.find(j => j.id === selectedJobId);
      const result = await api.submitApplication({
        googleId: googleUser.google_id,
        googleEmail: googleUser.email,
        name,
        dob,
        college,
        jobId: selectedJobId || null,
        roleApplied: selectedJob?.title || null,
        preferredDate1,
        preferredDate2,
        resumeFile: file,
      });
      onApplicant({ applicantId: result.applicant_id, email: googleUser.email, matchScore: result.match_score, questions: result.questions || [] });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleHRLogin = async () => {
    if (!hrEmail || !password) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.hrLogin(hrEmail, password);
      localStorage.setItem("aria_token", res.access_token);
      onHR();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  if (loading && mode === "applicant" && step === 2) return null; // parent shows loading

  const selectStyle = { width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", appearance: "none", WebkitAppearance: "none" };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden", padding: 20 }}>
      <GlowBg />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Logo size="lg" />
          <p style={{ color: S.muted, fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 10 }}>AI Recruitment Intelligence Assistant</p>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${S.border}` }}>
          {[["applicant", "🙋 Apply for a Job"], ["hr", "🏢 HR Dashboard"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setStep(1); }} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer", background: mode === m ? `linear-gradient(135deg, ${S.blue}, #0057C2)` : "transparent", color: mode === m ? "#fff" : S.muted, fontSize: 13, fontWeight: 600, transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}>{label}</button>
          ))}
        </div>

        <div style={{ background: S.surface, borderRadius: 20, border: `1px solid ${S.border}`, padding: 36, backdropFilter: "blur(20px)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
          {mode === "applicant" ? (
            step === 1 ? (
              /* ── STEP 1: Google Sign-In ── */
              <>
                <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Start your application</h2>
                <p style={{ color: S.muted, fontSize: 14, marginBottom: 28 }}>Sign in with Google to begin the AI-powered screening</p>

                {/* No vacancies gate */}
                {!jobsLoading && availableJobs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
                    <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Job Vacancies Available</h3>
                    <p style={{ color: S.muted, fontSize: 13, lineHeight: 1.6 }}>There are currently no open positions. Please check back later when HR posts new job descriptions.</p>
                  </div>
                ) : (
                  <>
                    {/* Step indicator */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                      {[1, 2].map(s => (
                        <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? `linear-gradient(90deg, ${S.blue}, ${S.cyan})` : "rgba(255,255,255,0.08)", transition: "all 0.3s" }} />
                      ))}
                    </div>
                    <p style={{ color: S.muted, fontSize: 11, textAlign: "center", marginBottom: 20, letterSpacing: 1.5, textTransform: "uppercase" }}>Step 1 of 2 — Verify your identity</p>

                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                      <div ref={googleBtnRef} />
                    </div>

                    {!window.google && (
                      <p style={{ color: S.dim, fontSize: 12, textAlign: "center", marginTop: 8 }}>Loading Google Sign-In...</p>
                    )}
                  </>
                )}

                {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>}
              </>
            ) : (
              /* ── STEP 2: Profile + Resume ── */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  {googleUser?.picture && <img src={googleUser.picture} alt="" style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${S.cyan}` }} />}
                  <div>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{googleUser?.name}</p>
                    <p style={{ color: S.muted, fontSize: 12 }}>{googleUser?.email}</p>
                  </div>
                  <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: "rgba(79,255,227,0.1)", border: "1px solid rgba(79,255,227,0.3)" }}>
                    <span style={{ color: S.cyan, fontSize: 11, fontWeight: 600 }}>Verified</span>
                  </div>
                </div>

                <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Complete your profile</h2>
                <p style={{ color: S.muted, fontSize: 14, marginBottom: 20 }}>Fill in your details and upload your resume</p>

                {/* Step indicator */}
                <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                  {[1, 2].map(s => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? `linear-gradient(90deg, ${S.blue}, ${S.cyan})` : "rgba(255,255,255,0.08)", transition: "all 0.3s" }} />
                  ))}
                </div>
                <p style={{ color: S.muted, fontSize: 11, textAlign: "center", marginBottom: 20, letterSpacing: 1.5, textTransform: "uppercase" }}>Step 2 of 2 — Your details</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                  {/* Job position selector */}
                  {availableJobs.length > 0 && (
                    <label style={{ display: "block" }}>
                      <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Position Applying For *</span>
                      <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} style={selectStyle}>
                        <option value="" disabled>Select a position</option>
                        {availableJobs.map(j => <option key={j.id} value={j.id} style={{ background: "#1a1a2e" }}>{j.title}{j.location ? ` · ${j.location}` : ""}</option>)}
                      </select>
                      {selectedJobId && (() => {
                        const job = availableJobs.find(j => j.id === selectedJobId);
                        return job ? (
                          <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(0,112,243,0.06)", border: "1px solid rgba(0,112,243,0.15)" }}>
                            <p style={{ color: S.text, fontSize: 12, lineHeight: 1.5 }}>{job.description?.substring(0, 150)}{job.description?.length > 150 ? "…" : ""}</p>
                            {job.required_skills?.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                                {job.required_skills.slice(0, 5).map(s => <span key={s} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(0,112,243,0.1)", border: "1px solid rgba(0,112,243,0.2)", color: "#60a5fa", fontSize: 10, fontWeight: 600 }}>{s}</span>)}
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </label>
                  )}
                  <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
                  <label style={{ display: "block" }}>
                    <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Date of Birth</span>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ ...selectStyle, colorScheme: "dark" }} />
                  </label>
                  <label style={{ display: "block" }}>
                    <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>College</span>
                    <select value={college} onChange={e => setCollege(e.target.value)} style={selectStyle}>
                      <option value="" disabled>Select your college</option>
                      {KOLKATA_COLLEGES.map(c => <option key={c} value={c} style={{ background: "#1a1a2e" }}>{c}</option>)}
                    </select>
                  </label>
                </div>

                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0]); }} onClick={() => document.getElementById("resume-input").click()}
                  style={{ border: `2px dashed ${dragOver ? S.cyan : file ? S.blue : S.border}`, borderRadius: 14, padding: "28px 24px", textAlign: "center", cursor: "pointer", marginBottom: 20, background: dragOver ? "rgba(79,255,227,0.04)" : file ? "rgba(0,112,243,0.06)" : "rgba(255,255,255,0.02)", transition: "all 0.2s" }}>
                  <input id="resume-input" type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{file ? "📄" : "☁️"}</div>
                  {file ? <><p style={{ color: S.cyan, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{file.name}</p><p style={{ color: S.muted, fontSize: 12 }}>Click to change</p></> : <><p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 4 }}>Drop your resume here</p><p style={{ color: S.muted, fontSize: 12 }}>PDF · Max 10MB</p></>}
                </div>

                {/* Preferred Interview Dates */}
                <div style={{ background: "rgba(0,112,243,0.05)", border: `1px solid rgba(0,112,243,0.15)`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <p style={{ color: S.muted, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>📅 Preferred Interview Dates (optional)</p>
                  <p style={{ color: S.dim, fontSize: 12, marginBottom: 12 }}>Select up to 2 dates when you'd be available for an interview if shortlisted</p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label style={{ flex: 1 }}>
                      <span style={{ color: S.muted, fontSize: 10, display: "block", marginBottom: 4 }}>Choice 1</span>
                      <input type="date" value={preferredDate1} onChange={e => setPreferredDate1(e.target.value)} style={{ ...selectStyle, colorScheme: "dark" }} />
                    </label>
                    <label style={{ flex: 1 }}>
                      <span style={{ color: S.muted, fontSize: 10, display: "block", marginBottom: 4 }}>Choice 2</span>
                      <input type="date" value={preferredDate2} onChange={e => setPreferredDate2(e.target.value)} style={{ ...selectStyle, colorScheme: "dark" }} />
                    </label>
                  </div>
                </div>

                {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>}
                <Btn onClick={handleSubmitProfile} disabled={!name || !dob || !college || !file || (availableJobs.length > 0 && !selectedJobId)} style={{ width: "100%", padding: "14px 0" }}>
                  {name && dob && college && file && (availableJobs.length === 0 || selectedJobId) ? "Submit Application →" : "Fill in all details to continue"}
                </Btn>
                <button onClick={() => { setStep(1); setGoogleUser(null); setError(""); }} style={{ width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 10, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back to Sign In</button>
              </>
            )
          ) : (
            <>
              <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>HR Portal</h2>
              <p style={{ color: S.muted, fontSize: 14, marginBottom: 24 }}>Sign in to access the recruitment dashboard</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                <Input label="Email" value={hrEmail} onChange={e => setHrEmail(e.target.value)} placeholder="hr@company.com" type="email" />
                <Input label="Password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" />
              </div>
              {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>}
              <Btn onClick={handleHRLogin} style={{ width: "100%", padding: "14px 0" }}>Sign In →</Btn>
              <p style={{ color: S.dim, fontSize: 12, textAlign: "center", marginTop: 12 }}>Demo: hr@company.com / hr123</p>
            </>
          )}
        </div>
        <p style={{ textAlign: "center", color: "#1e2a3a", fontSize: 11, marginTop: 20 }}>Powered by FastAPI · MongoDB · React</p>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{margin:0;padding:0;box-sizing:border-box;} input::placeholder{color:#2d3748;} input:focus{border-color:rgba(0,112,243,0.5)!important;}`}</style>
    </div>
  );
}

// ─── APPLICANT CHAT ───────────────────────────────────────────────────────────
function ApplicantChat({ applicantId, email, sessionId, questions: propQuestions, onComplete }) {
  const questions = propQuestions?.length ? propQuestions : DEFAULT_QUESTIONS;
  const [messages, setMessages] = useState([{ role: "ai", text: questions[0], time: now() }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(null);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const send = () => {
    if (!input.trim() || completed) return;
    const userMsg = { role: "user", text: input, time: now() };
    const updated = [...messages, userMsg];
    const currentQuestion = questions[qIndex];
    const answerText = input;
    setMessages(updated);
    setInput("");
    setTyping(true);
    setLastScore(null);

    // Auto-save to backend
    if (sessionId) api.saveMessages(sessionId, updated).catch(() => {});

    // Score this response in the background
    if (sessionId) {
      api.scoreResponse(sessionId, currentQuestion, answerText)
        .then(res => setLastScore(res.score))
        .catch(() => {});
    }

    setTimeout(async () => {
      setTyping(false);
      const next = qIndex + 1;
      if (next < questions.length) {
        const aiMsg = { role: "ai", text: questions[next], time: now() };
        setMessages(m => [...m, aiMsg]);
        setQIndex(next);
      } else {
        const finalMsg = { role: "ai", text: "Thank you so much for your responses! \ud83c\udf89 I've completed the assessment. Our HR team will review your full profile and be in touch soon. Best of luck!", time: now() };
        const finalMsgs = [...updated, finalMsg];
        setMessages(finalMsgs);
        setCompleted(true);

        let report = null;
        if (sessionId) {
          try { const res = await api.completeChat(sessionId, finalMsgs); report = res.report; } catch (_) {}
        }
        setTimeout(() => onComplete(report), 2500);
      }
    }, 1800);
  };

  const progress = ((qIndex + (completed ? 1 : 0)) / questions.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20, position: "relative" }}>
      <GlowBg />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 700 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, padding: "14px 20px", background: S.surface, borderRadius: 16, border: `1px solid ${S.border}` }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: S.bg }}>A</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>ARIA · AI Recruitment Assistant</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: completed ? "#F59E0B" : S.cyan }} />
              <span style={{ color: completed ? "#F59E0B" : S.cyan, fontSize: 12 }}>{completed ? "Assessment complete" : "Screening in progress"}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: S.muted, fontSize: 11 }}>Question {Math.min(qIndex + 1, questions.length)} of {questions.length}</p>
            <div style={{ width: 80, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginTop: 6 }}>
              <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${S.blue}, ${S.cyan})`, width: `${progress}%`, transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>

        {/* Score feedback */}
        {lastScore && (
          <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 12, background: "rgba(79,255,227,0.06)", border: "1px solid rgba(79,255,227,0.15)", display: "flex", alignItems: "center", gap: 12, animation: "fadeIn 0.3s ease" }}>
            <span style={{ color: S.cyan, fontSize: 12, fontWeight: 700 }}>✓ Response scored: {lastScore.overall}/10</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: S.muted, fontSize: 11 }}>Relevance {lastScore.relevance} · Depth {lastScore.depth} · Clarity {lastScore.communication}</span>
          </div>
        )}

        {/* Chat */}
        <div style={{ background: S.surface, borderRadius: 20, border: `1px solid ${S.border}`, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
          <div style={{ height: 440, overflowY: "auto", padding: "24px 24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
                {m.role === "ai" && <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: S.bg, flexShrink: 0, marginTop: 2 }}>A</div>}
                <div style={{ maxWidth: "72%" }}>
                  <div style={{ padding: "12px 16px", borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: m.role === "user" ? `linear-gradient(135deg, ${S.blue}, #0057C2)` : "rgba(255,255,255,0.06)", color: S.text, fontSize: 14, lineHeight: 1.65, border: m.role === "ai" ? `1px solid ${S.border}` : "none" }}>{m.text}</div>
                  <p style={{ color: S.dim, fontSize: 11, marginTop: 4, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</p>
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: S.bg }}>A</div>
                <div style={{ padding: "14px 18px", borderRadius: "4px 16px 16px 16px", background: "rgba(255,255,255,0.06)", border: `1px solid ${S.border}`, display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: S.cyan, animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "14px 20px", borderTop: `1px solid rgba(255,255,255,0.05)`, display: "flex", gap: 10, background: "rgba(255,255,255,0.02)" }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} disabled={completed}
              placeholder={completed ? "Assessment completed — generating your report…" : "Type your response and press Enter…"}
              style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: `1px solid ${S.border}`, background: completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", opacity: completed ? 0.5 : 1 }} />
            <button onClick={send} disabled={completed} style={{ padding: "12px 20px", borderRadius: 12, border: "none", background: completed ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, color: completed ? S.muted : S.bg, fontWeight: 700, cursor: completed ? "not-allowed" : "pointer", fontSize: 16 }}>→</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} input::placeholder{color:#2d3748;}`}</style>
    </div>
  );
}

// ─── HR DASHBOARD ─────────────────────────────────────────────────────────────
function HRDashboard({ onHome }) {
  const [tab, setTab] = useState("overview");
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [slots, setSlots] = useState([]);
  const [confirmedInterviews, setConfirmedInterviews] = useState([]);
  const [scheduleCandidate, setScheduleCandidate] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [selectedJobFilter, setSelectedJobFilter] = useState(""); // filter candidates by JD
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newJobSkills, setNewJobSkills] = useState("");
  const [newJobNice, setNewJobNice] = useState("");
  const [newJobExp, setNewJobExp] = useState("");
  const [newJobLoc, setNewJobLoc] = useState("");
  const [jobError, setJobError] = useState("");

  // Fetch interview slots
  const refreshSlots = () => {
    api.listSlots().then(setSlots).catch(() => {});
    api.listConfirmedInterviews().then(setConfirmedInterviews).catch(() => {});
  };
  useEffect(() => { refreshSlots(); }, [tab]);

  // Fetch jobs
  const refreshJobs = () => {
    api.listJobs().then(data => {
      setJobs(data || []);
    }).catch(() => {});
  };
  useEffect(() => { refreshJobs(); }, []);

  // Refresh candidates (filtered by selected JD)
  const refreshCandidates = () => {
    api.listApplicants(selectedJobFilter || null).then(data => {
      if (data?.length) {
        const normalized = data.map(a => ({
          id: a.id, name: a.name, role: a.role_applied || "Applicant",
          score: a.match_score || 0, engagement_score: a.engagement_score,
          final_score: a.final_score, psychology_rating: a.psychology_rating,
          skills: a.skills || [], status: a.status || "applied",
          avatar: a.name?.substring(0, 2).toUpperCase(), email: a.google_email,
          college: a.college, dob: a.dob, chat_completed: a.chat_completed,
          chat_session_id: a.chat_session_id, chat_report: a.chat_report,
          resume_analysis: a.resume_analysis, interview_slot_id: a.interview_slot_id,
          preferred_dates: a.preferred_dates || [],
          confirmed_interview_date: a.confirmed_interview_date || null,
          job_id: a.job_id,
          created_at: a.created_at,
          lastMsg: a.chat_completed ? "Chat assessment completed" : "Application submitted",
          lastTime: new Date(a.created_at).toLocaleDateString(), unread: 0,
        }));
        setCandidates(normalized);
      } else {
        setCandidates([]);
      }
    }).catch(() => {});
  };

  // Load candidates on mount, on tab switch, and when JD filter changes
  useEffect(() => {
    refreshCandidates();
    setLoading(false);
  }, [tab, selectedJobFilter]);

  // Status change action
  const handleStatusChange = async (candidateId, newStatus) => {
    const doUpdate = async () => {
      await api.updateApplicantStatus(candidateId, newStatus);
      refreshCandidates();
    };
    try {
      await doUpdate();
    } catch (e) {
      // If network error ("Failed to fetch"), retry once after a short delay
      if (e.message === "Failed to fetch" || e.message?.includes("fetch")) {
        console.warn("[Shortlist] Network error, retrying in 1s...", e);
        try {
          await new Promise(r => setTimeout(r, 1000));
          await doUpdate();
        } catch (e2) {
          alert(`Network error: Could not reach the server. Please check if the backend is running on port 8000.\n\nDetails: ${e2.message}`);
        }
      } else {
        alert(`Error updating status: ${e.message}`);
      }
    }
  };

  // Book slot action
  const handleBookSlot = async () => {
    if (!scheduleCandidate || !selectedSlotId) return;
    try {
      const res = await api.bookSlot(scheduleCandidate.id, selectedSlotId);
      alert(res.message);
      setScheduleCandidate(null);
      setSelectedSlotId(null);
      refreshSlots();
      refreshCandidates();
    } catch (e) { alert(e.message); }
  };

  // Fetch chat transcript when a candidate is selected
  useEffect(() => {
    if (!selectedCandidate?.chat_session_id) return;
    if (chatMessages[selectedCandidate.id]) return;
    api.getChatSession(selectedCandidate.chat_session_id).then(session => {
      if (session?.messages?.length) {
        setChatMessages(prev => ({ ...prev, [selectedCandidate.id]: session.messages }));
      }
    }).catch(() => {});
  }, [selectedCandidate]);

  const getMsgs = (id) => chatMessages[id] || [];
  const totalUnread = candidates.reduce((a, c) => a + (c.unread || 0), 0);

  const sendHRMsg = () => {
    if (!chatInput.trim() || !selectedCandidate) return;
    const msg = { role: "hr", text: chatInput, time: now() };
    setChatMessages(p => ({ ...p, [selectedCandidate.id]: [...getMsgs(selectedCandidate.id), msg] }));
    setChatInput("");
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "⬡" },
    { id: "candidates", label: "Candidates", icon: "◈" },
    { id: "jobs", label: "Jobs", icon: "💼" },
    { id: "messages", label: "Messages", icon: "◻", badge: totalUnread },
    { id: "schedule", label: "Schedule", icon: "◷" },
  ];

  // JD filter dropdown (shared across tabs)
  const JDFilterBar = () => {
    if (jobs.length === 0) return null;
    const selectedJob = jobs.find(j => j.id === selectedJobFilter);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(0,112,243,0.06)", border: "1px solid rgba(0,112,243,0.15)" }}>
        <span style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, flexShrink: 0 }}>Filter by JD</span>
        <select value={selectedJobFilter} onChange={e => setSelectedJobFilter(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
          <option value="" style={{ background: "#0d1117" }}>All Positions</option>
          {jobs.map(j => <option key={j.id} value={j.id} style={{ background: "#0d1117" }}>{j.title}</option>)}
        </select>
        {selectedJob && <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{candidates.length} applicant{candidates.length !== 1 ? "s" : ""}</span>}
      </div>
    );
  };

  // ── OVERVIEW ──
  const Overview = () => (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Recruitment Overview</h2>
      <p style={{ color: S.muted, fontSize: 14, marginBottom: 32 }}>Real-time pipeline status · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      <JDFilterBar />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Applicants", value: candidates.length, delta: `+${candidates.length} total`, color: S.blue },
          { label: "Engaged", value: candidates.filter(c => ["engaged","shortlisted","interview_scheduled"].includes(c.status)).length, delta: "Chat done", color: "#F59E0B" },
          { label: "Shortlisted", value: candidates.filter(c => ["shortlisted","interview_scheduled"].includes(c.status)).length, delta: "By HR", color: S.cyan },
          { label: "Interviews", value: candidates.filter(c => c.status === "interview_scheduled").length, delta: "Booked", color: "#10B981" },
        ].map(m => (
          <div key={m.label} style={{ padding: "22px 20px", borderRadius: 16, background: S.surface, border: `1px solid ${S.border}` }}>
            <div style={{ width: 32, height: 3, borderRadius: 4, background: m.color, marginBottom: 18 }} />
            <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{m.label}</p>
            <p style={{ color: "#fff", fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{m.value}</p>
            <p style={{ color: m.color, fontSize: 12 }}>{m.delta}</p>
          </div>
        ))}
      </div>
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 26 }}>
        <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 22 }}>Resume · Engagement · Final Score</p>
        <div style={{ display: "flex", gap: 14, marginBottom: 14, paddingLeft: 48+14+120+14+0 }}>
          <span style={{ color: S.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, flex: 1, textAlign: "center" }}>Final Score</span>
          <span style={{ color: S.muted, fontSize: 10, width: 60, textAlign: "center" }}>Resume</span>
          <span style={{ color: S.muted, fontSize: 10, width: 60, textAlign: "center" }}>Engage</span>
          <span style={{ width: 80 }} />
        </div>
        {[...candidates].sort((a, b) => (b.final_score || b.score || 0) - (a.final_score || a.score || 0)).map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${(statusColor[c.status] || S.muted)}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: statusColor[c.status] || S.muted, flexShrink: 0 }}>{c.avatar}</div>
            <span style={{ color: "#94a3b8", fontSize: 13, width: 120, flexShrink: 0 }}>{c.name}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${c.final_score || c.score || 0}%`, background: `linear-gradient(90deg, ${S.blue}, ${(c.final_score || c.score || 0) > 70 ? S.cyan : "#F59E0B"})`, transition: "width 1s" }} />
            </div>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, width: 60, textAlign: "center" }}>{c.score || "—"}%</span>
            <span style={{ color: c.engagement_score != null ? "#F59E0B" : S.dim, fontSize: 13, fontWeight: 700, width: 60, textAlign: "center" }}>{c.engagement_score != null ? `${c.engagement_score}%` : "—"}</span>
            <div style={{ padding: "3px 10px", borderRadius: 20, background: `${(statusColor[c.status] || S.muted)}18`, border: `1px solid ${(statusColor[c.status] || S.muted)}44`, width: 80, textAlign: "center" }}>
              <span style={{ color: statusColor[c.status] || S.muted, fontSize: 11, fontWeight: 600 }}>{statusLabel[c.status] || c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── CANDIDATES ──
  const Candidates = () => (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Candidate Pool</h2>
      <p style={{ color: S.muted, fontSize: 14, marginBottom: 28 }}>AI-ranked by final score (60% resume + 40% engagement)</p>
      <JDFilterBar />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[...candidates].sort((a, b) => (b.final_score || b.score || 0) - (a.final_score || a.score || 0)).map((c, i) => (
          <div key={c.id} style={{ padding: "18px 22px", borderRadius: 14, background: S.surface, border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 16, transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = S.surface}>
            <span style={{ color: S.dim, fontSize: 11, fontWeight: 700, width: 18 }}>#{i + 1}</span>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${(statusColor[c.status] || S.muted)}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: statusColor[c.status] || S.muted }}>{c.avatar}</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{c.name}</p>
              <p style={{ color: S.muted, fontSize: 12 }}>{c.role} · {c.college || ""}</p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 180 }}>
              {(c.skills || []).slice(0, 3).map(s => <span key={s} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(0,112,243,0.1)", border: "1px solid rgba(0,112,243,0.2)", color: "#60a5fa", fontSize: 11, fontWeight: 600 }}>{s}</span>)}
            </div>
            {/* Three scores */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#60a5fa" }}>{c.score || "—"}<span style={{ fontSize: 10, fontWeight: 400 }}>%</span></p>
                <p style={{ color: S.muted, fontSize: 9 }}>resume</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: c.engagement_score != null ? "#F59E0B" : S.dim }}>{c.engagement_score != null ? c.engagement_score : "—"}<span style={{ fontSize: 10, fontWeight: 400 }}>%</span></p>
                <p style={{ color: S.muted, fontSize: 9 }}>engage</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: (c.final_score || 0) > 70 ? S.cyan : (c.final_score || 0) > 50 ? "#F59E0B" : "#94a3b8" }}>{c.final_score != null ? c.final_score : "—"}<span style={{ fontSize: 10, fontWeight: 400 }}>%</span></p>
                <p style={{ color: S.muted, fontSize: 9 }}>final</p>
              </div>
            </div>
            <div style={{ padding: "4px 12px", borderRadius: 20, background: `${(statusColor[c.status] || S.muted)}18`, border: `1px solid ${(statusColor[c.status] || S.muted)}44` }}>
              <span style={{ color: statusColor[c.status] || S.muted, fontSize: 11, fontWeight: 600 }}>{statusLabel[c.status] || c.status}</span>
            </div>
            {/* Preferred dates */}
            {(c.preferred_dates?.length > 0) && (
              <div style={{ display: "flex", gap: 4, flexDirection: "column", marginRight: 8 }}>
                {c.preferred_dates.map((d, j) => <span key={j} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(0,112,243,0.1)", border: "1px solid rgba(0,112,243,0.2)", color: "#60a5fa", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>📅 {d}</span>)}
              </div>
            )}
            {/* Actions */}
            <div style={{ display: "flex", gap: 6 }}>
              {c.status === "engaged" && (
                <>
                  <button onClick={() => handleStatusChange(c.id, "shortlisted")} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid rgba(79,255,227,0.4)`, background: "rgba(79,255,227,0.1)", color: S.cyan, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✓ Shortlist</button>
                  <button onClick={() => handleStatusChange(c.id, "rejected")} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>✗ Reject</button>
                </>
              )}
              {c.status === "shortlisted" && (
                <button onClick={() => { setScheduleCandidate(c); setTab("schedule"); }} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid rgba(16,185,129,0.4)`, background: "rgba(16,185,129,0.1)", color: "#10B981", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>📅 Schedule</button>
              )}
              <button onClick={() => { setSelectedCandidate(c); setTab("messages"); }} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid rgba(0,112,243,0.3)`, background: "rgba(0,112,243,0.1)", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Chat</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── MESSAGES ──
  const Messages = () => (
    <div style={{ display: "flex", height: "calc(100vh - 64px)" }}>
      <div style={{ width: 290, borderRight: `1px solid ${S.border}`, overflowY: "auto", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${S.border}` }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Messages</p>
          <p style={{ color: S.muted, fontSize: 12 }}>{candidates.length} conversations</p>
        </div>
        {candidates.map(c => (
          <div key={c.id} onClick={() => setSelectedCandidate(c)} style={{ padding: "13px 16px", cursor: "pointer", borderBottom: `1px solid rgba(255,255,255,0.04)`, background: selectedCandidate?.id === c.id ? "rgba(0,112,243,0.1)" : "transparent", borderLeft: `3px solid ${selectedCandidate?.id === c.id ? S.blue : "transparent"}`, transition: "all 0.15s" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${statusColor[c.status]}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: statusColor[c.status] }}>{c.avatar || c.name?.substring(0, 2).toUpperCase()}</div>
                {(c.unread || 0) > 0 && <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: S.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>{c.unread}</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: S.dim, fontSize: 10 }}>{c.lastTime || ""}</span>
                </div>
                <p style={{ color: S.muted, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg || "No messages yet"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCandidate ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: `${statusColor[selectedCandidate.status]}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: statusColor[selectedCandidate.status] }}>{selectedCandidate.avatar || selectedCandidate.name?.substring(0, 2).toUpperCase()}</div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{selectedCandidate.name}</p>
              <p style={{ color: S.muted, fontSize: 12 }}>{selectedCandidate.role} · {selectedCandidate.score}% match{selectedCandidate.psychology_rating != null ? ` · 🧠 ${selectedCandidate.psychology_rating}/10` : ""}</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button onClick={() => setTab("schedule")} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>📅 Schedule</button>
              <div style={{ padding: "5px 14px", borderRadius: 20, background: `${statusColor[selectedCandidate.status]}18`, border: `1px solid ${statusColor[selectedCandidate.status]}44` }}>
                <span style={{ color: statusColor[selectedCandidate.status], fontSize: 11, fontWeight: 600 }}>{statusLabel[selectedCandidate.status]}</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {getMsgs(selectedCandidate.id).map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "hr" ? "flex-end" : "flex-start", gap: 10 }}>
                {m.role !== "hr" && <div style={{ width: 30, height: 30, borderRadius: 8, background: m.role === "ai" ? `linear-gradient(135deg, ${S.blue}, ${S.cyan})` : `${statusColor[selectedCandidate.status]}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: m.role === "ai" ? S.bg : statusColor[selectedCandidate.status], flexShrink: 0, marginTop: 2 }}>{m.role === "ai" ? "A" : selectedCandidate.avatar}</div>}
                <div style={{ maxWidth: "65%" }}>
                  {m.role !== "hr" && <p style={{ color: S.dim, fontSize: 10, marginBottom: 4 }}>{m.role === "ai" ? "ARIA (AI)" : selectedCandidate.name}</p>}
                  <div style={{ padding: "11px 15px", borderRadius: m.role === "hr" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: m.role === "hr" ? `linear-gradient(135deg, ${S.blue}, #0057C2)` : "rgba(255,255,255,0.05)", color: S.text, fontSize: 13, lineHeight: 1.6, border: m.role !== "hr" ? `1px solid ${S.border}` : "none" }}>{m.text}</div>
                  <p style={{ color: "#1a202c", fontSize: 10, marginTop: 3, textAlign: m.role === "hr" ? "right" : "left" }}>{m.time}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "12px 20px", borderTop: `1px solid rgba(255,255,255,0.05)`, display: "flex", gap: 10, flexShrink: 0 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendHRMsg()} placeholder={`Message ${selectedCandidate.name}…`}
              style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
            <button onClick={sendHRMsg} style={{ padding: "11px 18px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, color: S.bg, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <p style={{ color: S.muted, fontSize: 15 }}>Select a candidate to view conversation</p>
        </div>
      )}
    </div>
  );

  // ── SCHEDULE ──
  const schedulableCandidates = candidates.filter(c => ["shortlisted", "interview_scheduled"].includes(c.status));

  // Build conflict map: date -> list of candidate names who prefer that date
  const dateConflictMap = {};
  schedulableCandidates.forEach(c => {
    (c.preferred_dates || []).forEach(d => {
      if (!dateConflictMap[d]) dateConflictMap[d] = [];
      dateConflictMap[d].push(c.name);
    });
  });

  const handleConfirmDate = async (candidateId, date) => {
    try {
      await api.confirmInterviewDate(candidateId, date);
      refreshCandidates();
    } catch (e) { alert(e.message); }
  };

  const Schedule = () => (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Interview Scheduling</h2>
      <p style={{ color: S.muted, fontSize: 14, marginBottom: 28 }}>Review preferred dates · Detect conflicts · Confirm interviews</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: shortlisted candidates + their preferred dates */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24 }}>
          <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>Shortlisted Candidates & Preferences</p>
          {schedulableCandidates.length === 0 ? (
            <p style={{ color: S.dim, fontSize: 13, padding: 20, textAlign: "center" }}>No shortlisted candidates yet. Shortlist from the Candidates tab first.</p>
          ) : schedulableCandidates.map(c => {
            const isScheduled = c.status === "interview_scheduled";
            return (
              <div key={c.id} style={{ padding: "16px 18px", borderRadius: 12, background: isScheduled ? "rgba(79,255,227,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isScheduled ? "rgba(79,255,227,0.2)" : S.border}`, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${S.cyan}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: S.cyan }}>{c.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{c.name}</p>
                    <p style={{ color: S.muted, fontSize: 11 }}>Final: {c.final_score || c.score}%</p>
                  </div>
                  {isScheduled && <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981", fontSize: 10, fontWeight: 700 }}>✓ {c.confirmed_interview_date}</span>}
                </div>
                {/* Preferred dates with conflict highlights */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(c.preferred_dates || []).length === 0 ? (
                    <span style={{ color: S.dim, fontSize: 12 }}>No preferred dates submitted</span>
                  ) : (c.preferred_dates || []).map((d, j) => {
                    const hasConflict = (dateConflictMap[d] || []).length > 1;
                    const isConfirmed = c.confirmed_interview_date === d;
                    return (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ padding: "5px 12px", borderRadius: 8, background: hasConflict ? "rgba(239,68,68,0.12)" : isConfirmed ? "rgba(79,255,227,0.12)" : "rgba(0,112,243,0.1)", border: `1px solid ${hasConflict ? "rgba(239,68,68,0.35)" : isConfirmed ? "rgba(79,255,227,0.35)" : "rgba(0,112,243,0.25)"}`, color: hasConflict ? "#f87171" : isConfirmed ? S.cyan : "#60a5fa", fontSize: 12, fontWeight: 600 }}>
                          {hasConflict ? "⚠️" : "📅"} {d}
                        </span>
                        {!isScheduled && (
                          <button onClick={() => handleConfirmDate(c.id, d)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(79,255,227,0.4)", background: "rgba(79,255,227,0.08)", color: S.cyan, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Confirm</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Show who else wants the same date if conflict */}
                {(c.preferred_dates || []).some(d => (dateConflictMap[d] || []).length > 1) && (
                  <p style={{ color: "#f87171", fontSize: 11, marginTop: 8 }}>⚠️ Date conflict — {(c.preferred_dates || []).filter(d => (dateConflictMap[d] || []).length > 1).map(d => `${d}: ${dateConflictMap[d].filter(n => n !== c.name).join(", ")}`).join("; ")}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: confirmed interviews + conflict summary */}
        <div>
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>Confirmed Interviews ({candidates.filter(c => c.status === "interview_scheduled").length})</p>
            {candidates.filter(c => c.status === "interview_scheduled").length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <p style={{ color: S.dim, fontSize: 13 }}>No confirmed interviews yet</p>
              </div>
            ) : candidates.filter(c => c.status === "interview_scheduled").map(c => (
              <div key={c.id} style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(79,255,227,0.05)", border: "1px solid rgba(79,255,227,0.15)", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                  <span style={{ color: S.cyan, fontSize: 11, fontWeight: 600 }}>✓ Confirmed</span>
                </div>
                <p style={{ color: S.muted, fontSize: 13 }}>📅 {c.confirmed_interview_date}</p>
              </div>
            ))}
          </div>

          {/* Conflict summary */}
          {Object.entries(dateConflictMap).filter(([, names]) => names.length > 1).length > 0 && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 24 }}>
              <p style={{ color: "#f87171", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14, fontWeight: 700 }}>⚠️ Date Conflicts</p>
              {Object.entries(dateConflictMap).filter(([, names]) => names.length > 1).map(([date, names]) => (
                <div key={date} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", marginBottom: 8 }}>
                  <p style={{ color: "#f87171", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📅 {date}</p>
                  <p style={{ color: S.muted, fontSize: 12 }}>{names.join(", ")} — HR must reschedule one</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── JOBS MANAGEMENT ──
  const handleCreateJob = async () => {
    if (!newJobTitle.trim() || !newJobDesc.trim()) { setJobError("Title and description are required."); return; }
    setJobError("");
    try {
      await api.createJob({
        title: newJobTitle.trim(),
        description: newJobDesc.trim(),
        requiredSkills: newJobSkills.split(",").map(s => s.trim()).filter(Boolean),
        niceToHave: newJobNice.split(",").map(s => s.trim()).filter(Boolean),
        experienceYears: newJobExp ? parseInt(newJobExp) : null,
        location: newJobLoc.trim() || null,
      });
      setNewJobTitle(""); setNewJobDesc(""); setNewJobSkills(""); setNewJobNice(""); setNewJobExp(""); setNewJobLoc("");
      refreshJobs();
    } catch (e) { setJobError(e.message); }
  };

  const handleDeactivateJob = async (jobId) => {
    if (!window.confirm("Deactivate this job posting? Applicants won't be able to apply to it anymore.")) return;
    try {
      await api.deleteJob(jobId);
      refreshJobs();
    } catch (e) { alert(e.message); }
  };

  const inputStyleHR = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" };

  // NOTE: Jobs content is rendered inline (not as a component) to prevent
  // React from unmounting/remounting inputs on every keystroke.
  const jobsContent = (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Job Descriptions</h2>
      <p style={{ color: S.muted, fontSize: 14, marginBottom: 28 }}>Create and manage job postings · Applicants see these positions when applying</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left: Create new JD form */}
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, overflow: "hidden" }}>
          <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>Post New Position</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 6 }}>Job Title *</span>
              <input value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} placeholder="e.g. Senior React Developer" style={inputStyleHR} />
            </div>
            <div>
              <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 6 }}>Description *</span>
              <textarea value={newJobDesc} onChange={e => setNewJobDesc(e.target.value)} placeholder="Detailed job description…" rows={5} style={{ ...inputStyleHR, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div>
              <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 6 }}>Required Skills (comma-separated)</span>
              <input value={newJobSkills} onChange={e => setNewJobSkills(e.target.value)} placeholder="React, Node.js, TypeScript" style={inputStyleHR} />
            </div>
            <div>
              <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 6 }}>Nice to Have (comma-separated)</span>
              <input value={newJobNice} onChange={e => setNewJobNice(e.target.value)} placeholder="AWS, Docker, GraphQL" style={inputStyleHR} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 6 }}>Experience (years)</span>
                <input type="number" value={newJobExp} onChange={e => setNewJobExp(e.target.value)} placeholder="3" style={inputStyleHR} />
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: S.muted, fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 6 }}>Location</span>
                <input value={newJobLoc} onChange={e => setNewJobLoc(e.target.value)} placeholder="Remote / Kolkata" style={inputStyleHR} />
              </div>
            </div>
            {jobError && <p style={{ color: "#f87171", fontSize: 12 }}>{jobError}</p>}
            <button onClick={handleCreateJob} style={{ padding: "12px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${S.blue}, ${S.cyan})`, color: S.bg, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>Post Job Description</button>
          </div>
        </div>

        {/* Right: Existing JDs */}
        <div style={{ minWidth: 0 }}>
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, overflow: "hidden" }}>
            <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>Active Positions ({jobs.length})</p>
            {jobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
                <p style={{ color: S.dim, fontSize: 13 }}>No job descriptions posted yet</p>
                <p style={{ color: S.dim, fontSize: 12, marginTop: 4 }}>Create one to start receiving applications</p>
              </div>
            ) : jobs.map(j => (
              <div key={j.id} style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${S.border}`, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</p>
                    <p style={{ color: S.muted, fontSize: 11 }}>{j.location || "No location"} {j.experience_years ? `· ${j.experience_years}+ years` : ""}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setSelectedJobFilter(j.id); setTab("candidates"); }} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${S.border}`, background: "rgba(0,112,243,0.1)", color: "#60a5fa", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>View Rankings</button>
                    <button onClick={() => handleDeactivateJob(j.id)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>Deactivate</button>
                  </div>
                </div>
                <p style={{ color: S.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>{j.description?.substring(0, 120)}{j.description?.length > 120 ? "…" : ""}</p>
                {j.required_skills?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {j.required_skills.map(s => <span key={s} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(0,112,243,0.1)", border: "1px solid rgba(0,112,243,0.2)", color: "#60a5fa", fontSize: 10, fontWeight: 600 }}>{s}</span>)}
                  </div>
                )}
                <p style={{ color: S.dim, fontSize: 10, marginTop: 8 }}>Posted {new Date(j.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'DM Sans', sans-serif", display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 230, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 20px", borderBottom: `1px solid ${S.border}` }}>
          <Logo size="sm" />
          <p style={{ color: S.muted, fontSize: 11, marginTop: 6 }}>HR Portal</p>
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: tab === t.id ? "rgba(0,112,243,0.12)" : "transparent", borderLeft: `3px solid ${tab === t.id ? S.blue : "transparent"}`, borderTop: "none", borderRight: "none", borderBottom: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: tab === t.id ? "#fff" : S.muted, fontSize: 14, fontWeight: tab === t.id ? 700 : 400, textAlign: "left", width: "100%", transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
              {t.badge > 0 && <span style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: S.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>
            <div>
              <p style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>HR Admin</p>
              <p style={{ color: S.muted, fontSize: 10 }}>hr@company.com</p>
            </div>
          </div>
          <button onClick={onHome} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Sign Out</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: tab === "messages" ? "hidden" : "auto" }}>
        {tab === "overview" && <Overview />}
        {tab === "candidates" && <Candidates />}
        {tab === "jobs" && jobsContent}
        {tab === "messages" && <Messages />}
        {tab === "schedule" && <Schedule />}
      </div>
      <style>{`*{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent;} input::placeholder{color:#2d3748;} input:focus{border-color:rgba(0,112,243,0.4)!important;}`}</style>
    </div>
  );
}

// ─── NOTIFICATION BELL ────────────────────────────────────────────────────────
function NotificationBell({ googleId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  const refresh = () => {
    if (!googleId) return;
    api.getMyNotifications(googleId).then(setNotifications).catch(() => {});
  };

  useEffect(() => { refresh(); const iv = setInterval(refresh, 8000); return () => clearInterval(iv); }, [googleId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async () => {
    await api.markNotificationsRead(googleId).catch(() => {});
    refresh();
  };

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ position: "relative", width: 44, height: 44, borderRadius: 12, border: `1px solid ${S.border}`, background: open ? "rgba(0,112,243,0.15)" : "rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}>
        🔔
        {unread > 0 && (
          <div style={{ position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, background: "linear-gradient(135deg, #ef4444, #f87171)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800, padding: "0 5px", boxShadow: "0 2px 8px rgba(239,68,68,0.5)", animation: "pulse 2s ease-in-out infinite" }}>{unread}</div>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: 52, right: 0, width: 380, maxHeight: 440, background: "#0d1117", border: `1px solid ${S.border}`, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.7)", zIndex: 100, overflow: "hidden", animation: "fadeIn 0.2s ease" }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Notifications</p>
              <p style={{ color: S.muted, fontSize: 11 }}>{unread > 0 ? `${unread} unread` : "All caught up!"}</p>
            </div>
            {unread > 0 && (
              <button onClick={handleMarkRead} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${S.border}`, background: "rgba(255,255,255,0.05)", color: S.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
                <p style={{ color: S.muted, fontSize: 13 }}>No notifications yet</p>
                <p style={{ color: S.dim, fontSize: 12 }}>You'll be notified when HR reviews your application</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: "14px 20px", borderBottom: `1px solid rgba(255,255,255,0.04)`, background: n.is_read ? "transparent" : "rgba(0,112,243,0.06)", display: "flex", gap: 12, alignItems: "flex-start", transition: "background 0.2s" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: n.type === "shortlisted" ? "rgba(79,255,227,0.12)" : "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                  {n.type === "shortlisted" ? "🎉" : "📅"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{n.title}</p>
                  <p style={{ color: S.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>{n.message}</p>
                  <p style={{ color: S.dim, fontSize: 10 }}>{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: S.blue, flexShrink: 0, marginTop: 6 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APPLICANT DASHBOARD ──────────────────────────────────────────────────────
function ApplicantDashboard({ googleId, googleUser, onHome }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!googleId) return;
    api.getMyProfile(googleId).then(data => { setProfile(data); setLoading(false); }).catch(() => setLoading(false));
    const iv = setInterval(() => {
      api.getMyProfile(googleId).then(setProfile).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, [googleId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <GlowBg />
        <div style={{ textAlign: "center", zIndex: 1 }}>
          <Logo size="lg" />
          <p style={{ color: S.muted, marginTop: 16, fontSize: 14 }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <GlowBg />
        <div style={{ textAlign: "center", zIndex: 1, maxWidth: 400 }}>
          <Logo size="lg" />
          <p style={{ color: S.muted, marginTop: 16, fontSize: 14, marginBottom: 24 }}>Profile not found. You may not have submitted an application yet.</p>
          <Btn onClick={onHome}>← Back to Home</Btn>
        </div>
      </div>
    );
  }

  const p = profile;
  const statusSteps = ["applied", "engaged", "shortlisted", "interview_scheduled"];
  const statusStepLabels = { applied: "Applied", engaged: "Engaged", shortlisted: "Shortlisted", interview_scheduled: "Scheduled" };
  const currentStepIndex = statusSteps.indexOf(p.status);

  const scoreCards = [
    { label: "Resume Match", value: p.match_score, unit: "%", color: S.blue, icon: "📄" },
    { label: "Engagement", value: p.engagement_score, unit: "%", color: "#F59E0B", icon: "💬" },
    { label: "Final Score", value: p.final_score, unit: "%", color: S.cyan, icon: "⭐" },
    { label: "Psychology", value: p.psychology_rating, unit: "/10", color: "#10B981", icon: "🧠" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      <GlowBg />

      {/* Top bar */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", padding: "16px 32px", borderBottom: `1px solid ${S.border}`, background: "rgba(8,12,20,0.8)", backdropFilter: "blur(20px)" }}>
        <Logo size="sm" />
        <span style={{ color: S.muted, fontSize: 12, marginLeft: 12 }}>Applicant Portal</span>
        <div style={{ flex: 1 }} />
        <NotificationBell googleId={googleId} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 20 }}>
          {googleUser?.picture && <img src={googleUser.picture} alt="" style={{ width: 34, height: 34, borderRadius: 9, border: `2px solid ${S.border}` }} />}
          <div>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{p.name}</p>
            <p style={{ color: S.muted, fontSize: 11 }}>{p.google_email}</p>
          </div>
        </div>
        <button onClick={onHome} style={{ marginLeft: 20, padding: "8px 16px", borderRadius: 8, border: `1px solid ${S.border}`, background: "transparent", color: S.muted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Welcome header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Welcome back, {p.name.split(" ")[0]}! 👋</h1>
          <p style={{ color: S.muted, fontSize: 14 }}>
            {p.role_applied ? `Applied for ${p.role_applied}` : "Application submitted"} · {p.college || ""} · Status: <span style={{ color: statusColor[p.status] || S.muted, fontWeight: 600 }}>{statusLabel[p.status] || p.status}</span>
          </p>
        </div>

        {/* Confirmed interview banner */}
        {p.confirmed_interview_date && (
          <div style={{ padding: "18px 24px", borderRadius: 16, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📅</div>
            <div>
              <p style={{ color: "#10B981", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Interview Scheduled!</p>
              <p style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{p.confirmed_interview_date}</p>
              <p style={{ color: S.muted, fontSize: 12 }}>Please be prepared and arrive 10 minutes early</p>
            </div>
          </div>
        )}

        {/* Score cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {scoreCards.map(sc => {
            const hasValue = sc.value != null;
            const displayValue = hasValue ? (sc.unit === "/10" ? sc.value.toFixed(1) : Math.round(sc.value)) : "—";
            const pct = hasValue ? (sc.unit === "/10" ? (sc.value / 10) * 100 : sc.value) : 0;
            return (
              <div key={sc.label} style={{ padding: "22px 20px", borderRadius: 16, background: S.surface, border: `1px solid ${S.border}`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: sc.color, transition: "width 1.5s ease", boxShadow: `0 0 12px ${sc.color}55` }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>{sc.icon}</span>
                  <span style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 }}>{sc.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: hasValue ? "#fff" : S.dim }}>{displayValue}</span>
                  {hasValue && <span style={{ fontSize: 14, color: sc.color, fontWeight: 600 }}>{sc.unit}</span>}
                </div>
                {!hasValue && <p style={{ color: S.dim, fontSize: 11, marginTop: 4 }}>Pending</p>}
              </div>
            );
          })}
        </div>

        {/* Two-column: status + skills */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          {/* Status timeline */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24 }}>
            <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>Application Progress</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {statusSteps.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isLast = i === statusSteps.length - 1;
                return (
                  <div key={step}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: isActive ? (isCurrent ? `linear-gradient(135deg, ${S.blue}, ${S.cyan})` : `${S.cyan}22`) : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: isCurrent ? "none" : `1px solid ${isActive ? `${S.cyan}44` : S.border}`, boxShadow: isCurrent ? `0 0 16px rgba(79,255,227,0.3)` : "none" }}>
                        {isActive ? <span style={{ color: isCurrent ? S.bg : S.cyan, fontSize: 12, fontWeight: 800 }}>✓</span> : <span style={{ color: S.dim, fontSize: 12 }}>{i + 1}</span>}
                      </div>
                      <div>
                        <p style={{ color: isActive ? "#fff" : S.muted, fontSize: 14, fontWeight: isCurrent ? 700 : 400 }}>{statusStepLabels[step]}</p>
                        {isCurrent && <p style={{ color: S.cyan, fontSize: 11 }}>Current</p>}
                      </div>
                    </div>
                    {!isLast && (
                      <div style={{ width: 2, height: 24, marginLeft: 15, background: isActive && i < currentStepIndex ? `linear-gradient(to bottom, ${S.cyan}66, ${S.cyan}22)` : "rgba(255,255,255,0.06)" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24 }}>
            <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>Detected Skills</p>
            {(p.skills || []).length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.skills.map((s, i) => (
                  <span key={i} style={{ padding: "8px 16px", borderRadius: 20, background: `${S.blue}18`, border: `1px solid ${S.blue}33`, color: "#60a5fa", fontSize: 13, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            ) : (
              <p style={{ color: S.dim, fontSize: 13 }}>Skills will appear after resume analysis</p>
            )}

            {/* Resume analysis summary */}
            <div style={{ marginTop: 20 }}>
              <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Resume Overview</p>
              {p.resume_analysis && (p.resume_analysis.summary || p.resume_analysis.strengths?.length || p.resume_analysis.education?.length) ? (
                <>
                  {p.resume_analysis.summary && <p style={{ color: S.text, fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>{p.resume_analysis.summary}</p>}
                  {p.resume_analysis.experience_years != null && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(79,255,227,0.08)", border: "1px solid rgba(79,255,227,0.2)", color: S.cyan, fontSize: 12, fontWeight: 600 }}>🕒 {p.resume_analysis.experience_years}+ years exp</span>
                    </div>
                  )}
                  {(p.resume_analysis.strengths || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ color: S.cyan, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>✦ Key Strengths</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.resume_analysis.strengths.map((s, i) => <span key={i} style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(79,255,227,0.06)", border: "1px solid rgba(79,255,227,0.15)", color: S.text, fontSize: 12 }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                  {(p.resume_analysis.education || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🎓 Education</p>
                      {p.resume_analysis.education.map((ed, i) => <p key={i} style={{ color: S.muted, fontSize: 12, marginBottom: 4 }}>• {typeof ed === "string" ? ed : (ed.degree || ed.institution || JSON.stringify(ed))}</p>)}
                    </div>
                  )}
                  {(p.resume_analysis.key_projects || []).length > 0 && (
                    <div>
                      <p style={{ color: "#F59E0B", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>🚀 Notable Projects</p>
                      {p.resume_analysis.key_projects.map((proj, i) => <p key={i} style={{ color: S.muted, fontSize: 12, marginBottom: 4 }}>• {typeof proj === "string" ? proj : (proj.name || proj.title || JSON.stringify(proj))}</p>)}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: S.dim, fontSize: 13 }}>Resume analysis in progress or unavailable for this document.</p>
              )}
            </div>
          </div>
        </div>

        {/* Score breakdown bars */}
        {(p.match_score != null || p.engagement_score != null) && (
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <p style={{ color: S.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>Score Breakdown</p>
            {[
              { label: "Resume Match", value: p.match_score, max: 100, color: S.blue },
              { label: "Engagement Score", value: p.engagement_score, max: 100, color: "#F59E0B" },
              { label: "Final Score", value: p.final_score, max: 100, color: S.cyan },
              { label: "Psychology Rating", value: p.psychology_rating, max: 10, color: "#10B981" },
            ].filter(b => b.value != null).map(b => (
              <div key={b.label} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: S.text, fontSize: 13 }}>{b.label}</span>
                  <span style={{ color: b.color, fontSize: 13, fontWeight: 700 }}>{b.max === 10 ? b.value.toFixed(1) : Math.round(b.value)}{b.max === 10 ? "/10" : "%"}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: b.color, width: `${(b.value / b.max) * 100}%`, boxShadow: `0 0 8px ${b.color}66`, transition: "width 1.2s ease" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ color: S.dim, fontSize: 12 }}>Your profile is continuously evaluated. Check back for updates! 🚀</p>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}} *{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent;}`}</style>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // screen: "home" | "loading" | "chat" | "report" | "hr" | "applicant_dashboard"
  const [screen, setScreen] = useState("home");
  const [applicantData, setApplicantData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [report, setReport] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);

  const [applicantQuestions, setApplicantQuestions] = useState([]);

  const handleApplicantStart = async (data) => {
    setApplicantData(data);
    setApplicantQuestions(data.questions || []);
    setScreen("loading");
    // Start a chat session
    try {
      const sess = await api.startChatSession(data.applicantId, data.email);
      setSessionId(sess.session_id);
    } catch (_) { setSessionId(null); }
  };

  // Returning applicant — already submitted, go to dashboard
  const handleApplicantReturn = (gUser) => {
    setGoogleUser(gUser);
    setScreen("applicant_dashboard");
  };

  const handleLoadingDone = () => setScreen("chat");

  const handleChatComplete = (reportData) => {
    setReport(reportData);
    setScreen("report");
  };

  const goHome = () => {
    setScreen("home");
    setApplicantData(null);
    setSessionId(null);
    setReport(null);
    setGoogleUser(null);
    setApplicantQuestions([]);
    localStorage.removeItem("aria_token");
  };

  return (
    <>
      {screen === "home" && <HomeScreen onApplicant={handleApplicantStart} onHR={() => setScreen("hr")} onApplicantReturn={handleApplicantReturn} />}
      {screen === "loading" && <LoadingScreen matchScore={applicantData?.matchScore} onDone={handleLoadingDone} />}
      {screen === "chat" && <ApplicantChat applicantId={applicantData?.applicantId} email={applicantData?.email} sessionId={sessionId} questions={applicantQuestions} onComplete={handleChatComplete} />}
      {screen === "report" && <PerformanceReport report={report} matchScore={applicantData?.matchScore} onHome={goHome} />}
      {screen === "hr" && <HRDashboard onHome={goHome} />}
      {screen === "applicant_dashboard" && <ApplicantDashboard googleId={googleUser?.google_id} googleUser={googleUser} onHome={goHome} />}
    </>
  );
}

