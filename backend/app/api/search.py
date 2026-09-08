from fastapi import APIRouter
from app.models.search import SearchRequest
from app.services.search_service import SearchService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStore

router = APIRouter()

@router.post("/search")
def search_documents(request: SearchRequest):
    embed_service = EmbeddingService()
    vector_store = VectorStore(dimension=384)
    try:
        vector_store.load()
    except FileNotFoundError:
        return []

    search_service = SearchService(vector_store, embed_service)
    results = search_service.search(request.query, request.top_k)
    return results