import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from preprocessing.resume_parser import load_resumes_from_folder
from preprocessing.jd_parser import parse_job_description
from embeddings.embedding_generator import EmbeddingGenerator
from vector_store.chroma_store import ChromaStore
from ranking.candidate_ranker import CandidateRanker


def screen_candidates(job_description, resume_folder="data/resumes", top_k=5):
    """
    Main screening function that runs the entire ML pipeline.

    Parameters:
    job_description (str): Job description text
    resume_folder (str): Folder containing resumes
    top_k (int): Number of top candidates to return

    Returns:
    list: Ranked candidate results
    """

    print("\nStarting Candidate Screening Pipeline...\n")

    # STEP 1: Parse job description
    jd_data = parse_job_description(job_description)
    cleaned_jd = jd_data["cleaned_text"]

    # STEP 2: Load resumes
    resumes = load_resumes_from_folder(resume_folder)

    if len(resumes) == 0:
        print("No resumes found.")
        return []

    candidate_names = [r["candidate_name"] for r in resumes]
    resume_texts = [r["resume_text"] for r in resumes]

    # STEP 3: Generate embeddings
    embedder = EmbeddingGenerator()

    resume_embeddings = embedder.generate_embeddings_batch(resume_texts)
    jd_embedding = embedder.generate_embedding(cleaned_jd)

    # STEP 4: Store embeddings in vector DB
    store = ChromaStore()

    store.add_candidates(candidate_names, resume_embeddings, resume_texts)

    # STEP 5: Search candidates
    results = store.search_candidates(jd_embedding, top_k=top_k)

    # STEP 6: Rank candidates
    ranker = CandidateRanker()
    ranked_candidates = ranker.rank_candidates(results)

    print("\nScreening Completed.\n")

    return ranked_candidates