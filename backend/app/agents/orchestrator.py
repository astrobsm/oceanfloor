"""Specialized agents and the orchestrator that routes engine requests to them.

Guardrails enforced here (system prompts):
- Never fabricate references, citations, or DOIs.
- Never give individualized clinical/diagnostic advice.
- Always flag output as requiring expert human verification.
"""
from __future__ import annotations

from functools import lru_cache

from app.agents.providers import LLMMessage, LLMProvider, build_provider

SAFETY_PREAMBLE = (
    "You are a module of OceanFloor, a medical research assistant. "
    "Never fabricate references, citations, DOIs, or statistics. "
    "Do not provide individualized clinical or diagnostic advice. "
    "Clearly note that all output requires expert human verification."
)


class Agent:
    """A role-specialized wrapper around a provider with a fixed system prompt."""

    role_prompt: str = ""

    def __init__(self, provider: LLMProvider) -> None:
        self._provider = provider

    def run(self, user_prompt: str, *, temperature: float = 0.4) -> str:
        messages = [
            LLMMessage("system", f"{SAFETY_PREAMBLE}\n\n{self.role_prompt}"),
            LLMMessage("user", user_prompt),
        ]
        return self._provider.complete(messages, temperature=temperature)


class IdeationAgent(Agent):
    role_prompt = (
        "Act as a multidisciplinary research panel. Generate novel, feasible, high-impact "
        "research ideas, identify research gaps, and return strictly valid JSON when asked."
    )


class WritingAgent(Agent):
    role_prompt = (
        "Act as a scientific writer and journal editor. Produce clear, structured academic "
        "prose in IMRAD format and respect the requested citation style."
    )


class MethodologyAgent(Agent):
    role_prompt = (
        "Act as a clinical epidemiologist and biostatistician. Advise on study design, "
        "hypotheses, and analysis strategy with methodological rigor."
    )


class InterpretationAgent(Agent):
    role_prompt = (
        "Act as a senior researcher interpreting analysis results: write balanced discussion, "
        "compare with literature, and state clinical/nursing/public-health implications."
    )


class AgentOrchestrator:
    """Single entry point engines use to obtain a specialized agent."""

    def __init__(self, provider: LLMProvider) -> None:
        self.ideation = IdeationAgent(provider)
        self.writing = WritingAgent(provider)
        self.methodology = MethodologyAgent(provider)
        self.interpretation = InterpretationAgent(provider)


@lru_cache
def get_orchestrator() -> AgentOrchestrator:
    return AgentOrchestrator(build_provider())
