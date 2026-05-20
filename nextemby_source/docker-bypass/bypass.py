#!/usr/bin/env python3
"""NextEmby 启动绕过 - 完全激活团队版 Pro + 劫持授权心跳 + 离线自毁保护绕过"""
import os
import sys
import builtins
import time
import httpx
from httpx import Response
import runpy

# ============================================================
# 第一层防护：导入 PyArmor 运行时，然后在 import 层面
# 拦截 core.TransferService.is_pro_activated，永远返回 True
# 并拦截 emby_proxy.cloud_heartbeat_task，替换为空操作
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
            print('[Bypass] TransferService.is_pro_activated => True')
    if name == 'emby_proxy':
        # 替换 cloud_heartbeat_task 为无操作协程
        if hasattr(mod, 'cloud_heartbeat_task'):
            async def _fake_heartbeat(*a, **kw):
                """Bypassed heartbeat - always online"""
                while True:
                    await __import__('asyncio').sleep(3600)
            mod.cloud_heartbeat_task = _fake_heartbeat
            print('[Bypass] cloud_heartbeat_task => disabled')
    return mod


builtins.__import__ = _patched_import
print('[Bypass] Import hook installed')

# ============================================================
# 第二层防护：劫持 httpx 所有发往 auth.nextemby.com 的请求
# 包括 GET/POST/PUT 等所有方法
# ============================================================

_original_async_post = httpx.AsyncClient.post
_original_sync_post = httpx.Client.post
_original_async_get = httpx.AsyncClient.get
_original_sync_get = httpx.Client.get
_original_async_request = httpx.AsyncClient.request
_original_sync_request = httpx.Client.request


def _is_auth_url(url):
    url_str = str(url)
    return 'auth.nextemby.com' in url_str


# 构造一个看起来合法的心跳响应
def _fake_heartbeat_response():
    return Response(200, json={
        "status": "ok",
        "message": "verified",
        "timestamp": int(time.time()),
        "valid": True,
        "signature": "bypassed"
    })


async def _patched_async_post(self, url, *args, **kwargs):
    if _is_auth_url(url):
        print(f'[Bypass] Intercepted async POST: {url}')
        return _fake_heartbeat_response()
    return await _original_async_post(self, url, *args, **kwargs)


def _patched_sync_post(self, url, *args, **kwargs):
    if _is_auth_url(url):
        print(f'[Bypass] Intercepted sync POST: {url}')
        return _fake_heartbeat_response()
    return _original_sync_post(self, url, *args, **kwargs)


async def _patched_async_get(self, url, *args, **kwargs):
    if _is_auth_url(url):
        print(f'[Bypass] Intercepted async GET: {url}')
        return _fake_heartbeat_response()
    return await _original_async_get(self, url, *args, **kwargs)


def _patched_sync_get(self, url, *args, **kwargs):
    if _is_auth_url(url):
        print(f'[Bypass] Intercepted sync GET: {url}')
        return _fake_heartbeat_response()
    return _original_sync_get(self, url, *args, **kwargs)


async def _patched_async_request(self, method, url, *args, **kwargs):
    if _is_auth_url(url):
        print(f'[Bypass] Intercepted async {method}: {url}')
        return _fake_heartbeat_response()
    return await _original_async_request(self, method, url, *args, **kwargs)


def _patched_sync_request(self, method, url, *args, **kwargs):
    if _is_auth_url(url):
        print(f'[Bypass] Intercepted sync {method}: {url}')
        return _fake_heartbeat_response()
    return _original_sync_request(self, method, url, *args, **kwargs)


httpx.AsyncClient.post = _patched_async_post
httpx.Client.post = _patched_sync_post
httpx.AsyncClient.get = _patched_async_get
httpx.Client.get = _patched_sync_get
httpx.AsyncClient.request = _patched_async_request
httpx.Client.request = _patched_sync_request
print('[Bypass] httpx fully patched (all methods)')

sys.stdout.flush()

# ============================================================
# 第三层防护：注入 team_pro_key + 心跳时间戳到 config.db
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
    # Pro激活
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
    # 心跳时间戳 - 让系统认为刚刚验证过
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('last_heartbeat_success', str(int(time.time())), 'system'))
    _conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
        ('last_verified_time', str(int(time.time())), 'system'))
    _conn.commit()
    _conn.close()
    print(f'[Bypass] Team Pro + heartbeat timestamp injected into {_config_db_path}')
