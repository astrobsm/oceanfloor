"""AI agent layer.

Engines never import an LLM provider directly. They request capabilities from the
`AgentOrchestrator`, which selects a specialized agent and the configured provider.
This keeps engines provider-agnostic and centralizes safety guardrails.
"""
from app.agents.orchestrator import AgentOrchestrator, get_orchestrator

__all__ = ["AgentOrchestrator", "get_orchestrator"]
