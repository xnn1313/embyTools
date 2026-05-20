#!/usr/bin/env python3
"""NextMedia/NextFind 启动绕过 v4 - 适配 2026-05 新版模块化架构
   新增模块: app/utils/http_client, app/utils/sys_helper, app/services/hdhive,
            app/services/scheduler, app/services/tg_channel, app/api/subscriptions 等"""
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

print('[Bypass] Starting NextFind bypass (v4 - 2026-05 new arch)...')
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

# 授权相关的方法名（扩展覆盖新版可能的命名）
_AUTH_METHODS = [
    'is_pro_activated', 'is_activated', 'is_pro',
    'check_authorization', 'check_auth', 'verify_license',
    'is_authorized', 'is_licensed', 'check_license',
    'validate_license', 'validate_subscription', 'check_subscription',
    'is_subscribed', 'is_valid', 'verify_activation',
    'check_pro', 'check_pro_status', 'get_license_status',
    'is_trial_expired', 'is_expired', 'check_expiry',
    'verify_key', 'validate_key', 'check_key',
    'need_activation', 'require_pro', 'require_license',
]

# 需要全量 patch 的模块（所有方法都 patch）
_FULL_PATCH_MODULES = ['network_monitor', 'sys_helper']

# 需要特殊处理的模块（patch 部分关键方法）
_HTTP_CLIENT_MODULES = ['http_client']

_patched_modules = set()


async def _async_true(self=None, *a, **kw):
    return True


async def _async_false(self=None, *a, **kw):
    return False


async def _async_none(self=None, *a, **kw):
    return None


async def _async_ok_response(self=None, *a, **kw):
    return {"status": "ok", "activated": True, "pro": True}


def _sync_true(self=None, *a, **kw):
    return True


def _patch_method(cls, method_name, func, label=""):
    """替换方法"""
    try:
        orig = getattr(cls, method_name, None)
        if orig is None or not callable(orig):
            return False
        setattr(cls, method_name, func)
        if label:
            print(f'[Bypass] Patched {label}')
        return True
    except Exception as e:
        if label:
            print(f'[Bypass] Warning: failed to patch {label}: {e}')
        return False


def _is_async_func(func):
    """判断是否为 async 函数"""
    return asyncio.iscoroutinefunction(func) or (
        hasattr(func, '__wrapped__') and asyncio.iscoroutinefunction(func.__wrapped__)
    )


