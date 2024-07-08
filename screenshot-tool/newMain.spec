# newMain.spec
# -*- mode: python ; coding: utf-8 -*-
block_cipher = None
from PyInstaller.utils.hooks import collect_submodules
hiddenimports = [
    'tkinter', 
    'tkinter.filedialog', 
    'tkinter.tix', 
    'tkinter.ttk', 
    'tkinter.font', 
    'PIL.ImageGrab', 
    'PIL.Image', 
    'PIL.ImageTk', 
    'PIL.ImageDraw',
    'PIL.ImageOps',
    'base64', 
    'io', 
    'requests', 
    'ctypes', 
    'win32clipboard', 
    'pystray',
    'keyboard',
    'threading',
    'os',
]

hookspath=['hooks']  # Specify the hooks directory

datas = [
    ('IMB.png', '.'), 
    ('iconFullSize.png', '.'),
    ('button_icons/copy_2.png', 'button_icons'),
    ('button_icons/send_2.png', 'button_icons'),
    ('button_icons/save_2.png', 'button_icons'),
    ('button_icons/highlight.png', 'button_icons'),
]


a = Analysis(
    ['newMain.py'],
    pathex=['.'],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=hookspath,
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)


exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='newMain',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon='iconFullSize.ico',  # Ensure this path is correct if you have an icon
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='newMain',
)