from pydantic import BaseModel
from typing import Union

class RetrievedChunk(BaseModel):
    document_id: str
    chunk_id: Union[int, str]
    page_number: int
    score: float
    text: str