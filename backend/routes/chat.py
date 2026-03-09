from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models.chat_session import ChatSession
from models.applicant import Applicant
from core.ai_engine import score_response, generate_report

router = APIRouter()


class MessageIn(BaseModel):
    role: str
    text: str


class StartSessionRequest(BaseModel):
    applicant_id: str
    applicant_email: str


class SaveMessagesRequest(BaseModel):
    messages: List[MessageIn]


class CompleteSessionRequest(BaseModel):
    messages: List[MessageIn]


class ScoreRequest(BaseModel):
    question: str
    answer: str


@router.post("/start")
async def start_session(body: StartSessionRequest):
    """Create a new chat session for an applicant."""
    existing = await ChatSession.find_one(
        ChatSession.applicant_id == body.applicant_id,
        ChatSession.is_completed == False,
    )
    if existing:
        return {"session_id": str(existing.id), "resumed": True}

    session = ChatSession(
        applicant_id=body.applicant_id,
        applicant_email=body.applicant_email,
    )
    await session.insert()

    # Link session to applicant
    from beanie import PydanticObjectId
    applicant = await Applicant.find_one(Applicant.id == PydanticObjectId(body.applicant_id))
    if applicant:
        applicant.chat_session_id = str(session.id)
        await applicant.save()

    return {"session_id": str(session.id), "resumed": False}


@router.post("/{session_id}/save")
async def save_messages(session_id: str, body: SaveMessagesRequest):
    """Persist chat messages mid-conversation."""
    from beanie import PydanticObjectId
    session = await ChatSession.get(PydanticObjectId(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.messages = [m.dict() for m in body.messages]
    await session.save()
    return {"success": True}


@router.post("/{session_id}/score-response")
async def score_single_response(session_id: str, body: ScoreRequest):
    """Score a single response in real-time using AI."""
    from beanie import PydanticObjectId
    session = await ChatSession.get(PydanticObjectId(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get resume context from applicant
    applicant = await Applicant.find_one(Applicant.id == PydanticObjectId(session.applicant_id))
    resume_context = applicant.resume_analysis if applicant and applicant.resume_analysis else {}

    score = await score_response(body.question, body.answer, resume_context)

    # Store the QA pair with score
    qa_entry = {"question": body.question, "answer": body.answer, "score": score}
    session.qa_pairs.append(qa_entry)
    session.response_scores.append(score)
    await session.save()

    return {"success": True, "score": score}


@router.post("/{session_id}/complete")
async def complete_session(session_id: str, body: CompleteSessionRequest):
    """
    Mark chat as done. Generate a real AI assessment report.
    """
    from beanie import PydanticObjectId
    session = await ChatSession.get(PydanticObjectId(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get resume context
    applicant = await Applicant.find_one(Applicant.id == PydanticObjectId(session.applicant_id))
    resume_analysis = applicant.resume_analysis if applicant and applicant.resume_analysis else {}

    # Generate the full report using AI
    report = await generate_report(resume_analysis, session.qa_pairs)

    psychology_rating = report.get("psychology_rating", 5.0)

    # Add total_responses and avg_response_length for the frontend
    user_msgs = [m for m in body.messages if m.role == "user"]
    word_count = sum(len(m.text.split()) for m in user_msgs)
    report["total_responses"] = len(user_msgs)
    report["avg_response_length"] = round(word_count / max(len(user_msgs), 1), 1)

    session.is_completed = True
    session.psychology_rating = psychology_rating
    session.messages = [m.dict() for m in body.messages]
    session.report = report
    session.completed_at = datetime.utcnow()
    await session.save()

    # Update applicant record
    if applicant:
        applicant.chat_completed = True
        applicant.psychology_rating = psychology_rating
        applicant.chat_report = report

        # Compute engagement score (average of report sub-scores, scaled to 0-100)
        sub_scores = [
            report.get("psychology_rating", 5.0),
            report.get("communication_score", 5.0),
            report.get("confidence_score", 5.0),
            report.get("clarity_score", 5.0),
        ]
        engagement_score = round((sum(sub_scores) / len(sub_scores)) * 10, 1)
        applicant.engagement_score = engagement_score

        # Compute final score: 60% resume + 40% engagement
        resume_score = applicant.match_score or 0
        applicant.final_score = round(0.6 * resume_score + 0.4 * engagement_score, 1)

        # Auto-transition to ENGAGED
        from models.applicant import ApplicantStatus
        applicant.status = ApplicantStatus.ENGAGED

        applicant.updated_at = datetime.utcnow()
        await applicant.save()

    return {"success": True, "report": report}


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get full chat session with messages and scores."""
    from beanie import PydanticObjectId
    session = await ChatSession.get(PydanticObjectId(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": str(session.id),
        "applicant_id": session.applicant_id,
        "applicant_email": session.applicant_email,
        "messages": session.messages,
        "qa_pairs": session.qa_pairs,
        "response_scores": session.response_scores,
        "is_completed": session.is_completed,
        "psychology_rating": session.psychology_rating,
        "report": session.report,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "created_at": session.created_at.isoformat(),
    }
