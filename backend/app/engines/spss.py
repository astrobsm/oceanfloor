"""SPSS Compatibility Engine.

Produces a data dictionary (CSV) and an SPSS syntax (.sps) file that defines
variable names, labels, measurement level, value labels, and missing-value codes.
Importing the syntax file in IBM SPSS Statistics applies all metadata at once.
"""
from __future__ import annotations

import csv
import io

from app.schemas.extras import SpssDataDictRequest, SpssDataDictResponse, SpssVariable


class SpssEngine:
    def build(self, req: SpssDataDictRequest) -> SpssDataDictResponse:
        return SpssDataDictResponse(
            dictionary_csv=self._dictionary_csv(req.variables),
            syntax_sps=self._syntax(req.variables),
        )

    @staticmethod
    def _dictionary_csv(variables: list[SpssVariable]) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "name", "label", "type", "measure", "width", "decimals", "values", "missing",
        ])
        for v in variables:
            values = "; ".join(f"{k}={lbl}" for k, lbl in v.values.items())
            writer.writerow([
                v.name, v.label, v.type, v.measure, v.width, v.decimals,
                values, "; ".join(v.missing),
            ])
        return buf.getvalue()

    @staticmethod
    def _syntax(variables: list[SpssVariable]) -> str:
        lines: list[str] = ["* OceanFloor — SPSS metadata syntax.", ""]

        labels = ["VARIABLE LABELS"]
        for v in variables:
            labels.append(f"  {v.name} '{v.label.replace(chr(39), chr(39) * 2)}'")
        lines.append("\n".join(labels) + ".")

        measures = ["VARIABLE LEVEL"]
        for v in variables:
            measures.append(f"  {v.name} ({v.measure})")
        lines.append("\n".join(measures) + ".")

        for v in variables:
            if v.values:
                pairs = " ".join(f"{k} '{lbl}'" for k, lbl in v.values.items())
                lines.append(f"VALUE LABELS {v.name} {pairs}.")
            if v.missing:
                missing = " ".join(v.missing)
                lines.append(f"MISSING VALUES {v.name} ({missing}).")

        lines.append("EXECUTE.\n")
        return "\n".join(lines)


spss_engine = SpssEngine()
