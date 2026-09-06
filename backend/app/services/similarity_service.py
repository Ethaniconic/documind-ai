import numpy as np

class SimilarityService:
    def cosine_similarity(self, vector_a, vector_b):
        sim = np.dot(vector_a, vector_b) / (np.linalg.norm(vector_a) * np.linalg.norm(vector_b))

        return sim

    def search(self, query_embedding, embeddings, top_k=5):
        scores = []
        for item in embeddings:
            sim = self.cosine_similarity(query_embedding, item["embedding"])
            scores.append({
                "doc_id": item["document_id"],
                "similarity": float(sim),
            })

        top_scores = sorted(scores, key=lambda x: x["similarity"], reverse=True)[:top_k]

        return top_scores