def _patch_module(mod, name):
    """扫描模块中的所有类，patch 授权和网络状态相关方法"""
    if id(mod) in _patched_modules:
        return
    _patched_modules.add(id(mod))

    # 判断是否需要全量 patch（network_monitor, sys_helper 等模块）
    is_full_patch = any(fp in name for fp in _FULL_PATCH_MODULES)
    is_http_client = any(hc in name for hc in _HTTP_CLIENT_MODULES)

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
                            if _is_async_func(method):
                                _patch_method(attr, method_name, _async_true,
                                              f'{name}.{attr_name}.{method_name} => async True')
                            else:
                                _patch_method(attr, method_name, _sync_true,
                                              f'{name}.{attr_name}.{method_name} => sync True')
                    except Exception:
                        pass
            elif is_http_client:
                # HTTP 客户端模块：patch 可能绕过 httpx 的自定义请求方法
                for method_name in dir(attr):
                    if method_name.startswith('_'):
                        continue
                    method_lower = method_name.lower()
                    # patch 任何包含 auth/license/heartbeat/verify 的方法
                    if any(kw in method_lower for kw in ['auth', 'license', 'heartbeat',
                                                         'verify', 'activate', 'check_pro',
                                                         'subscription', 'validate']):
                        try:
                            method = getattr(attr, method_name)
                            if callable(method):
                                if _is_async_func(method):
                                    _patch_method(attr, method_name, _async_ok_response,
                                                  f'{name}.{attr_name}.{method_name} => async ok_response')
                                else:
                                    _patch_method(attr, method_name, _sync_true,
                                                  f'{name}.{attr_name}.{method_name} => sync True')
                        except Exception:
                            pass
            else:
                # 精确 patch：只 patch 授权相关方法
                for method_name in _AUTH_METHODS:
                    if hasattr(attr, method_name):
                        _patch_method(attr, method_name, _async_true,
                                      f'{name}.{attr_name}.{method_name} => async True')

    # 模块级变量和函数
    for var_name in dir(mod):
        if var_name.startswith('_'):
            continue
        var_lower = var_name.lower()

        try:
            val = getattr(mod, var_name)
        except Exception:
            continue

        if is_full_patch:
            if isinstance(val, bool):
                try:
                    setattr(mod, var_name, True)
                    print(f'[Bypass] Set {name}.{var_name} = True')
                except Exception:
                    pass
            elif callable(val) and not isinstance(val, type):
                try:
                    if _is_async_func(val):
                        setattr(mod, var_name, _async_true)
                    else:
                        setattr(mod, var_name, _sync_true)
                    print(f'[Bypass] Patched {name}.{var_name}() => True')
                except Exception:
                    pass
        else:
            # 对所有模块：patch 模块级的授权相关函数
            if any(kw in var_lower for kw in ['is_pro', 'is_activated', 'is_licensed',
                                               'check_auth', 'check_license', 'verify',
                                               'is_authorized', 'is_subscribed',
                                               'need_activation', 'is_expired']):
                if callable(val) and not isinstance(val, type):
                    try:
                        if _is_async_func(val):
                            setattr(mod, var_name, _async_true)
                        else:
                            setattr(mod, var_name, _sync_true)
                        print(f'[Bypass] Patched module-level {name}.{var_name}() => True')
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
# 第三步：劫持 httpx 发往授权域名的请求
# ============================================================
_AUTH_DOMAINS = ['auth.nextemby.com', 'license.nextemby.com',
                 'api.nextemby.com', 'nextemby.com/api/auth',
                 'nextemby.com/api/license', 'nextemby.com/api/verify']

for _method in ['post', 'get', 'put', 'delete', 'patch', 'request', 'send']:
    _orig_async = getattr(httpx.AsyncClient, _method, None)
    _orig_sync = getattr(httpx.Client, _method, None)

    if _orig_async:
        def _make_async_patch(orig, method_name=_method):
            async def _patched(self, *args, **kwargs):
                url_str = str(args[0]) if args else str(kwargs.get('url', ''))
                if any(d in url_str for d in _AUTH_DOMAINS):
                    print(f'[Bypass] Intercepted httpx async {method_name}: {url_str[:80]}')
                    return Response(200, json={"status": "ok", "activated": True, "pro": True,
                                              "valid": True, "expired": False,
                                              "subscription": {"active": True, "plan": "pro"}})
                return await orig(self, *args, **kwargs)
            return _patched
        setattr(httpx.AsyncClient, _method, _make_async_patch(_orig_async))

    if _orig_sync:
        def _make_sync_patch(orig, method_name=_method):
            def _patched(self, *args, **kwargs):
                url_str = str(args[0]) if args else str(kwargs.get('url', ''))
                if any(d in url_str for d in _AUTH_DOMAINS):
                    print(f'[Bypass] Intercepted httpx sync {method_name}: {url_str[:80]}')
                    return Response(200, json={"status": "ok", "activated": True, "pro": True,
                                              "valid": True, "expired": False,
                                              "subscription": {"active": True, "plan": "pro"}})
                return orig(self, *args, **kwargs)
            return _patched
        setattr(httpx.Client, _method, _make_sync_patch(_orig_sync))

# 也劫持 requests 库
import requests as req_lib


class FakeResp:
    status_code = 200
    ok = True
    text = '{"status": "ok", "activated": true, "pro": true, "valid": true, "expired": false}'
    content = b'{"status": "ok", "activated": true, "pro": true, "valid": true, "expired": false}'
    headers = {'content-type': 'application/json'}
    encoding = 'utf-8'

    def json(self):
        return {"status": "ok", "activated": True, "pro": True,
                "valid": True, "expired": False,
                "subscription": {"active": True, "plan": "pro"}}

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

