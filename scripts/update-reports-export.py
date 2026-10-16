#!/usr/bin/env python3
"""Add the Reports Page Master migration to the existing Matrika SQL export."""
from pathlib import Path
import re
import sys

if len(sys.argv) != 4:
    raise SystemExit('Usage: update-reports-export.py input.sql output.sql migration.sql')
source, destination, migration = map(Path, sys.argv[1:])
if source == destination or destination.exists() or not source.is_file():
    raise SystemExit('Provide a distinct, absent output path and a source export.')
raw = source.read_bytes()
if b'\0' in raw:
    raise SystemExit('Expected a text SQL export.')
existing = raw.decode('latin-1')
if '-- Matrika CRM page catalog and customer portal migration' not in existing:
    raise SystemExit('The portal and staff page migration is missing from the input export.')
if re.search(r"page_name\s*=\s*'/crm/reports'", existing, re.I):
    raise SystemExit('Reports route already exists in the export.')
addition = migration.read_text().strip()
if addition.count("'/crm/reports'") != 2 or addition.count(';') != 1:
    raise SystemExit('Unexpected Reports migration format.')
result = raw + ('\n-- Matrika CRM reports route migration\n' + addition + '\n').encode('latin-1')
if result[:len(raw)] != raw:
    raise SystemExit('Historical export bytes changed.')
destination.write_bytes(result)
print(f'Preserved {len(raw)} existing bytes and appended /crm/reports.')
