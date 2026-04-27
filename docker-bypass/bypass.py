#!/usr/bin/env python3
"""NanShare 启动绕过 - 替换授权验证为始终成功"""
import sys
import os
import builtins

os.chdir('/app')
sys.path.insert(0, '/app')

# 先初始化 PyArmor 运行时
import pyarmor_runtime_004721

# 创建假授权管理器
class FakeAuthManager:
    is_authorized = True
    auth_message = '授权绕过'

    def verify_license(self, auth_server_url=None, license_key=None):
        return (True, 'ok')

fake_mgr = FakeAuthManager()

# 拦截 core.auth_manager 的导入，替换为假对象
original_import = builtins.__import__

def patched_import(name, *args, **kwargs):
    mod = original_import(name, *args, **kwargs)
    if name == 'core.auth_manager':
        mod.auth_manager = fake_mgr
    return mod

builtins.__import__ = patched_import

# 启动主程序
import runpy
runpy.run_path('/app/main.py', run_name='__main__')
