# aria — ai recruitment intelligence assistant

full-stack ai-powered recruitment platform that handles the hiring pipeline end-to-end: resume parsing, semantic candidate ranking, ai chatbot interviews, automated scoring, and interview scheduling — all in one system.

applicants sign in with google, upload their resume, go through an ai-driven interview chat, and get scored automatically. hr teams get a dashboard with ranked candidates, interview management, and ai-generated assessment reports.

## what it does

### screening engine (ml pipeline)

the core ml pipeline extracts text from resume pdfs, generates semantic embeddings with `all-MiniLM-L6-v2`, stores them in chromadb, and ranks candidates against job descriptions using cosine similarity. no llm calls in the scoring loop — it's pure vector similarity, fully explainable.

```
resume pdf → text extraction (pdfplumber) → embedding (sentence-transformers)
                                                        ↓
job description → cleaned text → embedding → cosine similarity → ranked candidates
                                                        ↓
                                              chromadb vector store
```

### ai chatbot interview

once a candidate submits their application, aria generates 5 personalized interview questions based on the resume analysis. the chatbot (powered by gemini) asks questions across categories — intro, technical, soft skills, and career goals — and scores each response in real-time on relevance, depth, communication, and resume alignment.

### candidate scoring

final scores combine two signals:
- **60% resume match** — cosine similarity between resume and job description embeddings (ml-based, deterministic)
- **40% engagement score** — average of ai interview sub-scores (psychology rating, communication, confidence, clarity)

### full backend api

fastapi backend with mongodb (via motor + beanie odm) that handles:
- **auth** — google oauth for applicants, jwt-based hr login
- **job management** — create, update, deactivate job descriptions
- **application flow** — resume upload → ai analysis → question generation → chatbot interview → scoring
- **interview scheduling** — slot management, booking for shortlisted candidates
- **applicant portal** — candidates can check their status, scores, and notifications
- **notifications** — auto-generated when candidates get shortlisted or interviews are scheduled

## tech stack

| layer | tech |
|---|---|
| backend api | python, fastapi, uvicorn |
| database | mongodb (motor async driver, beanie odm) |
| ml/embeddings | sentence-transformers (`all-MiniLM-L6-v2`), scikit-learn |
| vector store | chromadb |
| llm | google gemini (`gemini-2.0-flash`) |
| resume parsing | pdfplumber |
| auth | google oauth2, python-jose (jwt), passlib (bcrypt) |
| frontend | react (vite), google sign-in |

## project structure

```
ARIA-ai-talent-acquisition-assistant/
├── backend/
│   ├── main.py                     # fastapi app entrypoint
│   ├── core/
│   │   ├── ai_engine.py            # gemini-powered resume analysis, question gen, scoring
│   │   ├── resume_scorer.py        # ml cosine similarity scoring (sentence-transformers)
│   │   ├── config.py               # pydantic settings (mongodb, jwt, gemini key)
│   │   ├── database.py             # mongodb connection, beanie init, slot seeding
│   │   └── security.py             # password hashing, jwt create/decode
│   ├── models/
│   │   ├── applicant.py            # applicant document (status, scores, resume data)
│   │   ├── job.py                  # job description document
│   │   ├── chat_session.py         # interview chat session with qa pairs
│   │   ├── interview_slot.py       # bookable interview time slots
│   │   └── notification.py         # applicant notifications
│   ├── routes/
│   │   ├── applicants.py           # submit, list, score, status management
│   │   ├── auth.py                 # google oauth + hr login
│   │   ├── chat.py                 # chatbot session lifecycle
│   │   ├── jobs.py                 # crud for job descriptions
│   │   ├── scheduling.py           # interview slot booking
│   │   └── applicant_portal.py     # applicant self-service endpoints
│   └── requirements.txt
├── preprocessing/
│   ├── resume_parser.py            # pdf text extraction
│   └── jd_parser.py                # job description cleaning
├── embeddings/
│   └── embedding_generator.py      # sentence-transformers wrapper
├── vector_store/
│   └── chroma_store.py             # chromadb operations
├── ranking/
│   └── candidate_ranker.py         # similarity-based ranking
├── api_interface/
│   └── screening_service.py        # end-to-end screening pipeline
├── frontend/
│   └── index.html                  # react app entry (vite)
├── data/resumes/                   # sample resume pdfs
├── main.py                         # standalone screening engine demo
└── start-app.bat                   # one-click launcher (windows)
```

## setup

### prerequisites

- python 3.10+
- mongodb running locally (default: `mongodb://localhost:27017`)
- node.js 18+ (for frontend)
- google cloud project with oauth credentials (for google sign-in)
- gemini api key

### backend

```bash
git clone https://github.com/swarajduttacv/ARIA-ai-talent-acquisition-assistant.git
cd ARIA-ai-talent-acquisition-assistant

# create virtual environment
python -m venv .venv
.venv\Scripts\activate          # windows
# source .venv/bin/activate     # mac/linux

# install backend dependencies
pip install -r backend/requirements.txt
```

create a `.env` file in the `backend/` directory:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=aria_recruitment
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_jwt_secret
```

start the backend:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

api docs available at `http://localhost:8000/docs`

### frontend

```bash
cd frontend
npm install
npm run dev
```

opens at `http://localhost:3000`

### screening engine (standalone)

to test the ml screening pipeline without the full backend:

```bash
pip install sentence-transformers chromadb pdfplumber
python main.py
```

this loads sample resumes from `data/resumes/`, generates embeddings, and ranks candidates against a sample job description.

## api endpoints

| method | endpoint | description |
|---|---|---|
| `POST` | `/api/auth/google` | google oauth sign-in |
| `POST` | `/api/auth/login` | hr login (email/password) |
| `POST` | `/api/applicants/submit` | submit application + resume |
| `GET` | `/api/applicants/` | list all applicants (hr) |
| `POST` | `/api/applicants/{id}/update-status` | update applicant status |
| `POST` | `/api/applicants/{id}/confirm-date` | confirm interview date |
| `POST` | `/api/chat/start` | start interview chat session |
| `POST` | `/api/chat/{id}/score-response` | score a single response |
| `POST` | `/api/chat/{id}/complete` | complete chat + generate report |
| `GET` | `/api/jobs/` | list job descriptions |
| `POST` | `/api/jobs/` | create job description |
| `GET` | `/api/scheduling/slots` | list interview slots |
| `POST` | `/api/scheduling/book` | book an interview slot |
| `GET` | `/api/applicant-portal/me` | applicant self-service profile |

## how the scoring works

the resume scorer uses the project's own `EmbeddingGenerator` (all-MiniLM-L6-v2) and `jd_parser` for preprocessing. the raw cosine similarity (typically 0.1–0.7 for text) gets scaled to a 0–100 match score:

```
match_score = ((cosine_similarity - 0.05) / 0.55) * 100
```

the ai interview scorer uses a weighted formula for each response:

```
overall = (relevance×2 + depth×3 + communication×2 + resume_alignment×1) / 8
```

gibberish detection kicks in on the fallback path — checks word count, alphabetic ratio, and caps extremely short or random answers at low scores.

## license

[MIT](./LICENSE)
