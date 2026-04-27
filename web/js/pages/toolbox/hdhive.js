// HDHive 解析设置页面组件（use_hdhive_account 和 points_limit 同时用于看板影巢搜索）
const HDHivePage = {
    name: 'HDHivePage',
    
    data() {
        return {
            loading: false,
            saving: false,
            configs115: [],
            hdhiveAccounts: [],
            config: {
                enabled: false,
                use_hdhive_account: '',   // 同时用于看板影巢搜索
                points_limit: 20,          // 同时用于看板影巢搜索
                use_115_config: '',
                target_cid: '0',
                auto_transfer_115: true,
                transfer_folders: [],
                auto_share_strm: false
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
    
    watch: {
        'config.auto_transfer_115'(val) {
            if (val && this.config.auto_share_strm) {
                this.config.auto_share_strm = false;
            }
        },
        'config.auto_share_strm'(val) {
            if (val && this.config.auto_transfer_115) {
                this.config.auto_transfer_115 = false;
            }
        }
    },
    
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [configRes, configs115Res, accountsRes] = await Promise.all([
                    this.fetchApi('/api/hdhive/config'),
                    api.get115Configs(),
                    api.getHdhiveAccounts()
                ]);
                if (configRes?.data) {
                    this.config = { ...this.config, ...configRes.data };
                    if (!this.config.transfer_folders) {
                        this.config.transfer_folders = [];
                    }
                    if (this.config.auto_share_strm === undefined) {
                        this.config.auto_share_strm = false;
                    }
                }
                this.configs115 = configs115Res || [];
                this.hdhiveAccounts = accountsRes || [];
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
                const res = await this.fetchApi('/api/hdhive/config', {
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
                // 检查是否已存在相同 CID
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
                const res = await this.fetchApi('/api/hdhive/config', {
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
                const res = await this.fetchApi('/api/hdhive/config', {
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
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">HDHive 解析</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(255,180,0,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
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
                    <h3 style="color: white; margin-bottom: 16px;"><v-icon color="warning">mdi-bee</v-icon> 基础配置</h3>
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch v-model="config.enabled" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 HDHive 解析</span>
                            </div>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="config.use_hdhive_account" label="使用 HDHive 账号" :items="hdhiveAccounts" item-title="name" item-value="name" variant="outlined" density="comfortable" placeholder="选择 HDHive 账号" hide-details clearable></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="config.points_limit" label="积分解锁限制" type="number" placeholder="超过此积分不自动解锁" variant="outlined" density="comfortable" hide-details></v-text-field>
                            <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-top: 4px;">
                                官组资源不受积分限制影响
                            </div>
                        </v-col>
                    </v-row>
                    <div v-if="hdhiveAccounts.length === 0" style="margin-top: 12px; padding: 12px; background: rgba(255,165,0,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="warning">mdi-alert-circle</v-icon>
                            请先在「HDHive 助手」中添加账号配置
                        </div>
                    </div>
                </div>

                <!-- 115 转存配置 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;" :style="{ opacity: config.auto_share_strm ? 0.5 : 1 }">
                    <h3 style="color: white; margin-bottom: 16px;"><v-icon color="primary">mdi-cloud-upload</v-icon> 115 转存配置</h3>
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch v-model="config.auto_transfer_115" color="primary" hide-details density="compact" style="flex: none;" :disabled="config.auto_share_strm"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用自动转存到 115</span>
                            </div>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="config.use_115_config" label="使用 115 配置" :items="configs115" :item-title="item => item.name" item-value="name" variant="outlined" density="comfortable" placeholder="选择用于转存的 115 配置" hide-details clearable :disabled="!config.auto_transfer_115"></v-select>
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
                    
                    <!-- 转存文件夹列表 -->
                    <div v-if="config.auto_transfer_115" style="margin-top: 20px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <span style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;">
                                <v-icon size="18" color="warning">mdi-folder-multiple</v-icon>
                                转存文件夹 ({{ config.transfer_folders.length }})
                            </span>
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
                </div>

                <!-- 解析完生成 115 分享 STRM -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;" :style="{ opacity: config.auto_transfer_115 ? 0.5 : 1 }">
                    <h3 style="color: white; margin-bottom: 16px;">
                        <v-icon color="teal">mdi-file-video</v-icon> 解析完生成 115 分享 STRM
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch v-model="config.auto_share_strm" color="teal" hide-details density="compact" style="flex: none;" :disabled="config.auto_transfer_115"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用解析完生成 115 分享 STRM</span>
                            </div>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 16px; padding: 12px; background: rgba(0,150,136,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.8;">
                            <v-icon size="16" color="teal">mdi-information</v-icon>
                            <strong>说明：</strong><br>
                            • 开启后，HDHive 解析完成如果链接是 115 分享链接，将自动提交到「115 分享 STRM」生成 STRM 文件<br>
                            • 路径、转存再分享模式等配置全部使用「115 分享 STRM」页面的设置<br>
                        </div>
                    </div>
                </div>

                <!-- 使用说明 -->
                <div style="margin-top: 16px; padding: 16px; background: rgba(255,180,0,0.1); border-radius: 12px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px; line-height: 1.8;">
                        <v-icon size="18" color="warning">mdi-lightbulb</v-icon>
                        <strong>使用说明：</strong><br>
                        1. 先在「HDHive 助手」中添加账号并获取 Token<br>
                        2. 选择账号后通过 Telegram Bot 发送 HDHive 链接即可自动解析<br>
                        3. 签到功能请在「HDHive 签到」中配置<br>
                        4. 代理设置请在「系统设置」的「全局设置」中配置
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
