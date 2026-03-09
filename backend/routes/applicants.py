from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional
import base64
from datetime import datetime
from models.applicant import Applicant, ApplicantStatus
from models.notification import Notification, NotificationType
from models.job import Job
from core.ai_engine import analyze_resume, generate_questions, extract_skills_from_text
from core.resume_scorer import score_resume_ml

router = APIRouter()


@router.post("/submit")
async def submit_application(
    google_id: str = Form(...),
    google_email: str = Form(...),
    name: str = Form(...),
    dob: Optional[str] = Form(None),
    college: Optional[str] = Form(None),
    role_applied: Optional[str] = Form(None),
    job_id: Optional[str] = Form(None),
    preferred_date_1: Optional[str] = Form(None),
    preferred_date_2: Optional[str] = Form(None),
    resume: UploadFile = File(...),
):
    """
    Two-step gate: applicant submits profile + resume AFTER Google sign-in.
    AI analyzes the resume and generates personalized interview questions.
    Resume is scored against the specific job description if job_id is provided.
    Same user can apply to multiple job descriptions.
    """
    # Check for duplicate: same user + same job
    if job_id:
        existing = await Applicant.find_one(
            Applicant.google_id == google_id,
            Applicant.job_id == job_id,
        )
    else:
        existing = await Applicant.find_one(Applicant.google_id == google_id)
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted an application for this position.")

    content = await resume.read()
    b64 = base64.b64encode(content).decode("utf-8")

    # Extract text from resume (simplified — for production use PyMuPDF)
    resume_text = ""
    try:
        import io
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    resume_text += text + "\n"
    except Exception as e:
        print(f"[WARN] PDF extraction failed: {e}")
        resume_text = f"Resume file: {resume.filename} (text extraction unavailable)"

    # AI analysis
    analysis = await analyze_resume(resume_text)
    questions = await generate_questions(analysis)

    # Get job description for scoring (if job_id provided)
    job_description = None
    job_title = None
    if job_id:
        try:
            from beanie import PydanticObjectId
            job = await Job.get(PydanticObjectId(job_id))
            if job:
                job_description = job.description
                job_title = job.title
                if not role_applied:
                    role_applied = job.title
        except Exception:
            pass

    # ML-based resume scoring (SentenceTransformer cosine similarity)
    ml_result = score_resume_ml(resume_text, job_description=job_description)
    match_score = ml_result["match_score"]
    print(f"[ML] Resume score for {name}: {match_score}% (similarity: {ml_result['similarity_score']}, JD: {job_title or 'default'})")

    # Collect preferred dates
    preferred_dates = []
    if preferred_date_1:
        preferred_dates.append(preferred_date_1)
    if preferred_date_2:
        preferred_dates.append(preferred_date_2)

    # Extract skills — use AI analysis, fallback to keyword matching
    ai_skills = analysis.get("skills", [])
    if not ai_skills:
        ai_skills = extract_skills_from_text(resume_text)
        analysis["skills"] = ai_skills  # also update analysis so questions use them

    applicant = Applicant(
        google_id=google_id,
        google_email=google_email,
        name=name,
        dob=dob if dob else None,
        college=college,
        resume_filename=resume.filename,
        resume_content_base64=b64,
        resume_text=resume_text,
        resume_analysis=analysis,
        generated_questions=questions,
        role_applied=role_applied,
        job_id=job_id,
        match_score=match_score,
        preferred_dates=preferred_dates,
        skills=ai_skills[:10],
    )
    await applicant.insert()

    return {
        "success": True,
        "applicant_id": str(applicant.id),
        "match_score": applicant.match_score,
        "questions": questions,
        "message": "Application received. Resume analyzed. Interview questions generated.",
    }


