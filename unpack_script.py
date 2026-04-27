#!/usr/bin/env python3
"""PyArmor unpack script using gdb to dump memory and extract code objects."""
import sys, os, marshal, types, struct, time, subprocess, signal, tempfile

sys.path.insert(0, '/app')

output_dir = '/tmp/pyc_decrypted'
os.makedirs(output_dir, exist_ok=True)

# Python 3.12 magic
import importlib.util
magic = importlib.util.MAGIC_NUMBER
header = magic + b'\x00' * (16 - len(magic)) + b'\x00' * 4

# Step 1: Import all modules
import importlib
core_dir = '/app/core'
modules = [f[:-3] for f in sorted(os.listdir(core_dir)) if f.endswith('.py') and f != '__init__.py']

for m in modules:
    try:
        importlib.import_module('core.' + m)
    except Exception as e:
        print(f'FAIL import: {m}: {e}')

# Also submodules
for sub in ['api', 'nameparser']:
    subdir = os.path.join(core_dir, sub)
    if os.path.isdir(subdir):
        for f in sorted(os.listdir(subdir)):
            if f.endswith('.py') and f != '__init__.py':
                try:
                    importlib.import_module(f'core.{sub}.{f[:-3]}')
                except Exception as e:
                    print(f'FAIL import: core.{sub}.{f[:-3]}: {e}')

print('All imports done')

# Step 2: Now iterate all modules and try to dump function code objects
# But we know they might segfault, so let's try-except carefully

count = 0
for modname in sorted(sys.modules.keys()):
    if not modname.startswith('core.'):
        continue
    mod = sys.modules[modname]
    if mod is None:
        continue

    # Try to access the module's __pyarmor__ generated code
    # The module itself was created by exec'ing the decrypted code
    # We can look at the original .py file to get the module name
    mod_dir = os.path.dirname(getattr(mod, '__file__', ''))

    # Walk through all attributes and dump code objects
    for attr_name in dir(mod):
        try:
            obj = getattr(mod, attr_name)
        except:
            continue

        try:
            if isinstance(obj, types.FunctionType):
                code = obj.__code__
                # Check if accessing co_code crashes (PyArmor protected)
                try:
                    _ = len(code.co_code)
                except:
                    continue

                pyc_name = f"{modname}.{attr_name}"
                pyc_path = os.path.join(output_dir, pyc_name.replace('.', '/') + '.cpython-312.pyc')
                os.makedirs(os.path.dirname(pyc_path), exist_ok=True)

                # Replace C functions with None in consts
                new_consts = []
                skip = False
                for c in code.co_consts:
                    tn = type(c).__name__
                    if tn == 'builtin_function_or_method':
                        new_consts.append(None)
                    elif tn == 'code':
                        new_consts.append(c)  # Nested code objects should be fine
                    else:
                        new_consts.append(c)

                try:
                    new_code = code.replace(co_consts=tuple(new_consts))
                    with open(pyc_path, 'wb') as f:
                        f.write(header)
                        marshal.dump(new_code, f)
                    count += 1
                except:
                    # Try even simpler - just write as-is
                    try:
                        with open(pyc_path + '.raw', 'wb') as f:
                            f.write(header)
                            marshal.dump(code, f)
                        count += 1
                    except:
                        pass
        except:
            pass

print(f'Dumped {count} code objects')
