from google import genai
from app.core.config import settings

_client = None

FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]


def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API)
    return _client


class LLMService:
    def generate(self, prompt: str, max_new_tokens: int = 512) -> str:
        client = get_client()
        models = [settings.GEMINI_MODEL] + [m for m in FALLBACK_MODELS if m != settings.GEMINI_MODEL]

        last_error = None
        for model in models:
            try:
                response = client.models.generate_content(model=model, contents=prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                last_error = e
                print(f"[LLMService] Model {model} failed: {e}")
                continue

        print(f"[LLMService] All models failed. Last error: {last_error}")
        return "The AI assistant is momentarily handling high traffic. Please try again in a few seconds."