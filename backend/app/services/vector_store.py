# pyrefly: ignore [missing-import]
import faiss
from pathlib import Path
import numpy as np
import json
from app.core.config import settings
from app.core.supabase_client import supabase

VECTOR_STORE = Path(__file__).resolve().parent.parent.parent / "vector_store"
INDEX_PATH = VECTOR_STORE / "index.faiss"
METADATA_PATH = VECTOR_STORE / "metadata.json"


class VectorStore:
    def __init__(self, dimension: int):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)
        self.metadata = []

    def add_vectors(self, embeddings):
        vectors = np.array(embeddings, dtype=np.float32)
        if vectors.ndim == 1:
            vectors = vectors.reshape(1, -1)
        if vectors.shape[1] != self.dimension:
            raise ValueError(f"Embeddings must have dimension {self.dimension}, got {vectors.shape[1]}")
        self.index.add(vectors)

    def search(self, query_embedding, top_k=5):
        query = np.array([query_embedding], dtype=np.float32)
        distances, indices = self.index.search(query, top_k)
        return distances, indices

    def add_metadata(self, chunks):
        self.metadata.extend([c.model_dump() if hasattr(c, "model_dump") else c for c in chunks])

    def save(self):
        VECTOR_STORE.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(INDEX_PATH))
        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=4)

        # Upload to Supabase Storage for persistence across ephemeral container restarts
        try:
            with open(INDEX_PATH, "rb") as f:
                supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                    path="vector_store/index.faiss",
                    file=f.read(),
                    file_options={"upsert": "true", "content-type": "application/octet-stream"}
                )
            with open(METADATA_PATH, "rb") as f:
                supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                    path="vector_store/metadata.json",
                    file=f.read(),
                    file_options={"upsert": "true", "content-type": "application/json"}
                )
        except Exception as e:
            print(f"[VectorStore] Supabase Storage backup note: {e}")

    def load(self):
        # Download from Supabase Storage if local copy is missing (e.g. Render redeploy/restart)
        if not INDEX_PATH.exists() or not METADATA_PATH.exists():
            self._download_from_supabase()

        if not INDEX_PATH.exists() or not METADATA_PATH.exists():
            raise FileNotFoundError("Vector store index or metadata file not found.")

        self.index = faiss.read_index(str(INDEX_PATH))
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

    def _download_from_supabase(self):
        VECTOR_STORE.mkdir(parents=True, exist_ok=True)
        try:
            items = supabase.storage.from_(settings.SUPABASE_BUCKET).list("vector_store")
            names = {f.get("name") for f in items if isinstance(f, dict)}
            if "index.faiss" in names:
                idx_bytes = supabase.storage.from_(settings.SUPABASE_BUCKET).download("vector_store/index.faiss")
                if idx_bytes:
                    with open(INDEX_PATH, "wb") as f:
                        f.write(idx_bytes)
            if "metadata.json" in names:
                meta_bytes = supabase.storage.from_(settings.SUPABASE_BUCKET).download("vector_store/metadata.json")
                if meta_bytes:
                    with open(METADATA_PATH, "wb") as f:
                        f.write(meta_bytes)
        except Exception as e:
            print(f"[VectorStore] Storage download note: {e}")