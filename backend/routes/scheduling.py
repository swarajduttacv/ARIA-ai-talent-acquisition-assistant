from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from models.interview_slot import InterviewSlot
from models.applicant import Applicant, ApplicantStatus

router = APIRouter()


class BookSlotRequest(BaseModel):
    applicant_id: str
    slot_id: str


@router.get("/slots")
async def list_slots():
    """List all interview slots with availability."""
    slots = await InterviewSlot.find_all().to_list()
    return [
        {
            "id": str(s.id),
            "day": s.day,
            "time": s.time,
            "is_booked": s.is_booked,
            "booked_by": s.booked_by,
            "booked_by_name": s.booked_by_name,
        }
        for s in slots
    ]


@router.post("/book")
async def book_slot(body: BookSlotRequest):
    """Book an interview slot. Only SHORTLISTED candidates can book."""
    from beanie import PydanticObjectId

    applicant = await Applicant.get(PydanticObjectId(body.applicant_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    if applicant.status != ApplicantStatus.SHORTLISTED:
        raise HTTPException(
            status_code=400,
            detail="Only shortlisted candidates can book interview slots",
        )

    # Check if candidate already has a slot
    if applicant.interview_slot_id:
        raise HTTPException(status_code=400, detail="Candidate already has an interview scheduled")

    slot = await InterviewSlot.get(PydanticObjectId(body.slot_id))
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if slot.is_booked:
        raise HTTPException(status_code=400, detail="This slot is already booked")

    # Book the slot
    slot.is_booked = True
    slot.booked_by = body.applicant_id
    slot.booked_by_name = applicant.name
    slot.booked_at = datetime.utcnow()
    await slot.save()

    # Update applicant
    applicant.status = ApplicantStatus.INTERVIEW_SCHEDULED
    applicant.interview_slot_id = str(slot.id)
    applicant.updated_at = datetime.utcnow()
    await applicant.save()

    return {
        "success": True,
        "message": f"Interview booked for {slot.day} at {slot.time}",
        "slot": {"day": slot.day, "time": slot.time},
    }


@router.get("/confirmed")
async def confirmed_interviews():
    """List all confirmed (booked) interview slots."""
    slots = await InterviewSlot.find(InterviewSlot.is_booked == True).to_list()
    return [
        {
            "id": str(s.id),
            "day": s.day,
            "time": s.time,
            "candidate_name": s.booked_by_name,
            "candidate_id": s.booked_by,
            "booked_at": s.booked_at.isoformat() if s.booked_at else None,
        }
        for s in slots
    ]
