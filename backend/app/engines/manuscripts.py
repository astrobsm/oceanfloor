"""Manuscript Writing Engine — assembles an IMRAD manuscript."""
from __future__ import annotations

from app.agents import get_orchestrator
from app.schemas.extras import ManuscriptRequest, ManuscriptResponse

IMRAD_SECTIONS = ["Abstract", "Introduction", "Methods", "Results", "Discussion", "Conclusion"]


class ManuscriptEngine:
    def assemble(self, req: ManuscriptRequest) -> ManuscriptResponse:
        agent = get_orchestrator().writing
        seeds = {
            "Introduction": req.background or "",
            "Methods": req.methods or "",
            "Results": req.results or "",
        }
        sections: dict[str, str] = {}
        for section in IMRAD_SECTIONS:
            seed = seeds.get(section, "")
            sections[section] = agent.run(
                f"Write the '{section}' section of a journal manuscript titled "
                f"\"{req.title}\" targeting {req.target_journal or 'a general medical journal'}. "
                f"Citation style: {req.citation_style}. "
                f"Seed content (may be empty):\n{seed}\n"
                "Do not fabricate references — use [CITATION NEEDED] placeholders.",
                temperature=0.5,
            )
        return ManuscriptResponse(
            title=req.title,
            target_journal=req.target_journal,
            citation_style=req.citation_style,
            sections=sections,
        )


manuscript_engine = ManuscriptEngine()
