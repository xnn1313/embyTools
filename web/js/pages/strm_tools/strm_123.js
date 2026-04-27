// 123 STRM 生成页面
const Strm123Page = {
    name: 'Strm123Page',
    
    data() {
        return {
            loading: false,
            saving: false,
            api123Saving: false,
            generating: false,
            configs123: [],
            api123Config: {
                enabled: false,
                use_123_config: '',
                cache_ttl: 10
            },
            config: {
                use_123_config: '',
                server_address: 'http://172.17.0.1:8115',
                media_extensions: 'mp4,mkv,ts,iso,rmvb,avi,mov,mpeg,mpg,wmv,3gp,asf,m4v,flv,m2ts,tp,f4v',
                metadata_extensions: 'srt,ass,ssa',
                download_metadata: true,
                include_filename: true,
                encode_filename: false,
                clean_invalid_strm: false,
                clean_invalid_metadata: false,
                clean_invalid_folders: false,
                validate_strm: false,
                validate_metadata: false,
                max_workers: 8,
                configs: [],
                cd2_webhook_enabled: false,
                cd2_webhook_show_raw: false,
                cd2_webhook_threads_enabled: false,
                cd2_webhook_threads: 8
            },
            showWebhookConfig: false,
            savedConfig: null,
            folderDialog: false,
            folderLoading: false,
            folders: [],
            currentPath: '',
            parentPath: '',
            browsing: null, // 'local'
            browseIndex: null,
            panFolderDialog: false,
            panFolderLoading: false,
            panFolders: [],
            panCurrentPath: '/',
            panParentPath: ''
        };
    },
    
    async mounted() {
        await this.loadData();
    },
    
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [configRes, configs123Res, api123ConfigRes] = await Promise.all([
                    api.getStrm123Config(),
                    api.get123Configs(),
                    api.getApi123Config()
                ]);
                if (api123ConfigRes) {
                    this.api123Config = { ...this.api123Config, ...api123ConfigRes };
                }
                if (configRes) {
                    this.config = { ...this.config, ...configRes };
                    // 保存配置副本
                    this.savedConfig = JSON.parse(JSON.stringify(this.config));
                }
                this.configs123 = configs123Res || [];
            } catch (error) {
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveConfig() {
            // 客户端 cron 表达式预校验
            for (let i = 0; i < (this.config.configs || []).length; i++) {
                const pc = this.config.configs[i];
                if (pc.schedule_enabled && pc.schedule_cron) {
                    const r = validateCronExpression(pc.schedule_cron);
                    if (!r.valid) { window.showMessage(`路径${i+1} 定时表达式错误: ${r.error}`, 'error'); return; }
                }
            }
            this.saving = true;
            try {
                await api.updateStrm123Config(this.config);
                // 更新保存的配置副本
                this.savedConfig = JSON.parse(JSON.stringify(this.config));
                window.showMessage('配置保存成功', 'success');
            } catch (error) {
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        isConfigSaved() {
            // 检查配置是否已保存
            return this.savedConfig && this.savedConfig.use_123_config === this.config.use_123_config;
        },
        
        addPathConfig() {
            if (!this.config.configs) {
                this.config.configs = [];
            }
            this.config.configs.push({
                pan_path: '/',
                local_path: '',
                mount_prefix: '',
                schedule_enabled: false,
                schedule_cron: '30 1 * * *',
                schedule_mode: 'incremental'
            });
        },
        
        deletePathConfig(index) {
            this.config.configs.splice(index, 1);
        },
        
        // 本地目录浏览
        async openLocalFolderBrowser(index) {
            this.browsing = 'local';
            this.browseIndex = index;
            this.folderDialog = true;
            this.currentPath = '';
            this.parentPath = '';
            await this.loadLocalFolders('');
        },
        
        async loadLocalFolders(path) {
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
        
        async enterLocalFolder(folder) {
            if (folder.no_access) {
                window.showMessage('没有访问权限', 'warning');
                return;
            }
            await this.loadLocalFolders(folder.path);
        },
        
        async goBackLocal() {
            if (this.parentPath !== undefined) {
                await this.loadLocalFolders(this.parentPath);
            }
        },
        
        async selectCurrentLocalFolder() {
            if (!this.currentPath) {
                window.showMessage('请先进入一个目录', 'warning');
                return;
            }
            this.config.configs[this.browseIndex].local_path = this.currentPath;
            window.showMessage(`已选择: ${this.currentPath}`, 'success');
            this.folderDialog = false;
        },
        
        getLocalDisplayPath() {
            return this.currentPath || '选择盘符';
        },
        
        // 网盘目录浏览
        async openPanFolderBrowser(index) {
            if (!this.isConfigSaved()) {
                window.showMessage('请先保存配置后再浏览目录', 'warning');
                return;
            }
            
            this.browsing = 'pan';
            this.browseIndex = index;
            this.panFolderDialog = true;
            this.panCurrentPath = '/';
            this.panParentPath = '';
            await this.loadPanFolders('/');
        },
        
        async loadPanFolders(path) {
            if (!this.savedConfig || !this.savedConfig.use_123_config) {
                window.showMessage('请先选择并保存 123 云盘配置', 'warning');
                return;
            }
            
            this.panFolderLoading = true;
            try {
                const endpoint = `/123/folders?config_name=${encodeURIComponent(this.savedConfig.use_123_config)}&path=${encodeURIComponent(path)}`;
                const res = await api.request(endpoint);
                if (res.success) {
                    this.panFolders = res.data.folders || [];
                    this.panCurrentPath = res.data.current_path || '/';
                    this.panParentPath = res.data.parent_path;
                } else {
                    window.showMessage(res.message || '加载目录失败', 'error');
                    this.panFolders = [];
                }
            } catch (error) {
                window.showMessage('加载目录失败', 'error');
                this.panFolders = [];
            } finally {
                this.panFolderLoading = false;
            }
        },
        
        async enterPanFolder(folder) {
            await this.loadPanFolders(folder.path);
        },
        
        async goBackPan() {
            if (this.panParentPath !== undefined && this.panParentPath !== '') {
                await this.loadPanFolders(this.panParentPath);
            }
        },
        
        async selectCurrentPanFolder() {
            if (!this.panCurrentPath) {
                window.showMessage('请先进入一个目录', 'warning');
                return;
            }
            this.config.configs[this.browseIndex].pan_path = this.panCurrentPath;
            window.showMessage(`已选择: ${this.panCurrentPath}`, 'success');
            this.panFolderDialog = false;
        },
        
        getPanDisplayPath() {
            return this.panCurrentPath || '/';
        },
        
        async generateStrmForPath(pathIndex, mode) {
            if (!this.savedConfig || !this.savedConfig.use_123_config) {
                window.showMessage('请先选择并保存 123 云盘配置', 'error');
                return;
            }
            
            const pathConfig = this.config.configs[pathIndex];
            if (!pathConfig || !pathConfig.pan_path || !pathConfig.local_path) {
                window.showMessage('请先配置网盘路径和本地路径', 'error');
                return;
            }
            
            this.generating = true;
            // 先保存配置
            await this.saveConfig();
            
            try {
                // 根据配置名称找到配置 ID
                const config123 = this.configs123.find(c => c.name === this.savedConfig.use_123_config);
                if (!config123) {
                    window.showMessage('未找到 123 云盘配置', 'error');
                    return;
                }
                
                // 提交任务（后台执行，不等待结果）
                api.request('/strm_123/generate', {
                    method: 'POST',
                    body: JSON.stringify({
                        config_id: config123.id,
                        mode: mode,
                        path_index: pathIndex
                    })
                }).catch(error => {
                    console.error('生成失败:', error);
                });
                
                window.showMessage('任务已提交', 'success');
            } catch (error) {
                window.showMessage('提交任务失败', 'error');
            } finally {
                this.generating = false;
            }
        },
        copyWebhookConfig() {
            const text = this.webhookConfigText;
            // 兼容 Safari / Android / 移动端的复制方法
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    window.showMessage && window.showMessage('配置已复制到剪贴板', 'success');
                }).catch(() => {
                    this.fallbackCopy(text);
                });
            } else {
                this.fallbackCopy(text);
            }
        },
        fallbackCopy(text) {
            // 回退方案：创建临时输入框
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            textArea.setAttribute('readonly', '');
            document.body.appendChild(textArea);
            
            // iOS Safari 需要特殊处理
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, text.length);
            
            try {
                document.execCommand('copy');
                window.showMessage && window.showMessage('配置已复制到剪贴板', 'success');
            } catch (err) {
                window.showMessage && window.showMessage('复制失败，请手动复制', 'error');
            } finally {
                document.body.removeChild(textArea);
            }
        },
        async saveApi123Config() {
            this.api123Saving = true;
            try {
                await api.updateApi123Config(this.api123Config);
                window.showMessage('123 API 配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.api123Saving = false;
            }
        }
    },
    
    computed: {
        webhookConfigText() {
            return `[file_system_watcher]
url = "http://172.17.0.1:8115/api/cd2/webhook"
method = "POST"
timeout = 10
enabled = true
body = '''
{
    "event_category": "{event_category}",
    "event_name": "{event_name}",
    "data": [
            {
                "action": "{action}",
                "is_dir": "{is_dir}",
                "source_file": "{source_file}",
                "destination_file": "{destination_file}"
            }
    ]
}
'''

[file_system_watcher.headers]
content-type = "application/json"`;
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">123 STRM</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <v-btn color="primary" @click="saveConfig(); saveApi123Config()" size="small" style="border-radius: 8px;" :loading="saving || api123Saving">
                        <v-icon left size="18">mdi-content-save</v-icon>
                        保存设置
                    </v-btn>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else class="glass-card" style="padding: 24px; border-radius: 16px;">
                <h3 style="color: white; margin-bottom: 16px;">
                    <v-icon color="primary">mdi-file-video</v-icon>
                    STRM 生成配置
                </h3>
                
                <v-row>
                    <v-col cols="12" md="6">
                        <v-select v-model="config.use_123_config" label="使用 123 配置" :items="configs123" item-title="name" item-value="name" variant="outlined" density="comfortable" placeholder="选择 123 云盘配置" hide-details></v-select>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            用于遍历云盘目录和生成 STRM
                        </div>
                        <div v-if="!isConfigSaved()" style="color: rgba(255,165,0,0.8); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            ⚠️ 请点击"保存设置"后才能浏览目录
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.server_address" label="STRM 请求头" placeholder="http://172.17.0.1:8115" variant="outlined" density="comfortable" hide-details></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.media_extensions" label="媒体文件扩展名" placeholder="mp4,mkv,ts,iso..." variant="outlined" density="comfortable" hide-details></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model="config.metadata_extensions" label="元数据文件扩展名" placeholder="srt,ass,ssa" variant="outlined" density="comfortable" hide-details></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field v-model.number="config.max_workers" label="扫描线程数" type="number" min="1" max="20" placeholder="8" variant="outlined" density="comfortable" hide-details></v-text-field>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px; padding-left: 4px;">
                            推荐 8 线程，过多可能导致超时
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.include_filename" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">STRM 包含文件名</span>
                            <v-switch v-if="config.include_filename" v-model="config.encode_filename" color="warning" hide-details density="compact" style="flex: none; margin-left: 16px;"></v-switch>
                            <span v-if="config.include_filename" style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">编码文件名</span>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.download_metadata" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">下载元数据文件</span>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.clean_invalid_folders" color="error" hide-details density="compact" style="flex: none;"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">清理无效文件夹</span>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.clean_invalid_strm" color="error" hide-details density="compact" style="flex: none;"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">清理无效 STRM</span>
                            <v-switch v-model="config.validate_strm" color="warning" hide-details density="compact" style="flex: none; margin-left: 16px;" :disabled="!config.clean_invalid_strm"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">校验</span>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <div style="display: flex; align-items: center;">
                            <v-switch v-model="config.clean_invalid_metadata" color="error" hide-details density="compact" style="flex: none;"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">清理无效元数据</span>
                            <v-switch v-model="config.validate_metadata" color="warning" hide-details density="compact" style="flex: none; margin-left: 16px;" :disabled="!config.clean_invalid_metadata"></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">校验</span>
                        </div>
                    </v-col>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center;">
                                <v-switch v-model="config.cd2_webhook_enabled" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 CD2 Webhook 实时监控</span>
                            </div>
                            <div v-if="config.cd2_webhook_enabled" style="display: flex; align-items: center;">
                                <v-switch v-model="config.cd2_webhook_show_raw" color="warning" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.6); margin-left: 8px; font-size: 13px;">显示原始数据日志</span>
                            </div>
                            <div v-if="config.cd2_webhook_enabled" style="display: flex; align-items: center; gap: 8px;">
                                <v-switch v-model="config.cd2_webhook_threads_enabled" color="success" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.6); font-size: 13px;">多线程处理</span>
                                <v-text-field v-if="config.cd2_webhook_threads_enabled" v-model.number="config.cd2_webhook_threads" type="number" min="1" max="32" variant="outlined" density="compact" hide-details style="width: 80px;"></v-text-field>
                                <span v-if="config.cd2_webhook_threads_enabled" style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px;">线程</span>
                            </div>
                            <v-btn v-if="config.cd2_webhook_enabled" color="info" variant="tonal" size="small" @click="showWebhookConfig = true" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-content-copy</v-icon>
                                复制 Webhook 配置
                            </v-btn>
                        </div>
                    </v-col>
                </v-row>
                
                <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        增量模式：只生成新文件的 STRM，跳过已存在的文件<br>
                        全量模式：重新生成所有文件的 STRM，覆盖已存在的文件<br>
                        无效文件夹：删除网盘中没有但本地有的文件夹(如果有)<br>
                        无效 STRM：删除网盘中没有但本地有的媒体文件扩展名对应的.strm文件(如果有)<br>
                        无效元数据：删除网盘中没有但本地有的元数据扩展名对应的元数据文件(如果有)<br>
                        校验 STRM：对比本地 STRM 文件中的 size、md5、s3_key_flag 参数与云端是否一致，不一致则删除<br>
                        校验元数据：对比本地元数据文件大小与云端是否一致，不一致则删除<br>
                        <v-icon size="16" color="info">mdi-telegram</v-icon>
                        任务完成后会自动推送到 Telegram(如果启用)
                    </div>
                </div>
                
                <v-divider style="margin: 24px 0;"></v-divider>
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <h3 style="color: white; margin: 0;">
                        <v-icon color="primary">mdi-folder-multiple</v-icon>
                        路径配置
                    </h3>
                    <v-btn color="primary" size="small" @click="addPathConfig" style="border-radius: 8px;">
                        <v-icon left size="18">mdi-plus</v-icon>
                        添加配置
                    </v-btn>
                </div>
                
                <div v-if="config.configs && config.configs.length > 0">
                    <div v-for="(item, index) in config.configs" :key="index" style="margin-bottom: 8px; padding: 12px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <!-- 网盘路径 -->
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                            <v-text-field v-model="item.pan_path" label="网盘路径" placeholder="/" variant="outlined" density="compact" hide-details style="flex: 1;"></v-text-field>
                            <v-btn color="info" variant="text" size="small" @click="openPanFolderBrowser(index)" style="min-width: 40px; height: 40px; flex-shrink: 0;">
                                <v-icon size="18">mdi-cloud-search-outline</v-icon>
                            </v-btn>
                        </div>
                        <!-- 本地路径 -->
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                            <v-text-field v-model="item.local_path" label="本地 STRM 目录" placeholder="./strm" variant="outlined" density="compact" hide-details style="flex: 1;"></v-text-field>
                            <v-btn color="info" variant="text" size="small" @click="openLocalFolderBrowser(index)" style="min-width: 40px; height: 40px; flex-shrink: 0;">
                                <v-icon size="18">mdi-folder-search-outline</v-icon>
                            </v-btn>
                        </div>
                        <!-- CD2 Webhook 匹配路径（仅 webhook 开启时显示） -->
                        <div v-if="config.cd2_webhook_enabled" style="margin-bottom: 8px;">
                            <v-text-field v-model="item.mount_prefix" label="cd2 webhook匹配路径" placeholder="/123云盘/媒体库/电影" variant="outlined" density="compact" hide-details></v-text-field>
                        </div>
                        <!-- 定时配置 -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 4px; min-width: 100px;">
                                <v-switch v-model="item.schedule_enabled" color="primary" hide-details density="compact" style="flex: none; transform: scale(0.85);"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">定时</span>
                            </div>
                            <v-btn-toggle v-if="item.schedule_enabled" v-model="item.schedule_mode" mandatory density="compact" color="primary" style="height: 32px;">
                                <v-btn value="incremental" size="small" style="font-size: 12px; min-width: 56px; height: 32px;">增量</v-btn>
                                <v-btn value="full" size="small" style="font-size: 12px; min-width: 56px; height: 32px;">全量</v-btn>
                            </v-btn-toggle>
                            <v-text-field v-if="item.schedule_enabled" v-model="item.schedule_cron" placeholder="30 1 * * *" variant="outlined" density="compact" hide-details style="flex: 1; max-width: 200px;"></v-text-field>
                        </div>
                        <!-- 操作按钮 -->
                        <div style="display: flex; gap: 6px; justify-content: flex-end;">
                            <v-btn color="success" variant="tonal" size="small" @click="generateStrmForPath(index, 'incremental')" :loading="generating" :disabled="!config.use_123_config" style="flex: 1; max-width: 80px;">
                                <v-icon size="16" style="margin-right: 4px;">mdi-play</v-icon>
                                <span style="font-size: 12px;">增量</span>
                            </v-btn>
                            <v-btn color="warning" variant="tonal" size="small" @click="generateStrmForPath(index, 'full')" :loading="generating" :disabled="!config.use_123_config" style="flex: 1; max-width: 80px;">
                                <v-icon size="16" style="margin-right: 4px;">mdi-refresh</v-icon>
                                <span style="font-size: 12px;">全量</span>
                            </v-btn>
                            <v-btn color="error" variant="text" size="small" @click="deletePathConfig(index)" style="min-width: 40px;">
                                <v-icon size="18">mdi-delete</v-icon>
                            </v-btn>
                        </div>
                    </div>
                </div>
                <div v-else style="padding: 24px; text-align: center; color: rgba(var(--v-theme-on-surface),0.4); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 12px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1);">
                    <v-icon size="48" color="grey-darken-1">mdi-folder-open-outline</v-icon>
                    <p style="margin-top: 12px;">暂无路径配置，请点击"添加配置"按钮添加</p>
                </div>
            </div>
            
            <!-- CD2 Webhook 匹配路径说明 -->
            <div v-if="config.cd2_webhook_enabled" class="glass-card" style="padding: 16px 20px; border-radius: 12px; margin-top: 16px; background: rgba(33,150,243,0.1);">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <v-icon size="20" color="info" style="margin-top: 2px;">mdi-information</v-icon>
                    <div>
                        <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 13px; font-weight: 500; margin-bottom: 6px;">CD2 Webhook 匹配路径说明</div>
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.6;">
                            从 CD2 根目录开始算起要带网盘，网盘名字要和你 CD2 中的 123 网盘名字对应，要和你当前路径配置的网盘路径对应，要带 /。<br>
                            <span style="color: rgba(var(--v-theme-on-surface),0.5);">例如：</span>当前路径配置中的网盘路径为 <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">/媒体库/电影</code> 那么 CD2 Webhook 匹配路径就填 <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">/123云盘/媒体库/电影</code><br>
                            <span style="color: rgba(var(--v-theme-on-surface),0.5);">以此类推：</span>/媒体库/电视剧 → /123云盘/媒体库/电视剧
                        </div>
                    </div>
                </div>
            </div>

            <!-- 123 API -->
            <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-top: 16px;">
                <h3 style="color: white; margin-bottom: 16px;">
                    <v-icon color="primary">mdi-api</v-icon>
                    123 API
                </h3>
                
                <v-row>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center;">
                            <v-switch
                                v-model="api123Config.enabled"
                                color="primary"
                                hide-details
                                density="compact"
                                style="flex: none;"
                            ></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 123 直链 API</span>
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-select
                            v-model="api123Config.use_123_config"
                            label="使用 123 配置"
                            :items="configs123"
                            item-title="name"
                            item-value="name"
                            variant="outlined"
                            density="comfortable"
                            placeholder="选择 123 配置"
                            hide-details
                            :disabled="!api123Config.enabled"
                        ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field
                            v-model.number="api123Config.cache_ttl"
                            label="缓存时间（秒）"
                            type="number"
                            placeholder="10"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            :disabled="!api123Config.enabled"
                        ></v-text-field>
                    </v-col>
                </v-row>
                
                <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        请求格式: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">GET /api/?redirect123&size=xxx&md5=xxx&s3_key_flag=xxx&name=xxx</code><br>
                        只要 URL 中包含 redirect123、size、md5、s3_key_flag 参数即可，返回 302 重定向到直链<br>
                        可用于 Emby 扫库等，123 STRM 生成的文件符合此格式<br>
                        缓存时间：相同请求在缓存时间内直接返回缓存结果，减少 API 调用
                    </div>
                </div>
            </div>

            <!-- 本地目录浏览弹窗 -->
            <v-dialog v-model="folderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>浏览本地目录</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="folderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-chip color="primary" size="small" variant="tonal" style="border-radius: 6px;">{{ getLocalDisplayPath() }}</v-chip>
                    </div>
                    
                    <v-card-text style="height: 350px; padding: 0;">
                        <div v-if="folderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="folders.length > 0" style="padding: 8px;">
                            <div v-for="folder in folders" :key="folder.path" @click="enterLocalFolder(folder)" :style="{ opacity: folder.no_access ? 0.5 : 1 }" class="folder-browse-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
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
                        <v-btn variant="tonal" @click="goBackLocal" :disabled="parentPath === undefined || parentPath === ''" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCurrentLocalFolder" :disabled="!currentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 网盘目录浏览弹窗 -->
            <v-dialog v-model="panFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-cloud</v-icon>
                                <span>浏览 123 云盘</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="panFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-chip color="primary" size="small" variant="tonal" style="border-radius: 6px;">{{ getPanDisplayPath() }}</v-chip>
                    </div>
                    
                    <v-card-text style="height: 350px; padding: 0;">
                        <div v-if="panFolderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="panFolders.length > 0" style="padding: 8px;">
                            <div v-for="folder in panFolders" :key="folder.path" @click="enterPanFolder(folder)" class="folder-browse-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <v-icon color="warning" size="22">mdi-folder</v-icon>
                                    <div style="font-size: 14px;">{{ folder.name }}</div>
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
                        <v-btn variant="tonal" @click="goBackPan" :disabled="panParentPath === undefined || panParentPath === ''" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCurrentPanFolder" :disabled="!panCurrentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- CD2 Webhook 配置弹窗 -->
            <v-dialog v-model="showWebhookConfig" max-width="650" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden; max-height: 90vh;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1); flex-shrink: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-webhook</v-icon>
                                <span>CD2 Webhook 配置</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="showWebhookConfig = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="padding: 20px; overflow-y: auto; flex: 1;">
                        <p style="margin-bottom: 16px; color: rgba(var(--v-theme-on-surface),0.7);">
                            请将以下配置添加到 CD2 Webhook 配置中。添加方法：设置 → Webhook 设置，名字随意，把下面的配置复制进去保存即可，无需重启 CD2。
                        </p>
                        <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; font-family: monospace; white-space: pre; font-size: 13px; line-height: 1.5; color: rgba(var(--v-theme-on-surface),0.9); overflow-x: auto; user-select: all;">{{ webhookConfigText }}</div>
                    </v-card-text>
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1); justify-content: flex-end; flex-shrink: 0; flex-wrap: wrap; gap: 8px;">
                        <v-btn color="success" variant="elevated" @click="copyWebhookConfig" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-content-copy</v-icon>
                            一键复制
                        </v-btn>
                        <v-btn variant="text" @click="showWebhookConfig = false">关闭</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
