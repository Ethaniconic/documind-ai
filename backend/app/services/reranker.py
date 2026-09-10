SIMILARITY_THRESHOLD = 0.65

def filter_results(results):
    filtered = []
    for result in results:
        if result.score >= SIMILARITY_THRESHOLD:
            filtered.append(result)
    
    return filtered

def remove_duplicates(results):
    unique = []
    seen = set()

    for result in results:
        if result.text not in seen:
            unique.append(result)
            seen.add(result.text)
    
    return unique

def build_context(results):
    context = ""
    for result in results:
        doc = getattr(result, "document_id", "Doc")
        context += f"[Document: {doc}, Page {result.page_number}]:\n{result.text}\n\n"
    return context.strip()