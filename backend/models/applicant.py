from beanie import Document, Indexed
from pydantic import EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class ApplicantStatus(str, Enum):
    APPLIED = "applied"
    ENGAGED = "engaged"
    IN_REVIEW = "in_review"
    SHORTLISTED = "shortlisted"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    REJECTED = "rejected"


class SkillScore(Document):
    skill: str
    score: float


class Applicant(Document):
    google_id: Indexed(str, unique=True)
    google_email: str
    name: str
    dob: Optional[date] = None
    college: Optional[str] = None
    resume_filename: str
    resume_content_base64: Optional[str] = None
    resume_text: Optional[str] = None
    resume_analysis: Optional[dict] = None          # AI-extracted skills/experience/education
    generated_questions: List[str] = []              # personalized interview questions from AI
    status: ApplicantStatus = ApplicantStatus.APPLIED
    match_score: Optional[float] = None
    engagement_score: Optional[float] = None
    final_score: Optional[float] = None
    psychology_rating: Optional[float] = None
    interview_slot_id: Optional[str] = None
    preferred_dates: List[str] = []                  # candidate's preferred interview dates
    confirmed_interview_date: Optional[str] = None   # HR-confirmed interview date
    skills: List[str] = []
    role_applied: Optional[str] = None
    job_id: Optional[str] = None                     # linked job description ID
    chat_completed: bool = False
    chat_session_id: Optional[str] = None
    chat_report: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "applicants"

    class Config:
        json_schema_extra = {
            "example": {
                "google_id": "1234567890",
                "google_email": "applicant@gmail.com",
                "name": "Arjun Mehta",
                "dob": "2000-01-15",
                "college": "Jadavpur University",
                "resume_filename": "arjun_resume.pdf",
                "status": "pending",
            }
        }
