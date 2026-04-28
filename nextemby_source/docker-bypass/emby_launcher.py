#!/usr/bin/env python3
"""NextEmby 启动器 - 在所有入口加载绕过（包括内部重启）"""
import os
import sys

os.chdir('/app')
sys.path.insert(0, '/app')

# ===== 加载 PyArmor 运行时，安装 import hook =====
import pyarmor_runtime_009884
import builtins

_original_import = builtins.__import__

def _patched_import(name, *args, **kwargs):
    mod = _original_import(name, *args, **kwargs)
    if name == 'core' and hasattr(mod, 'TransferService'):
        mod.TransferService.is_pro_activated = lambda self: True
    return mod

builtins.__import__ = _patched_import

# ===== 劫持 httpx 认证请求 =====
import httpx
from httpx import Response

_orig_async_post = httpx.AsyncClient.post
_orig_sync_post = httpx.Client.post

async def _patch_async_post(self, url, *args, **kwargs):
    if 'auth.nextemby.com' in str(url):
        return Response(200, json={"status": "ok"})
    return await _orig_async_post(self, url, *args, **kwargs)

def _patch_sync_post(self, url, *args, **kwargs):
    if 'auth.nextemby.com' in str(url):
        return Response(200, json={"status": "ok"})
    return _orig_sync_post(self, url, *args, **kwargs)

httpx.AsyncClient.post = _patch_async_post
httpx.Client.post = _patch_sync_post

# ===== 加载真正的 emby_proxy =====
import runpy
runpy.run_path('/app/emby_proxy_real.py', run_name='__main__')
