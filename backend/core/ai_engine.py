"""
AI Engine — uses Google Gemini to analyze resumes, generate questions, and score responses.
"""
import json
import os
import random
import google.generativeai as genai
from core.config import settings

# Configure Gemini — reads GEMINI_API_KEY from env or settings
_API_KEY = os.getenv("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", ""))
if _API_KEY:
    genai.configure(api_key=_API_KEY)

_model = genai.GenerativeModel("gemini-2.0-flash")


def _safe_json(text: str) -> dict | list:
    """Extract JSON from a model response, stripping markdown fences."""
    import re
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    if text.lower().startswith("json"):
        text = text[4:].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object or array in the text
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
        if match:
            return json.loads(match.group(1))
        raise


async def analyze_resume(resume_text: str) -> dict:
    """Extract structured info from resume text using Gemini."""
    prompt = f"""Analyze this resume and return a JSON object with these fields:
- "skills": list of technical and soft skills found
- "experience_years": estimated total years of experience (number)
- "education": list of degrees/certifications with institution names
- "strengths": 3-4 key strengths based on the resume
- "summary": 2-3 sentence professional summary
- "key_projects": list of notable projects or achievements (max 3)

Resume text:
\"\"\"
{resume_text[:4000]}
\"\"\"

Return ONLY valid JSON, no markdown."""

    try:
        response = await _model.generate_content_async(prompt)
        return _safe_json(response.text)
    except Exception as e:
        print(f"[AI] Resume analysis error: {e}")
        return {
            "skills": [],
            "experience_years": 0,
            "education": [],
            "strengths": ["Unable to analyze"],
            "summary": "Resume analysis unavailable.",
            "key_projects": [],
        }


async def generate_questions(resume_analysis: dict) -> list[str]:
    """Generate 5 personalized interview questions based on resume analysis."""
    # Pick a random style to ensure variety across candidates
    styles = [
        "Focus on real-world problem-solving scenarios. Ask about specific challenges they faced and how they overcame them.",
        "Focus on leadership and collaboration. Ask about team dynamics, mentoring others, and cross-functional work.",
        "Focus on innovation and learning. Ask about new technologies they've explored, side projects, and continuous learning habits.",
        "Focus on impact and metrics. Ask about measurable outcomes they've achieved and business value they've delivered.",
        "Focus on adaptability and growth. Ask about career transitions, learning from failures, and handling ambiguity.",
    ]
    style = random.choice(styles)

    prompt = f"""Based on this candidate profile, generate exactly 5 UNIQUE interview questions.

Profile:
- Skills: {', '.join(resume_analysis.get('skills', [])[:10])}
- Experience: {resume_analysis.get('experience_years', 0)} years
- Strengths: {', '.join(resume_analysis.get('strengths', []))}
- Summary: {resume_analysis.get('summary', 'N/A')}
- Projects: {json.dumps(resume_analysis.get('key_projects', []))}

Style guidance: {style}

Rules:
1. First question: warm greeting + ask them to introduce themselves (VARY the wording — don't always say "tell me about yourself")
2. Questions 2-3: probe their technical skills and project experience (reference SPECIFIC skills/projects from the resume)
3. Question 4: assess soft skills (choose a DIFFERENT angle each time — teamwork, conflict resolution, mentoring, communication, etc.)
4. Question 5: career goals, motivation, or a creative scenario question
5. Make EVERY question DIFFERENT from generic interview questions. Be specific to THIS candidate's background.
6. Do NOT reuse the same question patterns — be creative and conversational.

Return a JSON array of exactly 5 strings. Each question should feel natural and unique.
Return ONLY the JSON array, no markdown."""

    try:
        response = await _model.generate_content_async(prompt)
        questions = _safe_json(response.text)
        if isinstance(questions, list) and len(questions) >= 5:
            return questions[:5]
        return _default_questions()
    except Exception as e:
        print(f"[AI] Question generation error: {e}")
        return _default_questions()


