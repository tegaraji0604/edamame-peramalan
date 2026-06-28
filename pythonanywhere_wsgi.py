# ═══════════════════════════════════════════════════════════════
#  PythonAnywhere WSGI Configuration File
# ═══════════════════════════════════════════════════════════════
#
#  CARA PAKAI:
#  1. Buka PythonAnywhere → Tab "Web" → klik link WSGI configuration file
#  2. Hapus SEMUA isi file tersebut
#  3. Copy-paste SELURUH isi file ini
#  4. Ganti USERNAME dengan username PythonAnywhere kamu
#  5. Klik "Save" → klik "Reload" di tab Web
# ═══════════════════════════════════════════════════════════════

import sys
import os

# ── Ganti 'USERNAME' dengan username PythonAnywhere kamu ──────
USERNAME = 'USERNAME'  # <-- GANTI INI!

# Path ke folder project kamu di PythonAnywhere
project_home = f'/home/{USERNAME}/WEB'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# ── Environment Variables untuk MySQL PythonAnywhere ──────────
os.environ['MYSQL_HOST']     = f'{USERNAME}.mysql.pythonanywhere-services.com'
os.environ['MYSQL_PORT']     = '3306'
os.environ['MYSQL_USER']     = USERNAME
os.environ['MYSQL_PASSWORD'] = 'PASSWORD_MYSQL_KAMU'  # <-- GANTI INI!
os.environ['MYSQL_DATABASE'] = f'{USERNAME}$edamame_peramalan'

# ── Import Flask app ──────────────────────────────────────────
from app import app as application  # noqa

# Jalankan init_db saat pertama kali load
from app import init_db
init_db()
