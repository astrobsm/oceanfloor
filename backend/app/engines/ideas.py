"""Research Idea Generation Engine (LLM-assisted with deterministic ranking).

The agent proposes ideas; the engine applies a transparent weighted score so ranking
is reproducible and auditable rather than hidden inside the model.
"""
from __future__ import annotations

import json

from app.agents import get_orchestrator
from app.agents.providers import parse_json_block
from app.schemas.engines import IdeaRequest, IdeaResponse, ScoredIdea

DISCLAIMER = (
    "AI-generated research ideas. Validate novelty against a current literature search "
    "and confirm feasibility with your team before proceeding."
)

# Transparent ranking weights (sum to 1.0).
WEIGHTS = {"novelty": 0.3, "feasibility": 0.25, "impact": 0.3, "publication": 0.15}


class IdeaEngine:
    def generate(self, req: IdeaRequest) -> IdeaResponse:
        orchestrator = get_orchestrator()
        prompt = self._build_prompt(req)
        raw = orchestrator.ideation.run(prompt, temperature=0.7)

        ideas = self._parse(raw)
        for idea in ideas:
            idea.overall_score = round(
                idea.novelty_score * WEIGHTS["novelty"]
                + idea.feasibility_score * WEIGHTS["feasibility"]
                + idea.impact_score * WEIGHTS["impact"]
                + idea.publication_potential * WEIGHTS["publication"],
                2,
            )
        ideas.sort(key=lambda i: i.overall_score, reverse=True)
        return IdeaResponse(ideas=ideas, disclaimer=DISCLAIMER)

    @staticmethod
    def _build_prompt(req: IdeaRequest) -> str:
        discipline = f" in {req.discipline}" if req.discipline else ""
        return (
            f"Generate {req.count} novel research ideas{discipline} based on this context:\n"
            f"\"{req.context}\"\n\n"
            "Return ONLY a JSON array. Each element must have keys: title, rationale, "
            "research_gap, novelty_score, feasibility_score, impact_score, "
            "publication_potential. Scores are 0-10 floats."
        )

    @staticmethod
    def _parse(raw: str) -> list[ScoredIdea]:
        try:
            data = parse_json_block(raw)
        except (ValueError, json.JSONDecodeError):
            # Mock provider / non-JSON fallback: surface a single placeholder idea.
            return [
                ScoredIdea(
                    title="(LLM provider not configured — placeholder idea)",
                    rationale=raw[:400],
                    research_gap="Configure LLM_PROVIDER to receive ranked ideas.",
                    novelty_score=0.0,
                    feasibility_score=0.0,
                    impact_score=0.0,
                    publication_potential=0.0,
                    overall_score=0.0,
                )
            ]
        ideas: list[ScoredIdea] = []
        for item in data:  # type: ignore[union-attr]
            ideas.append(
                ScoredIdea(
                    title=item.get("title", "(untitled)"),
                    rationale=item.get("rationale", ""),
                    research_gap=item.get("research_gap", ""),
                    novelty_score=float(item.get("novelty_score", 0)),
                    feasibility_score=float(item.get("feasibility_score", 0)),
                    impact_score=float(item.get("impact_score", 0)),
                    publication_potential=float(item.get("publication_potential", 0)),
                    overall_score=0.0,
                )
            )
        return ideas


idea_engine = IdeaEngine()
