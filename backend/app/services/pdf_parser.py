# pyrefly: ignore [missing-import]
import pymupdf as pf

def extract_text(file_path: str):
    document = pf.open(file_path)
    pages = []
    for page in document:
        text = page.get_text()
        if not text.strip():
            continue
        pages.append({
            "page": page.number + 1,
            "text": text
        })

    document.close()
    return pages