#!/usr/bin/env python3
"""Build the complete GitHub Desktop working-tree archive, never dependencies/history.
Run from any directory: python3 tools/package_release.py
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT.parent / 'thesmallbook.zip'
EXCLUDED_DIRS = {'.git', '.qa', 'node_modules', '.cache', '.local', '.npm', '.venv', '__pycache__', '.pytest_cache', '.next', 'coverage', 'dist', 'build', '.DS_Store'}

def include(path):
    rel = path.relative_to(ROOT)
    return (path.is_file() and not path.is_symlink()
            and not any(p in EXCLUDED_DIRS for p in rel.parts)
            and (not path.name.startswith('.env') or path.name == '.env.example')
            and path.suffix not in {'.zip', '.pyc', '.log'}
            and path.name not in {'deno.lock', '.git-credentials', '.netrc'})

if __name__ == '__main__':
    files = sorted(p for p in ROOT.rglob('*') if include(p))
    with ZipFile(DEST, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())
    with ZipFile(DEST) as archive:
        assert archive.testzip() is None, 'Archive integrity check failed'
        assert 'index.html' in archive.namelist()
        assert 'CNAME' in archive.namelist()
    print(f'{DEST.name}: {len(files)} files, {DEST.stat().st_size / 1024 / 1024:.1f} MiB, integrity checked')
