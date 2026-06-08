"""Knowledge graph primitives and an in-memory implementation."""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from typing import Protocol


@dataclass
class Concept:
    id: str
    label: str
    domain: str  # e.g. "Wound Care", "Nursing", "Biostatistics"
    attributes: dict = field(default_factory=dict)


@dataclass
class Relation:
    source: str  # Concept id
    target: str  # Concept id
    kind: str  # e.g. "treats", "is_a", "associated_with"


class KnowledgeGraph(Protocol):
    """Storage-agnostic interface for the research knowledge graph."""

    def add_concept(self, concept: Concept) -> None: ...
    def add_relation(self, relation: Relation) -> None: ...
    def neighbors(self, concept_id: str) -> list[Concept]: ...
    def search(self, term: str, domain: str | None = None) -> list[Concept]: ...


class InMemoryKnowledgeGraph:
    """Dependency-free graph for local development and tests."""

    def __init__(self) -> None:
        self._concepts: dict[str, Concept] = {}
        self._relations: list[Relation] = []

    def add_concept(self, concept: Concept) -> None:
        self._concepts[concept.id] = concept

    def add_relation(self, relation: Relation) -> None:
        if relation.source in self._concepts and relation.target in self._concepts:
            self._relations.append(relation)

    def neighbors(self, concept_id: str) -> list[Concept]:
        ids = {r.target for r in self._relations if r.source == concept_id}
        ids |= {r.source for r in self._relations if r.target == concept_id}
        return [self._concepts[i] for i in ids if i in self._concepts]

    def search(self, term: str, domain: str | None = None) -> list[Concept]:
        term_l = term.lower()
        return [
            c
            for c in self._concepts.values()
            if term_l in c.label.lower() and (domain is None or c.domain == domain)
        ]


@lru_cache
def get_knowledge_graph() -> InMemoryKnowledgeGraph:
    """Return the process-wide knowledge graph (swap for Neo4j adapter in prod)."""
    return InMemoryKnowledgeGraph()
