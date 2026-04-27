FROM nan11888/nanshare:latest

# 添加启动时绕过验证的脚本
COPY bypass.py /app/bypass.py

# 修改入口点，先用我们的脚本初始化再启动主程序
ENTRYPOINT ["python3", "/app/bypass.py"]