async def score_response(question: str, answer: str, resume_context: dict) -> dict:
    """Score a single response — only meaningful, contextually relevant answers get real scores."""
    prompt = f"""You are an EXTREMELY STRICT interview evaluator. You must judge ONLY on substance.

CRITICAL RULE: Score 0-1 for ANY answer that is:
- Gibberish, random characters, or keyboard mashing (e.g. "asdfgh", "jkljkl")
- Completely off-topic and unrelated to the question
- Empty, one-word, or just "yes"/"no" without explanation
- Copy-pasted generic text with no relevance to the question asked

SCORING BANDS — follow these EXACTLY:
  0-1: Gibberish, irrelevant, empty, random text
  2-3: Vaguely related but zero substance (e.g. "I know Python" to a design question)
  4-5: Somewhat relevant but generic, no specifics, no examples, no depth
  6-7: Relevant answer with SOME specific details or one concrete example
  8-9: Strong answer with multiple specific examples, clear reasoning, demonstrates expertise
  10:  Exceptional — deep technical insight, real-world numbers/metrics, professional clarity

WEIGHTING: depth and communication matter MOST. An answer with depth but poor grammar is BETTER than a polished but shallow answer.

Overall formula: overall = (relevance*2 + depth*3 + communication*2 + resume_alignment*1) / 8
Round to one decimal.

Resume context:
- Skills: {', '.join(resume_context.get('skills', [])[:8])}
- Experience: {resume_context.get('experience_years', 0)} years

Question asked: "{question}"
Candidate's answer: "{answer}"

Concrete examples for THIS scoring:
- Answer "I like coding and stuff" to "{question}" → overall: 2.5 (vague, no substance)
- Answer "asdf random gibberish" → overall: 0.5
- Answer with 1-2 generic sentences → overall: 3.5-4.5
- Answer with specific project names, technologies, outcomes → overall: 7.0-8.5

Return ONLY valid JSON with these fields:
  "relevance": 0-10 (is the answer actually about what was asked?),
  "depth": 0-10 (specific details, examples, technical depth — MOST IMPORTANT),
  "resume_alignment": 0-10 (consistent with resume? if can't tell, give 5),
  "communication": 0-10 (clarity, structure, professionalism of expression),
  "overall": float (use the weighted formula above),
  "feedback": string (one sentence for HR — be specific about what was good or bad)

Be RUTHLESSLY honest. Do NOT inflate scores. A mediocre answer is a 4, not a 6."""

    try:
        response = await _model.generate_content_async(prompt)
        result = _safe_json(response.text)
        # Validate scores are actually numbers and cap at 10
        for key in ["relevance", "depth", "resume_alignment", "communication", "overall"]:
            val = result.get(key)
            if val is None or not isinstance(val, (int, float)):
                result[key] = 3.0  # default to LOW, not mid
            else:
                result[key] = min(10.0, max(0.0, float(val)))
        return result
    except Exception as e:
        print(f"[AI] Scoring error: {e}")
        # Smart fallback based on answer content analysis
        answer_clean = answer.strip()
        words = answer_clean.split()
        word_count = len(words)
        # Check for gibberish: low ratio of real alphabetic words
        alpha_words = sum(1 for w in words if w.isalpha() and len(w) > 1)
        alpha_ratio = alpha_words / max(word_count, 1)

        if word_count < 3 or alpha_ratio < 0.4:
            fb = 0.5  # gibberish or near-empty
        elif word_count < 8:
            fb = 2.0  # very short
        elif word_count < 20:
            fb = 3.5  # short
        elif word_count < 50:
            fb = 5.0  # moderate
        else:
            fb = 6.0  # at least substantial in length
        return {"relevance": fb, "depth": fb, "resume_alignment": fb, "communication": fb, "overall": fb, "feedback": "AI scoring unavailable — estimated from response analysis."}


async def generate_report(resume_analysis: dict, qa_pairs: list[dict]) -> dict:
    """Generate a comprehensive assessment report from the full interview."""
    qa_text = "\n".join([
        f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}\nScore: {qa.get('score', {}).get('overall', 'N/A')}/10"
        for qa in qa_pairs
    ])

    prompt = f"""Generate a STRICT and HONEST recruitment assessment report.

IMPORTANT: Your scores MUST reflect the ACTUAL quality of the answers.
- If a candidate gave vague, short, or gibberish answers → scores should be LOW (2-4)
- If answers were decent but generic → scores should be MODERATE (5-6)
- If answers were detailed with specific examples → scores should be HIGH (7-8)
- Only truly exceptional candidates get 9-10

Candidate Profile:
- Skills: {', '.join(resume_analysis.get('skills', [])[:10])}
- Experience: {resume_analysis.get('experience_years', 0)} years
- Summary: {resume_analysis.get('summary', 'N/A')}

Interview Q&A (with per-question scores):
{qa_text}

Generate a JSON report with:
- "psychology_rating": overall score 0-10 (MUST match answer quality — low for bad answers)
- "communication_score": 0-10
- "confidence_score": 0-10
- "clarity_score": 0-10
- "technical_depth": 0-10
- "resume_consistency": 0-10
- "strengths": list of 3-4 specific strengths (reference actual answers if good)
- "improvements": list of 2-3 areas for improvement (be specific)
- "summary": 3-4 sentence overall assessment
- "recommendation": "strong_hire" | "hire" | "maybe" | "pass"

Return ONLY valid JSON."""

    try:
        response = await _model.generate_content_async(prompt)
        report = _safe_json(response.text)
        # Ensure required fields
        report.setdefault("psychology_rating", 5.0)
        report.setdefault("communication_score", 5.0)
        report.setdefault("confidence_score", 5.0)
        report.setdefault("clarity_score", 5.0)
        report.setdefault("strengths", [])
        report.setdefault("improvements", [])
        report.setdefault("summary", "Assessment complete.")
        return report
    except Exception as e:
        print(f"[AI] Report generation error: {e}")
        return _fallback_report(qa_pairs)


