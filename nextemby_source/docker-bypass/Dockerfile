FROM nextemby/nextemby:latest

# 添加所有绕过脚本
COPY db_inject.py /app/db_inject.py
COPY bypass.py /app/bypass.py
COPY emby_launcher.py /app/emby_launcher.py
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 替换 emby_proxy.py 为启动器（劫持内部重启也通过 bypass）
RUN mv /app/emby_proxy.py /app/emby_proxy_real.py && \
    cp /app/emby_launcher.py /app/emby_proxy.py

# Shell 入口：先 db_inject（不依赖 PyArmor），再 bypass.py（完整绕过）
ENTRYPOINT ["/app/entrypoint.sh"]
