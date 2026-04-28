#!/usr/bin/env python3
"""NextEmby 启动绕过 - 完全激活团队版 Pro + 劫持授权心跳"""
import os
import sys
import builtins
import httpx
from httpx import Response
import runpy

# ============================================================
# 第一层防护：导入 PyArmor 运行时，然后在 import 层面
# 拦截 core.TransferService.is_pro_activated，永远返回 True
# ============================================================

# 先导入 PyArmor 运行时，这样它注册好 import hooks
os.chdir('/app')
sys.path.insert(0, '/app')
import pyarmor_runtime_009884

# PyArmor 现在已经替换了 builtins.__import__，
# 我们在它之上再包一层，拦截 core 模块的导入
_original_import = builtins.__import__


def _patched_import(name, *args, **kwargs):
    mod = _original_import(name, *args, **kwargs)
    if name == 'core':
        if hasattr(mod, 'TransferService'):
            mod.TransferService.is_pro_activated = lambda self: True
            print('[Bypass] TransferService.is_pro_activated => True (import hook)')
    return mod


builtins.__import__ = _patched_import
print('[Bypass] Import hook installed for core.TransferService')

# ============================================================
# 第二层防护：劫持 httpx 发往 auth.nextemby.com 的请求
# ============================================================

_original_async_post = httpx.AsyncClient.post
_original_sync_post = httpx.Client.post


async def _patched_async_post(self, url, *args, **kwargs):
    url_str = str(url) if not hasattr(url, 'decode') else url.decode()
    if 'auth.nextemby.com' in url_str:
        print(f'[Bypass] Intercepted auth request: {url_str}')
        return Response(200, json={"status": "ok"})
    return await _original_async_post(self, url, *args, **kwargs)


def _patched_sync_post(self, url, *args, **kwargs):
    url_str = str(url) if not hasattr(url, 'decode') else url.decode()
    if 'auth.nextemby.com' in url_str:
        print(f'[Bypass] Intercepted auth request: {url_str}')
        return Response(200, json={"status": "ok"})
    return _original_sync_post(self, url, *args, **kwargs)


httpx.AsyncClient.post = _patched_async_post
httpx.Client.post = _patched_sync_post
print('[Bypass] httpx auth requests will be intercepted')

sys.stdout.flush()

# ============================================================
# 第三层防护：注入 team_pro_key 到 config.db
# ============================================================

# 执行原始 entrypoint 的目录映射设置
import entrypoint
entrypoint.setup_directory_mapping()

import sqlite3
try:
    _config_db_path = '/Config/data/config.db'
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
    print(f'[Bypass] Team Pro activated - injected team_pro_key into {_config_db_path}')
except Exception as _e:
    print(f'[Bypass] Warning: could not inject team_pro_key - {_e}')

sys.stdout.flush()

# ============================================================
# 启动主程序（runpy 会触发 emby_proxy.py 中的 import，
# 从而触发我们的 import hook，自动 patch TransferService）
# ============================================================
print('[Bypass] Starting NextEmby...')
sys.stdout.flush()
runpy.run_path('/app/emby_proxy.py', run_name='__main__')
