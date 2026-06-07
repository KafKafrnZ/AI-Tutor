import argparse
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.rag import ingest_pyqs


def main() -> None:
    parser = argparse.ArgumentParser(description="Index PYQs into the Ascend RAG store.")
    parser.add_argument(
        "--path",
        default=str(BACKEND_ROOT / "data" / "pyqs.json"),
        help="Path to a PYQ JSON array.",
    )
    args = parser.parse_args()

    total = ingest_pyqs(args.path)
    print(f"Indexed {total} new chunks from {args.path}")


if __name__ == "__main__":
    main()
