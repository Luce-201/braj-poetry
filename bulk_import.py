#!/usr/bin/env python3
"""
Braj Kavya Kosha — Bulk Import Script
======================================
Reads poems_import.csv and poets_import.csv and generates
Hugo-compatible Markdown files ready to commit to your repo.

Usage:
    python bulk_import.py                        # process both CSVs
    python bulk_import.py --poems-only           # only poems
    python bulk_import.py --poets-only           # only poets
    python bulk_import.py --dry-run              # preview without writing files

Output:
    output/content/poems/*.md
    output/content/poets/*.md

Then copy the output/ folder contents into your Hugo repo and deploy.
"""

import csv
import os
import re
import sys
import argparse
import zipfile
from datetime import date

# ── CONFIG ────────────────────────────────────────────────────────────────────

POEMS_CSV  = "poems_import.csv"
POETS_CSV  = "poets_import.csv"
OUTPUT_DIR = "output"

VALID_FORMS = ["दोहा", "पद", "सवैया", "कवित्त", "छंद", "भजन", "अन्य"]

# ── HELPERS ───────────────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """
    Create a URL-safe slug.
    Keeps Devanagari characters (including matras/vowel signs) intact.
    Hugo urlize() does the same — so slugs match site URLs perfectly.
    """
    text = text.strip()
    # Replace spaces/underscores with hyphens
    text = re.sub(r"[\s_]+", "-", text)
    # Remove characters that are NOT: Devanagari (U+0900–U+097F),
    # ASCII word chars, hyphens
    text = re.sub(r"[^\u0900-\u097F\w\-]", "", text, flags=re.UNICODE)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def parse_themes(raw: str) -> list:
    """Split a comma or pipe separated themes string into a clean list."""
    if not raw or not raw.strip():
        return []
    delimiters = r"[,|;]"
    return [t.strip() for t in re.split(delimiters, raw) if t.strip()]


def yaml_str(value: str) -> str:
    """Safely quote a YAML string value."""
    value = value.replace('"', '\\"')
    return f'"{value}"'


def yaml_list(items: list) -> str:
    """Format a Python list as a YAML inline list."""
    quoted = [f'"{i}"' for i in items]
    return "[" + ", ".join(quoted) + "]"


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def write_file(path: str, content: str, dry_run: bool):
    if dry_run:
        print(f"\n{'─'*60}")
        print(f"  FILE: {path}")
        print('─'*60)
        print(content[:600] + ("…" if len(content) > 600 else ""))
    else:
        ensure_dir(os.path.dirname(path))
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

# ── POEM GENERATOR ────────────────────────────────────────────────────────────

def build_poem_md(row: dict, row_num: int) -> tuple[str, str] | None:
    """Returns (slug, markdown_content) or None if row is invalid."""

    title = row.get("title", "").strip()
    if not title:
        print(f"  ⚠  Row {row_num}: missing title — skipped")
        return None

    poet      = row.get("poet", "").strip()
    form      = row.get("form", "").strip()
    themes    = parse_themes(row.get("themes", ""))
    audio_url = row.get("audio_url", "").strip()
    notes     = row.get("notes", "").strip()
    body      = row.get("body", "").strip()
    draft     = row.get("draft", "false").strip().lower() in ("true", "yes", "1")
    pub_date  = row.get("date", str(date.today())).strip() or str(date.today())

    # Validate form
    if form and form not in VALID_FORMS:
        print(f"  ⚠  Row {row_num} '{title}': form '{form}' not in allowed list — using 'अन्य'")
        form = "अन्य"

    # Build frontmatter
    fm_lines = ["---"]
    fm_lines.append(f"title: {yaml_str(title)}")
    if poet:
        fm_lines.append(f"poet: {yaml_str(poet)}")
    if form:
        fm_lines.append(f"form: {yaml_str(form)}")
    if themes:
        fm_lines.append(f"themes: {yaml_list(themes)}")
    if audio_url:
        fm_lines.append(f"audio_url: {yaml_str(audio_url)}")
    if notes:
        fm_lines.append(f"notes: {yaml_str(notes)}")
    fm_lines.append(f"draft: {str(draft).lower()}")
    fm_lines.append(f"date: {pub_date}")
    fm_lines.append("---")

    # Body — preserve line breaks as Markdown paragraphs
    # Each blank line becomes a stanza break
    body_md = "\n\n".join(
        para.strip() for para in re.split(r"\n\s*\n", body) if para.strip()
    ) if body else ""

    content = "\n".join(fm_lines) + "\n\n" + body_md + "\n"
    slug = slugify(title)
    return slug, content


def process_poems(csv_path: str, output_dir: str, dry_run: bool) -> tuple[int, int]:
    if not os.path.exists(csv_path):
        print(f"  ✗  {csv_path} not found — skipping poems")
        return 0, 0

    out_folder = os.path.join(output_dir, "content", "poems")
    ok, skipped = 0, 0
    slugs_seen = set()

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"\n📖  Processing {len(rows)} poem rows from {csv_path}...")

    for i, row in enumerate(rows, start=2):
        result = build_poem_md(row, i)
        if result is None:
            skipped += 1
            continue

        slug, content = result

        # Handle duplicate slugs
        if slug in slugs_seen:
            slug = f"{slug}-{i}"
        slugs_seen.add(slug)

        file_path = os.path.join(out_folder, f"{slug}.md")
        write_file(file_path, content, dry_run)
        print(f"  ✓  {slug}.md")
        ok += 1

    return ok, skipped

# ── POET GENERATOR ────────────────────────────────────────────────────────────

def build_poet_md(row: dict, row_num: int) -> tuple[str, str] | None:
    title = row.get("title", "").strip()
    if not title:
        print(f"  ⚠  Row {row_num}: missing title — skipped")
        return None

    title_en = row.get("title_en", "").strip()
    dates    = row.get("dates", "").strip()
    region   = row.get("region", "").strip()
    image    = row.get("image", "").strip()
    bio      = row.get("body", "").strip()
    pub_date = row.get("date", str(date.today())).strip() or str(date.today())

    fm_lines = ["---"]
    fm_lines.append(f"title: {yaml_str(title)}")
    if title_en:
        fm_lines.append(f"title_en: {yaml_str(title_en)}")
    if dates:
        fm_lines.append(f"dates: {yaml_str(dates)}")
    if region:
        fm_lines.append(f"region: {yaml_str(region)}")
    if image:
        fm_lines.append(f"image: {yaml_str(image)}")
    fm_lines.append(f"date: {pub_date}")
    fm_lines.append("---")

    content = "\n".join(fm_lines) + "\n\n" + bio + "\n"
    slug = slugify((title_en if title_en else title).lower())
    return slug, content


def process_poets(csv_path: str, output_dir: str, dry_run: bool) -> tuple[int, int]:
    if not os.path.exists(csv_path):
        print(f"  ✗  {csv_path} not found — skipping poets")
        return 0, 0

    out_folder = os.path.join(output_dir, "content", "poets")
    ok, skipped = 0, 0
    slugs_seen = set()

    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"\n👤  Processing {len(rows)} poet rows from {csv_path}...")

    for i, row in enumerate(rows, start=2):
        result = build_poet_md(row, i)
        if result is None:
            skipped += 1
            continue

        slug, content = result
        if slug in slugs_seen:
            slug = f"{slug}-{i}"
        slugs_seen.add(slug)

        file_path = os.path.join(out_folder, f"{slug}.md")
        write_file(file_path, content, dry_run)
        print(f"  ✓  {slug}.md")
        ok += 1

    return ok, skipped

# ── ZIP PACKAGING ─────────────────────────────────────────────────────────────

def zip_output(output_dir: str):
    zip_path = "braj_kavya_import.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(output_dir):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, output_dir)
                zf.write(full_path, arcname)
    print(f"\n📦  Packaged → {zip_path}  (copy content/ folder into your Hugo repo)")
    return zip_path

# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Braj Kavya Kosha Bulk Importer")
    parser.add_argument("--poems-only", action="store_true")
    parser.add_argument("--poets-only", action="store_true")
    parser.add_argument("--dry-run",    action="store_true", help="Preview output without writing files")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════╗")
    print("║   Braj Kavya Kosha  —  Bulk Importer     ║")
    print("╚══════════════════════════════════════════╝")

    if args.dry_run:
        print("  [DRY RUN — no files will be written]\n")

    poems_ok = poems_skip = poets_ok = poets_skip = 0

    if not args.poets_only:
        poems_ok, poems_skip = process_poems(POEMS_CSV, OUTPUT_DIR, args.dry_run)

    if not args.poems_only:
        poets_ok, poets_skip = process_poets(POETS_CSV, OUTPUT_DIR, args.dry_run)

    print(f"\n{'─'*44}")
    print(f"  Poems  : {poems_ok} generated,  {poems_skip} skipped")
    print(f"  Poets  : {poets_ok} generated,  {poets_skip} skipped")
    print(f"{'─'*44}")

    if not args.dry_run and (poems_ok + poets_ok) > 0:
        zip_output(OUTPUT_DIR)
        print("\n✅  Done! Next steps:")
        print("    1. Unzip braj_kavya_import.zip")
        print("    2. Copy the content/ folder into your Hugo repo root")
        print("    3. git add . && git commit -m 'bulk import' && git push")
        print("    4. Netlify will auto-deploy ✨\n")


if __name__ == "__main__":
    main()
