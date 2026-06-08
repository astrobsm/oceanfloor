"""Presentation Engine — builds a structured slide deck (JSON model).

The deck model is renderer-agnostic. The export engine converts it into a real
.pptx file when requested.
"""
from __future__ import annotations

from app.agents import get_orchestrator
from app.agents.providers import parse_json_block
from app.schemas.extras import PresentationRequest, PresentationResponse, Slide

DEFAULT_SECTIONS = [
    "Title", "Background", "Aim & Objectives", "Methods", "Results",
    "Discussion", "Conclusion", "Acknowledgements", "Q&A",
]


class PresentationEngine:
    def build(self, req: PresentationRequest) -> PresentationResponse:
        sections = req.sections or DEFAULT_SECTIONS
        agent = get_orchestrator().writing
        prompt = (
            f"Build slide content for an {req.audience} presentation titled "
            f"\"{req.title}\". For each of these sections produce a slide with a "
            f"title, 3–5 short bullets, and brief speaker notes:\n- "
            + "\n- ".join(sections)
            + "\n\nReturn ONLY a JSON array. Each element: "
            "{title, bullets:[..], speaker_notes}."
        )
        raw = agent.run(prompt, temperature=0.4)

        slides: list[Slide] = []
        try:
            data = parse_json_block(raw)
            for item in data:  # type: ignore[union-attr]
                slides.append(
                    Slide(
                        title=item.get("title", "(slide)"),
                        bullets=list(item.get("bullets", [])),
                        speaker_notes=item.get("speaker_notes", ""),
                    )
                )
        except (ValueError, Exception):
            # Mock/non-JSON fallback: deterministic placeholder deck.
            for section in sections:
                slides.append(
                    Slide(
                        title=section,
                        bullets=["[Configure LLM_PROVIDER to populate bullets]"],
                        speaker_notes=raw[:400],
                    )
                )
        return PresentationResponse(title=req.title, slides=slides)


presentation_engine = PresentationEngine()
