from fastapi import APIRouter
from app.models.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.services.retriever import Retriever
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStore
from app.services.llm_service import LLMService
from app.services.chat_history import ChatHistoryService

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    embed_service = EmbeddingService()
    vector_store = VectorStore(dimension=384)

    try:
        vector_store.load()
    except FileNotFoundError:
        return {"answer": "No indexed documents found.", "sources": []}

    retriever = Retriever(embed_service, vector_store)
    llm_service = LLMService()
    chat_service = ChatService(retriever, llm_service)

    result = chat_service.chat(request.query, request.document_id, request.user_id)

    # Automatically persist conversation flow: User message -> AI response -> PostgreSQL
    if request.chat_id:
        try:
            import json
            history = ChatHistoryService()
            history.save_message(request.chat_id, "user", request.query)

            content_to_save = result["answer"]
            if result.get("sources"):
                content_to_save += f"\n\n<!-- SOURCES:{json.dumps(result['sources'])} -->"
            history.save_message(request.chat_id, "assistant", content_to_save)
        except Exception as e:
            print(f"Error saving chat message to database: {e}")


    return result