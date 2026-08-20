import os
import json
import logging
from typing import Optional, Type
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class LLMClient:
    """
    Shared LLM client using Groq as the primary provider.
    Uses OpenAI-compatible API. Supports plain text and structured JSON output.
    14,400 RPD free tier - 10x more than Gemini free tier.
    """

    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

    def _get_groq_client(self):
        from groq import Groq
        return Groq(api_key=self.groq_key)

    def generate(self, prompt: str, system: str = "", temperature: float = 0.2) -> str:
        """Generate plain text response via Groq."""
        if not self.groq_key:
            raise Exception("GROQ_API_KEY not set.")
        client = self._get_groq_client()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(
            model=self.groq_model,
            messages=messages,
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""

    def generate_json(
        self,
        prompt: str,
        response_model: Type[BaseModel],
        system: str = "",
        temperature: float = 0.1,
    ) -> Optional[BaseModel]:
        """
        Generate structured JSON response parsed into a Pydantic model.
        Uses Groq JSON mode for reliable structured output.
        """
        if not self.groq_key:
            raise Exception("GROQ_API_KEY not set.")

        schema_hint = (
            f"\n\nRespond ONLY with a valid JSON object matching this schema:\n"
            f"{json.dumps(response_model.model_json_schema(), indent=2)}"
        )

        client = self._get_groq_client()
        messages = []
        sys_msg = (system or "You are a helpful assistant that outputs valid JSON only.") + schema_hint
        messages.append({"role": "system", "content": sys_msg})
        messages.append({"role": "user", "content": prompt})

        resp = client.chat.completions.create(
            model=self.groq_model,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        try:
            return response_model.model_validate_json(raw)
        except Exception as e:
            logger.error(f"[LLMClient] Failed to parse Groq JSON: {e}\nRaw: {raw[:500]}")
            return None
