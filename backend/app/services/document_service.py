import uuid
import json
from pathlib import Path
import pymupdf as pf
from app.core.config import settings
from app.core.supabase_client import supabase
from app.core.user_resolver import resolve_user_id, ensure_public_user

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
META_FILE = UPLOAD_DIR / "documents_meta.json"


class DocumentService:
    def _load_local_docs(self) -> list:
        if META_FILE.exists():
            try:
                with open(META_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _save_local_doc(self, doc_data: dict):
        docs = self._load_local_docs()
        docs = [d for d in docs if str(d.get("id")) != str(doc_data.get("id"))]
        docs.insert(0, doc_data)
        try:
            with open(META_FILE, "w", encoding="utf-8") as f:
                json.dump(docs, f, indent=2)
        except Exception as err:
            print(f"[DocumentService] Failed writing local metadata: {err}")

    def upload_document(self, file, user_id: str):
        user_id = resolve_user_id(user_id)
        filename = getattr(file, "filename", "document.pdf")
        if hasattr(file, "file"):
            content = file.file.read()
        elif hasattr(file, "read"):
            content = file.read()
        else:
            content = file

        doc_id = str(uuid.uuid4())
        unique_name = f"{uuid.uuid4().hex}_{filename}"

        # 1. Store locally for extraction, FAISS embedding & knowledge graph
        with open(UPLOAD_DIR / unique_name, "wb") as buffer:
            buffer.write(content)
        with open(UPLOAD_DIR / f"{doc_id}.pdf", "wb") as buffer:
            buffer.write(content)

        # 2. Count pages
        pages = 1
        try:
            doc = pf.open(stream=content, filetype="pdf")
            pages = doc.page_count
            doc.close()
        except Exception:
            pass

        # 3. Pragmatic Storage Upload (Gracefully bypasses RLS violations)
        storage_path = f"{user_id}/{unique_name}"
        try:
            supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf"}
            )
        except Exception as st_err:
            print(f"[DocumentService] Supabase Storage upload note (RLS/Network): {st_err}")
            storage_path = f"local/{unique_name}"

        document_data = {
            "id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "storage_path": storage_path,
            "pages": pages,
        }

        # 4. Pragmatic Table Insert & Local Cache Sync
        self._save_local_doc(document_data)
        try:
            ensure_public_user(user_id)
            res = supabase.table("documents").upsert(document_data).execute()
            if res.data:
                return res.data[0]
        except Exception as tbl_err:
            print(f"[DocumentService] Supabase table upsert note: {tbl_err}")

        return document_data

    def get_user_documents(self, user_id: str):
        if not user_id:
            return []
        resolved_uid = resolve_user_id(user_id)
        docs = []

        # 1. Fetch from Supabase PostgreSQL table
        try:
            response = (
                supabase.table("documents")
                .select("*")
                .eq("user_id", resolved_uid)
                .order("id", desc=True)
                .execute()
            )
            if response.data:
                docs.extend(response.data)
        except Exception as err:
            print(f"[DocumentService] Supabase fetch note for {user_id}: {err}")

        # 2. Reconcile with Supabase Storage (guarantees stored files are never missing)
        try:
            storage_files = supabase.storage.from_(settings.SUPABASE_BUCKET).list(resolved_uid)
            if storage_files:
                known_paths = {d.get("storage_path") for d in docs if d.get("storage_path")}
                known_names = {d.get("filename") for d in docs if d.get("filename")}
                for s_file in storage_files:
                    fname = s_file.get("name", "")
                    if not fname:
                        continue
                    full_path = f"{resolved_uid}/{fname}"
                    orig_name = fname.split("_", 1)[1] if "_" in fname else fname
                    if full_path not in known_paths and orig_name not in known_names:
                        rec_id = str(s_file.get("id") or uuid.uuid4())
                        rec_doc = {
                            "id": rec_id,
                            "user_id": resolved_uid,
                            "filename": orig_name,
                            "storage_path": full_path,
                            "pages": 1,
                        }
                        try:
                            ensure_public_user(resolved_uid)
                            res = supabase.table("documents").upsert(rec_doc).execute()
                            docs.append(res.data[0] if res.data else rec_doc)
                        except Exception:
                            docs.append(rec_doc)
        except Exception as st_err:
            print(f"[DocumentService] Storage check note: {st_err}")

        # 3. Merge local records for this user
        local_docs = [
            d for d in self._load_local_docs() 
            if resolve_user_id(str(d.get("user_id", ""))) == resolved_uid
        ]
        existing_ids = {str(d.get("id")) for d in docs}
        for ld in local_docs:
            if str(ld.get("id")) not in existing_ids:
                docs.append(ld)

        return docs

    def get_user_document_ids(self, user_id: str) -> list:
        """Returns all document identifiers (IDs, filenames, storage hashes) owned by the user."""
        if not user_id:
            return []
        try:
            docs = self.get_user_documents(user_id)
            doc_ids = set()
            for d in docs:
                if d.get("id"):
                    doc_ids.add(str(d["id"]))
                if d.get("filename"):
                    doc_ids.add(d["filename"])
                storage_path = d.get("storage_path", "")
                if "/" in storage_path:
                    filename_part = storage_path.split("/")[-1]
                    doc_ids.add(filename_part)
                    if "_" in filename_part:
                        doc_ids.add(filename_part.split("_")[0])
            return list(doc_ids)
        except Exception as err:
            print(f"[DocumentService] Error extracting document IDs for user {user_id}: {err}")
            return []

    def delete_document(self, document_id: str, user_id: str = None):
        """Deletes a document, its local files, processed chunks, knowledge graph, and metadata."""
        if not document_id:
            raise ValueError("document_id is required")

        resolved_uid = resolve_user_id(user_id) if user_id else None

        # 1. Ownership validation
        if resolved_uid:
            user_doc_ids = self.get_user_document_ids(resolved_uid)
            doc_str = str(document_id)
            matches = any(allowed in doc_str or doc_str in allowed for allowed in user_doc_ids) if user_doc_ids else True
            if not matches:
                raise PermissionError("Access denied. You do not have permission to delete this document.")

        # 2. Extract storage_paths and filenames
        all_user_docs = self.get_user_documents(user_id) if user_id else self._load_local_docs()
        matching_docs = [d for d in all_user_docs if str(d.get("id")) == str(document_id) or d.get("filename") == str(document_id)]
        storage_paths = []
        filenames = []
        for d in matching_docs:
            if d.get("storage_path"):
                storage_paths.append(d["storage_path"])
            if d.get("filename"):
                filenames.append(d["filename"])

        # 3. Clean up local uploaded files
        base_dir = Path(__file__).resolve().parent.parent.parent
        file_candidates = [
            UPLOAD_DIR / f"{document_id}.pdf",
            UPLOAD_DIR / document_id,
        ]
        for sp in storage_paths:
            if "/" in sp:
                file_candidates.append(UPLOAD_DIR / sp.split("/")[-1])
        for fn in filenames:
            file_candidates.append(UPLOAD_DIR / fn)

        for f in file_candidates:
            if f.exists():
                try:
                    f.unlink()
                except Exception:
                    pass

        for f in UPLOAD_DIR.glob(f"*{document_id}*"):
            try:
                f.unlink()
            except Exception:
                pass

        # 4. Clean up processed chunks and knowledge graphs
        for stem in [document_id] + filenames:
            for p in (base_dir / "processed").rglob(f"*{stem}*"):
                try:
                    if p.is_file():
                        p.unlink()
                except Exception:
                    pass

        # 5. Remove from local metadata file
        docs = self._load_local_docs()
        updated_docs = [d for d in docs if str(d.get("id")) != str(document_id) and d.get("filename") != str(document_id)]
        try:
            with open(META_FILE, "w", encoding="utf-8") as f:
                json.dump(updated_docs, f, indent=2)
        except Exception:
            pass

        # 6. Remove from Supabase PostgreSQL table
        try:
            supabase.table("documents").delete().eq("id", document_id).execute()
        except Exception:
            pass
        try:
            supabase.table("documents").delete().eq("filename", document_id).execute()
        except Exception:
            pass
        for sp in storage_paths:
            try:
                supabase.table("documents").delete().eq("storage_path", sp).execute()
            except Exception:
                pass

        # 7. Remove from Supabase Storage bucket
        if storage_paths:
            try:
                supabase.storage.from_(settings.SUPABASE_BUCKET).remove(storage_paths)
            except Exception:
                pass

        if resolved_uid:
            try:
                user_files = supabase.storage.from_(settings.SUPABASE_BUCKET).list(resolved_uid)
                to_remove = []
                for uf in user_files:
                    uname = uf.get("name", "")
                    if str(document_id) in uname or any(fn in uname for fn in filenames):
                        to_remove.append(f"{resolved_uid}/{uname}")
                if to_remove:
                    supabase.storage.from_(settings.SUPABASE_BUCKET).remove(to_remove)
            except Exception:
                pass

        return {"status": "deleted", "document_id": document_id}
