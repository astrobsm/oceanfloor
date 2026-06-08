"""Automated Research Proposal Engine.

Produces a fully structured proposal skeleton with every required section. Each
section is drafted by the writing agent; the deterministic section list guarantees
completeness regardless of the LLM provider.
"""
from __future__ import annotations

from app.agents import get_orchestrator
from app.schemas.engines import ProposalRequest, ProposalResponse

PROPOSAL_SECTIONS = [
    "Title Page",
    "Abstract",
    "Background",
    "Problem Statement",
    "Justification",
    "Significance",
    "Aim",
    "Objectives",
    "Research Questions",
    "Hypotheses",
    "Literature Review",
    "Methodology",
    "Ethical Considerations",
    "Budget",
    "Work Plan",
    "References",
    "Appendices",
]


class ProposalEngine:
    def generate(self, req: ProposalRequest) -> ProposalResponse:
        orchestrator = get_orchestrator()
        design = f" using a {req.study_design} design" if req.study_design else ""
        discipline = f" in {req.discipline}" if req.discipline else ""

        sections: dict[str, str] = {}
        for section in PROPOSAL_SECTIONS:
            prompt = (
                f"Write the '{section}' section of a research proposal on the topic: "
                f"\"{req.topic}\"{discipline}{design}. "
                "Use formal academic language. Do not invent references; where citations "
                "are needed, insert a [CITATION NEEDED] placeholder."
            )
            sections[section] = orchestrator.writing.run(prompt, temperature=0.5)

        return ProposalResponse(title=req.topic, sections=sections)


proposal_engine = ProposalEngine()
