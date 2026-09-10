from app.services.reranker import filter_results, remove_duplicates, build_context

PROMPT_TEMPLATE = """You are DocuMind AI, an intelligent document analysis assistant.

Answer the user's question thoroughly using ONLY the provided context.
- Structure your answer with clear markdown (headings, bullet points, bold key phrases, and tables if relevant).
- Provide explicit inline citations to the source page(s) whenever you reference facts (e.g., **[Page 1]** or **[Page 3]**).
- If the answer cannot be found in the provided context, state that the information is not available in the uploaded documents.

Context:
{context}

Question:
{question}

Answer:"""


class ChatService:
    def __init__(self, retriever, llm_service):
        self.retriever = retriever
        self.llm = llm_service

    def chat(self, query: str, document_id=None, user_id=None):
        allowed_doc_ids = None
        if user_id:
            from app.services.document_service import DocumentService
            doc_service = DocumentService()
            allowed_doc_ids = doc_service.get_user_document_ids(user_id)
            if not allowed_doc_ids:
                return {
                    "answer": "You have not uploaded any documents yet. Please upload a PDF in the Knowledge Base to ask questions.",
                    "sources": [],
                }

        # 1. Retrieve candidate chunks
        raw_chunks = self.retriever.retrieve(query, top_k=10)

        # 2. Filter strictly by user's owned documents and selected document_id
        filtered_chunks = []
        for chunk in raw_chunks:
            chunk_doc = str(getattr(chunk, "document_id", "") or "")
            
            # Tenant isolation: ensure chunk belongs to this user's documents
            if allowed_doc_ids is not None:
                matches_user = any(allowed in chunk_doc or chunk_doc in allowed for allowed in allowed_doc_ids)
                if not matches_user:
                    continue

            # Focus filter: if specific document is selected
            if document_id:
                doc_str = str(document_id)
                if doc_str not in chunk_doc and chunk_doc not in doc_str:
                    continue

            filtered_chunks.append(chunk)

        # 3. Build context
        unique_chunks = remove_duplicates(filtered_chunks[:5])

        if not unique_chunks:
            return {
                "answer": "I couldn't find sufficiently relevant information in your uploaded documents.",
                "sources": [],
            }

        context = build_context(unique_chunks)

        # 4. Build prompt
        prompt = PROMPT_TEMPLATE.format(context=context, question=query)

        # 5. Send prompt to LLM
        answer = self.llm.generate(prompt)

        # 6. Extract sources
        sources = [
            {
                "document_id": chunk.document_id,
                "page_number": chunk.page_number,
                "score": chunk.score,
            }
            for chunk in unique_chunks
        ]

        return {
            "answer": answer,
            "sources": sources,
        }