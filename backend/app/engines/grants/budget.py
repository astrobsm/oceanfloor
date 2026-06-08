"""Budget assembly for grant proposals.

Produces a categorised line-item table, a 5–10% contingency, and a budget
narrative paragraph. Currency is user-supplied (defaults to USD). All
values are inputs from the user — nothing is fabricated.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


CATEGORY_ORDER = (
    "personnel",
    "consultants",
    "equipment",
    "consumables",
    "travel",
    "training",
    "meetings",
    "dissemination",
    "ethics",
    "indirects",
    "contingency",
)


@dataclass
class BudgetLine:
    category: str
    description: str
    quantity: float = 1.0
    unit_cost: float = 0.0
    months: float = 1.0
    notes: str = ""

    @property
    def total(self) -> float:
        return round(self.quantity * self.unit_cost * self.months, 2)


@dataclass
class BudgetRequest:
    currency: str = "USD"
    lines: list[BudgetLine] = field(default_factory=list)
    contingency_rate: float = 0.05  # 5%
    indirects_rate: float = 0.0     # institutional overhead, e.g. 0.15


@dataclass
class BudgetSummary:
    currency: str
    by_category: dict[str, float]
    subtotal: float
    contingency: float
    indirects: float
    total: float
    rows: list[dict]
    narrative: str


def _category_subtotals(lines: Iterable[BudgetLine]) -> dict[str, float]:
    out: dict[str, float] = {}
    for line in lines:
        out.setdefault(line.category, 0.0)
        out[line.category] += line.total
    return {k: round(v, 2) for k, v in out.items()}


def _format_amount(amount: float, currency: str) -> str:
    return f"{currency} {amount:,.2f}"


class BudgetEngine:
    def assemble(self, req: BudgetRequest) -> BudgetSummary:
        sub_by_cat = _category_subtotals(req.lines)
        subtotal = round(sum(sub_by_cat.values()), 2)
        contingency = round(subtotal * max(0.0, min(0.15, req.contingency_rate)), 2)
        indirects = round((subtotal + contingency) * max(0.0, min(0.40, req.indirects_rate)), 2)
        total = round(subtotal + contingency + indirects, 2)

        # Order categories canonically.
        ordered = {c: sub_by_cat[c] for c in CATEGORY_ORDER if c in sub_by_cat}
        for c in sub_by_cat:
            if c not in ordered:
                ordered[c] = sub_by_cat[c]

        rows = [
            {
                "category": ln.category,
                "description": ln.description,
                "quantity": ln.quantity,
                "unit_cost": ln.unit_cost,
                "months": ln.months,
                "total": ln.total,
                "notes": ln.notes,
            }
            for ln in req.lines
        ]

        narrative_parts = [
            f"## Budget narrative\n",
            f"The total budget request is **{_format_amount(total, req.currency)}**, "
            f"comprising a direct subtotal of {_format_amount(subtotal, req.currency)}, "
            f"a contingency of {_format_amount(contingency, req.currency)} "
            f"({req.contingency_rate * 100:.0f}%) and indirect costs of "
            f"{_format_amount(indirects, req.currency)} "
            f"({req.indirects_rate * 100:.0f}%).\n",
        ]
        for cat, amount in ordered.items():
            narrative_parts.append(
                f"- **{cat.title()}**: {_format_amount(amount, req.currency)} — "
                + ", ".join(
                    ln.description for ln in req.lines
                    if ln.category == cat
                )
                + "."
            )

        return BudgetSummary(
            currency=req.currency,
            by_category=ordered,
            subtotal=subtotal,
            contingency=contingency,
            indirects=indirects,
            total=total,
            rows=rows,
            narrative="\n".join(narrative_parts),
        )


budget_engine = BudgetEngine()
