"""Versionne les ressources locales et leurs imports avant publication."""
import hashlib
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
IMPORT = re.compile(r"(from\s+['\"])(\./[^'\"?]+\.js)(?:\?v=[^'\"]*)?(['\"])")
hashes = {}


def version(path):
    path = path.resolve()
    if path in hashes:
        return hashes[path]
    source = path.read_text()
    if path.suffix == '.js':
        source = IMPORT.sub(
            lambda match: f'{match[1]}{match[2]}?v={version(path.parent / match[2])}{match[3]}',
            source,
        )
        if source != path.read_text():
            path.write_text(source)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    hashes[path] = digest
    return digest


html = ROOT / 'index.html'
source = html.read_text()
for name in ('app.js', 'styles.css'):
    digest = version(ROOT / name)
    source = re.sub(rf'(["\']){re.escape(name)}(?:\?v=[^"\']*)?(["\'])',
                    lambda match: f'{match[1]}{name}?v={digest}{match[2]}', source)
html.write_text(source)
print('Ressources versionnées :', ', '.join(path.name for path in hashes))
