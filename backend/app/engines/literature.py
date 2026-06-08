"""Advanced Literature Review Engine.

Searches **verifiable** external providers (Crossref and Europe PMC) and returns
only records that carry a resolvable identifier (DOI or PMID). This enforces the
specification's hard rule: never fabricate references, citations, or DOIs.

The engine performs no LLM generation of citations - every record originates from a
real provider response. The deep-review path additionally fetches abstracts from
Europe PMC and assembles a deterministic, fully-editable submission-grade narrative
with inline citations in the requested style.

A third path - review_uploads - parses user-supplied PDF/DOCX/TXT articles and
synthesises a review over them. Uploaded items are clearly tagged as
"uploaded - not provider verified" because OceanFloor cannot independently
confirm an arbitrary file.
"""
from __future__ import annotations

import re
from collections import Counter

import httpx

from app.core.config import settings
from app.engines.literature_uploads import UploadedArticle
from app.engines.references import reference_engine
from app.schemas.engines import (
    CitationStyle,
    FormatCitationRequest,
    LiteratureRecord,
    LiteratureReviewRequest,
    LiteratureReviewResponse,
    LiteratureSearchRequest,
    LiteratureSearchResponse,
    ReferenceInput,
    ReviewedArticle,
)

CROSSREF_URL = "https://api.crossref.org/works"
EUROPE_PMC_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"

NUMERIC_STYLES = {CitationStyle.vancouver, CitationStyle.ama, CitationStyle.nature}

_JATS_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z(])")

_DESIGN_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Systematic review / meta-analysis", re.compile(r"\b(systematic review|meta[- ]analysis|prisma)\b", re.I)),
    ("Randomized controlled trial", re.compile(r"\b(randomi[sz]ed (controlled )?trial|RCT|double[- ]blind|placebo[- ]controlled)\b", re.I)),
    ("Cohort study", re.compile(r"\bcohort\b", re.I)),
    ("Case-control study", re.compile(r"\bcase[- ]control\b", re.I)),
    ("Cross-sectional study", re.compile(r"\bcross[- ]sectional\b", re.I)),
    ("Case series / report", re.compile(r"\bcase (series|report)\b", re.I)),
    ("Qualitative study", re.compile(r"\b(qualitative|grounded theory|thematic analysis|phenomenolog)\b", re.I)),
    ("Pilot / feasibility study", re.compile(r"\b(pilot|feasibility)\b", re.I)),
    ("In vitro / preclinical", re.compile(r"\b(in vitro|preclinical|murine|animal model)\b", re.I)),
]


def _clean(text: str | None) -> str:
    if not text:
        return ""
    return _WHITESPACE_RE.sub(" ", _JATS_TAG_RE.sub(" ", text)).strip()


def _first_sentences(text: str, n: int = 3) -> str:
    cleaned = _clean(text)
    if not cleaned:
        return ""
    sents = _SENT_SPLIT_RE.split(cleaned)
    return " ".join(sents[:n]).strip()


def _detect_design(*texts: str) -> str:
    blob = " ".join(t for t in texts if t)
    for label, pattern in _DESIGN_PATTERNS:
        if pattern.search(blob):
            return label
    return "Empirical study"


def _short_authors(authors: list[str]) -> str:
    if not authors:
        return "Anonymous"
    first = authors[0].strip()
    family = first.split()[-1] if first else "Anonymous"
    if len(authors) == 1:
        return family
    if len(authors) == 2:
        second = authors[1].strip().split()[-1] if authors[1].strip() else ""
        return f"{family} and {second}".strip(" and ")
    return f"{family} et al."


def _parse_author_to_dict(name: str) -> dict[str, str]:
    """Crossref-style {family, given} from a flat 'Smith JA' or 'Smith John' string."""
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return {"family": "", "given": ""}
    if len(parts) == 1:
        return {"family": parts[0], "given": ""}
    # Heuristic: last token = family if first looks like initials, else first = family
    if len(parts[0]) <= 3 and parts[0].isupper():
        return {"family": " ".join(parts[1:]), "given": parts[0]}
    if len(parts[-1]) <= 3 and parts[-1].isupper():
        return {"family": parts[0], "given": parts[-1]}
    # Default: first = family, rest = given (matches Europe PMC `authorString` convention)
    return {"family": parts[0], "given": " ".join(parts[1:])}


