FROM nextemby/nextfind:latest

# 添加绕过脚本
COPY nextfind_bypass.py /app/nextfind_bypass.py
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
