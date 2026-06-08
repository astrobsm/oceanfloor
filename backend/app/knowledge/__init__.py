"""Knowledge Ocean Repository — research knowledge graph adapter.

Provides a minimal, storage-agnostic graph interface ("Ocean Floor of Medical
Knowledge"). The default `InMemoryKnowledgeGraph` is dependency-free for local dev;
a Neo4j-backed adapter can implement the same `KnowledgeGraph` protocol for
production without changing engine code.
"""
from app.knowledge.graph import (
    Concept,
    InMemoryKnowledgeGraph,
    KnowledgeGraph,
    Relation,
    get_knowledge_graph,
)

__all__ = [
    "Concept",
    "Relation",
    "KnowledgeGraph",
    "InMemoryKnowledgeGraph",
    "get_knowledge_graph",
]