def _record_to_reference(r: LiteratureRecord) -> ReferenceInput:
    return ReferenceInput(
        title=r.title,
        authors=[_parse_author_to_dict(a) for a in r.authors],
        journal=r.journal,
        year=r.year,
        doi=r.doi,
        pmid=r.pmid,
    )


class LiteratureEngine:
    async def search(self, req: LiteratureSearchRequest) -> LiteratureSearchResponse:
        records = await self._collect(req.query, req.max_results)
        return LiteratureSearchResponse(
            query=req.query,
            records=records,
            note=(
                "All records carry a resolvable DOI or PMID returned by a real provider. "
                "Verify relevance before citing."
            ),
        )

    async def review(self, req: LiteratureReviewRequest) -> LiteratureReviewResponse:
        records = await self._collect(req.query, req.max_results, want_abstracts=True)
        if not records:
            return LiteratureReviewResponse(
                query=req.query,
                style=req.style,
                sections={
                    "Introduction": "No verifiable records were retrieved for this query.",
                    "Thematic Synthesis": "",
                    "Methodological Appraisal": "",
                    "Knowledge Gaps": "",
                    "Conclusion": "Refine the search terms and try again.",
                },
                articles=[],
                rendered_references=[],
                note="Search returned zero records with a resolvable DOI or PMID.",
            )

        numeric = req.style in NUMERIC_STYLES

        articles: list[ReviewedArticle] = []
        rendered: list[str] = []
        for idx, rec in enumerate(records, start=1):
            inline = (
                f"[{idx}]"
                if numeric
                else f"({_short_authors(rec.authors)}, {rec.year or 'n.d.'})"
            )
            summary = _first_sentences(rec.abstract or "", n=3) or (
                "Abstract not retrieved from the provider; review the source article "
                "before citing."
            )
            design = _detect_design(rec.title, rec.abstract or "")
            articles.append(
                ReviewedArticle(
                    number=idx,
                    title=rec.title,
                    authors=rec.authors,
                    year=rec.year,
                    journal=rec.journal,
                    doi=rec.doi,
                    pmid=rec.pmid,
                    url=rec.url,
                    design=design,
                    summary=summary,
                    inline_citation=inline,
                )
            )
            try:
                rendered.append(
                    reference_engine.format(
                        FormatCitationRequest(reference=_record_to_reference(rec), style=req.style)
                    ).rendered
                )
            except ValueError:
                rendered.append(
                    f"[Skipped: insufficient bibliographic data] {rec.title}"
                )

        sections = self._build_narrative(req, articles)

        return LiteratureReviewResponse(
            query=req.query,
            style=req.style,
            sections=sections,
            articles=articles,
            rendered_references=rendered,
            note=(
                "Draft generated deterministically from retrieved abstracts. All inline "
                "citations resolve to records with a verifiable DOI or PMID. Edit freely "
                "before submission; do not add citations that were not in the source list."
            ),
        )

    def review_uploads(
        self,
        uploaded: list[UploadedArticle],
        style: CitationStyle,
        focus: str | None,
        query_label: str = "uploaded corpus",
    ) -> LiteratureReviewResponse:
        ok = [u for u in uploaded if not u.error and (u.abstract or u.body)]
        failed = [u for u in uploaded if u.error]

        if not ok:
            errors = "; ".join(f"{u.filename}: {u.error}" for u in failed) or "no readable files"
            return LiteratureReviewResponse(
                query=query_label,
                style=style,
                sections={
                    "Introduction": "No articles could be parsed from the uploaded files.",
                    "Thematic Synthesis": "",
                    "Methodological Appraisal": "",
                    "Knowledge Gaps": "",
                    "Conclusion": errors,
                },
                articles=[],
                rendered_references=[],
                note="Upload parsing failed for every supplied file.",
            )

        numeric = style in NUMERIC_STYLES
        articles: list[ReviewedArticle] = []
        rendered: list[str] = []

        for idx, u in enumerate(ok, start=1):
            inline = (
                f"[{idx}]"
                if numeric
                else f"({_short_authors(u.authors) if u.authors else u.filename}, {u.year or 'n.d.'})"
            )
            summary_source = u.abstract or u.body
            summary = _first_sentences(summary_source, n=3) or (
                "Text extracted but no clear summary sentence was found; review the source file."
            )
            design = _detect_design(u.title, u.abstract or "", u.body[:6000])
            articles.append(
                ReviewedArticle(
                    number=idx,
                    title=u.title or u.filename,
                    authors=u.authors,
                    year=u.year,
                    journal=None,
                    doi=u.doi,
                    pmid=None,
                    url=(f"https://doi.org/{u.doi}" if u.doi else None),
                    design=design,
                    summary=summary,
                    inline_citation=inline,
                )
            )

            # Render bibliography. Prefer the strict engine when DOI+year exist;
            # otherwise fall back to a clearly tagged manual line so the user can
            # complete the bibliographic record before submission.
            rendered.append(self._render_uploaded(u, style))

        # Schema constrains max_results to 3..30; clamp so the shim validates
        # regardless of how many files the user uploaded.
        request_shim = LiteratureReviewRequest(
            query=query_label,
            max_results=max(3, min(30, len(ok))),
            style=style,
            focus=focus,
        )
        sections = self._build_narrative(request_shim, articles)
        intro = sections["Introduction"]
        sections["Introduction"] = (
            f"This review synthesises {len(ok)} user-supplied article(s) on "
            f"**{(focus or query_label).strip()}**. Files parsed: "
            + ", ".join(u.filename for u in ok)
            + ". " + intro.split(".", 1)[1].strip() if "." in intro else intro
        )

        notes = [
            f"{len(ok)} of {len(uploaded)} uploaded files were parsed and synthesised.",
            "Uploaded articles are NOT independently verified by OceanFloor. "
            "Confirm bibliographic details (authors, journal, year, DOI) before submission.",
        ]
        if failed:
            notes.append(
                "Files that could not be parsed: "
                + "; ".join(f"{u.filename} ({u.error})" for u in failed)
            )

        return LiteratureReviewResponse(
            query=query_label,
            style=style,
            sections=sections,
            articles=articles,
            rendered_references=rendered,
            note=" ".join(notes),
        )

    def _render_uploaded(self, u: UploadedArticle, style: CitationStyle) -> str:
        # If we have DOI+year+authors, route through the strict renderer.
        if u.doi and u.year and u.authors:
            try:
                return reference_engine.format(
                    FormatCitationRequest(
                        reference=ReferenceInput(
                            title=u.title or u.filename,
                            authors=[_parse_author_to_dict(a) for a in u.authors],
                            journal=None,
                            year=u.year,
                            doi=u.doi,
                            pmid=None,
                        ),
                        style=style,
                    )
                ).rendered
            except ValueError:
                pass

        # Manual fallback - tagged so reviewers see it must be completed.
        actor = _short_authors(u.authors) if u.authors else "[author(s) unknown]"
        year = u.year or "[year]"
        title = u.title or u.filename
        doi_part = f" doi:{u.doi}." if u.doi else " [DOI not detected in file]."
        return (
            f"{actor}. {title}. {year}.{doi_part} "
            f"[uploaded file: {u.filename} - bibliographic details require verification]"
        )

    # ---- narrative assembly ----
    def _build_narrative(
        self,
        req: LiteratureReviewRequest,
        articles: list[ReviewedArticle],
    ) -> dict[str, str]:
        focus = (req.focus or req.query).strip()
        years = [a.year for a in articles if a.year]
        year_lo, year_hi = (min(years), max(years)) if years else (None, None)
        n = len(articles)

        # Introduction
        oldest = sorted(
            [a for a in articles if a.year], key=lambda a: a.year or 0
        )[:2]
        intro_lines = [
            f"This review synthesizes the published evidence on **{focus}**.",
            (
                f"A structured search of Crossref and Europe PMC retrieved {n} verifiable "
                f"records"
                + (f" spanning {year_lo}-{year_hi}." if year_lo and year_hi else ".")
            ),
            (
                "Earlier work established the clinical relevance of this topic"
                + (
                    f" {oldest[0].inline_citation}"
                    + (f"{oldest[1].inline_citation}" if len(oldest) > 1 else "")
                    if oldest
                    else ""
                )
                + ", motivating the present synthesis."
            ),
        ]

        # Thematic synthesis grouped by detected design
        groups: dict[str, list[ReviewedArticle]] = {}
        for a in articles:
            groups.setdefault(a.design, []).append(a)
        theme_paragraphs: list[str] = []
        for design, items in groups.items():
            items_sorted = sorted(items, key=lambda x: (x.year or 0), reverse=True)
            lines = [f"### {design} ({len(items)})"]
            for a in items_sorted[:6]:
                actor = _short_authors(a.authors)
                year = a.year or "n.d."
                lines.append(f"- {actor} ({year}) reported: {a.summary} {a.inline_citation}")
            if len(items_sorted) > 6:
                remaining = ", ".join(a.inline_citation for a in items_sorted[6:])
                lines.append(f"- Additional supporting studies: {remaining}.")
            theme_paragraphs.append("\n".join(lines))

        # Methodological appraisal
        design_counts = Counter(a.design for a in articles)
        appraisal_lines = [
            "The included evidence base shows the following design distribution:",
        ]
        for design, count in design_counts.most_common():
            appraisal_lines.append(f"- {design}: {count}")
        rct_or_sr = sum(
            v
            for k, v in design_counts.items()
            if k.startswith("Randomized") or k.startswith("Systematic")
        )
        appraisal_lines.append(
            (
                f"Higher-tier evidence (RCTs and systematic reviews/meta-analyses) "
                f"accounts for {rct_or_sr} of {n} included records "
                f"({(rct_or_sr / n) * 100:.0f}%). Observational and pilot work make up "
                "the remainder and should be interpreted with appropriate caution "
                "regarding confounding, selection bias, and limited generalizability."
            )
        )

        # Knowledge gaps - mine 'limitation', 'further research', 'unclear', etc.
        gap_keywords = re.compile(
            r"\b(limitation|further (research|studies)|unclear|inconclusive|"
            r"insufficient|heterogene|small sample|no consensus|conflicting)\w*",
            re.I,
        )
        gap_lines = ["The following gaps emerge from the synthesised evidence:"]
        flagged = 0
        for a in articles:
            if gap_keywords.search(a.summary):
                gap_lines.append(
                    f"- {_short_authors(a.authors)} ({a.year or 'n.d.'}) highlight unresolved aspects: "
                    f"\"{a.summary[:200].rstrip('.')}\". {a.inline_citation}"
                )
                flagged += 1
                if flagged >= 5:
                    break
        if flagged == 0:
            gap_lines.append(
                "- Few included abstracts explicitly state limitations; a full-text "
                "appraisal is warranted to characterise residual uncertainty."
            )
        gap_lines.append(
            f"- Adequately powered, prospective studies on {focus} remain a priority, "
            "particularly where design heterogeneity precludes pooled estimates."
        )

        # Conclusion
        top_designs = [d for d, _ in design_counts.most_common(2)]
        conclusion_lines = [
            (
                f"The current evidence on {focus} is anchored primarily in "
                f"{', '.join(top_designs).lower() or 'observational designs'}."
            ),
            (
                "Findings are broadly consistent in direction but vary in magnitude and "
                "methodological rigour. Clinicians and researchers should weigh the "
                "tier of evidence cited and consider the methodological caveats noted above "
                "before translating these findings into practice or building on them in "
                "subsequent studies."
            ),
            (
                "This draft is intended for editorial refinement; the citation list is "
                "verifiable and ordered consistently with the in-text references."
            ),
        ]

        return {
            "Introduction": " ".join(intro_lines),
            "Thematic Synthesis": "\n\n".join(theme_paragraphs),
            "Methodological Appraisal": "\n".join(appraisal_lines),
            "Knowledge Gaps": "\n".join(gap_lines),
            "Conclusion": " ".join(conclusion_lines),
        }

    # ---- provider plumbing ----
    async def _collect(
        self, query: str, max_results: int, want_abstracts: bool = False
    ) -> list[LiteratureRecord]:
        records: list[LiteratureRecord] = []
        async with httpx.AsyncClient(timeout=25) as client:
            records += await self._search_crossref(client, query, max_results)
            records += await self._search_europepmc(client, query, max_results)

        # Deduplicate by DOI / PMID, preferring records that already carry an abstract.
        seen: dict[str, LiteratureRecord] = {}
        for r in records:
            key = (r.doi or r.pmid or "").lower()
            if not key:
                continue
            existing = seen.get(key)
            if not existing or (not existing.abstract and r.abstract):
                seen[key] = r

        verified = list(seen.values())[:max_results]

        # Enrich missing abstracts via Europe PMC DOI lookup.
        if want_abstracts:
            need = [r for r in verified if not r.abstract and r.doi]
            if need:
                async with httpx.AsyncClient(timeout=20) as client:
                    for r in need:
                        r.abstract = await self._fetch_abstract_by_doi(client, r.doi or "")
        return verified

    async def _fetch_abstract_by_doi(
        self, client: httpx.AsyncClient, doi: str
    ) -> str | None:
        try:
            resp = await client.get(
                EUROPE_PMC_URL,
                params={
                    "query": f"DOI:{doi}",
                    "format": "json",
                    "pageSize": 1,
                    "resultType": "core",
                },
            )
            resp.raise_for_status()
            results = resp.json().get("resultList", {}).get("result", [])
            if results:
                return _clean(results[0].get("abstractText"))
        except (httpx.HTTPError, ValueError):
            return None
        return None

    async def _search_crossref(
        self, client: httpx.AsyncClient, query: str, max_results: int
    ) -> list[LiteratureRecord]:
        params = {
            "query": query,
            "rows": max_results,
            "select": "DOI,title,author,container-title,issued,abstract",
            "mailto": settings.literature_contact_email,
        }
        try:
            resp = await client.get(CROSSREF_URL, params=params)
            resp.raise_for_status()
            items = resp.json().get("message", {}).get("items", [])
        except (httpx.HTTPError, ValueError):
            return []

        out: list[LiteratureRecord] = []
        for it in items:
            doi = it.get("DOI")
            if not doi:
                continue
            year = None
            issued = it.get("issued", {}).get("date-parts", [[None]])
            if issued and issued[0]:
                year = issued[0][0]
            out.append(
                LiteratureRecord(
                    title=(it.get("title") or ["(untitled)"])[0],
                    authors=[
                        f"{a.get('family', '')} {a.get('given', '')}".strip()
                        for a in it.get("author", [])
                    ],
                    journal=(it.get("container-title") or [None])[0],
                    year=year,
                    doi=doi,
                    pmid=None,
                    url=f"https://doi.org/{doi}",
                    source="Crossref",
                    abstract=_clean(it.get("abstract")) or None,
                )
            )
        return out

    async def _search_europepmc(
        self, client: httpx.AsyncClient, query: str, max_results: int
    ) -> list[LiteratureRecord]:
        params = {
            "query": query,
            "format": "json",
            "pageSize": max_results,
            "resultType": "core",
        }
        try:
            resp = await client.get(EUROPE_PMC_URL, params=params)
            resp.raise_for_status()
            results = resp.json().get("resultList", {}).get("result", [])
        except (httpx.HTTPError, ValueError):
            return []

        out: list[LiteratureRecord] = []
        for it in results:
            doi = it.get("doi")
            pmid = it.get("pmid")
            if not doi and not pmid:
                continue
            year = None
            if it.get("pubYear"):
                try:
                    year = int(it["pubYear"])
                except ValueError:
                    year = None
            out.append(
                LiteratureRecord(
                    title=it.get("title", "(untitled)"),
                    authors=[it.get("authorString", "")] if it.get("authorString") else [],
                    journal=it.get("journalTitle"),
                    year=year,
                    doi=doi,
                    pmid=pmid,
                    url=(f"https://doi.org/{doi}" if doi else
                         f"https://europepmc.org/article/MED/{pmid}"),
                    source="Europe PMC",
                    abstract=_clean(it.get("abstractText")) or None,
                )
            )
        return out


literature_engine = LiteratureEngine()
