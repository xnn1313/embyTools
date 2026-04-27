// 空文件夹清理页面组件
const EmptyFolderCleanerPage = {
    name: 'EmptyFolderCleanerPage',
    
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
            scanProgress: '',
            scanError: null,
            pollTimer: null,
            // 扫描结果
            results: [],
            selectedForDelete: [],
            selectAll: false,
            // 删除状态
            deleteConfirmDialog: false,
            deleting: false,
        }
    },
    
    computed: {
        emptyCount() {
            return this.results.filter(r => r.is_empty).length;
        },
        nonEmptyCount() {
            return this.results.filter(r => !r.is_empty).length;
        },
        selectedCount() {
            return this.selectedForDelete.length;
        },
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
        
        // ========== 扫描 ==========
        async startScan() {
            if (!this.selectedPath) {
                window.showMessage('请先选择扫描目录', 'warning');
                return;
            }
            
            this.scanning = true;
            this.scanError = null;
            this.scanProgress = '正在启动扫描...';
            this.results = [];
            this.selectedForDelete = [];
            this.selectAll = false;
            
            try {
                const res = await api.request('/empty_folder/scan', {
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
                    const res = await api.request('/empty_folder/status');
                    if (res.success) {
                        const data = res.data;
                        this.scanProgress = data.progress || '';
                        if (!data.running) {
                            clearInterval(this.pollTimer);
                            this.pollTimer = null;
                            this.scanning = false;
                            
                            if (data.error) {
                                this.scanError = data.error;
                                window.showMessage(`扫描失败: ${data.error}`, 'error');
                            } else {
                                window.showMessage('扫描完成', 'success');
                                await this.loadResults();
                            }
                        }
                    }
                } catch (error) {
                    // 忽略轮询错误
                }
            }, 1000);
        },
        
        async loadResults() {
            try {
                const res = await api.request('/empty_folder/results');
                if (res.success) {
                    this.results = res.data || [];
                }
            } catch (error) {
                // 忽略
            }
        },
        
        // ========== 选择与删除 ==========
        toggleSelectAll() {
            if (this.selectAll) {
                this.selectedForDelete = this.results.map(r => r.path);
            } else {
                this.selectedForDelete = [];
            }
        },
        
        onSelectionChange() {
            this.selectAll = this.selectedForDelete.length === this.results.length && this.results.length > 0;
        },
        
        confirmDelete() {
            if (this.selectedForDelete.length === 0) {
                window.showMessage('请先选择要删除的文件夹', 'warning');
                return;
            }
            this.deleteConfirmDialog = true;
        },
        
        async executeDelete() {
            this.deleting = true;
            try {
                const res = await api.request('/empty_folder/delete', {
                    method: 'POST',
                    body: JSON.stringify({ paths: this.selectedForDelete })
                });
                
                if (res.success) {
                    window.showMessage(res.message, 'success');
                    this.deleteConfirmDialog = false;
                    // 从本地结果中移除已删除的
                    const deletedSet = new Set(this.selectedForDelete);
                    this.results = this.results.filter(r => !deletedSet.has(r.path));
                    this.selectedForDelete = [];
                    this.selectAll = false;
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (error) {
                window.showMessage('删除失败', 'error');
            } finally {
                this.deleting = false;
            }
        },
    },
    
    template: `
        <div>
            <!-- 警告说明 -->
            <div style="padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 12px; line-height: 1.8; background: rgba(255,76,81,0.1); border: 1px solid rgba(255,76,81,0.3);" :style="{ color: 'rgb(var(--v-theme-error))' }">
                <v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>
                <strong>重要说明</strong><br>
                <span :style="{ color: 'rgba(var(--v-theme-on-surface),0.7)' }">
                    • 此插件的检测规则为：<strong :style="{ color: 'rgb(var(--v-theme-error))' }">无 .strm 文件则算空文件夹</strong><br>
                    • 删除操作<strong :style="{ color: 'rgb(var(--v-theme-error))' }">不可撤销</strong>，请确认后再执行，扫描完成后会先浏览结果，确认再删不会无脑删除<br>
                    • <strong :style="{ color: 'rgb(var(--v-theme-error))' }">网盘目录勿用</strong>，仅适用于本地 STRM 目录清理
                </span>
            </div>
            
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
                    递归扫描所选目录下所有一级子文件夹，检测是否包含 .strm 文件
                </div>
                
                <!-- 扫描进度 -->
                <div v-if="scanning" style="margin-top: 12px;">
                    <v-progress-linear indeterminate color="primary" style="border-radius: 4px;"></v-progress-linear>
                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-top: 6px;">{{ scanProgress }}</div>
                </div>
                
                <!-- 扫描错误 -->
                <div v-if="scanError" style="margin-top: 12px; padding: 10px 14px; background: rgba(255,76,81,0.1); border-radius: 8px; border: 1px solid rgba(255,76,81,0.3); font-size: 13px; color: #FF4C51;">
                    <v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>
                    {{ scanError }}
                </div>
            </div>
            
            <!-- 扫描结果 -->
            <div class="glass-card" style="padding: 20px; border-radius: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <v-icon color="info" size="22">mdi-format-list-bulleted</v-icon>
                        <span style="font-size: 16px; font-weight: 500;">扫描结果</span>
                        <v-chip v-if="results.length > 0" size="x-small" color="info" variant="tonal">{{ results.length }}</v-chip>
                        <v-chip v-if="emptyCount > 0" size="x-small" color="warning" variant="flat">空目录 {{ emptyCount }}</v-chip>
                        <v-chip v-if="nonEmptyCount > 0" size="x-small" color="error" variant="flat">有杂物 {{ nonEmptyCount }}</v-chip>
                    </div>
                    <div v-if="results.length > 0" style="display: flex; align-items: center; gap: 8px;">
                        <v-checkbox v-model="selectAll" @change="toggleSelectAll" label="全选" density="compact" hide-details style="flex-shrink: 0;"></v-checkbox>
                        <v-btn color="error" variant="elevated" size="small" @click="confirmDelete" :disabled="selectedCount === 0" style="border-radius: 10px;">
                            <v-icon left size="18">mdi-delete-sweep</v-icon>删除选中 ({{ selectedCount }})
                        </v-btn>
                    </div>
                </div>
                
                <div v-if="results.length === 0" style="text-align: center; padding: 40px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                    <v-icon size="48" color="grey-darken-1">mdi-folder-search-outline</v-icon>
                    <p style="margin-top: 12px; font-size: 14px;">暂无扫描结果</p>
                    <p style="font-size: 12px;">选择目录并点击「开始扫描」</p>
                </div>
                
                <div v-else style="display: flex; flex-direction: column; gap: 8px; max-height: 60vh; overflow-y: auto;">
                    <div v-for="item in results" :key="item.path"
                         style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); flex-wrap: wrap; gap: 8px;">
                        
                        <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 200px;">
                            <v-checkbox v-model="selectedForDelete" :value="item.path" @change="onSelectionChange" density="compact" hide-details style="flex-shrink: 0; margin-top: -2px;"></v-checkbox>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                    <v-chip v-if="item.is_empty" size="x-small" color="warning" variant="flat">空目录</v-chip>
                                    <v-chip v-else size="x-small" color="error" variant="flat">有杂物 ({{ item.items_count }})</v-chip>
                                    <span style="font-size: 13px; font-weight: 500; word-break: break-all;">{{ item.name }}</span>
                                </div>
                                <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); word-break: break-all;">
                                    {{ item.path }}
                                </div>
                                <div v-if="!item.is_empty && item.items.length > 0" style="margin-top: 6px;">
                                    <details style="font-size: 12px;">
                                        <summary style="cursor: pointer; color: rgba(var(--v-theme-on-surface),0.5); user-select: none;">
                                            查看文件 ({{ item.items_count }})
                                        </summary>
                                        <div style="margin-top: 6px; padding: 8px; background: rgba(0,0,0,0.1); border-radius: 6px; max-height: 150px; overflow-y: auto;">
                                            <div v-for="(f, fi) in item.items" :key="fi" style="padding: 2px 0; color: rgba(var(--v-theme-on-surface),0.5); font-size: 11px;">
                                                {{ f }}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            </div>
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
                        <v-chip color="primary" size="small" variant="tonal" style="border-radius: 6px;">{{ currentPath || '选择盘符' }}</v-chip>
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
            
            <!-- 删除确认弹窗 -->
            <v-dialog v-model="deleteConfirmDialog" max-width="420">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>
                        确认删除
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p>确定要删除选中的 <strong>{{ selectedCount }}</strong> 个文件夹吗？</p>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">此操作不可撤销，文件夹及其内容将被永久删除。</p>
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
        </div>
    `
};
