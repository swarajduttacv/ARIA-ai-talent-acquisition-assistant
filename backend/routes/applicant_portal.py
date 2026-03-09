from fastapi import APIRouter, HTTPException, Query
from models.applicant import Applicant
from models.notification import Notification

router = APIRouter()


@router.get("/me")
async def get_my_profile(google_id: str = Query(...)):
    """Applicant fetches their own profile by google_id."""
    applicant = await Applicant.find_one(Applicant.google_id == google_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return {
        "id": str(applicant.id),
        "name": applicant.name,
        "google_email": applicant.google_email,
        "college": applicant.college,
        "role_applied": applicant.role_applied,
        "status": applicant.status,
        "match_score": applicant.match_score,
        "engagement_score": applicant.engagement_score,
        "final_score": applicant.final_score,
        "psychology_rating": applicant.psychology_rating,
        "skills": applicant.skills,
        "resume_analysis": applicant.resume_analysis,
        "chat_completed": applicant.chat_completed,
        "confirmed_interview_date": applicant.confirmed_interview_date,
        "preferred_dates": applicant.preferred_dates,
        "created_at": applicant.created_at.isoformat(),
    }


@router.get("/me/notifications")
async def get_my_notifications(google_id: str = Query(...)):
    """Get all notifications for this applicant, newest first."""
    notifications = await Notification.find(
        Notification.google_id == google_id
    ).sort("-created_at").to_list()
    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.post("/me/notifications/read-all")
async def mark_notifications_read(google_id: str = Query(...)):
    """Mark all notifications as read for this applicant."""
    notifications = await Notification.find(
        Notification.google_id == google_id,
        Notification.is_read == False,
    ).to_list()
    for n in notifications:
        n.is_read = True
        await n.save()
    return {"success": True, "marked": len(notifications)}
