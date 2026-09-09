import uuid
from pathlib import Path
import pymupdf as pf
from app.core.config import settings
from app.core.supabase_client import supabase

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


class DocumentService:
    def upload_document(self, file, user_id: str):
        filename = getattr(file, "filename", "document.pdf")
        if hasattr(file, "file"):
            content = file.file.read()
        elif hasattr(file, "read"):
            content = file.read()
        else:
            content = file

        # Keep local copy during migration
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        with open(UPLOAD_DIR / unique_name, "wb") as buffer:
            buffer.write(content)

        # Count pages
        pages = 1
        try:
            doc = pf.open(stream=content, filetype="pdf")
            pages = doc.page_count
            doc.close()
        except Exception:
            pass

        # Upload to Supabase Storage bucket
        storage_path = f"{user_id}/{unique_name}"
        supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": "application/pdf"}
        )

        # Insert metadata into PostgreSQL documents table
        document_data = {
            "user_id": user_id,
            "filename": filename,
            "storage_path": storage_path,
            "pages": pages,
        }
        response = supabase.table("documents").insert(document_data).execute()
        return response.data[0] if response.data else document_data

    def get_user_documents(self, user_id: str):
        try:
            response = (
                supabase.table("documents")
                .select("*")
                .eq("user_id", user_id)
                .order("id", desc=True)
                .execute()
            )
            return response.data or []
        except Exception:
            return []
