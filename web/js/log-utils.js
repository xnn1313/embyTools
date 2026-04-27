// 日志解析工具函数（公共模块，供 app.js 和 logs.js 共用）

const LogUtils = {
    // 获取日志级别
    getLogLevel(line) {
        // 先检查是否是成功日志（包含 ✅）
        if (line.includes('✅')) {
            return 'INFO';
        }
        if (line.includes('ERROR') || line.includes('❌')) {
            return 'ERROR';
        }
        if (line.includes('WARN') || line.includes('⚠️') || line.includes('警告')) {
            return 'WARNING';
        }
        if (line.includes('DEBUG') || line.includes('🔍')) {
            return 'DEBUG';
        }
        return 'INFO';
    },

    // 获取日志级别颜色
    getLogLevelColor(level) {
        const colors = {
            'INFO': 'success',
            'DEBUG': 'info',
            'ERROR': 'error',
            'WARNING': 'warning'
        };
        return colors[level] || 'success';
    },

    // 解析日志时间
    getLogTime(line) {
        // 匹配 [HH:MM:SS.mmm] 或 [HH:MM:SS,mmm] 格式（带方括号）
        const bracketMatch = line.match(/\[(\d{2}:\d{2}:\d{2})[,.](\d{3})\]/);
        if (bracketMatch) {
            return bracketMatch[1] + ',' + bracketMatch[2];
        }
        // 匹配 HH:MM:SS,mmm 或 HH:MM:SS.mmm 格式（无方括号）
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2})[,.](\d{3})/);
        if (timeMatch) {
            return timeMatch[1] + ',' + timeMatch[2];
        }
        // 匹配 HH:MM:SS 格式，补充毫秒
        const timeOnlyMatch = line.match(/(\d{2}:\d{2}:\d{2})/);
        if (timeOnlyMatch) {
            return timeOnlyMatch[1] + ',000';
        }
        return '';
    },

    // 获取日志消息内容
    getLogMessage(line) {
        let msg = line;
        // 移除 [时间戳] 格式（包含方括号）
        msg = msg.replace(/\[\d{2}:\d{2}:\d{2}[,.]\d{3}\]\s*/g, '');
        // 移除日期时间戳（无方括号）
        msg = msg.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*/g, '');
        msg = msg.replace(/\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*/g, '');
        msg = msg.replace(/\d{2}:\d{2}:\d{2}\s*/g, '');
        // 移除方括号格式的日志级别 [INFO] [ERROR] 等
        msg = msg.replace(/\[(INFO|DEBUG|ERROR|WARNING|WARN)\]\s*/gi, '');
        // 移除无方括号的日志级别
        msg = msg.replace(/^(INFO|DEBUG|ERROR|WARNING|WARN)\s+/gi, '');
        // 移除残留的空方括号 []
        msg = msg.replace(/\[\]\s*/g, '');
        // 移除开头的 - 或 : 
        msg = msg.replace(/^[\s\-:]+/, '');
        return msg.trim() || line;
    }
};

window.LogUtils = LogUtils;
