// STRM 备份页面组件
const StrmBackupPage = {
    name: 'StrmBackupPage',
    
    data() {
        return {
            loading: false,
            saving: false,
            running: false,
            config: {
                enabled: false,
                source_path: '',
                target_path: '',
                extensions: '.strm,.ass,.srt,.sup',
                cron_expression: '0 */12 * * *'
            },
            // 文件夹浏览器
            folderDialog: false,
            folderLoading: false,
            folders: [],
            currentPath: '',
            parentPath: '',
            folderTarget: '', // 'source' or 'target'
            statusTimer: null
        }
    },
    
    async mounted() {
        await this.loadData();
    },
    
    beforeUnmount() {
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
        }
    },
    
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const configRes = await api.getStrmBackupConfig();
                if (configRes) {
                    this.config = { ...this.config, ...configRes };
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveConfig() {
            if (this.config.enabled && !this.config.source_path) {
                window.showMessage('请配置源文件夹', 'error');
                return;
            }
            if (this.config.enabled && !this.config.target_path) {
                window.showMessage('请配置目标文件夹', 'error');
                return;
            }
            if (this.config.enabled && !this.config.extensions) {
                window.showMessage('请配置匹配后缀', 'error');
                return;
            }
            if (this.config.cron_expression) {
                const r = validateCronExpression(this.config.cron_expression);
                if (!r.valid) {
                    window.showMessage(`定时表达式错误: ${r.error}`, 'error');
                    return;
                }
            }
            
            this.saving = true;
            try {
                const res = await api.updateStrmBackupConfig(this.config);
                if (res.success) {
                    window.showMessage('配置保存成功', 'success');
                } else {
                    window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        async runBackup() {
            if (this.running) return;
            if (!this.config.source_path || !this.config.target_path) {
                window.showMessage('请先配置源文件夹和目标文件夹', 'error');
                return;
            }
            
            // 先保存配置
            this.saving = true;
            try {
                const saveRes = await api.updateStrmBackupConfig(this.config);
                if (!saveRes.success) {
                    window.showMessage(saveRes.message || '保存配置失败', 'error');
                    this.saving = false;
                    return;
                }
            } catch (e) {
                window.showMessage('保存配置失败', 'error');
                this.saving = false;
                return;
            }
            this.saving = false;
            
            this.running = true;
            try {
                const res = await api.runStrmBackup();
                if (res.success) {
                    window.showMessage('备份任务已启动', 'success');
                    this.startStatusPolling();
                } else {
                    window.showMessage(res.message || '启动失败', 'error');
                    this.running = false;
                }
            } catch (error) {
                console.error('启动备份失败:', error);
                window.showMessage('启动备份失败', 'error');
                this.running = false;
            }
        },
        
        startStatusPolling() {
            if (this.statusTimer) clearInterval(this.statusTimer);
            this.statusTimer = setInterval(async () => {
                try {
                    const status = await api.getStrmBackupStatus();
                    if (!status.running) {
                        this.running = false;
                        clearInterval(this.statusTimer);
                        this.statusTimer = null;
                        window.showMessage('备份任务已完成', 'success');
                    }
                } catch (e) {
                    // ignore
                }
            }, 2000);
        },
        
        // ===== 文件夹浏览器 =====
        async openFolderBrowser(target) {
            this.folderTarget = target;
            this.folderDialog = true;
            this.currentPath = '';
            this.parentPath = '';
            // 如果已经有路径，尝试导航到那里
            const existingPath = target === 'source' ? this.config.source_path : this.config.target_path;
            if (existingPath) {
                await this.loadFolders(existingPath);
            } else {
                await this.loadFolders('');
            }
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
            } catch (e) {
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
        
        async goBackFolder() {
            if (this.parentPath !== undefined && this.parentPath !== '') {
                await this.loadFolders(this.parentPath);
            } else if (this.currentPath) {
                await this.loadFolders('');
            }
        },
        
        selectFolder() {
            if (!this.currentPath) {
                window.showMessage('请先进入一个目录', 'warning');
                return;
            }
            if (this.folderTarget === 'source') {
                this.config.source_path = this.currentPath;
            } else {
                this.config.target_path = this.currentPath;
            }
            window.showMessage(`已选择: ${this.currentPath}`, 'success');
            this.folderDialog = false;
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            分享 STRM 备份
                        </h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <v-btn color="success" @click="runBackup" size="small" style="border-radius: 8px;" :loading="running" :disabled="running || !config.source_path || !config.target_path">
                            <v-icon left size="18">mdi-play</v-icon>
                            立即备份
                        </v-btn>
                        <v-btn color="primary" @click="saveConfig" size="small" style="border-radius: 8px;" :loading="saving">
                            <v-icon left size="18">mdi-content-save</v-icon>
                            保存设置
                        </v-btn>
                    </div>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else>
                <!-- 配置区域 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 style="color: white; margin-bottom: 16px;">
                        <v-icon color="info">mdi-cog</v-icon>
                        备份配置
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <v-switch
                                    v-model="config.enabled"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用定时备份</span>
                            </div>
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.source_path"
                                label="源文件夹"
                                placeholder="点击右侧按钮选择源文件夹"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                readonly
                                @click="openFolderBrowser('source')"
                                style="cursor: pointer;"
                            >
                                <template v-slot:append-inner>
                                    <v-btn icon variant="text" size="small" @click.stop="openFolderBrowser('source')">
                                        <v-icon>mdi-folder-open</v-icon>
                                    </v-btn>
                                </template>
                            </v-text-field>
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.target_path"
                                label="目标文件夹"
                                placeholder="点击右侧按钮选择目标文件夹"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                readonly
                                @click="openFolderBrowser('target')"
                                style="cursor: pointer;"
                            >
                                <template v-slot:append-inner>
                                    <v-btn icon variant="text" size="small" @click.stop="openFolderBrowser('target')">
                                        <v-icon>mdi-folder-open</v-icon>
                                    </v-btn>
                                </template>
                            </v-text-field>
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.extensions"
                                label="匹配后缀"
                                placeholder=".strm,.ass,.srt,.sup"
                                hint="多个后缀用逗号分隔，如 .strm,.ass,.srt,.sup"
                                persistent-hint
                                variant="outlined"
                                density="comfortable"
                            ></v-text-field>
                        </v-col>
                        
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.cron_expression"
                                label="定时表达式"
                                placeholder="0 */12 * * *"
                                hint="格式: 分 时 日 月 周 (5位)，默认每12小时一次"
                                persistent-hint
                                variant="outlined"
                                density="comfortable"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 12px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="info">mdi-information</v-icon>
                            备份时会将源文件夹中匹配后缀的文件复制到目标文件夹，每次备份自动创建以时间命名的子文件夹，保持原始目录结构不变
                        </div>
                    </div>
                </div>
                
            </div>
            
            <!-- 文件夹浏览器对话框 -->
            <v-dialog v-model="folderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="info">mdi-folder-open</v-icon>
                                <span>{{ folderTarget === 'source' ? '选择源文件夹' : '选择目标文件夹' }}</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="folderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.7);">
                            <v-icon size="16" color="info">mdi-map-marker</v-icon>
                            当前路径: {{ currentPath || '选择盘符' }}
                        </div>
                    </div>
                    <v-card-text style="height: 300px; padding: 0;">
                        <div v-if="folderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="folders.length > 0" style="padding: 8px;">
                            <div v-for="folder in folders" :key="folder.path" @click="enterFolder(folder)"
                                style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;"
                                :style="{ opacity: folder.no_access ? 0.4 : 1 }"
                                onmouseover="this.style.background='rgba(61,111,213,0.1)'" onmouseout="this.style.background='rgba(var(--v-theme-on-surface),0.03)'">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <v-icon :color="folder.is_drive ? 'info' : (folder.no_access ? 'grey' : 'warning')" size="22">
                                        {{ folder.is_drive ? 'mdi-harddisk' : 'mdi-folder' }}
                                    </v-icon>
                                    <span style="font-size: 14px;">{{ folder.name }}</span>
                                    <v-chip v-if="folder.no_access" size="x-small" color="error" variant="tonal">无权限</v-chip>
                                </div>
                                <v-icon size="18" color="grey">mdi-chevron-right</v-icon>
                            </div>
                        </div>
                        <div v-else style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: rgba(var(--v-theme-on-surface),0.4);">
                            <v-icon size="56" color="grey-darken-1">mdi-folder-open-outline</v-icon>
                            <p style="margin-top: 12px;">该目录下没有子文件夹</p>
                        </div>
                    </v-card-text>
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackFolder" :disabled="!currentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectFolder" :disabled="!currentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            
        </div>
    `
};
