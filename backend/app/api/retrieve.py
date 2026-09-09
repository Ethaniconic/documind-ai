from fastapi import APIRouter
from app.models.search import SearchRequest
from app.services.retriever import Retriever
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStore

router = APIRouter()

@router.post("/retrieve")
def retrieve(request: SearchRequest):
    embed_service = EmbeddingService()
    vector_store = VectorStore(dimension=384)
    
    try:
        vector_store.load()
    except FileNotFoundError:
        return {
            "query": request.query,
            "candidates": [],
            "results": [],
            "context": ""
        }

    retriever = Retriever(embed_service, vector_store)
    raw_results = retriever.retrieve(request.query, top_k=request.top_k or 10)

    candidates = [
        {
            "score": round(chunk.score, 4),
            "chunk_id": chunk.chunk_id,
            "page_number": chunk.page_number,
            "text": chunk.text,
            "document_id": chunk.document_id,
        }
        for chunk in raw_results
    ]
    context = "\n\n".join([f"Page {c['page_number']}:\n{c['text']}" for c in candidates if c['text']])

    return {
        "query": request.query,
        "candidates": candidates,
        "results": candidates,
        "context": context
    }