def _default_questions():
    """Large pool of varied questions — randomly select 5 each time."""
    pool = [
        # Intro variations
        "Hi! I'm ARIA, your AI interviewer. Let's kick things off — what's your story? Give me the highlights of your journey so far.",
        "Welcome! I'm ARIA. Before we dive in, I'd love to hear — what brings you here today, and what are you most passionate about professionally?",
        "Hey there! I'm ARIA. To start, could you share what you've been working on recently and what excites you about it?",
        "Hi! I'm ARIA. Tell me — if you had 60 seconds to pitch yourself to a hiring manager, what would you say?",
        "Welcome! I'm ARIA. Let's begin with something simple — what's the most interesting thing you've built or contributed to in your career?",
        # Technical / project
        "Walk me through a project where you had to learn a new technology from scratch. How did you approach it?",
        "Tell me about a time your code or system failed in production. What happened and what did you learn?",
        "What's the most complex technical problem you've solved? Walk me through your thought process.",
        "Describe a time you had to make a difficult architectural or design decision. What were the tradeoffs?",
        "Tell me about a time you optimized something — could be code performance, a workflow, or a process.",
        "Have you ever disagreed with a technical decision made by your team? How did you handle it?",
        "What's a technology or tool you've been wanting to explore? Why hasn't it happened yet?",
        "Describe a project where you had to integrate multiple systems or APIs. What challenges did you face?",
        # Soft skills / behavioral
        "Tell me about a time you received critical feedback. How did you respond to it?",
        "How do you handle tight deadlines when multiple priorities compete for your attention?",
        "Describe a situation where you had to explain a complex technical concept to a non-technical audience.",
        "Tell me about a time you mentored or helped a colleague grow. What was the outcome?",
        "Have you ever had to push back on a requirement or scope? How did you navigate that conversation?",
        "What's a mistake you made early in your career that shaped how you work today?",
        "How do you stay productive and motivated when working on a long, repetitive task?",
        # Career / motivation / creative
        "If you could design your ideal role from scratch, what would a typical day look like?",
        "What's a trend in tech that you're either excited or concerned about? Why?",
        "Where do you see yourself in 3 years, and what skills do you want to develop to get there?",
        "If you joined our team tomorrow, what would you want to work on first and why?",
        "What's one thing you wish more companies understood about hiring and evaluating talent?",
    ]
    # Pick 1 intro (from first 5) + 2 technical + 1 soft + 1 career
    intros = pool[:5]
    technical = pool[5:13]
    soft = pool[13:21]
    career = pool[21:]
    selected = (
        random.sample(intros, 1) +
        random.sample(technical, 2) +
        random.sample(soft, 1) +
        random.sample(career, 1)
    )
    return selected


def extract_skills_from_text(text: str) -> list[str]:
    """Fallback skill extraction using keyword matching when AI analysis returns no skills."""
    KNOWN_SKILLS = [
        "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
        "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot",
        "HTML", "CSS", "SASS", "Tailwind", "Bootstrap",
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Firebase",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins", "CI/CD",
        "Git", "GitHub", "GitLab", "Bitbucket",
        "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy", "OpenCV",
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Science", "Data Analysis",
        "REST API", "GraphQL", "Microservices", "System Design",
        "Linux", "Agile", "Scrum", "JIRA",
        "Power BI", "Tableau", "Excel",
        "Figma", "Adobe XD",
        "Communication", "Leadership", "Teamwork", "Problem Solving", "Project Management",
    ]
    text_upper = text.upper()
    found = []
    for skill in KNOWN_SKILLS:
        if skill.upper() in text_upper:
            found.append(skill)
    return found[:10]


def _fallback_report(qa_pairs):
    n = max(len(qa_pairs), 1)
    avg = sum(qa.get("score", {}).get("overall", 5) for qa in qa_pairs) / n
    return {
        "psychology_rating": round(avg, 1),
        "communication_score": round(avg * 0.95, 1),
        "confidence_score": round(avg * 1.02, 1),
        "clarity_score": round(avg * 0.98, 1),
        "strengths": ["Completed the assessment"],
        "improvements": ["Provide more detailed answers"],
        "summary": f"Candidate completed the assessment with an average score of {round(avg, 1)}/10.",
    }
