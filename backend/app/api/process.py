from fastapi import APIRouter, HTTPException
from app.services.pdf_parser import extract_text
from app.services.chunker import chunk_text
from app.services.text_cleaner import clean_text
from pathlib import Path
import json

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
PROCESSED_DIR = Path(__file__).resolve().parent.parent.parent / "processed" / "chunks"

def save_chunks(document_id, chunks):
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_file = PROCESSED_DIR / f"{document_id}.json"

    data = {
        "document_id": document_id,
        "chunks": [c.model_dump() for c in chunks]
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

@router.post("/process/{document_id}")
def process_document(document_id: str):
    file_path = UPLOAD_DIR / f"{document_id}.pdf"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {document_id}.pdf")

    pages = extract_text(str(file_path))

    for page in pages:
        page['text'] = clean_text(page['text'])

    chunks = chunk_text(document_id, pages)

    save_chunks(document_id, chunks)

    return {
        "document_id": document_id,
        "status": "processed"
    }