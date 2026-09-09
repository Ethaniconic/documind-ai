from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.services.embedding_service import EmbeddingService
from app.models.chunk import Chunk
from app.services.vector_store import VectorStore
import json

router = APIRouter()

CHUNK_DIR = Path(__file__).resolve().parent.parent.parent / "processed" / "chunks"

@router.post("/embed/{document_id}")
def generate_embeddings(document_id: str):
    chunk_file = CHUNK_DIR / f"{document_id}.json"
    embedding_service = EmbeddingService()

    if not chunk_file.exists():
        raise HTTPException(status_code=404, detail=f"No chunks found for document {document_id}")

    with open(chunk_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        chunks_data = data["chunks"] if isinstance(data, dict) and "chunks" in data else data
        chunks = [Chunk.model_validate(chunk_data) for chunk_data in chunks_data]

    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no text chunks to embed.")

    chunks = [c for c in chunks if c.text and c.text.strip()]
    if not chunks:
        raise HTTPException(status_code=400, detail="Document has no valid text chunks to embed.")

    embeddings = embedding_service.generate_document_embeddings(chunks)

    # Index into persistent Vector Store
    vector_store = VectorStore(dimension=384)
    try:
        vector_store.load()
    except FileNotFoundError:
        pass

    vector_store.add_vectors([item.embedding for item in embeddings])
    vector_store.add_metadata(chunks)
    vector_store.save()

    return {
        "document": document_id,
        "model": "MiniLM-L6-v2",
        "dimension": 384,
        "chunks_embedded": len(embeddings),
        "status": "Ready for Retrieval"
    }