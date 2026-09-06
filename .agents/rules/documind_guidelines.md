# DocuMind Implementation & Review Guidelines

## Scope Boundaries
- When a task specifies frontend-only or backend-only, never modify files in the other subsystem.
- Use existing API contracts and adapt the requested layer to match.

## Review & Explanation Flow
- When asked "what is wrong", "is it good", or "just explain", provide structured technical explanations and call out specific bugs or confirmations before making or proposing file edits.
- Keep implementations short, simple, and clean without introducing unnecessary abstractions.

## Pipeline Technical Invariants
- **Pydantic Objects**: Always access fields via attributes (e.g., `chunk.text`), not dictionary keys (`chunk["text"]`).
- **Vector Serialization**: Always cast `np.ndarray` embeddings to Python native lists using `.tolist()` prior to Pydantic instantiation or JSON serialization.
- **File I/O**: Use text mode `"w"` with `json.dump` / `json.load`.
- **PyMuPDF Extraction**: Treat extracted page text as `str`, never encode to `bytes`.
- **Document IDs**: `document_id` is the raw hex/stem without `.pdf` extension (e.g., `stored_name.replace(".pdf", "")`).