# patch requests 模块级函数
for _method in ['post', 'get', 'put', 'delete', 'patch']:
    _orig_func = getattr(req_lib, _method, None)
    if _orig_func:
        def _make_func_patch(orig, method_name=_method):
            def _patched(url, *args, **kwargs):
                url_str = str(url)
                if any(d in url_str for d in _AUTH_DOMAINS):
                    print(f'[Bypass] Intercepted requests.{method_name}(): {url_str[:80]}')
                    return FakeResp()
                return orig(url, *args, **kwargs)
            return _patched
        setattr(req_lib, _method, _make_func_patch(_orig_func))

print('[Bypass] httpx + requests auth requests intercepted')
sys.stdout.flush()

# ============================================================
# 第四步：劫持 aiohttp（新版可能使用）
# ============================================================
try:
    import aiohttp

    _orig_aiohttp_request = aiohttp.ClientSession._request

    async def _patched_aiohttp_request(self, method, url, *args, **kwargs):
        url_str = str(url)
        if any(d in url_str for d in _AUTH_DOMAINS):
            print(f'[Bypass] Intercepted aiohttp {method}: {url_str[:80]}')

            class FakeAioResp:
                status = 200
                headers = {'content-type': 'application/json'}

                async def json(self, *a, **kw):
                    return {"status": "ok", "activated": True, "pro": True,
                            "valid": True, "expired": False}

                async def text(self, *a, **kw):
                    return '{"status": "ok", "activated": true, "pro": true}'

                async def read(self, *a, **kw):
                    return b'{"status": "ok", "activated": true, "pro": true}'

                async def __aenter__(self):
                    return self

                async def __aexit__(self, *a):
                    pass

                def raise_for_status(self):
                    pass

            return FakeAioResp()
        return await _orig_aiohttp_request(self, method, url, *args, **kwargs)

    aiohttp.ClientSession._request = _patched_aiohttp_request
    print('[Bypass] aiohttp auth requests intercepted')
except ImportError:
    pass

sys.stdout.flush()

# ============================================================
# 第五步：持续刷新心跳时间戳（后台线程）
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
                    cfg['system']['team_pro_key'] = 'bypass_pro'
                    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                        yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True)
        except Exception:
            pass


_hb_thread = threading.Thread(target=_heartbeat_refresher, daemon=True)
_hb_thread.start()
print('[Bypass] Heartbeat refresher started (every 5 min)')
sys.stdout.flush()

# ============================================================
# 第六步：防自毁 - 阻止 os._exit / sys.exit / subprocess kill
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

# 阻止通过 subprocess 自杀
try:
    import subprocess
    _orig_subprocess_run = subprocess.run
    _orig_subprocess_popen = subprocess.Popen

    def _patched_subprocess_run(args, *a, **kw):
        cmd_str = str(args)
        if any(danger in cmd_str for danger in ['kill', 'pkill', 'killall', 'rm -rf /app']):
            print(f'[Bypass] Blocked dangerous subprocess: {cmd_str[:100]}')
            class FakeResult:
                returncode = 0
                stdout = b''
                stderr = b''
            return FakeResult()
        return _orig_subprocess_run(args, *a, **kw)

    subprocess.run = _patched_subprocess_run

    class PatchedPopen(_orig_subprocess_popen):
        def __init__(self, args, *a, **kw):
            cmd_str = str(args)
            if any(danger in cmd_str for danger in ['kill', 'pkill', 'killall', 'rm -rf /app']):
                print(f'[Bypass] Blocked dangerous Popen: {cmd_str[:100]}')
                args = ['echo', 'blocked']
            super().__init__(args, *a, **kw)

    subprocess.Popen = PatchedPopen
except Exception:
    pass

# 阻止通过 signal 自杀
try:
    import signal
    _orig_signal = signal.signal

    def _patched_signal(signum, handler):
        if signum in (signal.SIGTERM, signal.SIGINT):
            print(f'[Bypass] Intercepted signal.signal({signum}) - keeping default handler')
            return _orig_signal(signum, signal.SIG_DFL)
        return _orig_signal(signum, handler)

    # 不 patch signal，避免影响正常关闭，只记录
except Exception:
    pass

print('[Bypass] Self-destruct protection installed')
sys.stdout.flush()

