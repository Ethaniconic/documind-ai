from app.models.chunk import Chunk

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

def chunk_text(document_id, pages):
    chunks = []
    chunk_counter = 1

    start = 0
    for page in pages:
        text = page['text']
        chunk = text[start: start + CHUNK_SIZE]
        start += CHUNK_SIZE - CHUNK_OVERLAP

        chunk_obj = Chunk(
            document_id=document_id,
            chunk_id=f"{document_id}_chunk_{chunk_counter}",
            page_number=page['page'],
            text=chunk,
            start_char=start,
            end_char=start + len(chunk)
        )

        chunks.append(chunk_obj)
        chunk_counter += 1

    return chunks