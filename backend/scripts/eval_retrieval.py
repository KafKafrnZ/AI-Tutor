"""Retrieval smoke eval: hit@5, MRR, duplicate crowding and abstention.

Usage (from backend/):
    RAG_CHROMA_PATH=/tmp/eval-chroma python scripts/eval_retrieval.py [--set data/eval/retrieval_smoke.json] [--json]

It ingests data/pyqs.json into the Chroma path you give it (use a throwaway path), runs every query in the eval set
through app.core.rag.retrieve exactly as the tutor does (k = RAG_CONTEXT_CHUNKS, default 8) and reports:

- hit@5 / MRR@k over answerable queries (target is not null);
- distinct@k: how many different corpus questions the k returned chunks cover (crowding by duplicates);
- abstain: share of unanswerable queries (target is null) for which retrieve returned nothing;
- false_abstain: share of answerable queries for which retrieve returned nothing.

The smoke set is synthetic. Use it to compare retrieval code before and after a change, not to claim quality.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

_QUESTION_RE = re.compile(r"^Question:\s*(.*)$", re.MULTILINE)
_VARIATION_RE = re.compile(r"\s*\(Variation \d+\)")


def base_question(document: str) -> str:
    match = _QUESTION_RE.search(document or "")
    text = match.group(1) if match else (document or "")
    return _VARIATION_RE.sub("", text).strip()


def evaluate(items: list[dict], retrieve, k: int) -> dict:
    hits = rr = answerable = unanswerable = abstained = false_abstain = 0
    distinct_total = 0
    rows = []
    for item in items:
        target = item.get("target")
        target = target.strip() if target else None
        docs = retrieve(item["q"], k=k)
        bases = [base_question(d) for d in docs]
        distinct_total += len(set(bases))
        rank = next((i + 1 for i, b in enumerate(bases) if target and b == target), None)
        if target:
            answerable += 1
            if not docs:
                false_abstain += 1
            if rank and rank <= 5:
                hits += 1
            if rank:
                rr += 1.0 / rank
        else:
            unanswerable += 1
            if not docs:
                abstained += 1
        rows.append({"q": item["q"], "target": target, "returned": len(docs), "distinct": len(set(bases)), "rank": rank})

    return {
        "k": k,
        "answerable": answerable,
        "unanswerable": unanswerable,
        "hit@5": round(hits / answerable, 3) if answerable else None,
        "mrr": round(rr / answerable, 3) if answerable else None,
        "false_abstain": round(false_abstain / answerable, 3) if answerable else None,
        "abstain": round(abstained / unanswerable, 3) if unanswerable else None,
        "mean_distinct@k": round(distinct_total / len(items), 2) if items else None,
        "rows": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", default=str(BACKEND / "data" / "eval" / "retrieval_smoke.json"))
    parser.add_argument("--json", action="store_true", help="print the full result as JSON")
    args = parser.parse_args()

    os.environ.setdefault("LLM_API_KEY", "eval-not-used")
    os.environ.setdefault("JWT_SECRET", "eval-not-used-" + "x" * 32)
    os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

    from app.core import rag

    rag.ingest_pyqs()
    k = int(os.getenv("RAG_CONTEXT_CHUNKS", "8"))
    items = json.loads(Path(args.set).read_text(encoding="utf-8"))["items"]
    result = evaluate(items, rag.retrieve, k)
    result["embedding"] = type(rag._get_embedding_function()).__name__
    result["embedding_model"] = getattr(rag, "active_embedding_model", lambda: "unknown")()

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        summary = {key: value for key, value in result.items() if key != "rows"}
        print(json.dumps(summary, indent=2))
        for row in result["rows"]:
            mark = "abstain" if row["returned"] == 0 else f"rank={row['rank']} distinct={row['distinct']}/{row['returned']}"
            print(f"  [{'A' if row['target'] else 'U'}] {mark:28} {row['q'][:70]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
