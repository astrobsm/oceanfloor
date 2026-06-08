"""Parse uploaded research articles (PDF / DOCX / TXT / MD) into structured records.

Extraction is deterministic and heuristic. We never invent metadata: a missing
DOI stays missing, and a missing year stays missing. The synthesis engine tags
records that lack a verifiable identifier as "uploaded - not provider verified".
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass

DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", re.IGNORECASE)
YEAR_RE = re.compile(r"\b(19[5-9]\d|20\d{2})\b")
ABSTRACT_RE = re.compile(
    r"(?is)\babstract\b[\s:.-]+(.+?)(?:\n\s*(?:keywords|introduction|background|1\.\s*introduction|methods|materials and methods)\b|$)"
)
WHITESPACE_RE = re.compile(r"[ \t]+")
NEWLINE_RE = re.compile(r"\n{3,}")


@dataclass
class UploadedArticle:
    filename: str
    title: str
    authors: list[str]
    year: int | None
    doi: str | None
    abstract: str | None
    body: str
    error: str | None = None


def _normalise(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = WHITESPACE_RE.sub(" ", text)
    text = NEWLINE_RE.sub("\n\n", text)
    return text.strip()


def _extract_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader  # lazy
    except ImportError as exc:  # pragma: no cover - install-time error
        raise RuntimeError(
            "PDF parsing requires `pypdf`. Install with: pip install pypdf"
        ) from exc
    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(parts)


def _extract_docx(data: bytes) -> str:
    try:
        import docx  # python-docx, lazy
    except ImportError as exc:
        raise RuntimeError(
            "DOCX parsing requires `python-docx`. Install with: pip install python-docx"
        ) from exc
    doc = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)


def _extract_text(data: bytes) -> str:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return _extract_pdf(data)
    if name.endswith(".docx"):
        return _extract_docx(data)
    if name.endswith((".txt", ".md", ".markdown", ".text")):
        return _extract_text(data)
    # Fallback: try text decoding so users can paste exotic formats.
    return _extract_text(data)


def _guess_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        s = line.strip()
        if 8 <= len(s) <= 240 and not s.lower().startswith(
            ("doi", "received", "accepted", "copyright", "http", "www", "abstract")
        ):
            return s
    return fallback


def _guess_authors(text: str, title: str) -> list[str]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if title in lines:
        idx = lines.index(title)
        candidates = lines[idx + 1 : idx + 6]
    else:
        candidates = lines[:6]
    for line in candidates:
        if (
            "@" in line
            or line.lower().startswith(("abstract", "doi", "department", "university", "received"))
        ):
            continue
        # split on commas / "and"
        parts = re.split(r"[,;]| and ", line)
        parts = [p.strip() for p in parts if p.strip()]
        # An author line usually has 2-12 short tokens per name
        if 1 <= len(parts) <= 30 and all(2 <= len(p.split()) <= 6 for p in parts):
            cleaned = [re.sub(r"\d+|\*|\u2020|\u2021", "", p).strip().strip(".") for p in parts]
            cleaned = [c for c in cleaned if c]
            if cleaned:
                return cleaned[:30]
    return []


def parse_article(filename: str, data: bytes) -> UploadedArticle:
    try:
        raw = extract_text(filename, data)
    except RuntimeError as exc:
        return UploadedArticle(
            filename=filename, title=filename, authors=[], year=None,
            doi=None, abstract=None, body="", error=str(exc),
        )
    except Exception as exc:  # pragma: no cover - defensive
        return UploadedArticle(
            filename=filename, title=filename, authors=[], year=None,
            doi=None, abstract=None, body="",
            error=f"Failed to read {filename}: {exc}",
        )

    text = _normalise(raw)
    if not text:
        return UploadedArticle(
            filename=filename, title=filename, authors=[], year=None,
            doi=None, abstract=None, body="",
            error="No text could be extracted (scanned image PDF?).",
        )

    title = _guess_title(text, fallback=filename)
    authors = _guess_authors(text, title)

    doi_match = DOI_RE.search(text)
    doi = doi_match.group(0).rstrip(".,);") if doi_match else None

    year = None
    year_match = YEAR_RE.search(text[:2000])
    if year_match:
        try:
            year = int(year_match.group(1))
        except ValueError:
            pass

    abstract = None
    abs_match = ABSTRACT_RE.search(text)
    if abs_match:
        abstract = WHITESPACE_RE.sub(" ", abs_match.group(1)).strip()[:3000]

    return UploadedArticle(
        filename=filename,
        title=title,
        authors=authors,
        year=year,
        doi=doi,
        abstract=abstract,
        body=text,
    )
