from pydantic import BaseModel

class SearchRequest(BaseModel):
    query: str
    top_k: int = 10

class SearchResponse(BaseModel):
    score: float
    document_id: str
    chunk_id: str
    page_number: int
    text: str