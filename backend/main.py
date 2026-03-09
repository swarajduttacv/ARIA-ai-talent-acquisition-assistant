from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import connect_db, disconnect_db
from routes import applicants, auth, chat, jobs, scheduling, applicant_portal


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="ARIA Recruitment API",
    description="AI Recruitment Intelligence Assistant — Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(applicants.router, prefix="/api/applicants", tags=["Applicants"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(scheduling.router, prefix="/api/scheduling", tags=["Scheduling"])
app.include_router(applicant_portal.router, prefix="/api/applicant-portal", tags=["Applicant Portal"])


@app.get("/")
async def root():
    return {"message": "ARIA Recruitment API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
