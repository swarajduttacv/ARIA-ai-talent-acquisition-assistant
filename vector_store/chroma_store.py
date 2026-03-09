import chromadb


class ChromaStore:

    def __init__(self):

        # Persistent vector database
        self.client = chromadb.PersistentClient(
            path="vector_store_db"
        )

        self.collection = self.client.get_or_create_collection(
            name="candidate_embeddings"
        )

    def add_candidates(self, candidate_names, embeddings, resume_texts):
        """
        Store candidate embeddings in the vector database.
        """

        ids = [f"candidate_{i}" for i in range(len(candidate_names))]

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=resume_texts,
            metadatas=[{"name": name} for name in candidate_names]
        )

        print(f"{len(candidate_names)} candidates added to vector database.")

    def search_candidates(self, query_embedding, top_k=5):
        """
        Search for candidates similar to the job description.
        """

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )

        return results