import re

def clean_text(text: str):
    text = re.sub(r'\n\s*\n+', ' ', text)
    text = re.sub(r'page\s*:?\s*\d+\s*(?:of\s*\d+)?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()

    return text