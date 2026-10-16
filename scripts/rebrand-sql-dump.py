#!/usr/bin/env python3
"""One-time text-only rebrand of the historical SQL export, preserving all rows.

Accepts an input and output path so CI can inspect the private large dump in place.
The source is never edited until the result passes the checks below.
"""
from pathlib import Path
import re
import sys

if len(sys.argv) != 3:
    raise SystemExit('Usage: rebrand-sql-dump.py INPUT.sql OUTPUT.sql')
source, target = map(Path, sys.argv[1:])
if source == target or not source.is_file() or target.exists():
    raise SystemExit('Provide an existing input and a distinct, absent output path.')
raw = source.read_bytes()
if b'\0' in raw:
    raise SystemExit('The dump contains binary data; refusing a text replacement.')
# MySQL dumps may contain non-UTF8 client data. Latin-1 round trips every byte so
# inserted records remain byte-identical apart from intentional branding changes.
text = raw.decode('latin-1')
patterns = [
    (r'arisecraft\s+technolog(?:y|ies)\s*,?\s*santekatte', 'Matrika Technology Bangalore'),
    (r'arisecraft\s+technolog(?:y|ies)', 'Matrika Technology'),
    (r'arisecraft', 'Matrika'),
    (r'santekatte', 'Bangalore'),
    (r'act[-_]base', 'matrika_crm'),
    # Replace brand tokens, not substrings inside SQL identifiers such as activity,
    # transactions, or contact.
    (r'(?<![A-Za-z0-9])act(?![A-Za-z0-9])', 'Matrika'),
]
counts = {}
for pattern, replacement in patterns:
    text, count = re.subn(pattern, replacement, text, flags=re.IGNORECASE)
    counts[pattern] = count
if not any(counts.values()):
    raise SystemExit('No legacy branding was found; check the source dump before changing it.')
# Branding can appear multiple times in a row, including settings and image URLs.
remaining = re.search(r'arisecraft|santekatte|act[-_]base|(?<![A-Za-z0-9])act(?![A-Za-z0-9])', text, re.IGNORECASE)
if remaining:
    raise SystemExit('Legacy branding remains after rewrite.')
result = text.encode('latin-1')
if result.count(b'\n') != raw.count(b'\n'):
    raise SystemExit('Line count changed unexpectedly.')
if len(result) < len(raw) // 2:
    raise SystemExit('Output is unexpectedly small.')
target.write_bytes(result)
print('Rebranded SQL export:', len(raw), 'input bytes,', len(result), 'output bytes;', sum(counts.values()), 'replacements; line count preserved.')
