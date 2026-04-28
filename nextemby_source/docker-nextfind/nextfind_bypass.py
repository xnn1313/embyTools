#!/usr/bin/env python3
"""NextMedia/NextFind 启动绕过 - 注入 team_pro_key + 劫持授权心跳 + 防自毁"""
import os
import sys
import time
import yaml
import builtins
import httpx
from httpx import Response
import runpy

os.chdir('/app')
sys.path.insert(0, '/app')

CONFIG_PATH = '/Config/config.yaml'

print('[Bypass] Starting NextFind bypass...')
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

def _patched_import(name, *args, **kwargs):
    mod = _original_import(name, *args, **kwargs)
    # 只在主模块/应用模块范围内 patch，不干扰第三方库
    if name in ('__main__', 'main') or (hasattr(mod, '__file__') and mod.__file__ and '<frozen' in str(mod.__file__)):
        for attr_name in dir(mod):
            attr = getattr(mod, attr_name)
            if isinstance(attr, type):
                for method_name in ['is_pro_activated', 'is_activated', 'is_pro', 'check_authorization']:
                    if hasattr(attr, method_name):
                        method = getattr(attr, method_name)
                        if callable(method):
                            setattr(attr, method_name, lambda self=True: True)
                            print(f'[Bypass] Patched {name}.{attr_name}.{method_name} => True')
    return mod

builtins.__import__ = _patched_import
print('[Bypass] Import hook installed')

# ============================================================
# 第三步：劫持 httpx 发往 auth.nextemby.com 的请求（含 GET / POST）
# ============================================================
for _method in ['post', 'get', 'put', 'delete', 'patch', 'request']:
    _orig_async = getattr(httpx.AsyncClient, _method, None)
    _orig_sync = getattr(httpx.Client, _method, None)

    if _orig_async:
        def _make_async_patch(orig):
            async def _patched(self, url, *args, **kwargs):
                url_str = str(url) if not hasattr(url, 'decode') else url.decode()
                if 'auth.nextemby.com' in url_str:
                    print(f'[Bypass] Intercepted httpx async {_method}: {url_str[:80]}')
                    return Response(200, json={"status": "ok"})
                return await orig(self, url, *args, **kwargs)
            return _patched
        setattr(httpx.AsyncClient, _method, _make_async_patch(_orig_async))

    if _orig_sync:
        def _make_sync_patch(orig):
            def _patched(self, url, *args, **kwargs):
                url_str = str(url) if not hasattr(url, 'decode') else url.decode()
                if 'auth.nextemby.com' in url_str:
                    print(f'[Bypass] Intercepted httpx sync {_method}: {url_str[:80]}')
                    return Response(200, json={"status": "ok"})
                return orig(self, url, *args, **kwargs)
            return _patched
        setattr(httpx.Client, _method, _make_sync_patch(_orig_sync))

# 也劫持 requests 库（含 GET / POST）
import requests as req_lib
class FakeResp:
    status_code = 200
    ok = True
    def json(self):
        return {"status": "ok"}
    def __getattr__(self, name):
        return lambda *a, **kw: None

for _method in ['post', 'get', 'put', 'delete', 'patch', 'request']:
    _orig_sess = getattr(req_lib.Session, _method, None)
    if _orig_sess:
        def _make_sess_patch(orig):
            def _patched(self, url, *args, **kwargs):
                url_str = str(url) if not hasattr(url, 'decode') else url.decode()
                if 'auth.nextemby.com' in url_str:
                    print(f'[Bypass] Intercepted requests {_method}: {url_str[:80]}')
                    return FakeResp()
                return orig(self, url, *args, **kwargs)
            return _patched
        setattr(req_lib.Session, _method, _make_sess_patch(_orig_sess))

print('[Bypass] httpx + requests (GET/POST/all) auth requests intercepted')
sys.stdout.flush()

# ============================================================
# 第四步：防自毁 - 阻止 os._exit / sys.exit（如果有代码尝试自毁）
# ============================================================
_original_os_exit = os._exit
def _patched_os_exit(code):
    print(f'[Bypass] Blocked os._exit({code}) - self-destruct prevented!')
    sys.stdout.flush()
    # 不让进程真的退出
    import threading
    threading.Thread(target=lambda: time.sleep(9999), daemon=True).start()
os._exit = _patched_os_exit

_original_sys_exit = sys.exit
def _patched_sys_exit(code=0):
    print(f'[Bypass] Blocked sys.exit({code}) - self-destruct prevented!')
    sys.stdout.flush()
    import threading
    threading.Thread(target=lambda: time.sleep(9999), daemon=True).start()
sys.exit = _patched_sys_exit

print('[Bypass] Self-destruct protection installed')
sys.stdout.flush()

# ============================================================
# 启动主程序
# ============================================================
print('[Bypass] Starting NextMedia...')
sys.stdout.flush()
runpy.run_path('/app/main.py', run_name='__main__')