# ============================================================
# 第七步：环境变量伪装（某些版本通过环境变量检测）
# ============================================================
os.environ['NEXTFIND_PRO'] = '1'
os.environ['NEXTFIND_LICENSED'] = '1'
os.environ['NF_SUBSCRIPTION'] = 'pro'
print('[Bypass] Environment variables set')
sys.stdout.flush()

# ============================================================
# 启动主程序 - 通过多种方式拦截心跳任务
# ============================================================

# 方式1：在import hook中直接替换 scheduler 模块的 cloud_heartbeat_task
# 并修改 network_monitor 的 GLOBAL_NETWORK_STATUS
_orig_import_final = builtins.__import__

def _final_patched_import(name, *args, **kwargs):
    mod = _patched_import(name, *args, **kwargs)
    # 拦截 scheduler 模块中的心跳任务
    if 'scheduler' in name:
        if hasattr(mod, 'cloud_heartbeat_task'):
            async def _noop_heartbeat(*a, **kw):
                while True:
                    await asyncio.sleep(86400)
            mod.cloud_heartbeat_task = _noop_heartbeat
            print(f'[Bypass] Replaced {name}.cloud_heartbeat_task => noop')
    # 拦截 network_monitor 模块，强制设置 auth 状态为已授权
    if 'network_monitor' in name:
        if hasattr(mod, 'GLOBAL_NETWORK_STATUS'):
            mod.GLOBAL_NETWORK_STATUS['auth'] = 'authorized'
            print(f'[Bypass] Set GLOBAL_NETWORK_STATUS["auth"] = "authorized"')
    return mod

builtins.__import__ = _final_patched_import

# 方式2：Patch asyncio.create_task 拦截心跳协程
_orig_asyncio_create_task = asyncio.create_task

def _patched_asyncio_create_task(coro, *args, **kwargs):
    coro_name = getattr(coro, '__name__', '') or getattr(coro, '__qualname__', '')
    if 'heartbeat' in coro_name.lower():
        print(f'[Bypass] Blocked asyncio.create_task: {coro_name}')
        async def _noop():
            while True:
                await asyncio.sleep(86400)
        coro.close()
        return _orig_asyncio_create_task(_noop(), *args, **kwargs)
    return _orig_asyncio_create_task(coro, *args, **kwargs)

asyncio.create_task = _patched_asyncio_create_task

# 方式3：Patch asyncio 事件循环
class _PatchedEventLoopPolicy(asyncio.DefaultEventLoopPolicy):
    def new_event_loop(self):
        loop = super().new_event_loop()
        _orig_create_task = loop.create_task
        def _patched_create_task(coro, *args, **kwargs):
            coro_name = getattr(coro, '__name__', '') or getattr(coro, '__qualname__', '')
            if 'heartbeat' in coro_name.lower():
                print(f'[Bypass] Blocked loop.create_task: {coro_name}')
                async def _noop():
                    while True:
                        await asyncio.sleep(86400)
                coro.close()
                return _orig_create_task(_noop(), *args, **kwargs)
            return _orig_create_task(coro, *args, **kwargs)
        loop.create_task = _patched_create_task
        return loop

asyncio.set_event_loop_policy(_PatchedEventLoopPolicy())

# 方式4：Patch asyncio.ensure_future
_orig_ensure_future = asyncio.ensure_future

def _patched_ensure_future(coro_or_future, *args, **kwargs):
    coro_name = getattr(coro_or_future, '__name__', '') or getattr(coro_or_future, '__qualname__', '')
    if 'heartbeat' in coro_name.lower():
        print(f'[Bypass] Blocked ensure_future: {coro_name}')
        async def _noop():
            while True:
                await asyncio.sleep(86400)
        try:
            coro_or_future.close()
        except:
            pass
        return _orig_ensure_future(_noop(), *args, **kwargs)
    return _orig_ensure_future(coro_or_future, *args, **kwargs)

asyncio.ensure_future = _patched_ensure_future

print('[Bypass] asyncio fully patched (create_task + loop + ensure_future)')
sys.stdout.flush()

print('[Bypass] Starting NextMedia (v4 bypass active)...')
sys.stdout.flush()
runpy.run_path('/app/main.py', run_name='__main__')
