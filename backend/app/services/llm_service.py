from google import genai
from app.core.config import settings

_client = None


def get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API)
    return _client


class LLMService:
    def generate(self, prompt: str, max_new_tokens: int = 512) -> str:
        client = get_client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        return response.text.strip() if response.text else ""


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