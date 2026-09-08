# pyrefly: ignore [missing-import]
import faiss
from app.models.retrieval import RetrievedChunk
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStore

class Retriever:
    def __init__(self, embedding_service: EmbeddingService, vector_store: VectorStore):
        self.embedding_service = embedding_service
        self.vector_store = vector_store

    def retrieve(self, query, top_k=5):
        query_vector = self.embedding_service.embed_text(query)
        distances, indices = self.vector_store.search(query_vector, top_k=top_k)

        retrieved_chunks = []

        for idx, score in zip(indices[0], distances[0]):
            if idx == -1:
                continue

            chunk = self.vector_store.metadata[idx]

            if chunk:
                retrieved_chunks.append(
                    RetrievedChunk(
                        document_id=chunk["document_id"],
                        chunk_id=chunk["chunk_id"],
                        page_number=chunk["page_number"],
                        score=float(score),
                        text=chunk["text"],
                    )
                )

        return retrieved_chunks