@router.get("/{applicant_id}/questions")
async def get_questions(applicant_id: str):
    """Get AI-generated questions for an applicant."""
    from beanie import PydanticObjectId
    applicant = await Applicant.get(PydanticObjectId(applicant_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return {
        "questions": applicant.generated_questions,
        "resume_analysis": applicant.resume_analysis,
    }


@router.get("/", response_model=List[dict])
async def list_applicants(job_id: Optional[str] = Query(None)):
    """HR: get all applicants with full details. Optionally filter by job_id."""
    if job_id:
        applicants = await Applicant.find(Applicant.job_id == job_id).to_list()
    else:
        applicants = await Applicant.find_all().to_list()
    return [
        {
            "id": str(a.id),
            "google_email": a.google_email,
            "name": a.name,
            "dob": str(a.dob) if a.dob else None,
            "college": a.college,
            "resume_filename": a.resume_filename,
            "resume_analysis": a.resume_analysis,
            "status": a.status,
            "match_score": a.match_score,
            "engagement_score": a.engagement_score,
            "final_score": a.final_score,
            "psychology_rating": a.psychology_rating,
            "interview_slot_id": a.interview_slot_id,
            "preferred_dates": a.preferred_dates,
            "confirmed_interview_date": a.confirmed_interview_date,
            "skills": a.skills,
            "role_applied": a.role_applied,
            "job_id": a.job_id,
            "chat_completed": a.chat_completed,
            "chat_session_id": a.chat_session_id,
            "chat_report": a.chat_report,
            "created_at": a.created_at.isoformat(),
        }
        for a in applicants
    ]


@router.get("/{applicant_id}")
async def get_applicant(applicant_id: str):
    from beanie import PydanticObjectId
    applicant = await Applicant.get(PydanticObjectId(applicant_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.patch("/{applicant_id}/status")
async def update_status(applicant_id: str, request: Request, status: str = None):
    from beanie import PydanticObjectId
    # Accept status from JSON body OR query parameter (backwards-compatible)
    new_status = status
    try:
        body = await request.json()
        if isinstance(body, dict) and "status" in body:
            new_status = body["status"]
    except Exception:
        pass
    if not new_status:
        raise HTTPException(status_code=400, detail="No status provided")
    applicant = await Applicant.get(PydanticObjectId(applicant_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    try:
        applicant.status = ApplicantStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    applicant.updated_at = datetime.utcnow()
    await applicant.save()
    return {"success": True, "status": new_status}


# POST version — avoids PATCH CORS issues in some browsers
@router.post("/{applicant_id}/update-status")
async def update_status_post(applicant_id: str, request: Request):
    from beanie import PydanticObjectId
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON body required")
    new_status = body.get("status") if isinstance(body, dict) else None
    if not new_status:
        raise HTTPException(status_code=400, detail="No status provided")
    applicant = await Applicant.get(PydanticObjectId(applicant_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    try:
        applicant.status = ApplicantStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    applicant.updated_at = datetime.utcnow()
    await applicant.save()

    # Auto-create notification when shortlisted
    if new_status == "shortlisted":
        notif = Notification(
            google_id=applicant.google_id,
            type=NotificationType.SHORTLISTED,
            title="🎉 You've been shortlisted!",
            message="Congratulations! The HR team has reviewed your profile and shortlisted you for an interview. Stay tuned for scheduling details.",
        )
        await notif.insert()

    return {"success": True, "status": new_status}


class ConfirmDateRequest(BaseModel):
    date: str

@router.post("/{applicant_id}/confirm-date")
async def confirm_interview_date(applicant_id: str, body: ConfirmDateRequest):
    """HR confirms an interview date for a shortlisted candidate."""
    from beanie import PydanticObjectId
    applicant = await Applicant.get(PydanticObjectId(applicant_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    if applicant.status not in [ApplicantStatus.SHORTLISTED, ApplicantStatus.INTERVIEW_SCHEDULED]:
        raise HTTPException(status_code=400, detail="Only shortlisted candidates can be scheduled")
    applicant.confirmed_interview_date = body.date
    applicant.status = ApplicantStatus.INTERVIEW_SCHEDULED
    applicant.updated_at = datetime.utcnow()
    await applicant.save()

    # Auto-create notification for interview scheduling
    notif = Notification(
        google_id=applicant.google_id,
        type=NotificationType.INTERVIEW_SCHEDULED,
        title="📅 Interview Scheduled!",
        message=f"Your interview has been scheduled for {body.date}. Please be prepared and good luck!",
    )
    await notif.insert()

    return {"success": True, "date": body.date, "status": "interview_scheduled"}
