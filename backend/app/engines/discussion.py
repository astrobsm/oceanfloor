"""Discussion & Interpretation Engine (LLM-assisted)."""
from __future__ import annotations

from app.agents import get_orchestrator
from app.schemas.extras import DiscussionRequest, DiscussionResponse


class DiscussionEngine:
    def generate(self, req: DiscussionRequest) -> DiscussionResponse:
        agent = get_orchestrator().interpretation
        findings = "\n- ".join(req.key_findings)
        base = (
            f"Research question: {req.research_question}\n"
            f"Key findings:\n- {findings}\n"
            f"Audience: {req.audience}\n"
            f"Discipline: {req.discipline or 'general medical research'}\n\n"
        )

        def section(name: str) -> str:
            return agent.run(
                base + f"Write the '{name}' section in 2–4 paragraphs. "
                "Do not invent citations; insert [CITATION NEEDED] where a citation belongs.",
                temperature=0.5,
            )

        return DiscussionResponse(
            interpretation=section("Interpretation of findings"),
            comparison_with_literature=section("Comparison with existing literature"),
            implications=section(f"{req.audience.capitalize()} implications"),
            limitations=section("Limitations"),
            future_directions=section("Future research directions"),
        )


discussion_engine = DiscussionEngine()
