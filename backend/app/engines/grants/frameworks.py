"""Theory of Change, Logframe, and SMART objective scaffolding."""
from __future__ import annotations

from dataclasses import dataclass, field
import re


@dataclass
class TocRequest:
    problem: str
    population: str
    inputs: list[str] = field(default_factory=list)
    activities: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    short_outcomes: list[str] = field(default_factory=list)
    intermediate_outcomes: list[str] = field(default_factory=list)
    long_term_impact: str = ""
    assumptions: list[str] = field(default_factory=list)


@dataclass
class TheoryOfChange:
    inputs: list[str]
    activities: list[str]
    outputs: list[str]
    short_outcomes: list[str]
    intermediate_outcomes: list[str]
    long_term_impact: str
    assumptions: list[str]
    diagram_mermaid: str  # mermaid flowchart definition
    narrative: str


@dataclass
class LogframeRow:
    level: str
    summary: str
    indicators: list[str]
    means_of_verification: list[str]
    assumptions: list[str]


@dataclass
class Logframe:
    rows: list[LogframeRow]
    notes: list[str]


@dataclass
class SmartObjective:
    raw: str
    specific: str
    measurable: str
    achievable: str
    relevant: str
    time_bound: str
    is_smart: bool
    issues: list[str]


def _bullets(arr: list[str]) -> str:
    return "\n".join(f"  - {a}" for a in arr) if arr else "  - (to be defined)"


def _seed(value: list[str], default: list[str]) -> list[str]:
    return value if value else default


class FrameworksEngine:
    def theory_of_change(self, req: TocRequest) -> TheoryOfChange:
        inputs = _seed(req.inputs,
                       ["Funding", "Research team", "Ethical approval",
                        "Data collection tools", "Partner institutions"])
        activities = _seed(req.activities,
                           ["Recruit participants", "Train data collectors",
                            "Collect data", "Analyse data", "Disseminate findings"])
        outputs = _seed(req.outputs,
                        ["Validated dataset", "Peer-reviewed publications",
                         "Stakeholder briefs"])
        short_oc = _seed(req.short_outcomes,
                         ["Improved knowledge", "Improved practice"])
        mid_oc = _seed(req.intermediate_outcomes,
                       ["Adoption by health facilities", "Policy uptake"])
        impact = req.long_term_impact or (
            f"Reduced burden of {req.problem or 'the target condition'} in "
            f"{req.population or 'the target population'}."
        )
        assumptions = _seed(req.assumptions,
                            ["Stakeholder engagement remains stable",
                             "No major political or epidemiological disruption",
                             "Adequate participant recruitment"])

        diagram = (
            "flowchart LR\n"
            "  IN[Inputs]\n"
            "  AC[Activities]\n"
            "  OUT[Outputs]\n"
            "  SOC[Short-term outcomes]\n"
            "  MOC[Mid-term outcomes]\n"
            "  IMP[Long-term impact]\n"
            "  IN --> AC --> OUT --> SOC --> MOC --> IMP\n"
            "  classDef stage fill:#11303f,stroke:#5fd9eb,color:#e6f1f5;\n"
            "  class IN,AC,OUT,SOC,MOC,IMP stage;"
        )

        narrative = (
            f"## Theory of Change\n\n"
            f"**Problem:** {req.problem or '(to be defined)'}\n\n"
            f"**Population:** {req.population or '(to be defined)'}\n\n"
            f"**Inputs:**\n{_bullets(inputs)}\n\n"
            f"**Activities:**\n{_bullets(activities)}\n\n"
            f"**Outputs:**\n{_bullets(outputs)}\n\n"
            f"**Short-term outcomes:**\n{_bullets(short_oc)}\n\n"
            f"**Intermediate outcomes:**\n{_bullets(mid_oc)}\n\n"
            f"**Long-term impact:** {impact}\n\n"
            f"**Assumptions:**\n{_bullets(assumptions)}\n"
        )

        return TheoryOfChange(
            inputs=inputs, activities=activities, outputs=outputs,
            short_outcomes=short_oc, intermediate_outcomes=mid_oc,
            long_term_impact=impact, assumptions=assumptions,
            diagram_mermaid=diagram, narrative=narrative,
        )

    def logframe(
        self,
        goal: str,
        purpose: str,
        outputs: list[str],
        activities: list[str],
        indicators: dict[str, list[str]] | None = None,
        verification: dict[str, list[str]] | None = None,
        assumptions: dict[str, list[str]] | None = None,
    ) -> Logframe:
        ind = indicators or {}
        ver = verification or {}
        ass = assumptions or {}
        rows = [
            LogframeRow(
                "Goal", goal,
                ind.get("goal", ["Long-term impact indicator (to define)"]),
                ver.get("goal", ["National statistics", "Independent evaluations"]),
                ass.get("goal", ["Macro context remains stable"]),
            ),
            LogframeRow(
                "Purpose", purpose,
                ind.get("purpose", ["Outcome indicator (to define)"]),
                ver.get("purpose", ["Project endline survey"]),
                ass.get("purpose", ["Stakeholder buy-in"]),
            ),
        ]
        for i, o in enumerate(outputs, start=1):
            key = f"output_{i}"
            rows.append(LogframeRow(
                f"Output {i}", o,
                ind.get(key, ["Quantified output indicator"]),
                ver.get(key, ["Project records", "Activity reports"]),
                ass.get(key, ["Resources delivered on schedule"]),
            ))
        for i, a in enumerate(activities, start=1):
            key = f"activity_{i}"
            rows.append(LogframeRow(
                f"Activity {i}", a,
                ind.get(key, ["Activity completion indicator"]),
                ver.get(key, ["Activity logs"]),
                ass.get(key, ["Inputs available"]),
            ))
        return Logframe(rows=rows, notes=[
            "Indicators and assumptions are placeholders — refine with the project team.",
            "Each indicator should be SMART and aligned with the funder's M&E template.",
        ])

    def smart_check(self, raw: str) -> SmartObjective:
        text = raw.strip()
        issues: list[str] = []
        specific = "Yes" if len(text.split()) >= 6 else "Add a specific verb and target."
        measurable = "Yes" if re.search(r"\d|%|percent", text.lower()) else "Add a measurable target."
        time_pat = re.search(r"by\s+\d{4}|within\s+\d+\s+(?:months|years)", text.lower())
        time_bound = "Yes" if time_pat else "Add a deadline (e.g. 'by 2027' or 'within 18 months')."
        relevant = "Yes (assumed — link to funder priorities)"
        achievable = "Yes (assumed — verify with feasibility analysis)"

        for label, value in [
            ("Specific", specific),
            ("Measurable", measurable),
            ("Time-bound", time_bound),
        ]:
            if value != "Yes":
                issues.append(f"{label}: {value}")

        return SmartObjective(
            raw=raw,
            specific=specific,
            measurable=measurable,
            achievable=achievable,
            relevant=relevant,
            time_bound=time_bound,
            is_smart=len(issues) == 0,
            issues=issues,
        )


frameworks_engine = FrameworksEngine()
