from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime


class InterviewSlot(Document):
    day: str                                    # e.g. "Mon, May 12"
    time: str                                   # e.g. "10:00 AM"
    is_booked: bool = False
    booked_by: Optional[str] = None             # applicant_id
    booked_by_name: Optional[str] = None        # candidate name
    booked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "interview_slots"
