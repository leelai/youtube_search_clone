#!/usr/bin/env python3
"""
Download and seed the AG News dataset (agnews.jsonl.gz) into the `worlds` table.

- Downloads from Hugging Face if the local file is missing or if --force-download is used.
- Reads the compressed JSONL file, where each line is ["title", "description"].
- Normalizes text and inserts N rows (configurable) into PostgreSQL.

Examples:
    # Download file if needed, then insert 20,000 rows
    python scripts/seed_agnews_remote.py --limit 20000

    # Insert 50,000 rows, shuffling the data first
    python scripts/seed_agnews_remote.py --limit 50000 --shuffle

    # Always re-download the file
    python scripts/seed_agnews_remote.py --limit 30000 --force-download

    # Only download (or re-download) file, do not insert into DB
    python scripts/seed_agnews_remote.py --download-only

    # Custom URL and output path
    python scripts/seed_agnews_remote.py --url <custom_url> --output datasets/custom.jsonl.gz --limit 10000
"""

import os
import sys
import argparse
import gzip
import json
import random
import requests
import psycopg2
from typing import List, Tuple
from datetime import datetime

# Default Hugging Face URL for AG News dataset
DEFAULT_URL = "https://huggingface.co/datasets/sentence-transformers/embedding-training-data/resolve/main/agnews.jsonl.gz"
DEFAULT_OUTPUT = "datasets/agnews.jsonl.gz"

# Database connection parameters (same as seed.py)
DB_PARAMS = {
    'host': 'localhost',
    'port': 5433,
    'database': 'worlds_db',
    'user': 'worlds_user',
    'password': 'worlds_password'
}


