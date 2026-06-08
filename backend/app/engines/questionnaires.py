"""Questionnaire & Data Collection Engine.

Validates the questionnaire structure and exports it to common data-collection
platforms. Exports are produced as text payloads (CSV / TSV / XML) so the caller
can stream them as file downloads without touching the filesystem.
"""
from __future__ import annotations

import csv
import io
from xml.sax.saxutils import escape

from app.schemas.extras import (
    QuestionItem,
    QuestionnaireExportFormat,
    QuestionnaireExportResponse,
    QuestionnaireRequest,
    QuestionType,
)


class QuestionnaireEngine:
    def export(
        self, req: QuestionnaireRequest, fmt: QuestionnaireExportFormat
    ) -> QuestionnaireExportResponse:
        self._validate(req.items)
        if fmt == QuestionnaireExportFormat.csv:
            content = self._to_csv(req.items)
        elif fmt == QuestionnaireExportFormat.redcap:
            content = self._to_redcap(req.items)
        elif fmt == QuestionnaireExportFormat.kobotoolbox:
            content = self._to_kobo(req.items)
        else:  # odk
            content = self._to_odk(req.title, req.items)
        return QuestionnaireExportResponse(title=req.title, format=fmt, content=content)

    @staticmethod
    def _validate(items: list[QuestionItem]) -> None:
        seen: set[str] = set()
        for item in items:
            if item.code in seen:
                raise ValueError(f"Duplicate question code: {item.code}")
            seen.add(item.code)
            if item.type in (QuestionType.multiple_choice, QuestionType.likert) and not item.options:
                raise ValueError(f"Question {item.code} requires options")

    @staticmethod
    def _to_csv(items: list[QuestionItem]) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["code", "text", "type", "options", "required"])
        for it in items:
            writer.writerow([it.code, it.text, it.type.value, "|".join(it.options), it.required])
        return buf.getvalue()

    @staticmethod
    def _to_redcap(items: list[QuestionItem]) -> str:
        """REDCap data dictionary CSV (subset of fields)."""
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "Variable / Field Name", "Form Name", "Field Type", "Field Label",
            "Choices, Calculations, OR Slider Labels", "Required Field?",
        ])
        for it in items:
            field_type = {
                QuestionType.multiple_choice: "radio",
                QuestionType.likert: "radio",
                QuestionType.vas: "slider",
                QuestionType.numeric: "text",
                QuestionType.date: "text",
                QuestionType.free_text: "notes",
                QuestionType.matrix: "matrix",
            }[it.type]
            choices = " | ".join(f"{i + 1}, {opt}" for i, opt in enumerate(it.options))
            writer.writerow([
                it.code.lower(), "data_collection", field_type, it.text, choices,
                "y" if it.required else "",
            ])
        return buf.getvalue()

    @staticmethod
    def _to_kobo(items: list[QuestionItem]) -> str:
        """KoboToolbox XLSForm-style TSV (sheet=survey)."""
        buf = io.StringIO()
        writer = csv.writer(buf, delimiter="\t")
        writer.writerow(["type", "name", "label", "required"])
        for it in items:
            if it.type in (QuestionType.multiple_choice, QuestionType.likert):
                kobo_type = f"select_one {it.code.lower()}_choices"
            elif it.type == QuestionType.numeric:
                kobo_type = "integer"
            elif it.type == QuestionType.date:
                kobo_type = "date"
            elif it.type == QuestionType.vas:
                kobo_type = "range"
            else:
                kobo_type = "text"
            writer.writerow([kobo_type, it.code.lower(), it.text, "yes" if it.required else "no"])
        return buf.getvalue()

    @staticmethod
    def _to_odk(title: str, items: list[QuestionItem]) -> str:
        """Minimal ODK XForm XML."""
        body_lines: list[str] = []
        for it in items:
            body_lines.append(f'  <input ref="/{escape(it.code)}"><label>{escape(it.text)}</label></input>')
        return (
            f'<?xml version="1.0"?>\n'
            f'<h:html xmlns="http://www.w3.org/2002/xforms" '
            f'xmlns:h="http://www.w3.org/1999/xhtml">\n'
            f'<h:head><h:title>{escape(title)}</h:title></h:head>\n'
            f'<h:body>\n' + "\n".join(body_lines) + "\n</h:body>\n</h:html>\n"
        )


questionnaire_engine = QuestionnaireEngine()
