from app.models.chunk import Chunk

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

def chunk_text(document_id, pages):
    chunks = []
    chunk_counter = 1

    for page in pages:
        text = (page.get("text") or "").strip()
        if not text:
            continue

        start = 0
        while start < len(text):
            chunk = text[start : start + CHUNK_SIZE]
            chunks.append(
                Chunk(
                    document_id=document_id,
                    chunk_id=f"{document_id}_chunk_{chunk_counter}",
                    page_number=page.get("page", 1),
                    text=chunk,
                    start_char=start,
                    end_char=start + len(chunk),
                )
            )
            chunk_counter += 1
            if len(chunk) < CHUNK_SIZE:
                break
            start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks