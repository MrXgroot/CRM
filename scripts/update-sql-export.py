#!/usr/bin/env python3
"""Append idempotent CRM additions to a previously rebranded SQL export."""
from pathlib import Path
import re
import sys

if len(sys.argv) != 4:
    raise SystemExit('Usage: update-sql-export.py input.sql output.sql migrations-directory')
src, dst, migrations = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
if src == dst or dst.exists() or not src.is_file():
    raise SystemExit('Provide a distinct absent output file.')
raw = src.read_bytes()
if b'\0' in raw:
    raise SystemExit('Export must be text SQL.')
text = raw.decode('latin-1')
if re.search(r'arisecraft|santekatte|act[-_]base|(?<![A-Za-z0-9])act(?![A-Za-z0-9])', text, re.I):
    raise SystemExit('Legacy branding remains in the SQL export.')
portal = (migrations / '001_customer_portal.sql').read_text()
pages = (migrations / '002_page_master.sql').read_text().replace(
    '@seedUserId',
    "COALESCE((SELECT u.user_id FROM users u JOIN roles r ON r.entity_id=u.entity_id AND r.role_id=u.role_id WHERE r.is_superadmin=1 ORDER BY u.entity_id,u.user_id LIMIT 1),0)",
)
if '@seedUserId' in pages:
    raise SystemExit('Unbound page seed parameter.')
marker = '-- Matrika CRM page catalog and customer portal migration'
if marker in text:
    raise SystemExit('This export already contains the CRM page catalog.')
# Append after the original export's restore statements, not inside an INSERT.
append = '\n' + marker + '\n' + portal.strip() + '\n\n' + pages.strip() + '\n'
result = raw + append.encode('latin-1')
if result[:len(raw)] != raw:
    raise SystemExit('Historical statements were modified unexpectedly.')
dst.write_bytes(result)
urls = re.findall(r"page_name='(/[^']*)'", pages)
print(f'Appended {len(urls)} distinct staff page URLs and four portal tables to {len(raw)} preserved SQL bytes.')
