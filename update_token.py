#!/usr/bin/env python3
"""
Script to replace sensitive tokens across the project.

Usage:
    python scripts/update_token.py OLD_TOKEN NEW_TOKEN [--dry-run]

The script walks through the repository directory, skipping common cache/build
folders, and replaces all occurrences of OLD_TOKEN with NEW_TOKEN in text files.

Notes:
- Binary files are automatically skipped.
- Use --dry-run to see the files that would be modified without changing them.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys


EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    ".idea",
    ".mypy_cache",
    ".pytest_cache",
    ".DS_Store",
}


def is_binary(path: Path) -> bool:
    try:
        with path.open("rb") as f:
            chunk = f.read(1024)
        return b"\0" in chunk
    except Exception:
        return True


def replace_in_file(path: Path, old: str, new: str, dry_run: bool) -> bool:
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # skip non-UTF files
        return False

    if old not in content:
        return False

    if dry_run:
        return True

    path.write_text(content.replace(old, new), encoding="utf-8")
    return True


def iter_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for filename in filenames:
            yield Path(dirpath, filename)


def main() -> int:
    parser = argparse.ArgumentParser(description="Replace tokens across the project.")
    parser.add_argument("old_token", help="Token to search for.")
    parser.add_argument("new_token", help="Token to replace with.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show which files would change without modifying them.",
    )

    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]  # project root
    changed_files = []

    for file_path in iter_files(root):
        if file_path.is_symlink() or not file_path.is_file():
            continue
        if is_binary(file_path):
            continue
        if replace_in_file(file_path, args.old_token, args.new_token, args.dry_run):
            changed_files.append(file_path.relative_to(root))

    if args.dry_run:
        if changed_files:
            print("Files that would be updated:")
            for path in changed_files:
                print(f" - {path}")
        else:
            print("No files contain the specified token.")
    else:
        if changed_files:
            print("Updated files:")
            for path in changed_files:
                print(f" - {path}")
        else:
            print("Token not found. No files modified.")

    return 0


if __name__ == "__main__":
    sys.exit(main())

