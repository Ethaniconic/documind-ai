# pyrefly: ignore [missing-import]
import faiss

class SearchService:
    def __init__(self, vector_store, embedding_service):
        self.vector_store = vector_store
        self.embedding_service =  embedding_service

    def search(self, query, top_k: int = 5):
        query_embedding = self.embedding_service.embed_text(query)

        distances, indices = self.vector_store.search(query_embedding, top_k=top_k)

        results = []

        for idx, score in zip(indices[0], distances[0]):
            if idx == -1:
                continue

            chunk = self.vector_store.metadata[idx]

            results.append({
                "score": float(score),
                "document_id": chunk.get("document_id", "Document"),
                "chunk_id": chunk.get("chunk_id", ""),
                "page_number": chunk.get("page_number", 1),
                "text": chunk.get("text", ""),
            })

        return results