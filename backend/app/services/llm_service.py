from google import genai
from app.core.config import settings

_client = None

FALLBACK_MODELS = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
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

        for model in models:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as error:
                # If model is unavailable (503/429), try next candidate
                continue

        return "The AI assistant is momentarily handling high traffic. Please try asking again in a few seconds."


# =====================================================================
# PREVIOUS LOCAL HUGGINGFACE MODEL CODE (1.7B / Qwen2.5-1.5B-Instruct)
# =====================================================================
# from transformers import pipeline
# 
# MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
# _pipe = None
# 
# def get_pipe():
#     global _pipe
#     if _pipe is None:
#         _pipe = pipeline(
#             "text-generation",
#             model=MODEL_NAME,
#             device_map="auto",
#             dtype="auto",
#         )
#     return _pipe
# 
# class LLMService:
#     def generate(self, prompt: str, max_new_tokens: int = 512) -> str:
#         outputs = get_pipe()(
#             prompt,
#             max_new_tokens=max_new_tokens,
#             max_length=None,
#             return_full_text=False,
#         )
#         return outputs[0]["generated_text"].strip()