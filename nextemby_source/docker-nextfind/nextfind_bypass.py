#!/usr/bin/env python3
"""NextMedia/NextFind 启动绕过 - 注入 team_pro_key + 劫持授权心跳 + 防自毁
   适配新版模块化架构 (app/api, app/services, app/db, app/utils)"""
import os
import sys
import time
import yaml
import builtins
import asyncio
import httpx
from httpx import Response
import runpy

os.chdir('/app')
sys.path.insert(0, '/app')

CONFIG_PATH = '/Config/config.yaml'

print('[Bypass] Starting NextFind bypass (v3 - async safe)...')
sys.stdout.flush()

# ============================================================
# 第一步：注入 team_pro_key + 更新心跳时间戳到 config.yaml
# ============================================================
try:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f) or {}
        if 'system' not in config:
            config['system'] = {}
        config['system']['team_pro_key'] = 'bypass_pro'
        config['system']['last_heartbeat_success'] = time.time()
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
        print(f'[Bypass] Injected team_pro_key + heartbeat timestamp into {CONFIG_PATH}')
    else:
        print(f'[Bypass] Warning: {CONFIG_PATH} not found')
except Exception as e:
    print(f'[Bypass] Warning: could not inject - {e}')

sys.stdout.flush()

# ============================================================
# 第二步：导入 PyArmor 运行时，安装 import hook
# ============================================================
import pyarmor_runtime_009884

_original_import = builtins.__import__

_TARGET_PREFIXES = ('main', '__main__', 'app', 'app.')

# 授权相关的方法名
_AUTH_METHODS = [
    'is_pro_activated', 'is_activated', 'is_pro',
    'check_authorization', 'check_auth', 'verify_license',
    'is_authorized', 'is_licensed', 'check_license',
]

# 需要全量 patch 的模块（所有方法都 patch）
_FULL_PATCH_MODULES = ['network_monitor']

_patched_modules = set()


async def _async_true(self=None, *a, **kw):
    return True


async def _async_false(self=None, *a, **kw):
    return False


async def _async_none(self=None, *a, **kw):
    return None


def _patch_method(cls, method_name, async_func, label=""):
    """用 async 函数替换方法 — await 时返回值，不 await 时返回 coroutine（truthy）"""
    try:
        orig = getattr(cls, method_name, None)
        if orig is None or not callable(orig):
            return False
        setattr(cls, method_name, async_func)
        if label:
            print(f'[Bypass] Patched {label}')
        return True
    except Exception as e:
        if label:
            print(f'[Bypass] Warning: failed to patch {label}: {e}')
        return False


def _patch_module(mod, name):
    """扫描模块中的所有类，patch 授权和网络状态相关方法"""
    if id(mod) in _patched_modules:
        return
    _patched_modules.add(id(mod))

    # 判断是否需要全量 patch（network_monitor 等模块）
    is_full_patch = any(fp in name for fp in _FULL_PATCH_MODULES)

    for attr_name in dir(mod):
        try:
            attr = getattr(mod, attr_name)
        except Exception:
            continue

        if isinstance(attr, type):
            if is_full_patch:
                # 全量 patch：这个模块的所有类的所有可调用方法都返回 True
                for method_name in dir(attr):
                    if method_name.startswith('_'):
                        continue
                    try:
                        method = getattr(attr, method_name)
                        if callable(method):
                            _patch_method(attr, method_name, _async_true,
                                          f'{name}.{attr_name}.{method_name} => async True')
                    except Exception:
                        pass
            else:
                # 精确 patch：只 patch 授权相关方法
                for method_name in _AUTH_METHODS:
                    if hasattr(attr, method_name):
                        _patch_method(attr, method_name, _async_true,
                                      f'{name}.{attr_name}.{method_name} => async True')

    # 模块级变量和函数
    if is_full_patch:
        for var_name in dir(mod):
            if var_name.startswith('_'):
                continue
            try:
                val = getattr(mod, var_name)
            except Exception:
                continue
            if isinstance(val, bool):
                try:
                    setattr(mod, var_name, True)
                    print(f'[Bypass] Set {name}.{var_name} = True')
                except Exception:
                    pass
            elif callable(val) and not isinstance(val, type):
                try:
                    setattr(mod, var_name, _async_true)
                    print(f'[Bypass] Patched {name}.{var_name}() => async True')
                except Exception:
                    pass


def _patched_import(name, *args, **kwargs):
    mod = _original_import(name, *args, **kwargs)
    if any(name == p or name.startswith(p) for p in _TARGET_PREFIXES):
        _patch_module(mod, name)
    return mod


