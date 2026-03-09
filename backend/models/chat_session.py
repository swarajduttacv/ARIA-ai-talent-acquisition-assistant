from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    AI = "ai"
    USER = "user"
    HR = "hr"


class ChatMessage(Document):
    role: MessageRole
    text: str
    time: Optional[str] = None


class ChatSession(Document):
    applicant_id: str
    applicant_email: str
    messages: List[dict] = []
    response_scores: List[dict] = []        # per-answer AI scores
    qa_pairs: List[dict] = []               # structured Q&A with scores
    is_completed: bool = False
    psychology_rating: Optional[float] = None
    report: Optional[dict] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chat_sessions"
