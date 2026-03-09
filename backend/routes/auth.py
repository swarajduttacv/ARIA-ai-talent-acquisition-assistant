from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from core.security import hash_password, verify_password, create_access_token
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

router = APIRouter()

# Google OAuth Client ID — replace with your real one from Google Cloud Console
GOOGLE_CLIENT_ID = "971282716814-4gu0sfa6r49stvgkjag27uja8agsnmjq.apps.googleusercontent.com"

# In production replace with a proper HR User model in MongoDB
# For demo we use a hardcoded HR account + token issuance
HR_ACCOUNTS = {
    "hr@company.com": hash_password("hr123")
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from frontend


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    google_id: str
    email: str
    name: str
    picture: str = ""


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    hashed = HR_ACCOUNTS.get(body.email)
    if not hashed or not verify_password(body.password, hashed):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": body.email, "role": "hr"})
    return TokenResponse(access_token=token, role="hr")


@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(body: GoogleAuthRequest):
    """
    Verify Google ID token and return user info + app JWT.
    Does NOT create an applicant — that happens on resume submission.
    """
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )

        google_id = idinfo["sub"]
        email = idinfo.get("email", "")
        name = idinfo.get("name", "")
        picture = idinfo.get("picture", "")

        # Issue our own JWT for the applicant session
        token = create_access_token({
            "sub": email,
            "role": "applicant",
            "google_id": google_id,
        })

        return GoogleAuthResponse(
            access_token=token,
            role="applicant",
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )


@router.post("/applicant-token")
async def applicant_token(email: str):
    """Issue a short-lived token for an applicant (legacy fallback)."""
    token = create_access_token({"sub": email, "role": "applicant"})
    return {"access_token": token, "token_type": "bearer", "role": "applicant"}