except Exception as _e:
    print(f'[Bypass] Warning: DB injection failed - {_e}')

sys.stdout.flush()

# ============================================================
# 第四层防护：启动后台线程持续更新心跳时间戳
# 防止运行时检测到心跳超时
# ============================================================
import threading

def _heartbeat_keeper():
    """每5分钟更新一次心跳时间戳"""
    import time as _time
    while True:
        _time.sleep(300)
        try:
            _c = sqlite3.connect('/Config/data/config.db')
            _c.execute(
                "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
                ('last_heartbeat_success', str(int(_time.time())), 'system'))
            _c.execute(
                "INSERT OR REPLACE INTO settings (key, value, category) VALUES (?, ?, ?)",
                ('last_verified_time', str(int(_time.time())), 'system'))
            _c.commit()
            _c.close()
        except:
            pass

_hb_thread = threading.Thread(target=_heartbeat_keeper, daemon=True)
_hb_thread.start()
print('[Bypass] Heartbeat keeper thread started (5min interval)')

sys.stdout.flush()

# ============================================================
# 启动主程序 - 用 runpy 执行，但通过 asyncio 事件循环 hook
# 在心跳任务创建时替换它
# ============================================================
print('[Bypass] Starting NextEmby...')
sys.stdout.flush()

import asyncio

# Patch asyncio.create_task 来拦截心跳任务的创建
_original_create_task = asyncio.ensure_future
_original_loop_create_task = None

def _patched_ensure_future(coro_or_future, *args, **kwargs):
    # 检查协程名称，如果是心跳任务就替换
    coro_name = getattr(coro_or_future, '__name__', '') or getattr(coro_or_future, '__qualname__', '')
    if 'heartbeat' in coro_name.lower():
        print(f'[Bypass] Blocked task creation: {coro_name}')
        async def _noop():
            while True:
                await asyncio.sleep(86400)
        return _original_create_task(_noop(), *args, **kwargs)
    return _original_create_task(coro_or_future, *args, **kwargs)

asyncio.ensure_future = _patched_ensure_future

# 同时 patch asyncio.TaskGroup 和 loop.create_task
_orig_task_init = asyncio.Task.__init__

# 更直接的方式：patch emby_proxy 模块加载后的全局变量
# 通过 runpy 的 init_globals 注入
import runpy

_run_globals = {
    '__name__': '__main__',
    '__file__': '/app/emby_proxy_real.py',
}

# 使用 run_path 但注入我们的 patch
# run_path 会在执行完模块顶层代码后返回模块的全局字典
# 但问题是它会直接启动 uvicorn，所以我们需要在启动前 patch

# 最终方案：直接修改 emby_proxy_real.py 的执行环境
# 通过 monkey-patch asyncio.create_task
_orig_asyncio_create_task = asyncio.get_event_loop_policy

class _PatchedEventLoopPolicy(asyncio.DefaultEventLoopPolicy):
    def new_event_loop(self):
        loop = super().new_event_loop()
        _orig_loop_create_task_fn = loop.create_task
        def _patched_loop_create_task(coro, *args, **kwargs):
            coro_name = getattr(coro, '__name__', '') or getattr(coro, '__qualname__', '')
            if 'heartbeat' in coro_name.lower() and 'cloud' in coro_name.lower():
                print(f'[Bypass] Intercepted loop.create_task: {coro_name}')
                async def _noop():
                    while True:
                        await asyncio.sleep(86400)
                coro.close()  # 关闭原协程防止警告
                return _orig_loop_create_task_fn(_noop(), *args, **kwargs)
            return _orig_loop_create_task_fn(coro, *args, **kwargs)
        loop.create_task = _patched_loop_create_task
        return loop

asyncio.set_event_loop_policy(_PatchedEventLoopPolicy())
print('[Bypass] asyncio event loop patched to intercept heartbeat tasks')

sys.stdout.flush()
runpy.run_path('/app/emby_proxy_real.py', run_name='__main__')
