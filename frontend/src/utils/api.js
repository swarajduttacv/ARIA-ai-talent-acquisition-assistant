const API_BASE = "http://localhost:8000/api";

async function request(url, options = {}) {
  const token = localStorage.getItem("aria_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  } catch (networkError) {
    // Network-level error (server down, CORS blocked, etc.)
    throw new Error("Failed to fetch");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Auth ──
export async function verifyGoogleToken(credential) {
  return request("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
}

export async function hrLogin(email, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

// ── Applicants ──
export async function submitApplication({ googleId, googleEmail, name, dob, college, roleApplied, jobId, preferredDate1, preferredDate2, resumeFile }) {
  const formData = new FormData();
  formData.append("google_id", googleId);
  formData.append("google_email", googleEmail);
  formData.append("name", name);
  if (dob) formData.append("dob", dob);
  if (college) formData.append("college", college);
  if (roleApplied) formData.append("role_applied", roleApplied);
  if (jobId) formData.append("job_id", jobId);
  if (preferredDate1) formData.append("preferred_date_1", preferredDate1);
  if (preferredDate2) formData.append("preferred_date_2", preferredDate2);
  formData.append("resume", resumeFile);
  return request("/applicants/submit", { method: "POST", body: formData });
}

export async function getApplicantQuestions(applicantId) {
  return request(`/applicants/${applicantId}/questions`);
}

export async function listApplicants(jobId) {
  const url = jobId ? `/applicants/?job_id=${encodeURIComponent(jobId)}` : "/applicants/";
  return request(url);
}

export async function getApplicant(applicantId) {
  return request(`/applicants/${applicantId}`);
}

export async function updateApplicantStatus(applicantId, status) {
  return request(`/applicants/${applicantId}/update-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

// ── Jobs ──
export async function listJobs() {
  return request("/jobs/");
}

export async function createJob({ title, description, requiredSkills, niceToHave, experienceYears, location }) {
  return request("/jobs/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description,
      required_skills: requiredSkills || [],
      nice_to_have: niceToHave || [],
      experience_years: experienceYears || null,
      location: location || null,
    }),
  });
}

export async function updateJob(jobId, data) {
  return request(`/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteJob(jobId) {
  return request(`/jobs/${jobId}`, { method: "DELETE" });
}

// ── Chat ──
export async function startChatSession(applicantId, email) {
  return request("/chat/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_id: applicantId, applicant_email: email }),
  });
}

export async function saveMessages(sessionId, messages) {
  return request(`/chat/${sessionId}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    }),
  });
}

export async function scoreResponse(sessionId, question, answer) {
  return request(`/chat/${sessionId}/score-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer }),
  });
}

export async function completeChat(sessionId, messages) {
  return request(`/chat/${sessionId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    }),
  });
}

export async function getChatSession(sessionId) {
  return request(`/chat/${sessionId}`);
}

// ── Scheduling ──
export async function listSlots() {
  return request("/scheduling/slots");
}

export async function bookSlot(applicantId, slotId) {
  return request("/scheduling/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_id: applicantId, slot_id: slotId }),
  });
}

export async function listConfirmedInterviews() {
  return request("/scheduling/confirmed");
}

export async function confirmInterviewDate(applicantId, date) {
  return request(`/applicants/${applicantId}/confirm-date`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });
}

// ── Applicant Portal ──
export async function getMyProfile(googleId) {
  return request(`/applicant-portal/me?google_id=${encodeURIComponent(googleId)}`);
}

export async function getMyNotifications(googleId) {
  return request(`/applicant-portal/me/notifications?google_id=${encodeURIComponent(googleId)}`);
}

export async function markNotificationsRead(googleId) {
  return request(`/applicant-portal/me/notifications/read-all?google_id=${encodeURIComponent(googleId)}`, {
    method: "POST",
  });
}

