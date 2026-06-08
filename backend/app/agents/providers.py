"""LLM provider abstraction.

`LLMProvider` is the stable interface engines rely on. Concrete adapters implement
it for OpenAI / Azure OpenAI / Anthropic. A `MockProvider` enables fully offline
development and deterministic tests.
"""
from __future__ import annotations

import abc
import json
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMProvider(abc.ABC):
    """Abstract chat-completion provider."""

    @abc.abstractmethod
    def complete(self, messages: list[LLMMessage], *, temperature: float = 0.4) -> str:
        """Return the assistant text for the given conversation."""
        raise NotImplementedError


class MockProvider(LLMProvider):
    """Deterministic, offline provider.

    Returns structured placeholder content so the full system is runnable without
    API keys. Swap for a real provider by setting LLM_PROVIDER in the environment.
    """

    def complete(self, messages: list[LLMMessage], *, temperature: float = 0.4) -> str:
        user = next((m.content for m in reversed(messages) if m.role == "user"), "")
        return (
            "[MOCK LLM OUTPUT — configure LLM_PROVIDER for live generation]\n\n"
            f"Prompt received:\n{user[:600]}"
        )


class OpenAIProvider(LLMProvider):
    """OpenAI / Azure OpenAI adapter (lazy import to keep base deps light)."""

    def __init__(self) -> None:
        self._model = settings.llm_model

    def complete(self, messages: list[LLMMessage], *, temperature: float = 0.4) -> str:
        try:
            from openai import OpenAI  # type: ignore
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "openai package not installed. `pip install openai` to use this provider."
            ) from exc

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=self._model,
            temperature=temperature,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
        return resp.choices[0].message.content or ""


def build_provider() -> LLMProvider:
    """Factory selecting the provider from configuration."""
    provider = settings.llm_provider.lower()
    if provider in {"openai", "azure"}:
        return OpenAIProvider()
    # "anthropic" adapter can be added the same way; default to mock.
    return MockProvider()


def parse_json_block(text: str) -> dict | list:
    """Best-effort extraction of a JSON object/array from an LLM response."""
    text = text.strip()
    start = min((i for i in (text.find("{"), text.find("[")) if i != -1), default=-1)
    if start == -1:
        raise ValueError("No JSON found in model output")
    end = max(text.rfind("}"), text.rfind("]"))
    return json.loads(text[start : end + 1])
