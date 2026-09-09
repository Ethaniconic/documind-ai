# pyrefly: ignore [missing-import]
import faiss
from pathlib import Path
import numpy as np
import json

VECTOR_STORE = Path(__file__).resolve().parent.parent.parent / "vector_store"
INDEX_PATH = str(VECTOR_STORE / "index.faiss")
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

        print("Embedding shape:", vectors.shape)
        print("First vector norm:", np.linalg.norm(vectors[0]))

        self.index.add(vectors)

    def search(self, query_embedding, top_k=5):
        query = np.array(
            [query_embedding],
            dtype=np.float32
        )

        distances, indices = self.index.search(query, top_k)

        return distances, indices

    def add_metadata(self, chunks):
        self.metadata.extend([c.model_dump() if hasattr(c, "model_dump") else c for c in chunks])

    def save(self):
        VECTOR_STORE.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, INDEX_PATH)
        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=4)

    def load(self):
        if not Path(INDEX_PATH).exists() or not METADATA_PATH.exists():
            raise FileNotFoundError("Vector store index or metadata file not found.")
        self.index = faiss.read_index(INDEX_PATH)
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)