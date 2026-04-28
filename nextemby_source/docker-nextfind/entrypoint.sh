#!/bin/bash
set -e

echo "🚀 [Bypass] Initializing NextMedia container environment..."

# 确保 /Config 目录和子目录存在
mkdir -p /Config/data
mkdir -p /Config/logs

# 1. 配置文件初始化与映射
if [ ! -f "/Config/config.yaml" ]; then
    echo "未检测到现有配置，正在从出厂设置生成 config.yaml 到 /Config..."
    if [ -f "/app/config.yaml.default" ]; then
        cp /app/config.yaml.default /Config/config.yaml
    else
        echo "❌ 警告: 找不到默认配置文件 /app/config.yaml.default"
    fi
fi

# 删除原本的 config.yaml（可能是断开的软链接）并建立新的软链接
rm -f /app/config.yaml
ln -s /Config/config.yaml /app/config.yaml

# 2. 数据目录映射
if [ -d "/app/data" ] && [ ! -L "/app/data" ]; then
    rm -rf /app/data
fi
if [ ! -e "/app/data" ]; then
    ln -s /Config/data /app/data
fi

# 3. 日志目录映射
if [ -d "/app/logs" ] && [ ! -L "/app/logs" ]; then
    rm -rf /app/logs
fi
if [ ! -e "/app/logs" ]; then
    ln -s /Config/logs /app/logs
fi

# 4. 权限放宽
chmod -R 777 /Config/logs 2>/dev/null || true

echo "✅ [Bypass] Environment mapping complete!"
echo "🚀 [Bypass] Starting bypass launcher..."

# 通过 bypass 启动主程序
exec python /app/nextfind_bypass.py
