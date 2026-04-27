// 分享 STRM 设置页面组件
const ShareStrmPage = {
    name: 'ShareStrmPage',
    
    data() {
        return {
            loading: false,
            saving: false,
            shareApiSaving: false,
            configs115: [],
            shareApiConfig: {
                enabled: false,
                use_115_config: '',
                cache_ttl: 10
            },
            config: {
                enabled: false,
                use_115_config: '',
                share_path: '/',
                local_strm_path: '',
                min_file_size: 0,
                auto_download_metadata: true,
                video_extensions: 'mp4,mkv,ts,iso,rmvb,avi,mov,mpeg,mpg,wmv,3gp,asf,m4v,flv,m2ts,tp,f4v',
                metadata_extensions: 'srt,ass,ssa',
                request_url: 'http://172.17.0.1:8115',
                speed_mode: 0,  // 默认最快
                strm_folders: [],  // 多 STRM 目录
                export_shares_enabled: true,  // 导出分享功能开关
                export_send_raw_json: true,  // 是否发送未解析 JSON
                enable_normal_share_mode: false,  // 是否启用普通分享模式
                enable_reshare_mode: false,  // 是否启用转存再分享模式
                reshare_first_parse_mode: 0,  // 转存再分享：首次解析模式（默认最快）
                reshare_new_link_parse_mode: 1,  // 转存再分享：新链接解析模式（默认大包模式）
                enable_strm_detail_log: true,  // 是否输出生成 STRM 详细日志
                strm_exclude_filename: true,  // STRM 不包含文件名
                batch_wait_time: 5,  // TG 批处理等待时间（秒）
                reshare_verify_method: 0,  // 0=cookie扫描, 1=115open扫描
                // 线程递归模式配置
                thread_recursive_threads: 2,
                thread_recursive_min_delay: 0.8,
                thread_recursive_max_delay: 1.5,
                reshare_custom_password_enabled: false,
                reshare_custom_password: '',
                reshare_generate_strm: true,
                reshare_115_open_config: ''
            },
            verifyMethods: [
                { value: 0, title: 'Cookie 扫描' },
                { value: 1, title: '115open 扫描' }
            ],
            showCustomPassword: false,
            activeTab: 'basic',
            speedModes: [
                { value: 0, title: '最快' },
                { value: 1, title: '大包模式' },
                { value: 2, title: '线程递归' },
                { value: 3, title: '葵花宝典' }
            ],
            reshareSpeedModes: [
                { value: 0, title: '最快' },
                { value: 1, title: '大包模式' },
                { value: 2, title: '线程递归' }
            ],
            folderDialog: false,
            folderLoading: false,
            folders: [],
            currentPath: '',
            parentPath: '',
            // 新增：编辑文件夹模式
            editingFolderIndex: -1,  // -1 表示新增，>=0 表示编辑
            newFolderName: '',
            // 导出分享相关
            exportDialog: false,
            exportLoading: false,
            selectedExportConfig: '',
            // ===== 日志相关 =====
            logTasks: [],
            logLoading: false,
            logPage: 1,
            logPageSize: 15,
            logTotal: 0,
            logTotalPages: 0,
            logFilterStatus: '',
            logFilterMode: '',
            logFilterKeyword: '',
            logStatusOptions: [
                { value: '', title: '全部状态' },
                { value: 'success', title: '成功' },
                { value: 'failed', title: '失败' },
                { value: 'running', title: '运行中' }
            ],
            logModeOptions: [
                { value: '', title: '全部模式' },
                { value: 'normal', title: '普通分享' },
                { value: 'reshare', title: '转存再分享' },
                { value: 'sub_normal', title: '订阅 普通分享' },
                { value: 'sub_reshare', title: '订阅 转存再分享' }
            ],
            logMultiSelectMode: false,
            logSelectedIds: [],
            logDetailDialog: false,
            logDetailLoading: false,
            logDetailData: null,
            logDeleteDialog: false,
            logDeleteType: '',
            logDeleting: false,
            logRefreshInterval: null,
            // 重试相关
            logRetrying: false,
            logRetryingDetail: false,
            logRetryFolderDialog: false,
            logRetryFolderLoading: false,
            logRetryTargetIds: [],
            logRetryFolderIndex: 0,
            // 详情页删除
            logDetailDeleting: false,
            logDetailDeleteDialog: false
        }
    },
    
    async mounted() {
        // 从 URL 子路径恢复 tab 状态（hash 格式: strm_tools/share_strm/reshare）
        const hash = window.location.hash.replace(/^#\/?/, '');
        const parts = hash.split('/');
        const tabPart = parts[2]; // strm_tools / share_strm / [tab]
        if (tabPart) {
            const validTabs = ['basic', 'normal', 'reshare', 'logs'];
            if (validTabs.includes(tabPart)) {
                this.activeTab = tabPart;
            }
        }
        await this.loadData();
    },
    
    beforeUnmount() {
        this.stopLogRefresh();
    },
    
    computed: {
        openConfigs115() {
            return this.configs115.filter(c => c.open_token && c.open_token.access_token);
        },
        isLogPageAllSelected() {
            if (this.logTasks.length === 0) return false;
            return this.logTasks.every(t => this.logSelectedIds.includes(t.task_id));
        }
    },
    
    watch: {
        logFilterStatus() { this.logPage = 1; this.loadLogTasks(); },
        logFilterMode() { this.logPage = 1; this.loadLogTasks(); },
        logFilterKeyword(val) {
            clearTimeout(this._logKwTimer);
            this._logKwTimer = setTimeout(() => { this.logPage = 1; this.loadLogTasks(); }, 300);
        },
        activeTab(val) {
            // 同步 tab 到 URL（必须包含 strm_tools/ 前缀，否则路由无法匹配到 StrmToolsPage）
            const base = 'strm_tools/share_strm';
            if (val === 'basic') {
                router.push(base);
            } else {
                router.push(base + '/' + val);
            }
            if (val === 'logs') {
                this.loadLogTasks();
                this.startLogRefresh();
            } else {
                this.stopLogRefresh();
            }
        }
    },
    
    methods: {
        getConfig115HasOpen(name) {
            const cfg = this.configs115.find(c => c.name === name);
            return !!(cfg && cfg.open_token && cfg.open_token.access_token);
        },
        async loadData() {
            this.loading = true;
            try {
                const [configRes, configs115Res, shareApiConfigRes] = await Promise.all([
                    api.getShareStrmConfig(),
                    api.get115Configs(),
                    api.getShareApiConfig()
                ]);
                if (shareApiConfigRes) {
                    this.shareApiConfig = { ...this.shareApiConfig, ...shareApiConfigRes };
                }
                if (configRes) {
                    this.config = { ...this.config, ...configRes };
                    // 确保字段存在
                    if (!this.config.strm_folders) {
                        this.config.strm_folders = [];
                    }
                    if (this.config.export_shares_enabled === undefined) {
                        this.config.export_shares_enabled = true;
                    }
                    if (this.config.export_send_raw_json === undefined) {
                        this.config.export_send_raw_json = true;
                    }
                    if (this.config.enable_normal_share_mode === undefined) {
                        this.config.enable_normal_share_mode = false;
                    }
                    if (this.config.enable_reshare_mode === undefined) {
                        this.config.enable_reshare_mode = false;
                    }
                    if (this.config.enable_strm_detail_log === undefined) {
                        this.config.enable_strm_detail_log = true;
                    }
                    if (this.config.strm_exclude_filename === undefined) {
                        this.config.strm_exclude_filename = true;
                    }
                    if (this.config.batch_wait_time === undefined) {
                        this.config.batch_wait_time = 5;
                    }
                    if (this.config.reshare_verify_method === undefined) {
                        this.config.reshare_verify_method = 0;
                    }
                    if (this.config.reshare_first_parse_mode === undefined) {
                        this.config.reshare_first_parse_mode = 0;
                    }
                    if (this.config.reshare_new_link_parse_mode === undefined) {
                        this.config.reshare_new_link_parse_mode = 1;
                    }
                    if (this.config.reshare_custom_password_enabled === undefined) {
                        this.config.reshare_custom_password_enabled = false;
                    }
                    if (this.config.reshare_custom_password === undefined) {
                        this.config.reshare_custom_password = '';
                    }
                    if (this.config.reshare_generate_strm === undefined) {
                        this.config.reshare_generate_strm = true;
                    }
                    if (this.config.reshare_115_open_config === undefined) {
                        this.config.reshare_115_open_config = '';
                    }
                }
                this.configs115 = configs115Res || [];
            } catch (error) {
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveConfig() {
            if (this.config.enabled && !this.config.use_115_config) {
                window.showMessage('启用时请选择 115 配置', 'error');
                return;
            }
            if (this.config.reshare_custom_password_enabled && (!this.config.reshare_custom_password || this.config.reshare_custom_password.length !== 4)) {
                window.showMessage('自定义分享密码必须为4位', 'error');
                return;
            }
            if (this.config.enable_reshare_mode && this.config.reshare_verify_method === 1 && !this.config.reshare_115_open_config) {
                window.showMessage('转存再分享使用 115open 扫描时请选择 Open 配置', 'error');
                return;
            }
            this.saving = true;
            try {
                await api.updateShareStrmConfig(this.config);
                window.showMessage('配置保存成功', 'success');
            } catch (error) {
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        onNormalShareToggle(val) {
            if (val) {
                this.config.enable_reshare_mode = false;
            }
        },
        onReshareToggle(val) {
            if (val) {
                this.config.enable_normal_share_mode = false;
            }
        },
        onVerifyMethodChange() {
            // 切换校验方法时不做特殊处理
        },
        
        // 打开文件夹浏览器（新增模式）
        async openFolderBrowserForAdd() {
            this.editingFolderIndex = -1;
            this.newFolderName = '';
            this.folderDialog = true;
            this.currentPath = '';
            this.parentPath = '';
            await this.loadFolders('');
        },
        
        // 打开文件夹浏览器（编辑模式）
        async openFolderBrowserForEdit(index) {
            this.editingFolderIndex = index;
            this.newFolderName = this.config.strm_folders[index].name;
            this.folderDialog = true;
            // 尝试导航到已选择的路径
            const targetPath = this.config.strm_folders[index].path;
            this.currentPath = targetPath;
            this.parentPath = '';
            await this.loadFolders(targetPath);
        },
        
        async openFolderBrowser() {
            this.folderDialog = true;
            this.currentPath = '';
            this.parentPath = '';
            await this.loadFolders('');
        },
        
        async loadFolders(path) {
            this.folderLoading = true;
            try {
                const endpoint = path ? `/local/folders?path=${encodeURIComponent(path)}` : '/local/folders';
                const res = await api.request(endpoint);
                if (res.success) {
                    this.folders = res.data.folders || [];
                    this.currentPath = res.data.current_path || '';
                    this.parentPath = res.data.parent_path;
                } else {
                    window.showMessage(res.message || '加载目录失败', 'error');
                    this.folders = [];
                }
            } catch (error) {
                window.showMessage('加载目录失败', 'error');
                this.folders = [];
            } finally {
                this.folderLoading = false;
            }
        },
        
        async enterFolder(folder) {
            if (folder.no_access) {
                window.showMessage('没有访问权限', 'warning');
                return;
            }
            await this.loadFolders(folder.path);
        },
        
        async goBack() {
            if (this.parentPath !== undefined) {
                await this.loadFolders(this.parentPath);
            }
        },
        
        async selectCurrentFolder() {
            if (!this.currentPath) {
                window.showMessage('请先进入一个目录', 'warning');
                return;
            }
            
            // 获取当前目录名作为默认别名
            const pathParts = this.currentPath.split(/[\/\\]/);
            const currentName = pathParts[pathParts.length - 1] || this.currentPath;
            const folderName = this.newFolderName.trim() || currentName;
            
            const folderData = {
                name: folderName,
                path: this.currentPath
            };
            
            if (this.editingFolderIndex >= 0) {
                // 编辑模式
                this.config.strm_folders[this.editingFolderIndex] = folderData;
            } else {
                // 新增模式
                // 检查是否已存在相同路径
                const exists = this.config.strm_folders.some(f => f.path === this.currentPath);
                if (exists) {
                    window.showMessage('该文件夹已添加', 'warning');
                    this.folderDialog = false;
                    return;
                }
                this.config.strm_folders.push(folderData);
            }
            
            // 同时更新 local_strm_path（兼容旧逻辑，使用第一个文件夹）
            if (this.config.strm_folders.length > 0) {
                this.config.local_strm_path = this.config.strm_folders[0].path;
            }
            
            // 立即保存到配置
            try {
                await api.updateShareStrmConfig(this.config);
                window.showMessage(`已${this.editingFolderIndex >= 0 ? '更新' : '添加'}: ${folderName}`, 'success');
            } catch (error) {
                window.showMessage('保存失败', 'error');
            }
            this.folderDialog = false;
        },
        
        // 删除 STRM 文件夹
        async removeStrmFolder(index) {
            this.config.strm_folders.splice(index, 1);
            // 更新 local_strm_path
            if (this.config.strm_folders.length > 0) {
                this.config.local_strm_path = this.config.strm_folders[0].path;
            } else {
                this.config.local_strm_path = '';
            }
            // 立即保存
            try {
                await api.updateShareStrmConfig(this.config);
                window.showMessage('已删除', 'success');
            } catch (error) {
                window.showMessage('删除失败', 'error');
            }
        },
        
        getDisplayPath() {
            return this.currentPath || '选择盘符';
        },
        
        // 打开导出分享对话框
        openExportDialog() {
            if (!this.config.export_shares_enabled) {
                window.showMessage('导出分享功能未启用', 'warning');
                return;
            }
            if (this.configs115.length === 0) {
                window.showMessage('未配置 115 账号', 'error');
                return;
            }
            // 默认选择当前使用的配置
            this.selectedExportConfig = this.config.use_115_config || (this.configs115.length > 0 ? this.configs115[0].name : '');
            this.exportDialog = true;
        },
        
        // 执行导出分享
        async exportShares() {
            if (!this.selectedExportConfig) {
                window.showMessage('请选择 115 配置', 'warning');
                return;
            }
            
            this.exportLoading = true;
            try {
                const result = await api.request('/export_shares', {
                    method: 'POST',
                    body: JSON.stringify({
                        config_name: this.selectedExportConfig,
                        include_raw: this.config.export_send_raw_json
                    })
                });
                
                if (result.success) {
                    // 下载解析后的 JSON
                    if (result.data.parsed_json) {
                        this.downloadFile(result.data.parsed_json, 'user_share.json');
                    }
                    
                    // 下载未解析的 JSON
                    if (result.data.raw_json && this.config.export_send_raw_json) {
                        setTimeout(() => {
                            this.downloadFile(result.data.raw_json, '未解析.json');
                        }, 100);
                    }
                    
                    window.showMessage(`导出成功，共 ${result.data.count} 条分享`, 'success');
                    this.exportDialog = false;
                } else {
                    window.showMessage(result.message || '导出失败', 'error');
                }
            } catch (error) {
                console.error('导出分享失败:', error);
                window.showMessage('导出失败', 'error');
            } finally {
                this.exportLoading = false;
            }
        },
        
        // 下载文件
        downloadFile(content, filename) {
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        
        // ===== 日志相关方法 =====
        startLogRefresh() {
            this.stopLogRefresh();
            this.logRefreshInterval = setInterval(() => {
                if (!this.logLoading && !this.logDetailDialog && !this.logDeleteDialog && !this.logRetryFolderDialog && !this.logDetailDeleteDialog) {
                    this.silentLogRefresh();
                }
            }, 3000);
        },
        stopLogRefresh() {
            if (this.logRefreshInterval) {
                clearInterval(this.logRefreshInterval);
                this.logRefreshInterval = null;
            }
        },
        async loadLogTasks() {
            this.logLoading = true;
            try {
                const params = new URLSearchParams({ page: this.logPage, page_size: this.logPageSize });
                if (this.logFilterStatus) params.append('status', this.logFilterStatus);
                if (this.logFilterMode) params.append('mode', this.logFilterMode);
                if (this.logFilterKeyword) params.append('keyword', this.logFilterKeyword);
                const res = await api.request(`/share_strm_logs?${params.toString()}`);
                if (res.success) {
                    this.logTasks = res.data.tasks || [];
                    this.logTotal = res.data.total || 0;
                    this.logTotalPages = res.data.total_pages || 0;
                }
            } catch (error) {
                window.showMessage('加载日志失败', 'error');
            } finally {
                this.logLoading = false;
            }
        },
        async silentLogRefresh() {
            try {
                const params = new URLSearchParams({ page: this.logPage, page_size: this.logPageSize });
                if (this.logFilterStatus) params.append('status', this.logFilterStatus);
                if (this.logFilterMode) params.append('mode', this.logFilterMode);
                if (this.logFilterKeyword) params.append('keyword', this.logFilterKeyword);
                const res = await api.request(`/share_strm_logs?${params.toString()}`);
                if (res.success) {
                    this.logTasks = res.data.tasks || [];
                    this.logTotal = res.data.total || 0;
                    this.logTotalPages = res.data.total_pages || 0;
                }
            } catch (error) { /* silent */ }
        },
        logGoPage(p) {
            if (p < 1 || p > this.logTotalPages) return;
            this.logPage = p;
            this.loadLogTasks();
        },
        logToggleSelectAll() {
            if (this.isLogPageAllSelected) {
                this.logTasks.forEach(t => {
                    const idx = this.logSelectedIds.indexOf(t.task_id);
                    if (idx > -1) this.logSelectedIds.splice(idx, 1);
                });
            } else {
                this.logTasks.forEach(t => {
                    if (!this.logSelectedIds.includes(t.task_id)) this.logSelectedIds.push(t.task_id);
                });
            }
        },
        logToggleSelect(taskId) {
            const idx = this.logSelectedIds.indexOf(taskId);
            if (idx > -1) this.logSelectedIds.splice(idx, 1);
            else this.logSelectedIds.push(taskId);
        },
        logIsSelected(taskId) {
            return this.logSelectedIds.includes(taskId);
        },
        async logViewDetail(taskId) {
            this.logDetailDialog = true;
            this.logDetailLoading = true;
            this.logDetailData = null;
            try {
                const res = await api.request(`/share_strm_logs/${taskId}`);
                if (res.success) { this.logDetailData = res.data; }
                else { window.showMessage(res.message || '加载失败', 'error'); this.logDetailDialog = false; }
            } catch (error) { window.showMessage('加载详情失败', 'error'); this.logDetailDialog = false; }
            finally { this.logDetailLoading = false; }
        },
        logConfirmDelete(type) {
            this.logDeleteType = type;
            this.logDeleteDialog = true;
        },
        async logExecuteDelete() {
            this.logDeleting = true;
            try {
                let res;
                if (this.logDeleteType === 'all') {
                    res = await api.request('/share_strm_logs/all', { method: 'DELETE' });
                } else {
                    res = await api.request('/share_strm_logs', { method: 'DELETE', body: JSON.stringify({ task_ids: this.logSelectedIds }) });
                }
                if (res.success) {
                    window.showMessage(res.message || '删除成功', 'success');
                    this.logSelectedIds = [];
                    this.logDeleteDialog = false;
                    await this.loadLogTasks();
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (error) { window.showMessage('删除失败', 'error'); }
            finally { this.logDeleting = false; }
        },
        logGetStatusColor(status) {
            switch (status) {
                case 'success': return 'success';
                case 'failed': return 'error';
                case 'running': return 'info';
                default: return 'grey';
            }
        },
        logGetStatusText(status) {
            switch (status) {
                case 'success': return '成功';
                case 'failed': return '失败';
                case 'running': return '运行中';
                case 'pending': return '等待中';
                default: return status;
            }
        },
        logTruncateUrl(url, maxLen = 50) {
            if (!url || url.length <= maxLen) return url;
            return url.slice(0, maxLen) + '...';
        },
        logFormatTime(timeStr) {
            if (!timeStr) return '-';
            return timeStr.replace('T', ' ').slice(0, 19);
        },
        logGetModeText(task) {
            const isSub = task.source === 'subscribe';
            if (isSub) {
                return task.is_reshare ? '订阅 转存再分享' : '订阅 普通分享';
            }
            return task.is_reshare ? '转存再分享' : '普通分享';
        },
        logGetModeColor(task) {
            const isSub = task.source === 'subscribe';
            if (isSub) return task.is_reshare ? 'deep-purple' : 'teal';
            return task.is_reshare ? 'purple' : 'blue';
        },
        logGetModeIcon(task) {
            const isSub = task.source === 'subscribe';
            if (isSub) return task.is_reshare ? 'mdi-sync' : 'mdi-rss';
            return task.is_reshare ? 'mdi-sync' : 'mdi-share-variant-outline';
        },
        // ===== 重试相关方法 =====
        logStartRetry(taskIds) {
            // 设置要重试的目标 ID 列表
            this.logRetryTargetIds = Array.isArray(taskIds) ? taskIds : [taskIds];
            this.logRetryFolderIndex = 0;
            // 检查是否有多个 STRM 目录，有则弹窗让用户选择
            if (this.config.strm_folders && this.config.strm_folders.length > 1) {
                this.logRetryFolderDialog = true;
            } else {
                // 只有 0 或 1 个目录，直接重试
                this.logExecuteRetry();
            }
        },
        logRetryFromBatch() {
            // 从批量选择中筛选出失败的任务 ID
            const failedIds = this.logSelectedIds.filter(id => {
                const t = this.logTasks.find(task => task.task_id === id);
                return t && t.status === 'failed';
            });
            if (failedIds.length === 0) {
                window.showMessage('选中的任务中没有失败的任务', 'warning');
                return;
            }
            this.logStartRetry(failedIds);
        },
        logRetryFromDetail() {
            if (!this.logDetailData) return;
            this.logStartRetry([this.logDetailData.task_id]);
        },
        async logExecuteRetry() {
            this.logRetryFolderDialog = false;
            // 判断是从详情页发起还是列表发起
            const isFromDetail = this.logDetailDialog && this.logRetryTargetIds.length === 1 
                && this.logDetailData && this.logRetryTargetIds[0] === this.logDetailData.task_id;
            if (isFromDetail) {
                this.logRetryingDetail = true;
            } else {
                this.logRetrying = true;
            }
            try {
                const res = await api.request('/share_strm_logs/retry', {
                    method: 'POST',
                    body: JSON.stringify({
                        task_ids: this.logRetryTargetIds,
                        path_index: this.logRetryFolderIndex
                    })
                });
                if (res.success) {
                    window.showMessage(res.message || '已提交重试', 'success');
                    if (isFromDetail) this.logDetailDialog = false;
                    this.logSelectedIds = [];
                    await this.loadLogTasks();
                } else {
                    window.showMessage(res.message || '重试失败', 'error');
                }
            } catch (error) {
                window.showMessage('重试请求失败', 'error');
            } finally {
                this.logRetrying = false;
                this.logRetryingDetail = false;
                this.logRetryTargetIds = [];
            }
        },
        // ===== 详情页删除 =====
        logConfirmDetailDelete() {
            this.logDetailDeleteDialog = true;
        },
        async logExecuteDetailDelete() {
            if (!this.logDetailData) return;
            this.logDetailDeleting = true;
            try {
                const res = await api.request(`/share_strm_logs/${this.logDetailData.task_id}`, { method: 'DELETE' });
                if (res.success) {
                    window.showMessage('已删除', 'success');
                    this.logDetailDeleteDialog = false;
                    this.logDetailDialog = false;
                    // 从选中列表中移除
                    const idx = this.logSelectedIds.indexOf(this.logDetailData.task_id);
                    if (idx > -1) this.logSelectedIds.splice(idx, 1);
                    await this.loadLogTasks();
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (error) {
                window.showMessage('删除失败', 'error');
            } finally {
                this.logDetailDeleting = false;
            }
        },
        async saveShareApiConfig() {
            this.shareApiSaving = true;
            try {
                await api.updateShareApiConfig(this.shareApiConfig);
                window.showMessage('115 分享 API 配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.shareApiSaving = false;
            }
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '28px', fontWeight: '450', margin: '0' }">
                            115 分享 STRM
                        </h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <v-btn color="primary" @click="saveConfig(); saveShareApiConfig()" size="small" style="border-radius: 8px;" :loading="saving || shareApiSaving">
                        <v-icon left size="18">mdi-content-save</v-icon>
                        保存设置
                    </v-btn>
                </div>
            </div>

            <!-- 顶部导航栏 -->
            <v-card style="border-radius: 12px; margin-bottom: 16px; background: rgba(var(--v-theme-on-surface),0.04); border: 1px solid rgba(var(--v-theme-on-surface),0.1);" elevation="0">
                <v-tabs v-model="activeTab" color="primary" bg-color="transparent" density="comfortable" grow>
                    <v-tab value="basic" class="share-strm-tab">
                        <v-icon size="16" style="margin-right: 4px;">mdi-cog-outline</v-icon>
                        基础设置
                    </v-tab>
                    <v-tab value="normal" class="share-strm-tab">
                        <v-icon size="16" style="margin-right: 4px;">mdi-share-variant-outline</v-icon>
                        普通分享
                    </v-tab>
                    <v-tab value="reshare" class="share-strm-tab">
                        <v-icon size="16" style="margin-right: 4px;">mdi-sync</v-icon>
                        转存再分享
                    </v-tab>
                    <v-tab value="logs" class="share-strm-tab">
                        <v-icon size="16" style="margin-right: 4px;">mdi-clipboard-text-clock-outline</v-icon>
                        日志
                    </v-tab>
                </v-tabs>
            </v-card>
            
            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else>
                <!-- ===== 基础设置 ===== -->
                <div v-show="activeTab === 'basic'">
                    <div class="glass-card" style="padding: 24px; border-radius: 16px;" >
                        <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                            <v-icon color="primary">mdi-file-video</v-icon>
                            STRM 生成配置
                        </h3>
                
                <v-row>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.enabled" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用分享 STRM 功能</span>
                        </div>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 48px;">
                            启用后，通过 Telegram Bot 发送 115 分享链接即可自动生成 STRM 文件
                        </div>
                    </v-col>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.enable_strm_detail_log" color="primary" hide-details density="compact" style="flex: none;" :disabled="!config.enabled"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">输出生成 STRM/元数据 详细日志</span>
                        </div>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 48px;">
                            关闭后只输出汇总信息（成功/失败数量、耗时），不输出每个文件的生成日志
                        </div>
                    </v-col>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.strm_exclude_filename" color="primary" hide-details density="compact" style="flex: none;" :disabled="!config.enabled"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">STRM 不包含文件名</span>
                        </div>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 48px;">
                            开启后生成的分享 STRM 链接末尾不追加文件名参数，关闭则追加 &amp;filename
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select v-model="config.use_115_config" label="使用 115 配置" :items="configs115.filter(c => !c.open_token || !c.open_token.access_token)" item-value="name" variant="outlined" density="comfortable" placeholder="选择用于解析分享链接的 115 配置" hide-details :disabled="!config.enabled">
                            <template v-slot:item="{ item, props }">
                                <v-list-item v-bind="props" :title="undefined">
                                    <span>{{ item.raw.name }}</span>
                                </v-list-item>
                            </template>
                            <template v-slot:selection="{ item }">
                                <span>{{ item.raw.name }}</span>
                            </template>
                        </v-select>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            用于解析分享链接内的文件
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.share_path" label="分享路径" placeholder="/" variant="outlined" density="comfortable" hide-details :disabled="!config.enabled"></v-text-field>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            分享链接内的路径，不懂勿动使用默认/即可
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model.number="config.min_file_size" label="最小文件大小 (字节)" type="number" placeholder="0 表示所有文件都生成" variant="outlined" density="comfortable" hide-details :disabled="!config.enabled"></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.request_url" label="STRM 请求头" placeholder="http://172.17.0.1:8115" variant="outlined" density="comfortable" hide-details :disabled="!config.enabled"></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.video_extensions" label="视频后缀" placeholder="mp4,mkv,ts,iso..." variant="outlined" density="comfortable" hide-details :disabled="!config.enabled"></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.metadata_extensions" label="元数据后缀" placeholder="srt,ass,ssa" variant="outlined" density="comfortable" hide-details :disabled="!config.enabled"></v-text-field>
                    </v-col>
                    <!-- STRM 生成目录配置 -->
                    <v-col cols="12">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <span style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;">
                                <v-icon size="18" color="primary">mdi-folder-multiple</v-icon>
                                STRM 生成目录 ({{ config.strm_folders.length }})
                            </span>
                            <v-btn color="success" variant="tonal" size="small" @click="openFolderBrowserForAdd" :disabled="!config.enabled" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-plus</v-icon>添加目录
                            </v-btn>
                        </div>
                        
                        <!-- 文件夹列表 -->
                        <div v-if="config.strm_folders.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
                            <div v-for="(folder, index) in config.strm_folders" :key="index" 
                                style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(var(--v-theme-on-surface),0.05); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                                    <v-icon color="primary" size="20">mdi-folder</v-icon>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px;">{{ folder.name }}</div>
                                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ folder.path }}</div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                                    <v-btn icon variant="text" size="small" color="info" @click="openFolderBrowserForEdit(index)" :disabled="!config.enabled">
                                        <v-icon size="18">mdi-pencil</v-icon>
                                    </v-btn>
                                    <v-btn icon variant="text" size="small" color="error" @click="removeStrmFolder(index)" :disabled="!config.enabled">
                                        <v-icon size="18">mdi-delete</v-icon>
                                    </v-btn>
                                </div>
                            </div>
                        </div>
                        <div v-else style="padding: 24px; text-align: center; color: rgba(var(--v-theme-on-surface),0.4); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 10px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1);">
                            <v-icon size="32" color="grey">mdi-folder-plus-outline</v-icon>
                            <p style="margin-top: 8px; font-size: 13px;">暂无 STRM 生成目录，点击上方按钮添加</p>
                        </div>
                        
                        <div style="margin-top: 12px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                                <v-icon size="16" color="info">mdi-information</v-icon>
                                只有一个目录时直接生成；配置多个目录时 Telegram 会显示选择菜单。别名用于 TG 菜单显示，为空则使用路径
                            </div>
                        </div>
                    </v-col>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.auto_download_metadata" color="primary" hide-details density="compact" style="flex: none;" :disabled="!config.enabled"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">下载元数据</span>
                        </div>
                    </v-col>
                </v-row>
                    </div>

                <!-- 115 分享 API -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-top: 16px;">
                    <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                        <v-icon color="success">mdi-api</v-icon>
                        115 分享 API
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch
                                    v-model="shareApiConfig.enabled"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 115 分享直链 API</span>
                            </div>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="shareApiConfig.use_115_config"
                                label="使用 115 配置"
                                :items="configs115.filter(c => !c.open_token || !c.open_token.access_token)"
                                :item-title="item => item.name"
                                item-value="name"
                                variant="outlined"
                                density="comfortable"
                                placeholder="选择 115 配置"
                                hide-details
                                :disabled="!shareApiConfig.enabled"
                            ></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model.number="shareApiConfig.cache_ttl"
                                label="缓存时间（秒）"
                                type="number"
                                placeholder="10"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                :disabled="!shareApiConfig.enabled"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="info">mdi-information</v-icon>
                            请求格式: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">GET /api/?share_code=xxx&receive_code=xxx&id=xxx</code><br>
                            只要 URL 中包含 share_code、receive_code、id 三个参数即可，返回 302 重定向到直链<br>
                            可用于 Emby 扫库等，115 分享 STRM 生成的文件符合此格式<br>
                            缓存时间：相同请求在缓存时间内直接返回缓存结果，减少 API 调用
                        </div>
                    </div>
                </div>

                    <!-- 导出分享配置 -->
                    <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-top: 16px;">
                        <h3 style="color: white; margin-bottom: 16px;">
                            <v-icon color="success">mdi-export</v-icon>
                            导出分享配置
                        </h3>
                        
                        <v-row>
                            <v-col cols="12">
                                <div style="display: flex; align-items: center;">
                                    <v-switch v-model="config.export_shares_enabled" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                                    <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用导出分享功能</span>
                                </div>
                            </v-col>
                            <v-col cols="12">
                                <div style="display: flex; align-items: center;">
                                    <v-switch v-model="config.export_send_raw_json" color="primary" hide-details density="compact" style="flex: none;" :disabled="!config.export_shares_enabled"></v-switch>
                                    <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">同时导出未解析 JSON</span>
                                </div>
                                <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 48px;">
                                    未解析 JSON 包含所有 API 返回字段
                                </div>
                            </v-col>
                            <v-col cols="12">
                                <v-btn color="success" variant="elevated" @click="openExportDialog" :disabled="!config.export_shares_enabled" style="border-radius: 8px;">
                                    <v-icon left size="18">mdi-export</v-icon>
                                    手动导出分享
                                </v-btn>
                            </v-col>
                        </v-row>
                        
                        <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                                <v-icon size="16" color="info">mdi-information</v-icon>
                                获取用户所有分享链接并导出为 JSON 文件。user_share.json 包含解析后的字段（分享名字、分享链接、分享有效期、接收次数、分享时间、分享大小），未解析.json 包含所有原始字段。通过 Telegram Bot 执行时可选择 115 账号配置。
                            </div>
                        </div>
                        
                        <div style="margin-top: 12px; padding: 12px; background: rgba(255,152,0,0.1); border-radius: 8px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                                <v-icon size="16" color="warning">mdi-alert</v-icon>
                                注意：选择了账号或更改按钮配置后，需要点击最上面的「保存设置」按钮才会生效
                            </div>
                        </div>
                    </div>

                </div>

                <!-- ===== 普通分享 ===== -->
                <div v-show="activeTab === 'normal'">
                    <div class="glass-card" style="padding: 24px; border-radius: 16px;">
                        <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                            <v-icon color="primary">mdi-share-variant-outline</v-icon>
                            普通分享
                        </h3>
                        
                        <v-row>
                            <v-col cols="12">
                                <div style="display: flex; align-items: center;">
                                    <v-switch v-model="config.enable_normal_share_mode" color="primary" hide-details density="compact" style="flex: none;" :disabled="!config.enabled" @update:model-value="onNormalShareToggle"></v-switch>
                                    <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用普通分享模式</span>
                                </div>
                                <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 48px;">
                                    启用后通过 Telegram 发送分享链接将使用普通模式直接解析生成 STRM，与「转存再分享」互斥
                                </div>
                            </v-col>
                        </v-row>
                        
                        <v-row>
                            <v-col cols="12" md="6">
                                <v-select v-model="config.speed_mode" label="解析速度模式" :items="speedModes" item-title="title" item-value="value" variant="outlined" density="comfortable" hide-details :disabled="!config.enabled || !config.enable_normal_share_mode"></v-select>
                                <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                                    速度越快，API 调用频率越高，可能触发限流
                                </div>
                            </v-col>
                            <!-- 线程递归模式子配置 -->
                            <v-col cols="12" v-if="config.speed_mode === 2 && config.enable_normal_share_mode">
                                <v-card variant="outlined" style="background: rgba(61,111,213,0.1); border-color: rgba(61,111,213,0.3);">
                                    <v-card-text>
                                        <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px; margin-bottom: 12px;">线程递归模式配置</div>
                                        <v-row dense>
                                            <v-col cols="12" md="4">
                                                <v-text-field v-model.number="config.thread_recursive_threads" label="扫描线程数" type="number" min="1" max="10" variant="outlined" density="compact" hide-details></v-text-field>
                                            </v-col>
                                            <v-col cols="12" md="4">
                                                <v-text-field v-model.number="config.thread_recursive_min_delay" label="最小延迟(秒)" type="number" min="0.1" step="0.1" variant="outlined" density="compact" hide-details></v-text-field>
                                            </v-col>
                                            <v-col cols="12" md="4">
                                                <v-text-field v-model.number="config.thread_recursive_max_delay" label="最大延迟(秒)" type="number" min="0.1" step="0.1" variant="outlined" density="compact" hide-details></v-text-field>
                                            </v-col>
                                        </v-row>
                                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 11px; margin-top: 8px;">
                                            逐文件夹扫描，每个请求间有随机延迟，不易触发风控
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                        </v-row>
                    </div>
                </div>

                <!-- ===== 转存再分享 ===== -->
                <div v-show="activeTab === 'reshare'">
            <div class="glass-card" style="padding: 24px; border-radius: 16px;">
                <h3 style="color: white; margin-bottom: 16px;">
                    <v-icon color="warning">mdi-sync</v-icon>
                    转存再分享模式
                </h3>
                
                <v-row>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.enable_reshare_mode" color="primary" hide-details density="compact" style="flex: none;" :disabled="!config.enabled" @update:model-value="onReshareToggle"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用转存再分享再生成 STRM</span>
                        </div>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 48px;">
                            与「普通分享」互斥，启用后将使用转存再分享模式处理链接
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select v-model="config.reshare_first_parse_mode" label="首次解析模式" :items="reshareSpeedModes" item-title="title" item-value="value" variant="outlined" density="comfortable" hide-details :disabled="!config.enable_reshare_mode || !config.enabled"></v-select>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            用于解析原始分享链接，默认最快
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select v-model="config.reshare_new_link_parse_mode" label="新链接解析模式" :items="reshareSpeedModes" item-title="title" item-value="value" variant="outlined" density="comfortable" hide-details :disabled="!config.enable_reshare_mode || !config.enabled"></v-select>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            用于解析生成的新分享链接，默认大包模式
                        </div>
                    </v-col>
                    <!-- 线程递归模式子配置（转存再分享） -->
                    <v-col cols="12" v-if="(config.reshare_first_parse_mode === 2 || config.reshare_new_link_parse_mode === 2) && config.enable_reshare_mode">
                        <v-card variant="outlined" style="background: rgba(61,111,213,0.1); border-color: rgba(61,111,213,0.3);">
                            <v-card-text>
                                <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px; margin-bottom: 12px;">线程递归模式配置</div>
                                <v-row dense>
                                    <v-col cols="12" md="4">
                                        <v-text-field v-model.number="config.thread_recursive_threads" label="扫描线程数" type="number" min="1" max="10" variant="outlined" density="compact" hide-details></v-text-field>
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <v-text-field v-model.number="config.thread_recursive_min_delay" label="最小延迟(秒)" type="number" min="0.1" step="0.1" variant="outlined" density="compact" hide-details></v-text-field>
                                    </v-col>
                                    <v-col cols="12" md="4">
                                        <v-text-field v-model.number="config.thread_recursive_max_delay" label="最大延迟(秒)" type="number" min="0.1" step="0.1" variant="outlined" density="compact" hide-details></v-text-field>
                                    </v-col>
                                </v-row>
                                <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 11px; margin-top: 8px;">
                                    首次解析与新链接解析共用此配置(如果两个都选线程递归或其中一个时)
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model.number="config.batch_wait_time" label="TG 批处理等待时间（秒）" type="number" min="1" max="300" placeholder="5" variant="outlined" density="comfortable" hide-details :disabled="!config.enable_reshare_mode || !config.enabled"></v-text-field>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            TG 连续发送多个链接时，等待指定秒数后统一处理。默认 5 秒
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select v-model="config.reshare_verify_method" label="网盘文件校验方法" :items="verifyMethods" item-title="title" item-value="value" variant="outlined" density="comfortable" hide-details :disabled="!config.enable_reshare_mode || !config.enabled" @update:model-value="onVerifyMethodChange"></v-select>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            转存完成后校验网盘文件数量的方式
                        </div>
                    </v-col>
                    <v-col cols="12" md="6" v-if="config.reshare_verify_method === 1">
                        <v-select v-model="config.reshare_115_open_config" label="115 Open 校验配置" :items="openConfigs115" item-value="name" variant="outlined" density="comfortable" placeholder="选择用于校验的 Open 配置" hide-details :disabled="!config.enable_reshare_mode || !config.enabled">
                            <template v-slot:item="{ item, props }">
                                <v-list-item v-bind="props" :title="undefined">
                                    <span>{{ item.raw.name }}</span>
                                    <v-chip color="teal" size="x-small" variant="elevated" style="margin-left: 6px;">Open</v-chip>
                                </v-list-item>
                            </template>
                            <template v-slot:selection="{ item }">
                                <span>{{ item.raw.name }}</span>
                            </template>
                        </v-select>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            选择已绑定 Open Token 的 115 配置用于校验文件数量
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-switch v-model="config.reshare_custom_password_enabled" label="自定义分享密码" color="primary" hide-details density="comfortable" :disabled="!config.enable_reshare_mode || !config.enabled"></v-switch>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            关闭时使用随机生成的4位密码
                        </div>
                    </v-col>
                    <v-col v-if="config.reshare_custom_password_enabled" cols="12" md="6">
                        <v-text-field v-model="config.reshare_custom_password" label="分享密码" placeholder="输入4位密码" variant="outlined" density="comfortable" hide-details :disabled="!config.enable_reshare_mode || !config.enabled" :type="showCustomPassword ? 'text' : 'password'" :append-inner-icon="showCustomPassword ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showCustomPassword = !showCustomPassword" maxlength="4"></v-text-field>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            创建新分享链接时使用的固定密码，必须4位
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-switch v-model="config.reshare_generate_strm" label="新链接生成 STRM" color="primary" hide-details density="comfortable" :disabled="!config.enable_reshare_mode || !config.enabled"></v-switch>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            关闭后转存再分享完成后不会自动生成 STRM 文件
                        </div>
                    </v-col>
                </v-row>
                
                <div style="margin-top: 16px; padding: 12px; background: rgba(255,152,0,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="warning">mdi-alert</v-icon>
                        <strong>说明：</strong>开启转存再分享模式后，普通分享中的「解析速度模式」将不生效，转存再分享会使用当前独立配置的两个解析模式
                    </div>
                </div>
                
                <div style="margin-top: 12px; padding: 12px; background: rgba(255,76,81,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="error">mdi-alert-circle</v-icon>
                        <strong>大包不推荐用此模式：</strong>如果要处理大包可把两个模式都切换为大包模式，但不建议，大包推荐关闭转存再分享模式使用最上方的大包模式直接生成strm
                    </div>
                </div>
                
                <div style="margin-top: 12px; padding: 12px; background: rgba(33,150,243,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        <strong>提示：</strong>如果快速模式或大包模式遇到 405 错误，可尝试使用线程递归模式；若还有问题可自行调低线程数或增大随机延迟时间
                    </div>
                </div>
                
                <div style="margin-top: 12px; padding: 12px; background: rgba(33,150,243,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        <strong>网盘校验说明：</strong>如果第三步转存完成校验网盘数量 Cookie 模式出现 405，可改用 115open 扫描模式（需配置 Open Token）
                    </div>
                </div>
                </div>
            </div>

                <!-- ===== 日志 ===== -->
                <div v-show="activeTab === 'logs'">
                    <!-- 筛选与操作区 -->
                    <div class="glass-card" style="padding: 16px 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <v-select v-model="logFilterStatus" :items="logStatusOptions" item-title="title" item-value="value" label="状态" density="compact" variant="outlined" hide-details style="max-width: 140px; min-width: 120px;"></v-select>
                            <v-select v-model="logFilterMode" :items="logModeOptions" item-title="title" item-value="value" label="模式" density="compact" variant="outlined" hide-details style="max-width: 170px; min-width: 140px;"></v-select>
                            <v-text-field v-model="logFilterKeyword" label="搜索链接" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 220px; min-width: 180px;"></v-text-field>
                            <v-spacer></v-spacer>
                            <template v-if="logMultiSelectMode">
                                <v-btn v-if="logTasks.length > 0" :color="isLogPageAllSelected ? 'primary' : 'default'" :variant="isLogPageAllSelected ? 'tonal' : 'outlined'" size="small" @click="logToggleSelectAll" style="border-radius: 8px;">
                                    <v-icon left size="18">{{ isLogPageAllSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>全选本页
                                </v-btn>
                                <v-btn v-if="logSelectedIds.length > 0" color="success" variant="tonal" size="small" @click="logRetryFromBatch" :loading="logRetrying" style="border-radius: 8px;">
                                    <v-icon left size="18">mdi-refresh</v-icon>重试失败 ({{ logSelectedIds.filter(id => { const t = logTasks.find(task => task.task_id === id); return t && t.status === 'failed'; }).length }})
                                </v-btn>
                                <v-btn v-if="logSelectedIds.length > 0" color="error" variant="tonal" size="small" @click="logConfirmDelete('selected')" style="border-radius: 8px;">
                                    <v-icon left size="18">mdi-delete</v-icon>删除选中 ({{ logSelectedIds.length }})
                                </v-btn>
                            </template>
                            <v-btn color="error" variant="outlined" size="small" @click="logConfirmDelete('all')" style="border-radius: 8px;">
                                <v-icon left size="18">mdi-delete-sweep</v-icon>清空全部
                            </v-btn>
                            <v-btn icon variant="text" size="small" :color="logMultiSelectMode ? 'primary' : undefined" @click="logMultiSelectMode = !logMultiSelectMode; if(!logMultiSelectMode) logSelectedIds = []" title="多选模式">
                                <v-icon size="20">mdi-checkbox-multiple-outline</v-icon>
                            </v-btn>
                            <v-btn icon variant="text" size="small" @click="loadLogTasks" :loading="logLoading">
                                <v-icon size="20">mdi-refresh</v-icon>
                            </v-btn>
                        </div>
                    </div>
                    <!-- 日志列表 -->
                    <div class="glass-card" style="padding: 16px 20px; border-radius: 16px;">
                        <div v-if="logLoading && logTasks.length === 0" style="display: flex; justify-content: center; padding: 50px;">
                            <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
                        </div>
                        <div v-else-if="logTasks.length === 0" style="text-align: center; padding: 60px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                            <v-icon size="56" color="grey-darken-1">mdi-clipboard-text-outline</v-icon>
                            <p style="margin-top: 16px; font-size: 15px;">暂无任务日志</p>
                        </div>
                        <div v-else class="strm-log-grid">
                            <div v-for="task in logTasks" :key="task.task_id" class="strm-log-card" :class="{'strm-log-card-selected': logMultiSelectMode && logIsSelected(task.task_id)}" @click="logMultiSelectMode ? logToggleSelect(task.task_id) : logViewDetail(task.task_id)">
                                <div class="strm-log-card-body">
                                    <div class="strm-log-card-url">{{ logTruncateUrl(task.share_url, 55) }}</div>
                                    <div v-if="task.is_reshare && task.new_share_url" class="strm-log-card-url" style="color: rgba(138,43,226,0.85); font-size: 11px;">新：{{ logTruncateUrl(task.new_share_url, 50) }}</div>
                                    <div class="strm-log-card-chips">
                                        <v-chip size="x-small" :color="logGetStatusColor(task.status)" variant="flat">{{ logGetStatusText(task.status) }}</v-chip>
                                        <v-chip size="x-small" :color="logGetModeColor(task)" variant="tonal">{{ logGetModeText(task) }}</v-chip>
                                        <span class="strm-log-card-stats">STRM: {{ task.strm_success }}/{{ task.strm_success + task.strm_fail }}</span>
                                    </div>
                                    <div class="strm-log-card-time">{{ logFormatTime(task.created_at) }}</div>
                                    <div v-if="task.error_message" class="strm-log-card-error">{{ task.error_message }}</div>
                                </div>
                                <div class="strm-log-card-actions" @click.stop>
                                    <v-btn v-if="task.status === 'failed'" icon variant="text" size="x-small" color="success" @click="logStartRetry(task.task_id)" title="重试"><v-icon size="16">mdi-refresh</v-icon></v-btn>
                                    <v-btn icon variant="text" size="x-small" color="info" @click="logViewDetail(task.task_id)" title="查看详情"><v-icon size="16">mdi-eye</v-icon></v-btn>
                                </div>
                            </div>
                        </div>
                        <div v-if="logTotalPages > 1" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
                            <v-btn variant="text" size="small" :disabled="logPage <= 1" @click="logGoPage(1)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-double-left</v-icon></v-btn>
                            <v-btn variant="text" size="small" :disabled="logPage <= 1" @click="logGoPage(logPage - 1)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-left</v-icon></v-btn>
                            <span style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6); padding: 0 12px;">{{ logPage }} / {{ logTotalPages }} 页 (共 {{ logTotal }} 条)</span>
                            <v-btn variant="text" size="small" :disabled="logPage >= logTotalPages" @click="logGoPage(logPage + 1)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-right</v-icon></v-btn>
                            <v-btn variant="text" size="small" :disabled="logPage >= logTotalPages" @click="logGoPage(logTotalPages)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-double-right</v-icon></v-btn>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 日志详情弹窗 -->
            <v-dialog v-model="logDetailDialog" max-width="700" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;"><v-icon color="primary">mdi-text-box-search</v-icon><span>任务详情</span></div>
                            <v-btn icon variant="text" size="small" @click="logDetailDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="max-height: 500px; padding: 16px;">
                        <div v-if="logDetailLoading" style="display: flex; justify-content: center; padding: 50px;"><v-progress-circular indeterminate color="primary"></v-progress-circular></div>
                        <div v-else-if="logDetailData">
                            <div style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                    <v-chip size="small" :color="logGetStatusColor(logDetailData.status)" variant="flat">{{ logGetStatusText(logDetailData.status) }}</v-chip>
                                    <v-chip size="small" :color="logGetModeColor(logDetailData)" variant="tonal"><v-icon start size="14">{{ logGetModeIcon(logDetailData) }}</v-icon>{{ logGetModeText(logDetailData) }}</v-chip>
                                </div>
                                <div style="font-size: 13px; margin-bottom: 6px;"><span style="color: rgba(var(--v-theme-on-surface),0.5);">分享链接：</span><span style="word-break: break-all;">{{ logDetailData.share_url }}</span></div>
                                <div v-if="logDetailData.is_reshare && logDetailData.new_share_url" style="font-size: 13px; margin-bottom: 6px;"><span style="color: rgba(138,43,226,0.8);">新链接：</span><span style="word-break: break-all; color: rgba(138,43,226,0.9);">{{ logDetailData.new_share_url }}</span></div>
                                <div style="font-size: 13px; margin-bottom: 6px;"><span style="color: rgba(var(--v-theme-on-surface),0.5);">生成目录：</span><span>{{ logDetailData.local_path || '-' }}</span></div>
                                <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; margin-top: 10px;">
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">STRM：</span><span style="color: #56CA00;">{{ logDetailData.strm_success }}</span> / <span style="color: #FF4C51;">{{ logDetailData.strm_fail }}</span></span>
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">元数据：</span><span style="color: #56CA00;">{{ logDetailData.metadata_success }}</span> / <span style="color: #FF4C51;">{{ logDetailData.metadata_fail }}</span></span>
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">耗时：</span>{{ logDetailData.elapsed_time?.toFixed(1) || 0 }}s</span>
                                </div>
                                <div v-if="logDetailData.error_message" style="margin-top: 10px; padding: 10px; background: rgba(255,76,81,0.1); border-radius: 8px; font-size: 13px; color: #FF4C51;"><v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>{{ logDetailData.error_message }}</div>
                            </div>
                            <div style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;"><v-icon size="18" color="info">mdi-text-long</v-icon><span style="font-size: 14px; font-weight: 500;">执行日志</span><v-chip size="x-small" color="info" variant="tonal">{{ logDetailData.detail_log?.length || 0 }}</v-chip></div>
                                <div v-if="!logDetailData.detail_log || logDetailData.detail_log.length === 0" style="text-align: center; padding: 30px; color: rgba(var(--v-theme-on-surface),0.4);">暂无详细日志</div>
                                <div v-else style="max-height: 250px; overflow-y: auto; font-size: 12px; font-family: monospace;">
                                    <div v-for="(log, idx) in logDetailData.detail_log" :key="idx" style="padding: 4px 0; border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.05);">
                                        <span style="color: rgba(var(--v-theme-on-surface),0.4); margin-right: 8px;">{{ log.time }}</span>
                                        <span :style="{ color: log.message.includes('失败') || log.message.includes('错误') ? '#FF4C51' : log.message.includes('成功') ? '#56CA00' : 'rgba(var(--v-theme-on-surface),0.8)' }">{{ log.message }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                    <v-card-actions v-if="logDetailData && !logDetailLoading" style="padding: 12px 16px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <v-btn v-if="logDetailData.status === 'failed'" color="success" variant="tonal" @click="logRetryFromDetail" :loading="logRetryingDetail" style="border-radius: 8px;" size="small">
                            <v-icon left size="18">mdi-refresh</v-icon>重试
                        </v-btn>
                        <v-btn color="error" variant="tonal" @click="logConfirmDetailDelete" style="border-radius: 8px;" size="small">
                            <v-icon left size="18">mdi-delete</v-icon>删除
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="logDetailDialog = false" style="border-radius: 8px;" size="small">关闭</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 重试目录选择弹窗 -->
            <v-dialog v-model="logRetryFolderDialog" max-width="450">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;"><v-icon color="primary">mdi-folder-multiple</v-icon>选择 STRM 生成目录</v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6); margin-bottom: 16px;">检测到多个 STRM 目录，请选择重试任务的生成目录：</p>
                        <v-radio-group v-model="logRetryFolderIndex" hide-details>
                            <v-radio v-for="(folder, idx) in config.strm_folders" :key="idx" :value="idx" color="primary">
                                <template v-slot:label>
                                    <div>
                                        <div style="font-size: 14px;">{{ folder.name || '未命名' }}</div>
                                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">{{ folder.path }}</div>
                                    </div>
                                </template>
                            </v-radio>
                        </v-radio-group>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="logRetryFolderDialog = false; logRetryTargetIds = []" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="success" variant="elevated" @click="logExecuteRetry" style="border-radius: 8px;"><v-icon left size="18">mdi-refresh</v-icon>确认重试</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 详情页删除确认 -->
            <v-dialog v-model="logDetailDeleteDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;"><v-icon color="error">mdi-alert</v-icon>确认删除</v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p>确定要删除这条任务日志吗？</p>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">此操作不可撤销。</p>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="logDetailDeleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="logExecuteDetailDelete" :loading="logDetailDeleting" style="border-radius: 8px;"><v-icon left size="18">mdi-delete</v-icon>确认删除</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 日志删除确认 -->
            <v-dialog v-model="logDeleteDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;"><v-icon color="error">mdi-alert</v-icon>确认删除</v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p v-if="logDeleteType === 'all'">确定要删除<strong>所有</strong>任务日志吗？</p>
                        <p v-else>确定要删除选中的 <strong>{{ logSelectedIds.length }}</strong> 条日志吗？</p>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">此操作不可撤销。</p>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="logDeleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="logExecuteDelete" :loading="logDeleting" style="border-radius: 8px;"><v-icon left size="18">mdi-delete</v-icon>确认删除</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 导出分享对话框 -->
            <v-dialog v-model="exportDialog" max-width="500">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="success">mdi-export</v-icon>
                                <span>导出 115 分享</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="exportDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <v-card-text style="padding: 20px;">
                        <v-select v-model="selectedExportConfig" label="选择 115 账号" :items="configs115" item-title="name" item-value="name" variant="outlined" density="comfortable" hide-details></v-select>
                        
                        <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                                <v-icon size="16" color="info">mdi-information</v-icon>
                                将导出该账号的所有分享链接
                            </div>
                        </div>
                    </v-card-text>
                    
                    <v-card-actions style="padding: 16px 20px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="exportDialog = false" :disabled="exportLoading">取消</v-btn>
                        <v-btn color="success" variant="elevated" @click="exportShares" :loading="exportLoading" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-download</v-icon>
                            开始导出
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 本地目录浏览弹窗 -->
            <v-dialog v-model="folderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>{{ editingFolderIndex >= 0 ? '编辑 STRM 目录' : '添加 STRM 目录' }}</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="folderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <!-- 别名输入 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-text-field v-model="newFolderName" label="目录别名 (TG 菜单显示名称)" placeholder="留空则使用目录名" variant="outlined" density="compact" hide-details></v-text-field>
                    </div>
                    
                    <!-- 当前路径 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-chip color="primary" size="small" variant="tonal" style="border-radius: 6px;">{{ getDisplayPath() }}</v-chip>
                    </div>
                    
                    <v-card-text style="height: 350px; padding: 0;">
                        <div v-if="folderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="folders.length > 0" style="padding: 8px;">
                            <div v-for="folder in folders" :key="folder.path" @click="enterFolder(folder)" :style="{ opacity: folder.no_access ? 0.5 : 1 }" class="folder-browse-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <v-icon :color="folder.is_drive ? 'info' : 'warning'" size="22">{{ folder.is_drive ? 'mdi-harddisk' : 'mdi-folder' }}</v-icon>
                                    <div>
                                        <div style="font-size: 14px;">{{ folder.name }}</div>
                                        <div v-if="folder.no_access" style="font-size: 11px; color: #f44336;">无访问权限</div>
                                    </div>
                                </div>
                                <v-icon size="18" color="grey">mdi-chevron-right</v-icon>
                            </div>
                        </div>
                        <div v-else style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: rgba(var(--v-theme-on-surface),0.4);">
                            <v-icon size="56" color="grey-darken-1">mdi-folder-open-outline</v-icon>
                            <p style="margin-top: 12px;">该目录下没有子目录</p>
                        </div>
                    </v-card-text>
                    
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBack" :disabled="parentPath === undefined || parentPath === ''" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCurrentFolder" :disabled="!currentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
