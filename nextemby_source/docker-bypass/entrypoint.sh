#!/bin/sh
# NextEmby 绕过入口 - 写文件日志确保可诊断
LOG=/app/bypass.log

echo "=== [Bypass] $(date) ===" >> $LOG
echo "[Bypass/Shell] Starting..." >> $LOG

# 第一步：在 PyArmor 外预注入 team_pro_key（架构无关）
echo "[Bypass/Shell] Running db_inject.py..." >> $LOG
python3 /app/db_inject.py >> $LOG 2>&1
echo "[Bypass/Shell] db_inject.py exit code: $?" >> $LOG

# 第二步：运行完整绕过（含 PyArmor + httpx 劫持 + 启动主程序）
echo "[Bypass/Shell] Running bypass.py..." >> $LOG
python3 /app/bypass.py >> $LOG 2>&1
echo "[Bypass/Shell] bypass.py exit code: $?" >> $LOG
