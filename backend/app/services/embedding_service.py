import json
from pathlib import Path
from sentence_transformers import SentenceTransformer
from app.models.embedding import EmbeddingRecord

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
PROCESSED_PATH = Path(__file__).resolve().parent.parent.parent / "processed" / "embeddings"
PROCESSED_PATH.mkdir(parents=True, exist_ok=True)


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(MODEL_NAME)

    def embed_text(self, text):
        return self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)

    def save_embeddings(self, document_id, embeddings):
        output_file = PROCESSED_PATH / f"{document_id}_embeddings.json"
        data = {
            "document_id": document_id,
            "embedding_model": MODEL_NAME,
            "dimension": self.model.get_sentence_embedding_dimension(),
            "embeddings": [item.model_dump() for item in embeddings],
        }
        with open(output_file, "w") as f:
            json.dump(data, f, indent=4)
        return output_file

    def generate_document_embeddings(self, chunks):
        if not chunks:
            return []

        embeddings = []
        for chunk in chunks:
            text = (chunk.text or "").strip()
            if not text:
                continue
            embedding = self.embed_text(text)
            embeddings.append(
                EmbeddingRecord(
                    document_id=chunk.document_id,
                    chunk_id=chunk.chunk_id,
                    page_number=chunk.page_number,
                    text=chunk.text,
                    embedding=embedding.tolist(),
                )
            )

        self.save_embeddings(chunks[0].document_id, embeddings)
        return embeddings