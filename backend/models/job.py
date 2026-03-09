from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime


class Job(Document):
    title: str
    description: str
    required_skills: List[str] = []
    nice_to_have: List[str] = []
    experience_years: Optional[int] = None
    location: Optional[str] = None
    is_active: bool = True
    created_by: Optional[str] = None  # HR user email
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jobs"

