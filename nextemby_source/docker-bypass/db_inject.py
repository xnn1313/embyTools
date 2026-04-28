#!/usr/bin/env python3
"""NextEmby 数据库预注入 - 纯 Python，不依赖 PyArmor，架构无关"""
import os
import sys
import sqlite3

os.chdir('/app')
sys.path.insert(0, '/app')

print('[Bypass/DB] Starting database pre-injection...')
sys.stdout.flush()

# ===== 运行目录映射设置 =====
try:
    import entrypoint
    entrypoint.setup_directory_mapping()
    print('[Bypass/DB] Directory mapping set up')
except Exception as e:
    print(f'[Bypass/DB] Warning: directory mapping failed - {e}')

# ===== 注入 team_pro_key 到 config.db =====
_config_db_path = '/Config/data/config.db'
try:
    os.makedirs(os.path.dirname(_config_db_path), exist_ok=True)
    _need_init = not os.path.exists(_config_db_path)
    _conn = sqlite3.connect(_config_db_path)
    if _need_init:
        _conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, category TEXT)")
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('team_pro_key', '"bypass_pro"', 'system'))
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('overclock_mode', 'true', 'system'))
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('enable_fallback_users', 'true', 'system'))
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('auto_sync', 'true', 'system'))
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('open_registration', 'true', 'system'))
    _conn.commit()
    _conn.close()
    print(f'[Bypass/DB] Team Pro activated - injected team_pro_key into {_config_db_path}')
except Exception as e:
    print(f'[Bypass/DB] Warning: could not inject team_pro_key - {e}')

sys.stdout.flush()
print('[Bypass/DB] Database pre-injection complete.')
sys.stdout.flush()
