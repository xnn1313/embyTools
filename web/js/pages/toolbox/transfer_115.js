// 115 转存设置页面组件
const Transfer115Page = {
    name: 'Transfer115Page',
    
    data() {
        return {
            loading: false,
            saving: false,
            configs115: [],
            config: {
                enabled: false,
                use_115_config: '',
                transfer_folders: [],
            },
            // 文件夹浏览
            folderDialog: false,
            folderLoading: false,
            folders: [],
            currentCid: '0',
            folderPath: [{ name: '根目录', cid: '0' }],
            editingFolderIndex: -1,
            newFolderName: '',
            // 新建文件夹
            createFolderMode: false,
            createFolderName: '',
            createFolderLoading: false
        }
    },
    
    async mounted() {
        await this.loadData();
    },
    
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [configRes, configs115Res] = await Promise.all([
                    this.fetchApi('/api/transfer_115/config'),
                    api.get115Configs()
                ]);
                if (configRes?.data) {
                    this.config = { ...this.config, ...configRes.data };
                    if (!this.config.transfer_folders) {
                        this.config.transfer_folders = [];
                    }
                }
                this.configs115 = (configs115Res || []).filter(c => !c.open_token);
            } catch (error) {
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async fetchApi(url, options = {}) {
            const token = localStorage.getItem('auth_token');
            const headers = {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            };
            const response = await fetch(url, {
                ...options,
                headers
            });
            return await response.json();
        },
        
        async saveConfig() {
            this.saving = true;
            try {
                const res = await this.fetchApi('/api/transfer_115/config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.config)
                });
                if (res.success) {
                    window.showMessage(res.message || '配置保存成功', 'success');
                } else {
                    window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (error) {
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        // 打开文件夹浏览器（新增模式）
        async openFolderBrowserForAdd() {
            if (!this.config.use_115_config) {
                window.showMessage('请先选择并保存 115 配置', 'error');
                return;
            }
            this.editingFolderIndex = -1;
            this.newFolderName = '';
            this.folderDialog = true;
            this.currentCid = '0';
            this.folderPath = [{ name: '根目录', cid: '0' }];
            await this.loadFolders('0');
        },
        
        // 打开文件夹浏览器（编辑模式）
        async openFolderBrowserForEdit(index) {
            if (!this.config.use_115_config) {
                window.showMessage('请先选择并保存 115 配置', 'error');
                return;
            }
            this.editingFolderIndex = index;
            this.newFolderName = this.config.transfer_folders[index].name;
            this.folderDialog = true;
            this.currentCid = this.config.transfer_folders[index].cid || '0';
            this.folderPath = [{ name: '根目录', cid: '0' }];
            await this.loadFolders(this.currentCid);
        },
        
        async loadFolders(cid) {
            this.folderLoading = true;
            try {
                const res = await this.fetchApi(`/api/115/folders?config_name=${encodeURIComponent(this.config.use_115_config)}&cid=${cid}`);
                if (res.success) {
                    this.folders = res.data.folders || [];
                    this.currentCid = cid;
                    if (res.data.path?.length > 0) {
                        this.folderPath = res.data.path;
                    }
                } else {
                    window.showMessage(res.message || '加载文件夹失败', 'error');
                    this.folders = [];
                }
            } catch (error) {
                window.showMessage('加载文件夹失败', 'error');
                this.folders = [];
            } finally {
                this.folderLoading = false;
            }
        },
        
        async enterFolder(folder) {
            await this.loadFolders(folder.cid);
        },
        
        async goBack() {
            if (this.folderPath.length > 1) {
                const parentPath = this.folderPath[this.folderPath.length - 2];
                await this.loadFolders(parentPath.cid);
            }
        },
        
        async goToPath(index) {
            const targetPath = this.folderPath[index];
            await this.loadFolders(targetPath.cid);
        },
        
        // 选择当前文件夹（添加或更新到列表）
        async selectCurrentFolder() {
            const currentName = this.folderPath.length > 0 ? this.folderPath[this.folderPath.length - 1].name : '根目录';
            const folderName = this.newFolderName.trim() || currentName;
            
            const folderData = {
                name: folderName,
                cid: this.currentCid
            };
            
            if (this.editingFolderIndex >= 0) {
                // 编辑模式
                this.config.transfer_folders[this.editingFolderIndex] = folderData;
            } else {
                // 新增模式
                const exists = this.config.transfer_folders.some(f => f.cid === this.currentCid);
                if (exists) {
                    window.showMessage('该文件夹已添加', 'warning');
                    this.folderDialog = false;
                    return;
                }
                this.config.transfer_folders.push(folderData);
            }
            
            // 立即保存
            try {
                const res = await this.fetchApi('/api/transfer_115/config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.config)
                });
                if (res.success) {
                    window.showMessage(`已${this.editingFolderIndex >= 0 ? '更新' : '添加'}: ${folderName}`, 'success');
                } else {
                    window.showMessage('保存失败', 'error');
                }
            } catch (error) {
                window.showMessage('保存失败', 'error');
            }
            this.folderDialog = false;
        },
        
        // 新建文件夹
        toggleCreateFolderMode() {
            this.createFolderMode = !this.createFolderMode;
            this.createFolderName = '';
        },
        async createCloudFolder() {
            const name = this.createFolderName.trim();
            if (!name) { window.showMessage('请输入文件夹名称', 'warning'); return; }
            this.createFolderLoading = true;
            try {
                const res = await this.fetchApi('/api/115/folders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config_name: this.config.use_115_config, parent_cid: this.currentCid, folder_name: name })
                });
                if (res.success) {
                    window.showMessage(res.message || '创建成功', 'success');
                    this.createFolderMode = false;
                    this.createFolderName = '';
                    await this.loadFolders(this.currentCid);
                } else {
                    window.showMessage(res.message || '创建失败', 'error');
                }
            } catch (e) {
                window.showMessage('创建文件夹失败', 'error');
            } finally { this.createFolderLoading = false; }
        },
        // 删除转存文件夹
        async removeTransferFolder(index) {
            this.config.transfer_folders.splice(index, 1);
            // 立即保存
            try {
                const res = await this.fetchApi('/api/transfer_115/config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.config)
                });
                if (res.success) {
                    window.showMessage('已删除', 'success');
                }
            } catch (error) {
                window.showMessage('删除失败', 'error');
            }
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">115 转存</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(86,202,0,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <v-btn color="primary" @click="saveConfig" size="small" style="border-radius: 8px;" :loading="saving">
                            <v-icon left size="18">mdi-content-save</v-icon>保存设置
                        </v-btn>
                    </div>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else>
                <!-- 基础配置 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 style="color: white; margin-bottom: 16px;"><v-icon color="primary">mdi-cloud-upload</v-icon> 基础配置</h3>
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch v-model="config.enabled" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 115 转存</span>
                            </div>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="config.use_115_config" label="使用 115 配置" :items="configs115" :item-title="item => item.name" item-value="name" variant="outlined" density="comfortable" placeholder="选择用于转存的 115 配置（仅 Cookie 模式）" hide-details clearable :disabled="!config.enabled"></v-select>
                        </v-col>
                        <v-col cols="12">
                            <div style="padding: 12px; background: rgba(255,165,0,0.1); border-radius: 8px; border-left: 3px solid rgba(255,165,0,0.8);">
                                <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px;">
                                    <v-icon size="16" color="warning">mdi-alert-circle</v-icon>
                                    启用转存并选择配置后，需要点击上方的「保存设置」按钮才能获取网盘文件夹信息
                                </div>
                            </div>
                        </v-col>
                    </v-row>
                </div>

                <!-- 转存文件夹列表 -->
                <div v-if="config.enabled" class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h3 style="color: white; margin: 0;">
                            <v-icon color="warning" size="22">mdi-folder-multiple</v-icon>
                            转存文件夹 ({{ config.transfer_folders.length }})
                        </h3>
                        <v-btn color="success" variant="tonal" size="small" @click="openFolderBrowserForAdd" :disabled="!config.use_115_config" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-plus</v-icon>添加文件夹
                        </v-btn>
                    </div>
                    
                    <!-- 文件夹列表 -->
                    <div v-if="config.transfer_folders.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
                        <div v-for="(folder, index) in config.transfer_folders" :key="index" 
                            style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(var(--v-theme-on-surface),0.05); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <v-icon color="warning" size="20">mdi-folder</v-icon>
                                <div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px;">{{ folder.name }}</div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px;">CID: {{ folder.cid }}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <v-btn icon variant="text" size="small" color="info" @click="openFolderBrowserForEdit(index)">
                                    <v-icon size="18">mdi-pencil</v-icon>
                                </v-btn>
                                <v-btn icon variant="text" size="small" color="error" @click="removeTransferFolder(index)">
                                    <v-icon size="18">mdi-delete</v-icon>
                                </v-btn>
                            </div>
                        </div>
                    </div>
                    <div v-else style="padding: 24px; text-align: center; color: rgba(var(--v-theme-on-surface),0.4); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 10px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1);">
                        <v-icon size="32" color="grey">mdi-folder-plus-outline</v-icon>
                        <p style="margin-top: 8px; font-size: 13px;">暂无转存文件夹，点击上方按钮添加</p>
                    </div>
                    
                    <div style="margin-top: 12px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="info">mdi-information</v-icon>
                            只有一个文件夹时直接转存；多个文件夹时 Telegram 会显示选择按钮
                        </div>
                    </div>
                </div>

                <!-- 注意事项 -->
                <div style="margin-top: 16px; padding: 16px; background: rgba(61,111,213,0.1); border-radius: 12px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px; line-height: 1.8;">
                        <v-icon size="16" color="warning">mdi-alert</v-icon>
                        <strong>注意：</strong>「115 转存」和「115 分享 STRM」为互斥功能，开启其中一个另外一个会自动关闭
                    </div>
                </div>
            </div>

            <!-- 115 文件夹浏览弹窗 -->
            <v-dialog v-model="folderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>{{ editingFolderIndex >= 0 ? '编辑转存文件夹' : '添加转存文件夹' }}</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="folderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    
                    <!-- 别名输入 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-text-field v-model="newFolderName" label="文件夹别名 (TG 显示名称)" placeholder="留空则使用文件夹原名" variant="outlined" density="compact" hide-details></v-text-field>
                    </div>
                    
                    <!-- 路径导航 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <template v-for="(p, idx) in folderPath" :key="idx">
                                <v-chip size="small" :color="idx === folderPath.length - 1 ? 'primary' : 'default'" variant="tonal" @click="goToPath(idx)" style="cursor: pointer; border-radius: 6px;">{{ p.name }}</v-chip>
                                <v-icon v-if="idx < folderPath.length - 1" size="14" color="grey">mdi-chevron-right</v-icon>
                            </template>
                        </div>
                    </div>
                    
                    <v-card-text style="height: 300px; padding: 0;">
                        <div v-if="folderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="folders.length > 0" style="padding: 8px;">
                            <div v-for="folder in folders" :key="folder.cid" @click="enterFolder(folder)" class="folder-browse-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;">
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
                    
                    <!-- 新建文件夹输入区 -->
                    <div v-if="createFolderMode" style="padding: 12px 16px; background: rgba(76,175,80,0.08); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-text-field v-model="createFolderName" label="新文件夹名称" placeholder="输入文件夹名称" variant="outlined" density="compact" hide-details autofocus @keyup.enter="createCloudFolder" style="flex: 1;"></v-text-field>
                            <v-btn color="success" variant="elevated" size="small" @click="createCloudFolder" :loading="createFolderLoading" style="border-radius: 8px;">
                                <v-icon size="18">mdi-check</v-icon>
                            </v-btn>
                            <v-btn variant="text" size="small" @click="createFolderMode = false" style="border-radius: 8px;">
                                <v-icon size="18">mdi-close</v-icon>
                            </v-btn>
                        </div>
                    </div>
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBack" :disabled="folderPath.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-btn variant="tonal" color="success" @click="toggleCreateFolderMode" style="border-radius: 8px; margin-left: 8px;">
                            <v-icon left size="18">mdi-folder-plus</v-icon>新建
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCurrentFolder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
