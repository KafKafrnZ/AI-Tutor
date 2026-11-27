"""Retrieval and answer-trust guards (README problems 2, 6 and the embedding-model bug).

None of these tests download a model: the vector store and FastEmbed are replaced by stubs.
"""

import logging

import pytest

from app.core import rag
from app.routers.practice import validate_questions
from modules.tutor import TUTOR_SYSTEM_PROMPT, build_tutor_messages


class _StubCollection:
    """Mimics the parts of a Chroma collection that retrieve_scored uses."""

    def __init__(self, documents, distances):
        self._documents = documents
        self._distances = distances

    def count(self):
        return len(self._documents)

    def query(self, query_texts, n_results):
        return {"documents": [self._documents[:n_results]], "distances": [self._distances[:n_results]]}

    def get(self, *args, **kwargs):
        return {"documents": self._documents, "ids": []}


def _variation(n):
    return (
        f"Question: When was the Battle of Plassey fought? (Variation {n})\n"
        "Correct Answer: The Battle of Plassey was fought in 1757."
    )


# --- retrieval -------------------------------------------------------------------------------------------------


def test_near_duplicates_collapse_to_one_item(monkeypatch):
    docs = [_variation(n) for n in range(1, 21)]
    monkeypatch.setattr(rag, "_get_collection", lambda: _StubCollection(docs, [0.1] * len(docs)))
    result = rag.retrieve("When was the Battle of Plassey fought?", k=8)
    assert len(result) == 1


def test_distinct_items_are_all_kept(monkeypatch):
    docs = [
        _variation(1),
        "Question: Which Article deals with the Election Commission?\nCorrect Answer: Article 324.",
        "Question: What is the port number for HTTP?\nCorrect Answer: Port 80.",
    ]
    monkeypatch.setattr(rag, "_get_collection", lambda: _StubCollection(docs, [0.1, 0.15, 0.2]))
    assert len(rag.retrieve("anything", k=8)) == 3


def test_below_threshold_returns_nothing_and_does_not_fall_back(monkeypatch):
    # distance 0.5 -> similarity 0.5, below the default 0.75: the store answered, nothing is relevant.
    docs = ["Question: Which planet is known as the Red Planet?\nCorrect Answer: Mars."]
    monkeypatch.setattr(rag, "_get_collection", lambda: _StubCollection(docs, [0.5]))
    called = []
    monkeypatch.setattr(rag, "_keyword_fallback", lambda q, k: called.append(q) or ["should not be used"])
    assert rag.retrieve("Explain photosynthesis in C4 plants", k=8) == []
    assert called == []


def test_threshold_is_configurable(monkeypatch):
    docs = ["Question: Which planet is known as the Red Planet?\nCorrect Answer: Mars."]
    monkeypatch.setattr(rag, "_get_collection", lambda: _StubCollection(docs, [0.5]))
    monkeypatch.setattr(rag, "MIN_SIMILARITY", 0.4)
    assert len(rag.retrieve("red planet", k=8)) == 1


def test_scored_results_carry_vector_similarity(monkeypatch):
    docs = ["Question: Which planet is known as the Red Planet?\nCorrect Answer: Mars."]
    monkeypatch.setattr(rag, "_get_collection", lambda: _StubCollection(docs, [0.1]))
    [(similarity, _)] = rag.retrieve_scored("red planet", k=8)
    assert similarity == pytest.approx(0.9)


def test_vector_store_error_still_falls_back_to_keyword(monkeypatch):
    class Broken:
        def count(self):
            raise RuntimeError("chroma down")

    monkeypatch.setattr(rag, "_get_collection", lambda: Broken())
    monkeypatch.setattr(rag, "_keyword_fallback", lambda q, k: ["kw result"])
    assert rag.retrieve("anything", k=8) == ["kw result"]


def test_keyword_ranking_drops_unrelated_documents():
    docs = [
        "Question: Which planet is known as the Red Planet? Correct Answer: Mars.",
        "Question: Find the odd one out: Apple, Banana, Carrot, Mango. Correct Answer: Carrot.",
    ]
    assert rag._rank_keyword("Explain photosynthesis in C4 plants", docs, k=8) == []
    assert len(rag._rank_keyword("Which planet is known as the Red Planet", docs, k=8)) == 1


