"""
ML Resume Scorer — uses the project's EXISTING EmbeddingGenerator (all-MiniLM-L6-v2)
and jd_parser for preprocessing.

This integrates the pre-built ML modules from the project:
  - embeddings/embedding_generator.py  → EmbeddingGenerator class
  - preprocessing/jd_parser.py         → clean_job_description()
  - preprocessing/resume_parser.py     → extract_text_from_pdf()

The score is cosine similarity between resume embedding and JD embedding — fully
explainable ML, no black-box Gemini calls.
"""
import sys, os

# Add project root to path so we can import existing modules
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from sklearn.metrics.pairwise import cosine_similarity
from preprocessing.jd_parser import clean_job_description
from embeddings.embedding_generator import EmbeddingGenerator

# Singleton embedding generator — reuses the existing EmbeddingGenerator class
_embedder = None

# Default JD used when no specific JD is provided
DEFAULT_JD = """
We are looking for a talented software engineer with strong programming skills.
The ideal candidate has experience in Python, JavaScript, web development,
machine learning, data structures, algorithms, REST APIs, databases (SQL/NoSQL),
cloud platforms (AWS/GCP/Azure), version control (Git), and agile methodologies.
Strong communication skills, problem-solving ability, teamwork, and a passion
for technology are essential. Experience with React, Node.js, FastAPI, Docker,
Kubernetes, CI/CD pipelines, and system design is a plus. A degree in Computer
Science, IT, or related field is preferred.
"""


def _get_embedder():
    """Lazy-load the project's EmbeddingGenerator (all-MiniLM-L6-v2)."""
    global _embedder
    if _embedder is None:
        print("[ML] Loading EmbeddingGenerator from embeddings/embedding_generator.py...")
        _embedder = EmbeddingGenerator()
        print("[ML] EmbeddingGenerator loaded successfully.")
    return _embedder


def score_resume_ml(resume_text: str, job_description: str = None) -> dict:
    """
    Score a resume against a job description using semantic similarity.

    Uses the project's existing ML pipeline:
      1. jd_parser.clean_job_description() to preprocess the JD text
      2. EmbeddingGenerator to encode both resume and JD
      3. Cosine similarity to compute the match score

    Returns:
        dict with:
          - similarity_score: raw cosine similarity (0.0 - 1.0)
          - match_score: scaled to 0-100
          - explanation: human-readable breakdown
    """
    if not resume_text or len(resume_text.strip()) < 50:
        return {
            "similarity_score": 0.0,
            "match_score": 0,
            "explanation": "Resume text too short or empty for analysis."
        }

    # Use existing jd_parser to clean the job description
    jd_raw = job_description or DEFAULT_JD
    cleaned_jd = clean_job_description(jd_raw)

    embedder = _get_embedder()

    # Generate embeddings using the project's EmbeddingGenerator
    resume_embedding = embedder.generate_embedding(resume_text)
    jd_embedding = embedder.generate_embedding(cleaned_jd)

    if resume_embedding is None or jd_embedding is None:
        return {
            "similarity_score": 0.0,
            "match_score": 0,
            "explanation": "Failed to generate embeddings."
        }

    # Cosine similarity
    sim = cosine_similarity(
        resume_embedding.reshape(1, -1),
        jd_embedding.reshape(1, -1)
    )[0][0]

    # Scale similarity to 0-100 score
    # Raw cosine similarity for text is typically 0.1-0.7 range
    raw_score = float(sim)
    scaled = min(100, max(0, round((raw_score - 0.05) / 0.55 * 100, 1)))

    # Build explanation
    if scaled >= 80:
        grade = "Excellent match"
    elif scaled >= 60:
        grade = "Good match"
    elif scaled >= 40:
        grade = "Moderate match"
    elif scaled >= 20:
        grade = "Weak match"
    else:
        grade = "Poor match"

    return {
        "similarity_score": round(raw_score, 4),
        "match_score": scaled,
        "explanation": f"{grade} — cosine similarity {raw_score:.3f} between resume embedding and JD embedding (using all-MiniLM-L6-v2 via EmbeddingGenerator)."
    }
