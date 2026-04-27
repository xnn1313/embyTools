// 日志页面组件
const LogsPage = {
    name: 'LogsPage',
    
    data() {
        return {
            logType: 'system',
            logTypes: [
                { title: '系统', value: 'system' },
                { title: '302', value: '302' },
                { title: 'API', value: '302api' },
                { title: 'STRM', value: 'share_strm' },
                { title: '整理', value: 'organize' },
                { title: '订阅', value: 'subscribe' }
            ],
            logs: [],
            loading: false,
            refreshInterval: null
        }
    },
    
    async mounted() {
        await this.loadLogs();
        // 启动实时刷新（每 3 秒）
        this.refreshInterval = setInterval(() => {
            this.loadLogs(false);
        }, 3000);
    },
    
    beforeUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    },
    
    methods: {
        async loadLogs(showLoading = true) {
            if (showLoading) {
                this.loading = true;
            }
            try {
                const result = await api.getLogs(this.logType);
                if (result && result.data) {
                    this.logs = result.data;
                }
            } catch (error) {
                console.error('加载日志失败:', error);
            } finally {
                this.loading = false;
            }
        },
        
        async switchLogType(type) {
            this.logType = type;
            await this.loadLogs();
        },
        
        async clearLogs() {
            try {
                const result = await api.request(`/logs/${this.logType}/clear`, { method: 'POST' });
                if (result.success) {
                    this.logs = [];
                    window.showMessage && window.showMessage('日志已清空', 'success');
                } else {
                    window.showMessage && window.showMessage(result.message || '清空失败', 'error');
                }
            } catch (error) {
                window.showMessage && window.showMessage('清空日志失败', 'error');
            }
        },
        
        getLogTypeName() {
            const item = this.logTypes.find(t => t.value === this.logType);
            return item ? item.title : '系统日志';
        },
        
        // 日志解析函数（委托给公共 LogUtils）
        getLogLevel(line) { return LogUtils.getLogLevel(line); },
        getLogLevelColor(level) { return LogUtils.getLogLevelColor(level); },
        getLogTime(line) { return LogUtils.getLogTime(line); },
        getLogMessage(line) { return LogUtils.getLogMessage(line); },
        
        // 查看全部日志（带 token 直接打开）
        viewFullLog() {
            const token = localStorage.getItem('auth_token');
            const url = '/api/logs/' + this.logType + '/full' + (token ? '?token=' + encodeURIComponent(token) : '');
            window.open(url, '_blank');
        }
    },
    
    template: `
        <v-card class="logs-page-card">
            <!-- 标题栏 -->
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <div class="mt-3">
                    <span style="font-size: 22px;">实时日志</span>
                </div>
                <v-spacer></v-spacer>
                <v-btn icon variant="text" color="primary" @click="loadLogs()" :loading="loading">
                    <v-icon>mdi-refresh</v-icon>
                </v-btn>
            </v-card-title>
            
            <!-- 工具栏 -->
            <div class="px-4 pb-2 log-toolbar">
                <div class="d-flex align-center justify-center flex-wrap" style="gap: 8px;">
                    <!-- 日志类型切换按钮组 -->
                    <v-btn-group density="compact" class="border rounded">
                        <v-btn 
                            v-for="t in logTypes" 
                            :key="t.value"
                            size="small"
                            :class="logType === t.value ? 'bg-primary text-white' : 'text-grey-lighten-3'"
                            :variant="logType === t.value ? 'flat' : 'text'"
                            class="font-medium px-2"
                            style="height: auto; min-width: 45px; font-size: 12px;"
                            @click="switchLogType(t.value)"
                        >{{ t.title }}</v-btn>
                    </v-btn-group>
                    
                    <!-- 清空按钮 -->
                    <v-btn color="info" variant="elevated" size="small" class="rounded-pill" @click="clearLogs">
                        <template v-slot:prepend><v-icon size="16">mdi-delete</v-icon></template>
                        清空
                    </v-btn>
                    
                    <!-- 查看全部按钮 -->
                    <v-btn color="success" variant="tonal" size="small" style="border-radius: 8px;" @click="viewFullLog">
                        <v-icon left size="18">mdi-open-in-new</v-icon>查看全部
                    </v-btn>
                </div>
            </div>
            
            <!-- 日志表格 -->
            <v-card-text class="pa-0" style="height: calc(100vh - 280px); overflow-y: auto;">
                <div class="table-container">
                    <v-table hover class="logs-table" density="default">
                        <tbody>
                            <tr v-if="loading && logs.length === 0">
                                <td class="py-3 pl-6 text-center">
                                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                                </td>
                            </tr>
                            <tr v-else-if="logs.length === 0">
                                <td class="py-3 pl-6 text-center" :style="{ color: $root.isDark ? 'rgba(var(--v-theme-on-surface),0.4)' : 'rgba(0,0,0,0.4)' }">
                                    <v-icon size="48" color="grey" class="mb-2">mdi-text-box-outline</v-icon>
                                    <p>暂无日志</p>
                                </td>
                            </tr>
                            <tr v-for="(line, index) in logs" :key="index">
                                <td class="py-3 pl-6">
                                    <div class="d-flex align-center" style="gap: 16px;">
                                        <span class="d-inline-flex align-center" style="min-width: 100px;">
                                            <v-chip 
                                                size="small" 
                                                :color="getLogLevelColor(getLogLevel(line))"
                                                class="font-medium px-3"
                                            >{{ getLogLevel(line) }}</v-chip>
                                        </span>
                                        <span class="d-inline-flex align-center" :style="{ minWidth: '120px', color: $root.isDark ? 'rgba(var(--v-theme-on-surface),0.7)' : 'rgba(0,0,0,0.5)' }">{{ getLogTime(line) }}</span>
                                        <span style="white-space: normal; line-height: 1.6; word-break: break-word; max-width: 100%;">{{ getLogMessage(line) }}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </div>
            </v-card-text>
        </v-card>
    `
};