def log(message: str, prefix: str = "ℹ️") -> None:
    """Print log message with timestamp."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {prefix} {message}", flush=True)


def download_agnews(url: str, output_path: str, force: bool = False) -> None:
    """
    Download the AG News dataset from the given URL.
    
    Args:
        url: URL to download from
        output_path: Local path to save the file
        force: If True, always re-download even if file exists
    """
    if os.path.exists(output_path) and not force:
        log(f"File already exists: {output_path} (skip download)")
        return

    # Create directory if needed
    dir_path = os.path.dirname(output_path)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)

    log(f"Downloading AG News from {url} ...", "⬇️")
    
    try:
        with requests.get(url, stream=True, timeout=120) as r:
            r.raise_for_status()
            total = 0
            with open(output_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if not chunk:
                        continue
                    f.write(chunk)
                    total += len(chunk)
                    # Log roughly every ~10 MB
                    if total % (10 * 1024 * 1024) < 8192:
                        log(f"Downloaded ~{total / (1024 * 1024):.1f} MB", "⬇️")
        
        final_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        log(f"Download complete: {output_path} ({final_size_mb:.1f} MB)", "✅")
    
    except requests.exceptions.RequestException as e:
        log(f"Download failed: {e}", "❌")
        # Clean up partial file if it exists
        if os.path.exists(output_path):
            os.remove(output_path)
        sys.exit(1)


def normalize_text(text: str) -> str:
    """
    Normalize text by stripping whitespace and collapsing multiple spaces.
    
    Args:
        text: Input text to normalize
        
    Returns:
        Normalized text string
    """
    if text is None:
        return ""
    # Strip leading/trailing whitespace
    text = text.strip()
    # Replace multiple whitespace (including newlines) with a single space
    text = " ".join(text.split())
    return text


def load_agnews_pairs(path: str, max_rows: int | None = None) -> List[Tuple[str, str]]:
    """
    Load (title, description) pairs from a compressed JSONL file.
    
    Each line in the file should be a JSON array: ["title", "description"]
    
    Args:
        path: Path to the .jsonl.gz file
        max_rows: Optional limit on number of rows to read
        
    Returns:
        List of (title, description) tuples
    """
    pairs: List[Tuple[str, str]] = []
    log(f"Reading compressed JSONL from {path} ...", "📖")
    
    try:
        with gzip.open(path, "rt", encoding="utf-8") as f:
            for idx, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                
                # The dataset is documented as a pair: ["title", "description"]
                if isinstance(obj, (list, tuple)) and len(obj) >= 2:
                    title_raw = str(obj[0])
                    desc_raw = str(obj[1])
                    title = normalize_text(title_raw)
                    description = normalize_text(desc_raw)
                    
                    if not title or not description:
                        continue
                    
                    pairs.append((title, description))
                
                if max_rows is not None and len(pairs) >= max_rows:
                    break
                
                # Progress logging every 50,000 lines read
                if idx % 50000 == 0:
                    log(f"Read {idx:,} lines, collected {len(pairs):,} pairs...", "📖")
    
    except Exception as e:
        log(f"Error reading file: {e}", "❌")
        sys.exit(1)
    
    log(f"Loaded {len(pairs):,} (title, description) pairs from {path}", "✅")
    return pairs


def deduplicate_by_title(pairs: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    """
    Remove duplicate entries based on case-insensitive title matching.
    
    Args:
        pairs: List of (title, description) tuples
        
    Returns:
        Deduplicated list of tuples
    """
    seen = set()
    unique: List[Tuple[str, str]] = []
    
    for title, desc in pairs:
        key = title.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append((title, desc))
    
    log(f"Deduplicated: {len(pairs):,} -> {len(unique):,}", "🔄")
    return unique


def insert_worlds_to_db(worlds: List[Tuple[str, str]]) -> None:
    """
    Insert (title, description) pairs into the PostgreSQL worlds table.
    
    This will clear existing data first, then insert in batches.
    
    Args:
        worlds: List of (title, description) tuples to insert
    """
    log("Connecting to PostgreSQL...", "🔌")
    
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cur = conn.cursor()
        
        # Clear existing data first
        log("Clearing existing data from worlds table...", "🗑️")
        cur.execute("DELETE FROM worlds")
        conn.commit()
        
        log(f"Inserting {len(worlds):,} records into worlds table...", "💾")
        
        batch_size = 1000
        total = len(worlds)
        
        for i in range(0, total, batch_size):
            batch = worlds[i:i + batch_size]
            cur.executemany(
                "INSERT INTO worlds (title, description) VALUES (%s, %s)",
                batch,
            )
            conn.commit()
            
            inserted = min(i + batch_size, total)
            if inserted % 5000 == 0 or inserted == total:
                log(f"Inserted {inserted:,}/{total:,}", "📥")
        
        cur.close()
        conn.close()
        log("PostgreSQL connection closed.", "🔌")
    
    except psycopg2.Error as e:
        log(f"Database error: {e}", "❌")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Download and seed AG News dataset into PostgreSQL worlds table.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/seed_agnews_remote.py --limit 20000
  python scripts/seed_agnews_remote.py --limit 50000 --shuffle
  python scripts/seed_agnews_remote.py --download-only --force-download
        """
    )
    
    parser.add_argument(
        "--limit",
        type=int,
        default=20000,
        help="Number of rows to insert into DB (default: 20000)"
    )
    parser.add_argument(
        "--shuffle",
        action="store_true",
        help="Shuffle all loaded records before cutting to limit"
    )
    parser.add_argument(
        "--force-download",
        action="store_true",
        help="Always re-download the file even if it already exists locally"
    )
    parser.add_argument(
        "--download-only",
        action="store_true",
        help="Only download the file and exit without inserting into DB"
    )
    parser.add_argument(
        "--url",
        type=str,
        default=None,
        help=f"Override the download URL (default: {DEFAULT_URL})"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help=f"Local path to save the downloaded file (default: {DEFAULT_OUTPUT})"
    )
    
    args = parser.parse_args()
    
    url = args.url or DEFAULT_URL
    output_path = args.output or DEFAULT_OUTPUT
    
    log("=" * 60)
    log("AG News Dataset Seeder")
    log("=" * 60)
    log(f"URL: {url}")
    log(f"Output: {output_path}")
    log(f"Limit: {args.limit:,}")
    log(f"Shuffle: {args.shuffle}")
    log(f"Force download: {args.force_download}")
    log(f"Download only: {args.download_only}")
    log("=" * 60)
    
    # 1) Download if needed
    download_agnews(url, output_path, force=args.force_download)
    
    if args.download_only:
        log("Download-only mode: not inserting into database.", "ℹ️")
        log("Done!", "🎉")
        return
    
    # 2) Load data (read entire file to allow proper deduplication and shuffling)
    raw_pairs = load_agnews_pairs(output_path, max_rows=None)
    
    if not raw_pairs:
        log("No data loaded from file. Exiting.", "⚠️")
        sys.exit(1)
    
    # 3) Deduplicate by title
    unique_pairs = deduplicate_by_title(raw_pairs)
    
    # 4) Shuffle (optional)
    if args.shuffle:
        log("Shuffling data...", "🎲")
        random.shuffle(unique_pairs)
    
    # 5) Apply limit
    final_pairs = unique_pairs[:args.limit]
    log(f"Prepared {len(final_pairs):,} rows for insertion.", "🎯")
    
    if len(final_pairs) < args.limit:
        log(f"Warning: Only {len(final_pairs):,} unique rows available (requested {args.limit:,})", "⚠️")
    
    # 6) Insert into DB
    insert_worlds_to_db(final_pairs)
    
    log("Seeding completed successfully!", "🎉")


if __name__ == "__main__":
    main()

