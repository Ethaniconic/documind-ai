from pydantic import BaseModel

class EmbeddingRecord(BaseModel):
    document_id: str
    chunk_id: str
    page_number: int
    text: str
    embedding: list[float]