def test_unsourced_exam_labels_are_not_shown_as_a_source():
    text = rag.format_pyq_record({"question": "Q?", "answer": "A.", "exam": "UPSC", "year": 2020})
    assert "Source:" not in text and "2020" not in text
    cited = rag.format_pyq_record({"question": "Q?", "answer": "A.", "source": "IBPS SO 2019 paper, Q12"})
    assert "Source: IBPS SO 2019 paper, Q12" in cited


# --- embedding model -------------------------------------------------------------------------------------------


@pytest.fixture
def fresh_embedding(monkeypatch):
    monkeypatch.setattr(rag, "_embedding_function", None)
    monkeypatch.setattr(rag, "_embedding_model_name", "unset")


def test_configured_fastembed_model_is_used(monkeypatch, fresh_embedding):
    import fastembed

    class FakeTextEmbedding:
        def __init__(self, model_name):
            self.model_name = model_name

        def embed(self, texts):
            import numpy as np

            return [np.zeros(3) for _ in texts]

    monkeypatch.setattr(fastembed, "TextEmbedding", FakeTextEmbedding)
    fn = rag._get_embedding_function()
    assert isinstance(fn, rag.FastEmbedFunction)
    assert rag.active_embedding_model() == rag.settings.RAG_EMBEDDING_MODEL
    assert fn(["a", "b"]) == [[0.0, 0.0, 0.0], [0.0, 0.0, 0.0]]


def test_fallback_model_is_loud_and_gets_its_own_collection(monkeypatch, fresh_embedding, caplog):
    def boom(model_name):
        raise RuntimeError("no model")

    monkeypatch.setattr(rag, "FastEmbedFunction", boom)
    with caplog.at_level(logging.WARNING, logger="app.core.rag"):
        rag._get_embedding_function()
    assert "falling back" in caplog.text
    assert "MiniLM" in rag.active_embedding_model()
    assert "minilm" in rag._collection_name()
    assert len(rag._collection_name()) <= 63


# --- prompt ----------------------------------------------------------------------------------------------------


def test_prompt_no_longer_asks_for_past_paper_trends():
    lowered = TUTOR_SYSTEM_PROMPT.lower()
    assert "pyq trend" not in lowered
    assert "previous-year patterns" not in lowered
    assert "never describe past-paper trends" in lowered


def test_empty_context_is_marked_explicitly():
    messages = build_tutor_messages("What is photosynthesis?", trusted_context="")
    assert "EMPTY: no matching item was found" in messages[1]["content"]


# --- practice quiz validation ----------------------------------------------------------------------------------


def _q(**overrides):
    base = {"difficulty": "Easy", "question": "2+2?", "options": ["3", "4", "5", "6"], "correct_answer": "4"}
    base.update(overrides)
    return base


def test_valid_question_is_kept():
    import json

    kept, rejected = validate_questions(json.dumps([_q()]))
    assert rejected == 0 and kept[0]["correct_answer"] == "4"


@pytest.mark.parametrize("letter, expected", [("B", "4"), ("b", "4"), ("D)", "6"), ("A.", "3")])
def test_letter_answers_map_to_option_text(letter, expected):
    import json

    kept, _ = validate_questions(json.dumps([_q(correct_answer=letter)]))
    assert kept[0]["correct_answer"] == expected


@pytest.mark.parametrize(
    "bad",
    [
        _q(correct_answer="7"),
        _q(options=["3", "4", "5"]),
        _q(options=["3", "3", "5", "6"]),
        _q(options=["3", "", "5", "6"]),
        _q(question=" "),
        "not a dict",
    ],
)
def test_unanswerable_questions_are_rejected(bad):
    import json

    kept, rejected = validate_questions(json.dumps([bad, _q()]))
    assert len(kept) == 1 and rejected == 1


@pytest.mark.parametrize("raw", ["not json", '{"questions": []}', "", None])
def test_garbage_output_yields_nothing(raw):
    kept, rejected = validate_questions(raw)
    assert kept == [] and rejected == 1
