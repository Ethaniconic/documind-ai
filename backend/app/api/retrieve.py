from fastapi import APIRouter
from app.models.search import SearchRequest
from app.services.retriever import Retriever
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStore
from app.services.reranker import filter_results, remove_duplicates, build_context

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
            "results": [],
            "context": ""
        }

    retriever = Retriever(embed_service, vector_store)
    raw_results = retriever.retrieve(request.query, top_k=request.top_k)

    filtered_results = filter_results(raw_results)
    results = remove_duplicates(filtered_results)
    context = build_context(results)

    return {
        "query": request.query,
        "results": results,
        "context": context
    }