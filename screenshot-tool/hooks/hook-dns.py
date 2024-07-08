# hooks/hook-dns.py
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = collect_submodules('dns')