builtins.__import__ = _patched_import
print('[Bypass] Import hook installed (covers app.* modules)')

# ============================================================
# 第三步：劫持 httpx 发往 auth.nextemby.com 的请求
# ============================================================
_AUTH_DOMAINS = ['auth.nextemby.com', 'license.nextemby.com']

for _method in ['post', 'get', 'put', 'delete', 'patch', 'request']:
    _orig_async = getattr(httpx.AsyncClient, _method, None)
    _orig_sync = getattr(httpx.Client, _method, None)

    if _orig_async:
        def _make_async_patch(orig, method_name=_method):
            async def _patched(self, url, *args, **kwargs):
                url_str = str(url)
                if any(d in url_str for d in _AUTH_DOMAINS):
                    print(f'[Bypass] Intercepted httpx async {method_name}: {url_str[:80]}')
                    return Response(200, json={"status": "ok", "activated": True, "pro": True})
                return await orig(self, url, *args, **kwargs)
            return _patched
        setattr(httpx.AsyncClient, _method, _make_async_patch(_orig_async))

    if _orig_sync:
        def _make_sync_patch(orig, method_name=_method):
            def _patched(self, url, *args, **kwargs):
                url_str = str(url)
                if any(d in url_str for d in _AUTH_DOMAINS):
                    print(f'[Bypass] Intercepted httpx sync {method_name}: {url_str[:80]}')
                    return Response(200, json={"status": "ok", "activated": True, "pro": True})
                return orig(self, url, *args, **kwargs)
            return _patched
        setattr(httpx.Client, _method, _make_sync_patch(_orig_sync))

# 也劫持 requests 库
import requests as req_lib


class FakeResp:
    status_code = 200
    ok = True
    text = '{"status": "ok", "activated": true, "pro": true}'
    content = b'{"status": "ok", "activated": true, "pro": true}'

    def json(self):
        return {"status": "ok", "activated": True, "pro": True}

    def raise_for_status(self):
        pass

    def __getattr__(self, name):
        return lambda *a, **kw: None


for _method in ['post', 'get', 'put', 'delete', 'patch', 'request']:
    _orig_sess = getattr(req_lib.Session, _method, None)
    if _orig_sess:
        def _make_sess_patch(orig, method_name=_method):
            def _patched(self, url, *args, **kwargs):
                url_str = str(url)
                if any(d in url_str for d in _AUTH_DOMAINS):
                    print(f'[Bypass] Intercepted requests {method_name}: {url_str[:80]}')
                    return FakeResp()
                return orig(self, url, *args, **kwargs)
            return _patched
        setattr(req_lib.Session, _method, _make_sess_patch(_orig_sess))

print('[Bypass] httpx + requests auth requests intercepted')
sys.stdout.flush()

# ============================================================
# 第四步：持续刷新心跳时间戳（后台线程）
# ============================================================
import threading


def _heartbeat_refresher():
    """每 5 分钟刷新一次 config.yaml 中的心跳时间戳"""
    while True:
        time.sleep(300)
        try:
            if os.path.exists(CONFIG_PATH):
                with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                    cfg = yaml.safe_load(f) or {}
                if 'system' in cfg:
                    cfg['system']['last_heartbeat_success'] = time.time()
                    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                        yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True)
        except Exception:
            pass


_hb_thread = threading.Thread(target=_heartbeat_refresher, daemon=True)
_hb_thread.start()
print('[Bypass] Heartbeat refresher started (every 5 min)')
sys.stdout.flush()

# ============================================================
# 第五步：防自毁 - 阻止 os._exit / sys.exit
# ============================================================
_original_os_exit = os._exit


def _patched_os_exit(code):
    print(f'[Bypass] Blocked os._exit({code}) - self-destruct prevented!')
    sys.stdout.flush()
    raise SystemExit(code)


os._exit = _patched_os_exit

_original_sys_exit = sys.exit


def _patched_sys_exit(code=0):
    print(f'[Bypass] Blocked sys.exit({code}) - self-destruct prevented!')
    sys.stdout.flush()
    raise SystemExit(code)


sys.exit = _patched_sys_exit

print('[Bypass] Self-destruct protection installed')
sys.stdout.flush()

# ============================================================
# 启动主程序
# ============================================================
print('[Bypass] Starting NextMedia...')
sys.stdout.flush()
runpy.run_path('/app/main.py', run_name='__main__')
