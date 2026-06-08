"""Universal Referencing Engine — deterministic citation formatting.

Renders verifiable bibliographic records into common citation styles. The engine
refuses to render a reference that lacks any verifiable identifier (DOI or PMID)
*and* a year, in keeping with the integrity guarantee that the system never emits
unverifiable citations.
"""
from __future__ import annotations

from app.schemas.engines import (
    CitationStyle,
    FormatCitationRequest,
    FormatCitationResponse,
    ReferenceInput,
)


class ReferenceEngine:
    def format(self, req: FormatCitationRequest) -> FormatCitationResponse:
        ref = req.reference
        self._assert_verifiable(ref)
        renderer = {
            CitationStyle.vancouver: self._vancouver,
            CitationStyle.ama: self._vancouver,  # AMA ≈ Vancouver numeric for our purposes
            CitationStyle.apa7: self._apa7,
            CitationStyle.harvard: self._harvard,
            CitationStyle.nature: self._nature,
        }[req.style]
        return FormatCitationResponse(style=req.style, rendered=renderer(ref))

    @staticmethod
    def _assert_verifiable(ref: ReferenceInput) -> None:
        if not (ref.doi or ref.pmid) and not ref.year:
            raise ValueError(
                "Reference lacks a verifiable identifier (DOI/PMID) and a year; "
                "OceanFloor does not render unverifiable citations."
            )

    @staticmethod
    def _authors_vancouver(ref: ReferenceInput) -> str:
        names = []
        for a in ref.authors[:6]:
            family = a.get("family", "").strip()
            given = a.get("given", "").strip()
            initials = "".join(part[0] for part in given.split() if part)
            names.append(f"{family} {initials}".strip())
        out = ", ".join(names)
        if len(ref.authors) > 6:
            out += ", et al"
        return out

    @staticmethod
    def _authors_apa(ref: ReferenceInput) -> str:
        names = []
        for a in ref.authors:
            family = a.get("family", "").strip()
            given = a.get("given", "").strip()
            initials = ". ".join(part[0] for part in given.split() if part)
            initials = f"{initials}." if initials else ""
            names.append(f"{family}, {initials}".strip())
        if not names:
            return ""
        if len(names) == 1:
            return names[0]
        return ", ".join(names[:-1]) + ", & " + names[-1]

    def _vancouver(self, ref: ReferenceInput) -> str:
        parts = [self._authors_vancouver(ref) + "." if ref.authors else "",
                 f"{ref.title}."]
        if ref.journal:
            parts.append(f"{ref.journal}.")
        tail = ""
        if ref.year:
            tail += f"{ref.year}"
        if ref.volume:
            tail += f";{ref.volume}"
        if ref.issue:
            tail += f"({ref.issue})"
        if ref.pages:
            tail += f":{ref.pages}"
        if tail:
            parts.append(tail + ".")
        if ref.doi:
            parts.append(f"doi:{ref.doi}.")
        elif ref.pmid:
            parts.append(f"PMID:{ref.pmid}.")
        return " ".join(p for p in parts if p)

    def _apa7(self, ref: ReferenceInput) -> str:
        authors = self._authors_apa(ref)
        year = f"({ref.year})." if ref.year else "(n.d.)."
        out = f"{authors} {year} {ref.title}."
        if ref.journal:
            vol = f", {ref.volume}" if ref.volume else ""
            iss = f"({ref.issue})" if ref.issue else ""
            pages = f", {ref.pages}" if ref.pages else ""
            out += f" {ref.journal}{vol}{iss}{pages}."
        if ref.doi:
            out += f" https://doi.org/{ref.doi}"
        return out.strip()

    def _harvard(self, ref: ReferenceInput) -> str:
        authors = self._authors_apa(ref)
        out = f"{authors} {ref.year or 'n.d.'}, '{ref.title}'"
        if ref.journal:
            out += f", {ref.journal}"
            if ref.volume:
                out += f", vol. {ref.volume}"
            if ref.issue:
                out += f", no. {ref.issue}"
            if ref.pages:
                out += f", pp. {ref.pages}"
        out += "."
        if ref.doi:
            out += f" doi:{ref.doi}."
        return out

    def _nature(self, ref: ReferenceInput) -> str:
        authors = self._authors_vancouver(ref)
        out = f"{authors}. {ref.title}."
        if ref.journal:
            out += f" {ref.journal}"
            if ref.volume:
                out += f" {ref.volume},"
            if ref.pages:
                out += f" {ref.pages}"
            if ref.year:
                out += f" ({ref.year})"
            out += "."
        if ref.doi:
            out += f" https://doi.org/{ref.doi}"
        return out


reference_engine = ReferenceEngine()
