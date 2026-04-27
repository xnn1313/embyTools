// 无效 115 分享 STRM 检测页面组件
const StrmCheckerPage = {
    name: 'StrmCheckerPage',
    
    data() {
        return {
            // 文件夹浏览
            folderDialog: false,
            folderLoading: false,
            folders: [],
            currentPath: '',
            parentPath: '',
            selectedPath: '',
            // 扫描状态
            scanning: false,
            scanError: null,
            pollTimer: null,
            // 扫描结果列表
            resultsList: [],
            resultsLoading: false,
            // 详情弹窗
            detailDialog: false,
            detailLoading: false,
            detailData: null,
            // 删除确认
            deleteConfirmDialog: false,
            deleteTargetId: null,
            deleting: false,
            // 删除结果确认
            removeResultDialog: false,
            removeTargetId: null
        }
    },
    
    async mounted() {
        await this.loadResults();
    },
    
    beforeUnmount() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },
    
    methods: {
        // ========== 文件夹浏览 ==========
        async openFolderBrowser() {
            this.folderDialog = true;
            this.currentPath = this.selectedPath || '';
            this.parentPath = '';
            await this.loadFolders(this.currentPath || '');
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
        
        async goBackFolder() {
            if (this.parentPath !== undefined && this.parentPath !== '') {
                await this.loadFolders(this.parentPath);
            }
        },
        
        selectCurrentFolder() {
            if (!this.currentPath) {
                window.showMessage('请先进入一个目录', 'warning');
                return;
            }
            this.selectedPath = this.currentPath;
            this.folderDialog = false;
        },
        
        getDisplayPath() {
            return this.currentPath || '选择盘符';
        },
        
        // ========== 扫描 ==========
        async startScan() {
            if (!this.selectedPath) {
                window.showMessage('请先选择扫描目录', 'warning');
                return;
            }
            
            this.scanning = true;
            this.scanError = null;
            
            try {
                const res = await api.request('/strm_checker/scan', {
                    method: 'POST',
                    body: JSON.stringify({ directory: this.selectedPath })
                });
                
                if (res.success) {
                    window.showMessage('扫描任务已启动', 'success');
                    this.startPolling();
                } else {
                    window.showMessage(res.message || '启动失败', 'error');
                    this.scanning = false;
                }
            } catch (error) {
                window.showMessage('启动扫描失败', 'error');
                this.scanning = false;
            }
        },
        
        startPolling() {
            if (this.pollTimer) clearInterval(this.pollTimer);
            this.pollTimer = setInterval(async () => {
                try {
                    const res = await api.request('/strm_checker/status');
                    if (res.success) {
                        const status = res.data;
                        if (!status.running) {
                            // 扫描完成
                            clearInterval(this.pollTimer);
                            this.pollTimer = null;
                            this.scanning = false;
                            
                            if (status.error) {
                                this.scanError = status.error;
                                window.showMessage(`扫描失败: ${status.error}`, 'error');
                            } else {
                                window.showMessage('扫描完成!', 'success');
                                await this.loadResults();
                            }
                        }
                    }
                } catch (error) {
                    // 忽略轮询错误
                }
            }, 1500);
        },
        
        // ========== 结果列表 ==========
        async loadResults() {
            this.resultsLoading = true;
            try {
                const res = await api.request('/strm_checker/results');
                if (res.success) {
                    this.resultsList = res.data || [];
                }
            } catch (error) {
                // 忽略
            } finally {
                this.resultsLoading = false;
            }
        },
        
        // ========== 查看详情 ==========
        async viewDetail(resultId) {
            this.detailDialog = true;
            this.detailLoading = true;
            this.detailData = null;
            
            try {
                const res = await api.request(`/strm_checker/results/${resultId}`);
                if (res.success) {
                    this.detailData = res.data;
                } else {
                    window.showMessage(res.message || '加载失败', 'error');
                    this.detailDialog = false;
                }
            } catch (error) {
                window.showMessage('加载详情失败', 'error');
                this.detailDialog = false;
            } finally {
                this.detailLoading = false;
            }
        },
        
        // ========== 删除无效 STRM 文件 ==========
        confirmDelete(resultId) {
            this.deleteTargetId = resultId;
            this.deleteConfirmDialog = true;
        },
        
        async executeDelete() {
            if (!this.deleteTargetId) return;
            
            this.deleting = true;
            try {
                const res = await api.request(`/strm_checker/delete_files/${this.deleteTargetId}`, {
                    method: 'POST'
                });
                
                if (res.success) {
                    window.showMessage(res.message, 'success');
                    this.deleteConfirmDialog = false;
                    this.detailDialog = false;
                    await this.loadResults();
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (error) {
                window.showMessage('删除失败', 'error');
            } finally {
                this.deleting = false;
            }
        },
        
        // ========== 删除扫描记录 ==========
        confirmRemoveResult(resultId) {
            this.removeTargetId = resultId;
            this.removeResultDialog = true;
        },
        
        async executeRemoveResult() {
            if (!this.removeTargetId) return;
            
            try {
                const res = await api.request(`/strm_checker/results/${this.removeTargetId}`, {
                    method: 'DELETE'
                });
                
                if (res.success) {
                    window.showMessage('已删除记录', 'success');
                    this.removeResultDialog = false;
                    await this.loadResults();
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (error) {
                window.showMessage('删除失败', 'error');
            }
        },
        
        // ========== 浏览器查看 JSON（通过 Blob 避免 token 泄露到 URL） ==========
        async viewFullJson(resultId) {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/strm_checker/results/' + resultId + '/full', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (response.status === 401) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('username');
                    window.location.href = '/login.html';
                    return;
                }
                const text = await response.text();
                const blob = new Blob([text], { type: 'application/json; charset=utf-8' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } catch (error) {
                window.showMessage && window.showMessage('获取数据失败', 'error');
            }
        },
        
        // ========== 下载 JSON ==========
        downloadJson(resultId) {
            const result = this.resultsList.find(r => r.id === resultId);
            if (!result) return;
            
            // 从详情接口获取完整数据后下载
            api.request(`/strm_checker/results/${resultId}`).then(res => {
                if (res.success) {
                    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `strm_check_${resultId}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            });
        },
        
        // ========== 辅助 ==========
        getReasonColor(reason) {
            if (reason.includes('取消')) return '#FF4C51';
            if (reason.includes('过期')) return '#FFB400';
            if (reason.includes('违规')) return '#FF6D00';
            if (reason.includes('不存在')) return '#9E9E9E';
            return '#FF4C51';
        },
        
        getReasonIcon(reason) {
            if (reason.includes('取消')) return 'mdi-close-circle';
            if (reason.includes('过期')) return 'mdi-clock-alert';
            if (reason.includes('违规')) return 'mdi-alert';
            if (reason.includes('不存在')) return 'mdi-help-circle';
            return 'mdi-close-circle';
        },
        
        truncatePath(path, maxLen = 60) {
            if (!path || path.length <= maxLen) return path;
            return '...' + path.slice(-(maxLen - 3));
        }
    },
    
    template: `
        <div>
            <!-- 扫描控制区 -->
            <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <v-icon color="primary" size="22">mdi-magnify-scan</v-icon>
                    <span style="font-size: 16px; font-weight: 500;">扫描配置</span>
                </div>
                
                <!-- 选择目录 -->
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px; display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(var(--v-theme-on-surface),0.05); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.1); cursor: pointer;" @click="openFolderBrowser">
                        <v-icon size="20" color="warning">mdi-folder</v-icon>
                        <span v-if="selectedPath" style="font-size: 13px; word-break: break-all;">{{ selectedPath }}</span>
                        <span v-else style="font-size: 13px; opacity: 0.5;">点击选择扫描目录...</span>
                    </div>
                    <v-btn color="primary" variant="elevated" @click="startScan" :loading="scanning" :disabled="!selectedPath || scanning" style="border-radius: 10px; min-width: 130px;">
                        <v-icon left size="18">mdi-play</v-icon>
                        {{ scanning ? '扫描中...' : '开始扫描' }}
                    </v-btn>
                </div>
                
                <div style="margin-top: 10px; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">
                    递归扫描所选目录下所有 .strm 文件，检测 115 分享链接是否有效（已取消/已过期）
                </div>
                
                <!-- 扫描错误 -->
                <div v-if="scanError" style="margin-top: 12px; padding: 10px 14px; background: rgba(255,76,81,0.1); border-radius: 8px; border: 1px solid rgba(255,76,81,0.3); font-size: 13px; color: #FF4C51;">
                    <v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>
                    {{ scanError }}
                </div>
            </div>
            
            <!-- 扫描结果列表 -->
            <div class="glass-card" style="padding: 20px; border-radius: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <v-icon color="info" size="22">mdi-format-list-bulleted</v-icon>
                        <span style="font-size: 16px; font-weight: 500;">检测记录</span>
                        <v-chip v-if="resultsList.length > 0" size="x-small" color="info" variant="tonal">{{ resultsList.length }}</v-chip>
                    </div>
                    <v-btn icon variant="text" size="small" @click="loadResults" :loading="resultsLoading">
                        <v-icon size="20">mdi-refresh</v-icon>
                    </v-btn>
                </div>
                
                <div v-if="resultsLoading && resultsList.length === 0" style="display: flex; justify-content: center; padding: 30px;">
                    <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
                </div>
                
                <div v-else-if="resultsList.length === 0" style="text-align: center; padding: 40px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                    <v-icon size="48" color="grey-darken-1">mdi-clipboard-text-search-outline</v-icon>
                    <p style="margin-top: 12px; font-size: 14px;">暂无检测记录</p>
                    <p style="font-size: 12px;">选择目录并点击「开始扫描」</p>
                </div>
                
                <div v-else style="display: flex; flex-direction: column; gap: 8px;">
                    <div v-for="item in resultsList" :key="item.id"
                        style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); flex-wrap: wrap; gap: 8px;">
                        
                        <div style="flex: 1; min-width: 200px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <v-chip size="x-small" :color="item.invalid_count > 0 ? 'error' : 'success'" variant="flat">
                                    {{ item.invalid_count > 0 ? ('无效 ' + item.invalid_count) : '全部有效' }}
                                </v-chip>
                                <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">{{ item.timestamp }}</span>
                                <v-chip v-if="item.api_error" size="x-small" color="warning" variant="tonal">不完整</v-chip>
                            </div>
                            <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6); word-break: break-all;">
                                {{ item.directory }}
                            </div>
                            <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.35); margin-top: 2px;">
                                STRM: {{ item.total_strm_files }} | 分享: {{ item.total_shares }} | 无效文件: {{ item.invalid_file_count }} | 耗时: {{ item.scan_time }}s
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <v-btn icon variant="text" size="small" color="info" @click="viewDetail(item.id)" title="查看详情">
                                <v-icon size="18">mdi-eye</v-icon>
                            </v-btn>
                            <v-btn icon variant="text" size="small" color="success" @click="viewFullJson(item.id)" title="浏览 JSON">
                                <v-icon size="18">mdi-open-in-new</v-icon>
                            </v-btn>
                            <v-btn icon variant="text" size="small" color="primary" @click="downloadJson(item.id)" title="下载 JSON">
                                <v-icon size="18">mdi-download</v-icon>
                            </v-btn>
                            <v-btn v-if="item.invalid_count > 0" icon variant="text" size="small" color="error" @click="confirmDelete(item.id)" title="删除无效文件">
                                <v-icon size="18">mdi-delete-sweep</v-icon>
                            </v-btn>
                            <v-btn icon variant="text" size="small" color="grey" @click="confirmRemoveResult(item.id)" title="删除记录">
                                <v-icon size="18">mdi-close</v-icon>
                            </v-btn>
                        </div>
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
                                <span>选择扫描目录</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="folderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
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
                        <v-btn variant="tonal" @click="goBackFolder" :disabled="parentPath === undefined || parentPath === ''" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCurrentFolder" :disabled="!currentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            
            <!-- 详情弹窗 -->
            <v-dialog v-model="detailDialog" max-width="750" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(255,76,81,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="error">mdi-alert-circle</v-icon>
                                <span>无效分享详情</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="detailDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <v-card-text style="max-height: 500px; padding: 16px;">
                        <div v-if="detailLoading" style="display: flex; justify-content: center; padding: 40px;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        
                        <div v-else-if="detailData">
                            <!-- 摘要 -->
                            <div style="padding: 12px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; margin-bottom: 12px; font-size: 13px;">
                                <div>扫描目录: <span style="color: rgba(var(--v-theme-on-surface),0.7);">{{ detailData.directory }}</span></div>
                                <div style="margin-top: 4px;">
                                    STRM 文件: {{ detailData.total_strm_files }} |
                                    分享链接: {{ detailData.total_shares }} |
                                    无效: {{ detailData.invalid_shares.length }} |
                                    有效: {{ detailData.valid_shares_count }} |
                                    耗时: {{ detailData.scan_time }}s
                                </div>
                                <div v-if="detailData.api_error" style="margin-top: 4px; color: #FFB400;">
                                    ⚠️ {{ detailData.api_error }}
                                </div>
                            </div>
                            
                            <!-- 无效分享列表 -->
                            <div v-if="detailData.invalid_shares.length === 0" style="text-align: center; padding: 30px; color: rgba(var(--v-theme-on-surface),0.4);">
                                <v-icon size="40">mdi-check-circle</v-icon>
                                <p style="margin-top: 8px;">所有分享链接均有效</p>
                            </div>
                            
                            <div v-else style="display: flex; flex-direction: column; gap: 10px;">
                                <div v-for="(share, idx) in detailData.invalid_shares" :key="idx"
                                    style="padding: 12px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                                    
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                        <v-icon size="16" :color="getReasonColor(share.reason)">{{ getReasonIcon(share.reason) }}</v-icon>
                                        <v-chip size="x-small" :color="getReasonColor(share.reason)" variant="flat">{{ share.reason }}</v-chip>
                                        <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">{{ share.file_count }} 个文件</span>
                                    </div>
                                    
                                    <div v-if="share.share_title" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.7); margin-bottom: 4px;">
                                        {{ share.share_title }}
                                    </div>
                                    
                                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-bottom: 6px; word-break: break-all;">
                                        {{ share.share_url }}
                                    </div>
                                    
                                    <!-- 文件列表（折叠） -->
                                    <details style="font-size: 12px;">
                                        <summary style="cursor: pointer; color: rgba(var(--v-theme-on-surface),0.5); user-select: none;">
                                            查看关联文件 ({{ share.files.length }})
                                        </summary>
                                        <div style="margin-top: 6px; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 6px; max-height: 200px; overflow-y: auto;">
                                            <div v-for="(file, fidx) in share.files" :key="fidx" style="padding: 2px 0; color: rgba(var(--v-theme-on-surface),0.5); word-break: break-all; font-size: 11px;">
                                                {{ file }}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                    
                    <v-card-actions v-if="detailData && detailData.invalid_shares.length > 0" style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-spacer></v-spacer>
                        <v-btn color="error" variant="elevated" @click="confirmDelete(detailData.id)" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete-sweep</v-icon>
                            删除所有无效 STRM 文件
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            
            <!-- 删除确认弹窗 -->
            <v-dialog v-model="deleteConfirmDialog" max-width="420">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>
                        确认删除
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p>确定要删除所有检测到的无效 STRM 文件吗？</p>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">此操作不可撤销，文件将被永久删除。</p>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="deleteConfirmDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeDelete" :loading="deleting" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>确认删除
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            
            <!-- 删除记录确认 -->
            <v-dialog v-model="removeResultDialog" max-width="380">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px;">删除记录</v-card-title>
                    <v-card-text>确定要删除此检测记录吗？（不会删除文件）</v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="removeResultDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeRemoveResult" style="border-radius: 8px;">确认</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
