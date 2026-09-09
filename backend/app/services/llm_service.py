from transformers import pipeline

MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
_pipe = None


def get_pipe():
    global _pipe
    if _pipe is None:
        _pipe = pipeline(
            "text-generation",
            model=MODEL_NAME,
            device_map="auto",
            dtype="auto",
        )
    return _pipe


class LLMService:
    def generate(self, prompt: str, max_new_tokens: int = 512) -> str:
        outputs = get_pipe()(
            prompt,
            max_new_tokens=max_new_tokens,
            max_length=None,
            return_full_text=False,
        )
        return outputs[0]["generated_text"].strip()