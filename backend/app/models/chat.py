from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    document_id: str | None = None
    chat_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list