// ed2k STRM 工具箱页面组件
const Ed2kStrmPage = {
    name: 'Ed2kStrmPage',
    
    data() {
        return {
            activeTab: 'config',
            loading: false,
            saving: false,
            ed2kApiSaving: false,
            apiEd2kConfig: {
                enabled: false,
                cache_ttl: 10
            },
            configs115: [],
            config: {
                use_115_config: '',
                api_mode: 'open',
                offline_dir_cid: '0',
                offline_dir_name: '根目录',
                strm_output_dir: '',
                strm_folders: [],
                server_address: 'http://172.17.0.1:8115',
                strm_extensions: 'mp4,mkv,ts,iso,rmvb,avi,mov,mpeg,mpg,wmv,3gp,asf,m4v,flv,m2ts,tp,f4v',
                min_file_size_mb: 0
            },
            // 115 离线目录浏览
            offlineFolderDialog: false,
            offlineFolderLoading: false,
            offlineFolders: [],
            offlineCurrentCid: '0',
            offlineFolderPath: [{ name: '根目录', cid: '0' }],
            offlineCreateFolderMode: false,
            offlineCreateFolderName: '',
            offlineCreateFolderLoading: false,
            // STRM 本地目录浏览
            strmFolderDialog: false,
            strmFolderLoading: false,
            strmFolders: [],
            strmCurrentPath: '',
            strmParentPath: '',
            editingStrmFolderIndex: -1,
            newStrmFolderName: '',
            // API 模式选项
            apiModes: [
                { value: 'open', title: 'Open API' },
                { value: 'cookie', title: 'Cookie' }
            ],
            // ===== 日志相关 =====
            logTasks: [],
            logLoading: false,
            logPage: 1,
            logPageSize: 15,
            logTotal: 0,
            logTotalPages: 0,
            logFilterStatus: '',
            logFilterKeyword: '',
            logStatusOptions: [
                { value: '', title: '全部状态' },
                { value: 'success', title: '成功' },
                { value: 'partial', title: '部分成功' },
                { value: 'failed', title: '失败' }
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
            logDetailDeleting: false,
            logDetailDeleteDialog: false
        }
    },
    
    watch: {
        activeTab(val) {
            const base = 'toolbox/ed2k_strm';
            if (val === 'config') {
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
        },
        logFilterStatus() { this.logPage = 1; this.loadLogTasks(); },
        logFilterKeyword(val) {
            clearTimeout(this._logKwTimer);
            this._logKwTimer = setTimeout(() => { this.logPage = 1; this.loadLogTasks(); }, 300);
        },
        'config.use_115_config'(val) {
            if (val) {
                // 自动选择可用的 api_mode
                const cfg = this.configs115.find(c => c.name === val);
                if (cfg) {
                    if (cfg.open_token && cfg.open_token.access_token) {
                        this.config.api_mode = 'open';
                    } else if (cfg.cookie) {
                        this.config.api_mode = 'cookie';
                    }
                }
            }
        }
    },
    
    computed: {
        isLogPageAllSelected() {
            if (this.logTasks.length === 0) return false;
            return this.logTasks.every(t => this.logSelectedIds.includes(t.id));
        },
        availableApiModes() {
            const cfg = this.configs115.find(c => c.name === this.config.use_115_config);
            if (!cfg) return [];
            const modes = [];
            if (cfg.open_token && cfg.open_token.access_token) {
                modes.push({ value: 'open', title: 'Open API' });
            }
            if (cfg.cookie) {
                modes.push({ value: 'cookie', title: 'Cookie' });
            }
            return modes;
        }
    },

    async mounted() {
        // 从 URL 子路径恢复 tab 状态
        const hash = window.location.hash.replace(/^#\/?/, '');
        const parts = hash.split('/');
        const tabPart = parts[2]; // toolbox / ed2k_strm / [tab]
        if (tabPart === 'logs') {
            this.activeTab = 'logs';
        }
        await this.loadConfig();
        if (this.activeTab === 'logs') {
            this.loadLogTasks();
            this.startLogRefresh();
        }
    },

    beforeUnmount() {
        this.stopLogRefresh();
    },
    
    methods: {
        async loadConfig() {
            this.loading = true;
            try {
                const [ed2kConfig, configs115, apiEd2kConfig] = await Promise.all([
                    api.getEd2kStrmConfig(),
                    api.get115Configs(),
                    api.getApiEd2kConfig()
                ]);
                if (ed2kConfig && Object.keys(ed2kConfig).length) {
                    this.config = { ...this.config, ...ed2kConfig };
                    if (!this.config.strm_folders) {
                        this.config.strm_folders = [];
                    }
                }
                this.configs115 = configs115 || [];
                if (apiEd2kConfig && Object.keys(apiEd2kConfig).length) {
                    this.apiEd2kConfig = { ...this.apiEd2kConfig, ...apiEd2kConfig };
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveConfig() {
            if (!this.config.use_115_config) {
                window.showMessage('请先选择 115 配置', 'error');
                return;
            }
            this.saving = true;
            try {
                await api.updateEd2kStrmConfig(this.config);
                window.showMessage('配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        async saveApiEd2kConfig() {
            this.ed2kApiSaving = true;
            try {
                await api.updateApiEd2kConfig(this.apiEd2kConfig);
                window.showMessage('ed2k API 配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.ed2kApiSaving = false;
            }
        },
        
        // ========== 115 离线目录浏览 ==========
        async openOfflineFolderBrowser() {
            if (!this.config.use_115_config) {
                window.showMessage('请先选择并保存 115 配置', 'warning');
                return;
            }
            this.offlineFolderDialog = true;
            this.offlineCurrentCid = '0';
            this.offlineFolderPath = [{ name: '根目录', cid: '0' }];
            await this.loadOfflineFolders('0');
        },
        
        async loadOfflineFolders(cid) {
            this.offlineFolderLoading = true;
            try {
                const configName = this.config.use_115_config;
                const cfg = this.configs115.find(c => c.name === configName);
                let res;
                if (this.config.api_mode === 'open' && cfg && cfg.open_token && cfg.open_token.access_token) {
                    res = await api.request(`/115/open/folders?config_name=${encodeURIComponent(configName)}&cid=${cid}`);
                } else {
                    res = await api.request(`/115/folders?config_name=${encodeURIComponent(configName)}&cid=${cid}`);
                }
                if (res.success) {
                    this.offlineFolders = res.data.folders || [];
                    this.offlineCurrentCid = cid;
                    // 更新路径
                    if (res.data.path) {
                        this.offlineFolderPath = res.data.path;
                    }
                } else {
                    window.showMessage(res.message || '加载目录失败', 'error');
                }
            } catch (error) {
                window.showMessage('加载目录失败', 'error');
            } finally {
                this.offlineFolderLoading = false;
            }
        },
        
        async enterOfflineFolder(folder) {
            await this.loadOfflineFolders(folder.cid);
        },
        
        async goBackOffline() {
            if (this.offlineFolderPath.length > 1) {
                const parentPath = this.offlineFolderPath[this.offlineFolderPath.length - 2];
                await this.loadOfflineFolders(parentPath.cid);
            }
        },
        
        async goToOfflinePath(idx) {
            const target = this.offlineFolderPath[idx];
            if (target) {
                this.offlineFolderPath = this.offlineFolderPath.slice(0, idx + 1);
                await this.loadOfflineFolders(target.cid);
            }
        },
        
        selectOfflineFolder() {
            this.config.offline_dir_cid = this.offlineCurrentCid;
            // 拼接完整路径显示
            if (this.offlineFolderPath.length <= 1) {
                this.config.offline_dir_name = '根目录';
            } else {
                this.config.offline_dir_name = '/' + this.offlineFolderPath.slice(1).map(p => p.name).join('/');
            }
            this.offlineFolderDialog = false;
            window.showMessage(`已选择离线目录: ${this.config.offline_dir_name}`, 'success');
        },
        
        toggleOfflineCreateFolderMode() {
            this.offlineCreateFolderMode = !this.offlineCreateFolderMode;
            this.offlineCreateFolderName = '';
        },
        
        async createOfflineCloudFolder() {
            const name = this.offlineCreateFolderName.trim();
            if (!name) { window.showMessage('请输入文件夹名称', 'warning'); return; }
            this.offlineCreateFolderLoading = true;
            try {
                const res = await api.request('/115/folders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config_name: this.config.use_115_config, parent_cid: this.offlineCurrentCid, folder_name: name })
                });
                if (res.success) {
                    window.showMessage(res.message || '创建成功', 'success');
                    this.offlineCreateFolderMode = false;
                    this.offlineCreateFolderName = '';
                    await this.loadOfflineFolders(this.offlineCurrentCid);
                } else {
                    window.showMessage(res.message || '创建失败', 'error');
                }
            } catch (error) {
                window.showMessage('创建失败', 'error');
            } finally {
                this.offlineCreateFolderLoading = false;
            }
        },
        
        // ========== STRM 本地目录浏览 ==========
        async openStrmFolderBrowserForAdd() {
            this.editingStrmFolderIndex = -1;
            this.newStrmFolderName = '';
            this.strmFolderDialog = true;
            this.strmCurrentPath = '';
            this.strmParentPath = '';
            await this.loadStrmFolders('');
        },
        
        async openStrmFolderBrowserForEdit(index) {
            this.editingStrmFolderIndex = index;
            this.newStrmFolderName = this.config.strm_folders[index].name;
            this.strmFolderDialog = true;
            const targetPath = this.config.strm_folders[index].path;
            this.strmCurrentPath = targetPath;
            this.strmParentPath = '';
            await this.loadStrmFolders(targetPath);
        },
        
        async loadStrmFolders(path) {
            this.strmFolderLoading = true;
            try {
                const endpoint = path ? `/local/folders?path=${encodeURIComponent(path)}` : '/local/folders';
                const res = await api.request(endpoint);
                if (res.success) {
                    this.strmFolders = res.data.folders || [];
                    this.strmCurrentPath = res.data.current_path || '';
                    this.strmParentPath = res.data.parent_path;
                } else {
                    window.showMessage(res.message || '加载目录失败', 'error');
                }
            } catch (error) {
                window.showMessage('加载目录失败', 'error');
            } finally {
                this.strmFolderLoading = false;
            }
        },
        
        async enterStrmFolder(folder) {
            if (folder.no_access) {
                window.showMessage('没有访问权限', 'warning');
                return;
            }
            await this.loadStrmFolders(folder.path);
        },
        
        async goBackStrm() {
            if (this.strmParentPath !== undefined) {
                await this.loadStrmFolders(this.strmParentPath);
            }
        },
        
        async selectCurrentStrmFolder() {
            if (!this.strmCurrentPath) {
                window.showMessage('请先进入一个目录', 'warning');
                return;
            }
            const pathParts = this.strmCurrentPath.split(/[\/\\]/);
            const currentName = pathParts[pathParts.length - 1] || this.strmCurrentPath;
            const folderName = this.newStrmFolderName.trim() || currentName;
            const folderData = { name: folderName, path: this.strmCurrentPath };
            
            if (this.editingStrmFolderIndex >= 0) {
                this.config.strm_folders[this.editingStrmFolderIndex] = folderData;
            } else {
                const exists = this.config.strm_folders.some(f => f.path === this.strmCurrentPath);
                if (exists) {
                    window.showMessage('该文件夹已添加', 'warning');
                    this.strmFolderDialog = false;
                    return;
                }
                this.config.strm_folders.push(folderData);
            }
            if (this.config.strm_folders.length > 0) {
                this.config.strm_output_dir = this.config.strm_folders[0].path;
            }
            try {
                await api.updateEd2kStrmConfig(this.config);
                window.showMessage(`已${this.editingStrmFolderIndex >= 0 ? '更新' : '添加'}: ${folderName}`, 'success');
            } catch (error) {
                window.showMessage('保存失败', 'error');
            }
            this.strmFolderDialog = false;
        },
        
        async removeStrmFolder(index) {
            this.config.strm_folders.splice(index, 1);
            if (this.config.strm_folders.length > 0) {
                this.config.strm_output_dir = this.config.strm_folders[0].path;
            } else {
                this.config.strm_output_dir = '';
            }
            try {
                await api.updateEd2kStrmConfig(this.config);
                window.showMessage('已删除', 'success');
            } catch (error) {
                window.showMessage('保存失败', 'error');
            }
        },
        
        getStrmDisplayPath() {
            return this.strmCurrentPath || '选择盘符';
        },
        
        formatFileSize(bytes) {
            if (!bytes) return '';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
            return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
        },

        // ===== 日志相关方法 =====
        startLogRefresh() {
            this.stopLogRefresh();
            this.logRefreshInterval = setInterval(() => {
                if (!this.logLoading && !this.logDetailDialog && !this.logDeleteDialog && !this.logDetailDeleteDialog) {
                    this.silentLogRefresh();
                }
            }, 5000);
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
                if (this.logFilterKeyword) params.append('keyword', this.logFilterKeyword);
                const res = await api.request(`/ed2k_strm/logs?${params.toString()}`);
                if (res.success) {
                    this.logTasks = res.data.list || [];
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
                if (this.logFilterKeyword) params.append('keyword', this.logFilterKeyword);
                const res = await api.request(`/ed2k_strm/logs?${params.toString()}`);
                if (res.success) {
                    this.logTasks = res.data.list || [];
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
                    const idx = this.logSelectedIds.indexOf(t.id);
                    if (idx > -1) this.logSelectedIds.splice(idx, 1);
                });
            } else {
                this.logTasks.forEach(t => {
                    if (!this.logSelectedIds.includes(t.id)) this.logSelectedIds.push(t.id);
                });
            }
        },
        logToggleSelect(logId) {
            const idx = this.logSelectedIds.indexOf(logId);
            if (idx > -1) this.logSelectedIds.splice(idx, 1);
            else this.logSelectedIds.push(logId);
        },
        logIsSelected(logId) {
            return this.logSelectedIds.includes(logId);
        },
        async logViewDetail(logId) {
            this.logDetailDialog = true;
            this.logDetailLoading = true;
            this.logDetailData = null;
            try {
                const res = await api.request(`/ed2k_strm/logs/${logId}`);
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
                    res = await api.request('/ed2k_strm/logs/all', { method: 'DELETE' });
                } else {
                    res = await api.request('/ed2k_strm/logs', { method: 'DELETE', body: JSON.stringify({ log_ids: this.logSelectedIds }) });
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
        logConfirmDetailDelete() {
            this.logDetailDeleteDialog = true;
        },
        async logExecuteDetailDelete() {
            if (!this.logDetailData) return;
            this.logDetailDeleting = true;
            try {
                const res = await api.request('/ed2k_strm/logs', { method: 'DELETE', body: JSON.stringify({ log_ids: [this.logDetailData.id] }) });
                if (res.success) {
                    window.showMessage('已删除', 'success');
                    this.logDetailDeleteDialog = false;
                    this.logDetailDialog = false;
                    const idx = this.logSelectedIds.indexOf(this.logDetailData.id);
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
        logGetStatusColor(status) {
            switch (status) {
                case 'success': return 'success';
                case 'partial': return 'warning';
                case 'failed': return 'error';
                default: return 'grey';
            }
        },
        logGetStatusText(status) {
            switch (status) {
                case 'success': return '成功';
                case 'partial': return '部分成功';
                case 'failed': return '失败';
                default: return status || '未知';
            }
        },
        logGetSourceText(source) {
            if (source === 'tgbot') return 'TG Bot';
            if (source === 'api') return 'API';
            return source || '-';
        },
        logFormatTime(timeStr) {
            if (!timeStr) return '-';
            return timeStr.replace('T', ' ').slice(0, 19);
        },
        logTruncateText(text, maxLen = 50) {
            if (!text || text.length <= maxLen) return text || '-';
            return text.slice(0, maxLen) + '...';
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">
                            ed2k STRM
                        </h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(139,92,246,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div v-show="activeTab === 'config'" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <v-btn color="primary" @click="saveConfig(); saveApiEd2kConfig()" size="small" style="border-radius: 8px;" :loading="saving || ed2kApiSaving">
                            <v-icon left size="18">mdi-content-save</v-icon>
                            保存设置
                        </v-btn>
                    </div>
                </div>
            </div>

            <!-- 顶部导航栏 -->
            <v-card style="border-radius: 12px; margin-bottom: 16px; background: rgba(var(--v-theme-on-surface),0.04); border: 1px solid rgba(var(--v-theme-on-surface),0.1);" elevation="0">
                <v-tabs v-model="activeTab" color="primary" bg-color="transparent" density="comfortable" grow>
                    <v-tab value="config" class="share-strm-tab">
                        <v-icon size="16" style="margin-right: 4px;">mdi-cog-outline</v-icon>
                        配置
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
              <!-- ===== 配置 Tab ===== -->
              <div v-show="activeTab === 'config'">
                <!-- 配置区 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 style="color: white; margin-bottom: 16px;">
                        <v-icon color="primary">mdi-cog</v-icon>
                        基本配置
                    </h3>
                    
                    <v-row>
                        <!-- 115 配置选择 -->
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="config.use_115_config"
                                label="115 配置"
                                :items="configs115"
                                item-title="name"
                                item-value="name"
                                variant="outlined"
                                density="comfortable"
                                placeholder="选择 115 配置"
                                hide-details
                            ></v-select>
                        </v-col>
                        
                        <!-- API 模式选择 -->
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="config.api_mode"
                                label="API 模式"
                                :items="availableApiModes"
                                item-title="title"
                                item-value="value"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                :disabled="!config.use_115_config"
                            ></v-select>
                        </v-col>
                        
                        <!-- 请求头 -->
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.server_address"
                                label="请求头"
                                placeholder="http://172.17.0.1:8115"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                            ></v-text-field>
                        </v-col>

                        <!-- 离线下载目录 -->
                        <v-col cols="12" md="6">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <v-text-field
                                    :model-value="config.offline_dir_name || '根目录'"
                                    label="离线下载目录 (115 网盘)"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    readonly
                                    style="flex: 1;"
                                ></v-text-field>
                                <v-btn color="primary" variant="tonal" @click="openOfflineFolderBrowser" :disabled="!config.use_115_config" style="border-radius: 8px; height: 48px;">
                                    <v-icon>mdi-folder-open</v-icon>
                                </v-btn>
                            </div>
                        </v-col>

                        <!-- STRM 输出目录 -->
                        <v-col cols="12">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                <span style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;">
                                    <v-icon size="18" color="primary">mdi-folder-multiple</v-icon>
                                    STRM 生成目录 ({{ config.strm_folders.length }})
                                </span>
                                <v-btn color="success" variant="tonal" size="small" @click="openStrmFolderBrowserForAdd" style="border-radius: 8px;">
                                    <v-icon left size="16">mdi-plus</v-icon>添加目录
                                </v-btn>
                            </div>
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
                                        <v-btn icon variant="text" size="small" color="info" @click="openStrmFolderBrowserForEdit(index)">
                                            <v-icon size="18">mdi-pencil</v-icon>
                                        </v-btn>
                                        <v-btn icon variant="text" size="small" color="error" @click="removeStrmFolder(index)">
                                            <v-icon size="18">mdi-delete</v-icon>
                                        </v-btn>
                                    </div>
                                </div>
                            </div>
                            <div v-else style="padding: 24px; text-align: center; color: rgba(var(--v-theme-on-surface),0.4); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 10px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1);">
                                <v-icon size="32" color="grey">mdi-folder-plus-outline</v-icon>
                                <p style="margin-top: 8px; font-size: 13px;">没有 STRM 生成目录，点击上方按钮添加</p>
                            </div>
                            <div style="margin-top: 12px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                                <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                                    <v-icon size="16" color="info">mdi-information</v-icon>
                                    只有一个目录时直接生成；配置多个目录时 Telegram 会显示选择菜单。别名用于 TG 菜单显示，为空则使用目录名
                                </div>
                            </div>
                        </v-col>

                        <!-- 生成 STRM 后缀 -->
                        <v-col cols="12" md="8">
                            <v-text-field
                                v-model="config.strm_extensions"
                                label="生成 STRM 后缀"
                                placeholder="mp4,mkv,ts,iso,..."
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                hint="只有这些后缀的文件才会生成 STRM，英文逗号分隔"
                            ></v-text-field>
                        </v-col>

                        <!-- 最小生成文件大小 -->
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model.number="config.min_file_size_mb"
                                label="最小生成文件 (MB)"
                                type="number"
                                placeholder="0"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                :min="0"
                                hint="小于此大小的文件不生成 STRM，0 为不限制"
                            ></v-text-field>
                        </v-col>

                        <v-col cols="12">
                            <div style="padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                                <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                                    <v-icon size="16" color="info">mdi-information</v-icon>
                                    STRM 格式: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">请求头/api/ed2k_strm?hash=xxxx&size=xxxx&name=xxxx</code><br>
                                    提交 ed2k 任务可发送链接至 TG Bot<br>
                                    Emby 助手中此模式离线目录复用上方的离线目标
                                </div>
                            </div>
                        </v-col>
                    </v-row>
                </div>
                
                <!-- ed2k API -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 style="color: white; margin-bottom: 16px;">
                        <v-icon color="primary">mdi-api</v-icon>
                        ed2k API
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch
                                    v-model="apiEd2kConfig.enabled"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 ed2k 直链 API</span>
                            </div>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model.number="apiEd2kConfig.cache_ttl"
                                label="缓存时间（秒）"
                                type="number"
                                placeholder="10"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                :disabled="!apiEd2kConfig.enabled"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="info">mdi-information</v-icon>
                            请求格式: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">GET /api/ed2k_strm?hash=xxx&size=xxx&name=xxx</code><br>
                            只要 URL 中包含 hash、size、name 参数即可，返回 302 重定向到直链<br>
                            可用于 Emby 扫库等，下方 ed2k STRM 生成的文件符合此格式<br>
                            缓存时间：相同请求在缓存时间内直接返回缓存结果，减少 API 调用
                        </div>
                    </div>
                </div>

              </div>

                <!-- ===== 日志 Tab ===== -->
                <div v-show="activeTab === 'logs'">
                    <!-- 筛选与操作区 -->
                    <div class="glass-card" style="padding: 16px 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <v-select v-model="logFilterStatus" :items="logStatusOptions" item-title="title" item-value="value" label="状态" density="compact" variant="outlined" hide-details style="max-width: 140px; min-width: 120px;"></v-select>
                            <v-text-field v-model="logFilterKeyword" label="搜索" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 220px; min-width: 180px;"></v-text-field>
                            <v-spacer></v-spacer>
                            <template v-if="logMultiSelectMode">
                                <v-btn v-if="logTasks.length > 0" :color="isLogPageAllSelected ? 'primary' : 'default'" :variant="isLogPageAllSelected ? 'tonal' : 'outlined'" size="small" @click="logToggleSelectAll" style="border-radius: 8px;">
                                    <v-icon left size="18">{{ isLogPageAllSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>全选本页
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
                            <p style="margin-top: 16px; font-size: 15px;">暂无日志记录</p>
                        </div>
                        <div v-else class="strm-log-grid">
                            <div v-for="task in logTasks" :key="task.id" class="strm-log-card" :class="{'strm-log-card-selected': logMultiSelectMode && logIsSelected(task.id)}" @click="logMultiSelectMode ? logToggleSelect(task.id) : logViewDetail(task.id)">
                                <div class="strm-log-card-body">
                                    <div class="strm-log-card-url">{{ logTruncateText(task.output_dir, 55) }}</div>
                                    <div class="strm-log-card-chips">
                                        <v-chip size="x-small" :color="logGetStatusColor(task.status)" variant="flat">{{ logGetStatusText(task.status) }}</v-chip>
                                        <v-chip size="x-small" color="info" variant="tonal">{{ logGetSourceText(task.source) }}</v-chip>
                                        <span class="strm-log-card-stats">链接: {{ task.total_links }} | 生成: {{ task.generated }} | 过滤: {{ task.filtered }} | 失败: {{ task.failed }}</span>
                                    </div>
                                    <div class="strm-log-card-time">{{ logFormatTime(task.created_at) }}</div>
                                    <div v-if="task.error_message" class="strm-log-card-error">{{ task.error_message }}</div>
                                </div>
                                <div class="strm-log-card-actions" @click.stop>
                                    <v-btn icon variant="text" size="x-small" color="info" @click="logViewDetail(task.id)" title="查看详情"><v-icon size="16">mdi-eye</v-icon></v-btn>
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
                            <div style="display: flex; align-items: center; gap: 8px;"><v-icon color="primary">mdi-text-box-search</v-icon><span>日志详情</span></div>
                            <v-btn icon variant="text" size="small" @click="logDetailDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="max-height: 500px; padding: 16px;">
                        <div v-if="logDetailLoading" style="display: flex; justify-content: center; padding: 50px;"><v-progress-circular indeterminate color="primary"></v-progress-circular></div>
                        <div v-else-if="logDetailData">
                            <div style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                    <v-chip size="small" :color="logGetStatusColor(logDetailData.status)" variant="flat">{{ logGetStatusText(logDetailData.status) }}</v-chip>
                                    <v-chip size="small" color="info" variant="tonal">{{ logGetSourceText(logDetailData.source) }}</v-chip>
                                </div>
                                <div style="font-size: 13px; margin-bottom: 6px;"><span style="color: rgba(var(--v-theme-on-surface),0.5);">输出目录：</span><span style="word-break: break-all;">{{ logDetailData.output_dir || '-' }}</span></div>
                                <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; margin-top: 10px;">
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">收到链接：</span><span style="font-weight: 600;">{{ logDetailData.total_links }}</span></span>
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">生成：</span><span style="color: #56CA00; font-weight: 600;">{{ logDetailData.generated }}</span></span>
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">过滤：</span><span style="color: #FFB400; font-weight: 600;">{{ logDetailData.filtered }}</span></span>
                                    <span><span style="color: rgba(var(--v-theme-on-surface),0.5);">失败：</span><span style="color: #FF4C51; font-weight: 600;">{{ logDetailData.failed }}</span></span>
                                </div>
                                <div style="font-size: 13px; margin-top: 8px;"><span style="color: rgba(var(--v-theme-on-surface),0.5);">时间：</span>{{ logFormatTime(logDetailData.created_at) }}</div>
                                <div v-if="logDetailData.error_message" style="margin-top: 10px; padding: 10px; background: rgba(255,76,81,0.1); border-radius: 8px; font-size: 13px; color: #FF4C51;"><v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>{{ logDetailData.error_message }}</div>
                            </div>
                            <div style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;"><v-icon size="18" color="info">mdi-text-long</v-icon><span style="font-size: 14px; font-weight: 500;">执行日志</span><v-chip size="x-small" color="info" variant="tonal">{{ logDetailData.detail_log?.length || 0 }}</v-chip></div>
                                <div v-if="!logDetailData.detail_log || logDetailData.detail_log.length === 0" style="text-align: center; padding: 30px; color: rgba(var(--v-theme-on-surface),0.4);">暂无详细日志</div>
                                <div v-else style="max-height: 250px; overflow-y: auto; font-size: 12px; font-family: monospace;">
                                    <div v-for="(log, idx) in logDetailData.detail_log" :key="idx" style="padding: 4px 0; border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.05);">
                                        <span style="color: rgba(var(--v-theme-on-surface),0.4); margin-right: 8px;">{{ log.time }}</span>
                                        <span :style="{ color: log.message.includes('失败') || log.message.includes('错误') || log.message.includes('❌') ? '#FF4C51' : log.message.includes('成功') || log.message.includes('✅') ? '#56CA00' : 'rgba(var(--v-theme-on-surface),0.8)' }">{{ log.message }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                    <v-card-actions v-if="logDetailData && !logDetailLoading" style="padding: 12px 16px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <v-btn color="error" variant="tonal" @click="logConfirmDetailDelete" style="border-radius: 8px;" size="small">
                            <v-icon left size="18">mdi-delete</v-icon>删除
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="logDetailDialog = false" style="border-radius: 8px;" size="small">关闭</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 详情页删除确认 -->
            <v-dialog v-model="logDetailDeleteDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;"><v-icon color="error">mdi-alert</v-icon>确认删除</v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p>确定要删除这条日志吗？</p>
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
                        <p v-if="logDeleteType === 'all'">确定要删除<strong>所有</strong>日志吗？</p>
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

            <!-- 115 离线目录浏览弹窗 -->
            <v-dialog v-model="offlineFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-cloud-download</v-icon>
                                <span>选择离线下载目录</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="offlineFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <!-- 路径导航 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <template v-for="(p, idx) in offlineFolderPath" :key="idx">
                                <v-chip size="small" :color="idx === offlineFolderPath.length - 1 ? 'primary' : 'default'" variant="tonal" @click="goToOfflinePath(idx)" style="cursor: pointer; border-radius: 6px;">{{ p.name }}</v-chip>
                                <v-icon v-if="idx < offlineFolderPath.length - 1" size="14" color="grey">mdi-chevron-right</v-icon>
                            </template>
                        </div>
                    </div>
                    
                    <v-card-text style="height: 300px; padding: 0;">
                        <div v-if="offlineFolderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="offlineFolders.length > 0" style="padding: 8px;">
                            <div v-for="folder in offlineFolders" :key="folder.cid" @click="enterOfflineFolder(folder)" class="folder-browse-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <v-icon color="warning" size="22">mdi-folder</v-icon>
                                    <span style="font-size: 14px;">{{ folder.name }}</span>
                                </div>
                                <v-icon size="18" color="grey">mdi-chevron-right</v-icon>
                            </div>
                        </div>
                        <div v-else style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: rgba(var(--v-theme-on-surface),0.4);">
                            <v-icon size="56" color="grey-darken-1">mdi-folder-open-outline</v-icon>
                            <p style="margin-top: 12px;">该目录下没有子文件夹</p>
                        </div>
                    </v-card-text>
                    
                    <!-- 新建文件夹 -->
                    <div v-if="offlineCreateFolderMode" style="padding: 12px 16px; background: rgba(76,175,80,0.08); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-text-field v-model="offlineCreateFolderName" label="新文件夹名称" placeholder="输入文件夹名称" variant="outlined" density="compact" hide-details autofocus @keyup.enter="createOfflineCloudFolder" style="flex: 1;"></v-text-field>
                            <v-btn color="success" variant="elevated" size="small" @click="createOfflineCloudFolder" :loading="offlineCreateFolderLoading" style="border-radius: 8px;">
                                <v-icon size="18">mdi-check</v-icon>
                            </v-btn>
                            <v-btn variant="text" size="small" @click="offlineCreateFolderMode = false" style="border-radius: 8px;">
                                <v-icon size="18">mdi-close</v-icon>
                            </v-btn>
                        </div>
                    </div>
                    
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackOffline" :disabled="offlineFolderPath.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-btn variant="tonal" color="success" @click="toggleOfflineCreateFolderMode" style="border-radius: 8px; margin-left: 8px;">
                            <v-icon left size="18">mdi-folder-plus</v-icon>新建
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectOfflineFolder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- STRM 本地目录浏览弹窗 -->
            <v-dialog v-model="strmFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>选择 STRM 输出目录</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="strmFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <!-- 别名输入 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-text-field v-model="newStrmFolderName" label="目录别名 (TG 菜单显示名称)" placeholder="留空则使用目录名" variant="outlined" density="compact" hide-details></v-text-field>
                    </div>
                    
                    <!-- 当前路径 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-chip size="small" color="primary" variant="tonal" style="border-radius: 6px;">{{ getStrmDisplayPath() }}</v-chip>
                    </div>
                    
                    <v-card-text style="height: 300px; padding: 0;">
                        <div v-if="strmFolderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="strmFolders.length > 0" style="padding: 8px;">
                            <div v-for="folder in strmFolders" :key="folder.path" @click="enterStrmFolder(folder)" class="folder-browse-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;" :style="{ opacity: folder.no_access ? 0.4 : 1 }">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <v-icon :color="folder.no_access ? 'grey' : 'warning'" size="22">mdi-folder</v-icon>
                                    <span style="font-size: 14px;">{{ folder.name }}</span>
                                </div>
                                <v-icon v-if="!folder.no_access" size="18" color="grey">mdi-chevron-right</v-icon>
                                <v-icon v-else size="18" color="grey">mdi-lock</v-icon>
                            </div>
                        </div>
                        <div v-else style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: rgba(var(--v-theme-on-surface),0.4);">
                            <v-icon size="56" color="grey-darken-1">mdi-folder-open-outline</v-icon>
                            <p style="margin-top: 12px;">该目录下没有子文件夹</p>
                        </div>
                    </v-card-text>
                    
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackStrm" :disabled="strmParentPath === undefined || strmParentPath === null" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCurrentStrmFolder" :disabled="!strmCurrentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
