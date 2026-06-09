import argparse
import sys
from pathlib import Path
import json
import os

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.rag import ingest_pyqs, get_chroma_client
from app.core.config import settings

def main() -> None:
    parser = argparse.ArgumentParser(description="Index PYQs into the Ascend RAG store.")
    parser.add_argument(
        "--source",
        default=str(BACKEND_ROOT / "data" / "pyqs.json"),
        help="Path to a PYQ JSON array.",
    )
    parser.add_argument(
        "--chroma-path",
        default="/data/chroma",
        help="Path to ChromaDB directory.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-ingest even if collection exists",
    )
    parser.add_argument(
        "--min-docs",
        type=int,
        default=100,
        help="Skip if collection already has >= N docs",
    )
    args = parser.parse_args()

    # Override for rag.py
    os.environ["RAG_CHROMA_PATH"] = args.chroma_path
    settings.RAG_CHROMA_PATH = args.chroma_path

    client = get_chroma_client()
    collection = client.get_or_create_collection(settings.RAG_COLLECTION_NAME)
    existing_count = collection.count()

    if existing_count >= args.min_docs and not args.force:
        print(f"Collection already has {existing_count} docs. Skipping ingest. Use --force to re-ingest.")
        sys.exit(0)

    try:
        with open(args.source, "r", encoding="utf-8") as f:
            data = json.load(f)
            num_docs = len(data)
    except Exception:
        num_docs = "unknown"

    print(f"Ingesting {num_docs} documents into ChromaDB at {args.chroma_path}...")
    total = ingest_pyqs(args.source)
    print(f"Indexed {total} new chunks from {args.source}")

if __name__ == "__main__":
    main()
