from app.services.reranker import filter_results, remove_duplicates, build_context

PROMPT_TEMPLATE = """You are DocuMind AI.

Answer the user's question using ONLY the provided context.

If the answer cannot be found in the context,
say that the information is not available in the provided documents.

Context:
{context}

Question:
{question}

Answer:"""


class ChatService:
    def __init__(self, retriever, llm_service):
        self.retriever = retriever
        self.llm = llm_service

    def chat(self, query: str, document_id=None):
        # 1. Retrieve relevant chunks
        raw_chunks = self.retriever.retrieve(query, top_k=5)

        # 2. Build context
        unique_chunks = remove_duplicates(raw_chunks)

        if not unique_chunks:
            return {
                "answer": "I couldn't find sufficiently relevant information in the uploaded documents.",
                "sources": [],
            }

        context = build_context(unique_chunks)

        # 3. Build prompt
        prompt = PROMPT_TEMPLATE.format(context=context, question=query)

        # 4. Send prompt to LLM
        answer = self.llm.generate(prompt)

        # 5. Extract sources
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