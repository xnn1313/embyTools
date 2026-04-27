// 文件整理页面组件（侧边栏 123 STRM 子页面）
const FileTransferPage = {
    name: 'FileTransferPage',
    components: {
        FilePickerDialog,
    },
    data() {
        return {
            loading: false,
            saving: false,
            configs: [],
            categoryNames: { movie: [], tv: [] },
            monitorStatus: { started: false, watchdog_available: false, watchers: [] },
            available115Configs: [],
            configDefaults: {
                id: '',
                name: '',
                source_path: '',
                target_path: '',
                monitor_enabled: false,
                monitor_mode: 'compatibility',
                auto_category: true,
                category_by_media_type: true,
                category_by_secondary: true,
                download_metadata: false,
                metadata_nfo_enabled: false,
                metadata_images_enabled: false,
                metadata_overwrite_enabled: false,
                media_info_extract_enabled: false,
                media_info_extract_reuse_enabled: false,
                transfer_type: 'move',
                overwrite_enabled: false,
                overwrite_mode: 'always',
                delete_empty_dirs: true,
                use_115_config: '',
                source_cid: '',
                target_cid: '',
            },
            editDialog: false,
            editForm: {
                id: '',
                name: '',
                source_path: '',
                target_path: '',
                monitor_enabled: false,
                monitor_mode: 'compatibility',
                auto_category: true,
                category_by_media_type: true,
                category_by_secondary: true,
                download_metadata: false,
                metadata_nfo_enabled: false,
                metadata_images_enabled: false,
                metadata_overwrite_enabled: false,
                media_info_extract_enabled: false,
                media_info_extract_reuse_enabled: false,
                transfer_type: 'move',
                overwrite_enabled: false,
                overwrite_mode: 'always',
                delete_empty_dirs: true,
                use_115_config: '',
                source_cid: '',
                target_cid: '',
            },
            editIndex: -1,
            deleteDialog: false,
            deleteId: '',
            transferTypeCards: [
                { value: 'move', title: '移动文件', icon: 'mdi-folder-move', description: '适用于本地文件或网盘挂载路径', starred: false },
                { value: 'copy', title: '复制文件', icon: 'mdi-content-copy', description: '适用于本地文件或网盘挂载路径', starred: false },
                { value: '115_move', title: '115 移动', icon: 'mdi-cloud-upload', description: '使用 115cookie 进行批量操作速度极快', starred: true },
                { value: '115_copy', title: '115 复制', icon: 'mdi-cloud-sync', description: '使用 115cookie 进行批量操作速度极快', starred: true },
                { value: 'cd2_move', title: 'CD2 移动', icon: 'mdi-cloud-upload', description: '使用 CD2 进行批量操作，速度极快', starred: true },
                { value: 'cd2_copy', title: 'CD2 复制', icon: 'mdi-cloud-sync', description: '使用 CD2 进行批量操作，速度极快', starred: true },
            ],
            overwriteModeItems: [
                { title: '始终覆盖', value: 'always' },
                { title: '按大小', value: 'size' },
                { title: '按分辨率', value: 'resolution' },
            ],
            pickerDialog: false,
            pickerTarget: '',
            // 115 云盘文件夹选择器
            cloud115PickerDialog: false,
            cloud115PickerTarget: '',
            cloud115Loading: false,
            cloud115Folders: [],
            cloud115CurrentCid: '0',
            cloud115Path: [{ name: '根目录', cid: '0' }],
            cloud115CreateMode: false,
            cloud115CreateName: '',
            cloud115CreateLoading: false,
            // CD2 云盘文件夹选择器
            cloudCd2PickerDialog: false,
            cloudCd2PickerTarget: '',
            cloudCd2Loading: false,
            cloudCd2Items: [],
            cloudCd2CurrentPath: '/',
            cloudCd2Path: [{ name: '根目录', path: '/' }],
            monitorModeCards: [
                { value: 'performance', title: '性能模式', icon: 'mdi-lightning-bolt', description: '使用系统事件监听，网盘挂载路径勿用' },
                { value: 'compatibility', title: '兼容模式', icon: 'mdi-sync', description: '使用轮询扫描，兼容性更好，适合网络挂载目录' },
            ],
        }
    },
    async mounted() {
        await this.loadData();
    },
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [configsRes, categoryRes, statusRes, configs115Res] = await Promise.all([
                    api.request('/file_transfer/configs'),
                    api.request('/transfer_config/category/names'),
                    api.request('/file_transfer/status'),
                    api.request('/115/configs').catch(() => ({ success: false })),
                ]);
                if (configsRes.success) {
                    if (configsRes.defaults) {
                        this.configDefaults = { ...this.configDefaults, ...configsRes.defaults };
                    }
                    this.configs = configsRes.data || [];
                }
                if (categoryRes.success) this.categoryNames = categoryRes.data || { movie: [], tv: [] };
                if (statusRes.success) this.monitorStatus = statusRes.data || { started: false, watchdog_available: false, watchers: [] };
                if (configs115Res.success) this.available115Configs = (configs115Res.data || []).filter(c => !c.has_open_token).map(c => ({ title: c.name || c.id, value: c.name || c.id }));
            } catch (e) {
                window.showMessage && window.showMessage('加载配置失败: ' + (e.message || ''), 'error');
            } finally {
                this.loading = false;
            }
        },
        buildEditForm(config = {}) {
            return {
                ...this.configDefaults,
                ...config,
            };
        },
        openAddDialog() {
            this.editIndex = -1;
            this.editForm = this.buildEditForm();
            this.editDialog = true;
        },
        openEditDialog(config, index) {
            this.editIndex = index;
            this.editForm = this.buildEditForm(config);
            this.editDialog = true;
        },
        async saveConfig() {
            if (!this.editForm.name || !this.editForm.source_path || !this.editForm.target_path) {
                window.showMessage && window.showMessage('请填写名称、源目录和目标目录', 'error');
                return;
            }
            if (this.editForm.transfer_type && this.editForm.transfer_type.startsWith('115_')) {
                if (!this.editForm.use_115_config) {
                    window.showMessage && window.showMessage('115 模式请选择要使用的 115 配置', 'error');
                    return;
                }
                if (!this.editForm.source_cid) {
                    window.showMessage && window.showMessage('115 模式请通过文件夹选择器选择源目录', 'error');
                    return;
                }
                if (!this.editForm.target_cid) {
                    window.showMessage && window.showMessage('115 模式请通过文件夹选择器选择目标目录', 'error');
                    return;
                }
            }
            this.saving = true;
            try {
                let result;
                if (this.editForm.id) {
                    result = await api.request('/file_transfer/configs/' + this.editForm.id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(this.editForm)
                    });
                } else {
                    result = await api.request('/file_transfer/configs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(this.editForm)
                    });
                }
                if (result.success) {
                    window.showMessage && window.showMessage(result.message || '已保存', 'success');
                    this.editDialog = false;
                    await this.loadData();
                } else {
                    window.showMessage && window.showMessage(result.message || '保存失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('保存失败: ' + (e.message || ''), 'error');
            } finally {
                this.saving = false;
            }
        },
        confirmDelete(id) {
            this.deleteId = id;
            this.deleteDialog = true;
        },
        async doDelete() {
            try {
                const result = await api.request('/file_transfer/configs/' + this.deleteId, { method: 'DELETE' });
                if (result.success) {
                    window.showMessage && window.showMessage('已删除', 'success');
                    await this.loadData();
                } else {
                    window.showMessage && window.showMessage(result.message || '删除失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('删除失败', 'error');
            } finally {
                this.deleteDialog = false;
                this.deleteId = '';
            }
        },
        getTransferTypeLabel(val) {
            const item = this.transferTypeCards.find(i => i.value === val);
            return item ? item.title : val;
        },
        getOverwriteModeLabel(config) {
            if (!config || !config.overwrite_enabled) {
                return '不覆盖';
            }
            const item = this.overwriteModeItems.find(i => i.value === config.overwrite_mode);
            return item ? item.title : (config.overwrite_mode || '始终覆盖');
        },
        getMonitorModeLabel(mode) {
            if (mode === 'event' || mode === 'performance') {
                return '性能模式';
            }
            if (mode === 'compatibility') {
                return '兼容模式';
            }
            return mode || '兼容模式';
        },
        getRuntimeWatcher(config) {
            const sourcePath = String((config || {}).source_path || '').trim();
            const name = String((config || {}).name || '').trim();
            return (this.monitorStatus.watchers || []).find(item => {
                const watcherPath = String((item || {}).source_path || '').trim();
                const watcherName = String((item || {}).name || '').trim();
                if (watcherPath !== sourcePath) {
                    return false;
                }
                if (!name || !watcherName) {
                    return true;
                }
                return watcherName === name;
            }) || null;
        },
        getMonitorStateLabel(config) {
            if (!config || !config.monitor_enabled) {
                return '未启用';
            }
            if (this.getRuntimeWatcher(config)) {
                return '运行中';
            }
            return this.monitorStatus.started ? '待启动' : '未启动';
        },
        getMonitorStateColor(config) {
            if (!config || !config.monitor_enabled) {
                return 'grey';
            }
            if (this.getRuntimeWatcher(config)) {
                return 'success';
            }
            return this.monitorStatus.started ? 'warning' : 'grey';
        },
        getRuntimeMonitorModeLabel(config) {
            const watcher = this.getRuntimeWatcher(config);
            return this.getMonitorModeLabel((watcher || {}).effective_mode || (watcher || {}).monitor_mode || (config || {}).monitor_mode);
        },
        // 统一路径选择入口：根据当前整理方式决定打开本地选择器还是 115 云盘选择器
        openPathPicker(target) {
            if (this.editForm.transfer_type.startsWith('115_')) {
                if (!this.editForm.use_115_config) {
                    window.showMessage && window.showMessage('请先在下方选择 115 账号配置', 'warning');
                    return;
                }
                this.cloud115PickerTarget = target;
                this.cloud115CurrentCid = '0';
                this.cloud115Path = [{ name: '根目录', cid: '0' }];
                this.cloud115CreateMode = false;
                this.cloud115CreateName = '';
                this.cloud115PickerDialog = true;
                this.loadCloud115Folders('0');
            } else if (this.editForm.transfer_type.startsWith('cd2_')) {
                this.cloudCd2PickerTarget = target;
                this.cloudCd2CurrentPath = '/';
                this.cloudCd2Path = [{ name: '根目录', path: '/' }];
                this.cloudCd2PickerDialog = true;
                this.loadCloudCd2Folders('/');
            } else {
                this.pickerTarget = target;
                this.pickerDialog = true;
            }
        },
        // 115 云盘文件夹浏览
        async loadCloud115Folders(cid) {
            this.cloud115Loading = true;
            try {
                const res = await api.request(`/115/folders?config_name=${encodeURIComponent(this.editForm.use_115_config)}&cid=${cid}`);
                if (res.success) {
                    this.cloud115Folders = res.data.folders || [];
                    this.cloud115CurrentCid = cid;
                    if (res.data.path && res.data.path.length > 0) {
                        this.cloud115Path = res.data.path;
                    }
                } else {
                    window.showMessage && window.showMessage(res.message || '加载 115 目录失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载 115 目录失败: ' + (e.message || ''), 'error');
            } finally {
                this.cloud115Loading = false;
            }
        },
        enterCloud115Folder(folder) {
            this.loadCloud115Folders(folder.cid);
        },
        goBackCloud115() {
            if (this.cloud115Path.length > 1) {
                const parent = this.cloud115Path[this.cloud115Path.length - 2];
                this.loadCloud115Folders(parent.cid);
            }
        },
        goToCloud115Path(index) {
            const target = this.cloud115Path[index];
            this.loadCloud115Folders(target.cid);
        },
        selectCloud115Folder() {
            const pathStr = '/' + this.cloud115Path.slice(1).map(p => p.name).join('/');
            const cid = this.cloud115CurrentCid;
            if (this.cloud115PickerTarget === 'source') {
                this.editForm.source_path = pathStr;
                this.editForm.source_cid = cid;
            } else {
                this.editForm.target_path = pathStr;
                this.editForm.target_cid = cid;
            }
            this.cloud115PickerDialog = false;
        },
        // CD2 云盘文件夹浏览
        async loadCloudCd2Folders(path) {
            this.cloudCd2Loading = true;
            try {
                const browseRes = await api.request(`/cd2/browse?path=${encodeURIComponent(path)}`);
                if (browseRes.success && browseRes.data) {
                    this.cloudCd2Items = (browseRes.data.items || []).filter(i => i.is_dir);
                    this.cloudCd2CurrentPath = browseRes.data.current_path || path;
                } else {
                    window.showMessage && window.showMessage(browseRes.message || '加载 CD2 目录失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载 CD2 目录失败: ' + (e.message || ''), 'error');
            } finally {
                this.cloudCd2Loading = false;
            }
        },
        enterCloudCd2Folder(folder) {
            this.cloudCd2Path.push({ name: folder.name, path: folder.path });
            this.loadCloudCd2Folders(folder.path);
        },
        goBackCloudCd2() {
            if (this.cloudCd2Path.length > 1) {
                this.cloudCd2Path.pop();
                const parent = this.cloudCd2Path[this.cloudCd2Path.length - 1];
                this.loadCloudCd2Folders(parent.path);
            }
        },
        goToCloudCd2Path(index) {
            this.cloudCd2Path = this.cloudCd2Path.slice(0, index + 1);
            const target = this.cloudCd2Path[index];
            this.loadCloudCd2Folders(target.path);
        },
        selectCloudCd2Folder() {
            const cd2Path = this.cloudCd2CurrentPath;
            if (this.cloudCd2PickerTarget === 'source') {
                this.editForm.source_path = cd2Path;
            } else {
                this.editForm.target_path = cd2Path;
            }
            this.cloudCd2PickerDialog = false;
        },
        async createCloud115Folder() {
            const name = (this.cloud115CreateName || '').trim();
            if (!name) { window.showMessage && window.showMessage('请输入文件夹名称', 'warning'); return; }
            this.cloud115CreateLoading = true;
            try {
                const res = await api.request('/115/folders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config_name: this.editForm.use_115_config, parent_cid: this.cloud115CurrentCid, folder_name: name })
                });
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '创建成功', 'success');
                    this.cloud115CreateMode = false;
                    this.cloud115CreateName = '';
                    await this.loadCloud115Folders(this.cloud115CurrentCid);
                } else {
                    window.showMessage && window.showMessage(res.message || '创建失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('创建失败: ' + (e.message || ''), 'error');
            } finally {
                this.cloud115CreateLoading = false;
            }
        },
    },
    template: `
        <div>
            <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4"></v-progress-linear>


            <!-- 配置列表 -->
            <v-row>
                <v-col v-for="(config, index) in configs" :key="config.id" cols="12" md="6" lg="4">
                    <v-card class="glass-card" style="border-radius: 16px; overflow: hidden;">
                        <v-card-title class="d-flex align-center" style="padding: 14px 16px; font-size: 15px; font-weight: 600;">
                            <v-icon color="primary" size="20" class="mr-2">mdi-folder-sync</v-icon>
                            {{ config.name || '未命名' }}
                            <v-spacer></v-spacer>
                            <v-chip v-if="config.monitor_enabled" size="x-small" :color="getMonitorStateColor(config)" variant="tonal" class="mr-1">{{ getMonitorStateLabel(config) }}</v-chip>
                            <v-chip v-if="config.category_by_media_type || config.category_by_secondary" size="x-small" color="info" variant="tonal" class="mr-1">分类</v-chip>
                            <v-chip v-if="config.download_metadata" size="x-small" color="deep-purple" variant="tonal">元数据</v-chip>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text style="padding: 12px 16px; font-size: 13px; line-height: 1.8;">
                            <div><strong>源目录：</strong><span style="font-family: monospace; word-break: break-all;">{{ config.source_path }}</span></div>
                            <div><strong>目标目录：</strong><span style="font-family: monospace; word-break: break-all;">{{ config.target_path }}</span></div>
                            <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap;">
                                <v-chip size="x-small" variant="tonal" :color="(config.transfer_type || '').startsWith('115_') ? 'warning' : (config.transfer_type || '').startsWith('cd2_') ? 'cyan' : 'primary'">
                                    <v-icon v-if="(config.transfer_type || '').startsWith('115_') || (config.transfer_type || '').startsWith('cd2_')" start size="12">mdi-star</v-icon>
                                    {{ getTransferTypeLabel(config.transfer_type) }}
                                </v-chip>
                                <v-chip v-if="(config.transfer_type || '').startsWith('115_') && config.use_115_config" size="x-small" variant="outlined" color="warning">{{ config.use_115_config }}</v-chip>
                                <v-chip v-if="(config.transfer_type || '').startsWith('cd2_')" size="x-small" variant="outlined" color="cyan">CD2</v-chip>
                                <v-chip size="x-small" variant="tonal" :color="config.overwrite_enabled ? 'warning' : 'grey'">{{ getOverwriteModeLabel(config) }}</v-chip>
                                <v-chip v-if="config.monitor_enabled" size="x-small" variant="tonal" color="deep-purple">{{ getRuntimeMonitorModeLabel(config) }}</v-chip>
                            </div>
                            <div v-if="config.monitor_enabled" style="margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(61,111,213,0.06); border: 1px solid rgba(61,111,213,0.12);">
                                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                                    <v-chip size="x-small" :color="getMonitorStateColor(config)" variant="tonal">{{ getMonitorStateLabel(config) }}</v-chip>
                                    <v-chip size="x-small" color="primary" variant="outlined">{{ getRuntimeMonitorModeLabel(config) }}</v-chip>
                                </div>
                            </div>
                        </v-card-text>
                        <v-divider></v-divider>
                        <v-card-actions style="padding: 8px 12px; justify-content: flex-end; gap: 4px;">
                            <v-btn variant="text" size="small" color="primary" @click="openEditDialog(config, index)">
                                <v-icon start size="16">mdi-pencil</v-icon>编辑
                            </v-btn>
                            <v-btn variant="text" size="small" color="error" @click="confirmDelete(config.id)">
                                <v-icon start size="16">mdi-delete</v-icon>删除
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>

                <!-- 添加按钮 -->
                <v-col cols="12" md="6" lg="4">
                    <v-card class="glass-card d-flex align-center justify-center" style="border-radius: 16px; min-height: 180px; cursor: pointer; border: 2px dashed rgba(61,111,213,0.3);" @click="openAddDialog">
                        <div class="text-center">
                            <v-icon size="48" color="primary" style="opacity: 0.5;">mdi-plus-circle-outline</v-icon>
                            <div style="margin-top: 8px; font-size: 14px; opacity: 0.6;">添加文件整理配置</div>
                        </div>
                    </v-card>
                </v-col>
            </v-row>

            <!-- 编辑弹窗 -->
            <v-dialog v-model="editDialog" max-width="600px" scrollable>
                <v-card style="border-radius: 16px; overflow: hidden;">
                    <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                        <v-icon color="primary" size="22" class="mr-2">mdi-folder-sync</v-icon>
                        {{ editForm.id ? '编辑配置' : '添加配置' }}
                        <v-spacer></v-spacer>
                        <v-btn icon variant="text" size="x-small" @click="editDialog = false">
                            <v-icon size="20">mdi-close</v-icon>
                        </v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text style="padding: 16px 20px;">
                        <v-text-field v-model="editForm.name" label="配置名称" variant="outlined" density="compact" hide-details class="mb-3" placeholder="例如：电影整理"></v-text-field>
                        <div class="d-flex align-center gap-2 mb-3">
                            <v-text-field v-model="editForm.source_path" :label="editForm.transfer_type.startsWith('115_') ? '源目录 (115 云盘)' : editForm.transfer_type.startsWith('cd2_') ? '源目录 (CD2)' : '源目录'" variant="outlined" density="compact" hide-details :placeholder="editForm.transfer_type.startsWith('115_') ? '点击右侧按钮选择 115 云盘目录' : editForm.transfer_type.startsWith('cd2_') ? '点击右侧按钮选择 CD2 目录' : '/path/to/downloads'" :readonly="editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_')" style="flex: 1;"></v-text-field>
                            <v-btn icon variant="tonal" size="small" :color="editForm.transfer_type.startsWith('115_') ? 'warning' : editForm.transfer_type.startsWith('cd2_') ? 'cyan' : 'primary'" @click="openPathPicker('source')" style="flex-shrink: 0;">
                                <v-icon size="20">{{ (editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_')) ? 'mdi-cloud-search-outline' : 'mdi-folder-search-outline' }}</v-icon>
                            </v-btn>
                        </div>
                        <div class="d-flex align-center gap-2 mb-3">
                            <v-text-field v-model="editForm.target_path" :label="editForm.transfer_type.startsWith('115_') ? '目标目录 (115 云盘)' : editForm.transfer_type.startsWith('cd2_') ? '目标目录 (CD2)' : '目标目录'" variant="outlined" density="compact" hide-details :placeholder="editForm.transfer_type.startsWith('115_') ? '点击右侧按钮选择 115 云盘目录' : editForm.transfer_type.startsWith('cd2_') ? '点击右侧按钮选择 CD2 目录' : '/path/to/library'" :readonly="editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_')" style="flex: 1;"></v-text-field>
                            <v-btn icon variant="tonal" size="small" :color="editForm.transfer_type.startsWith('115_') ? 'warning' : editForm.transfer_type.startsWith('cd2_') ? 'cyan' : 'primary'" @click="openPathPicker('target')" style="flex-shrink: 0;">
                                <v-icon size="20">{{ (editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_')) ? 'mdi-cloud-search-outline' : 'mdi-folder-search-outline' }}</v-icon>
                            </v-btn>
                        </div>

                        <div class="mb-3">
                            <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: rgba(var(--v-theme-on-surface),0.8);">整理方式</div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                <v-card
                                    v-for="card in transferTypeCards"
                                    :key="card.value"
                                    variant="outlined"
                                    :style="{
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        borderColor: editForm.transfer_type === card.value ? (card.starred ? 'rgb(var(--v-theme-warning))' : 'rgb(var(--v-theme-primary))') : 'rgba(var(--v-theme-on-surface), 0.12)',
                                        borderWidth: editForm.transfer_type === card.value ? '2px' : '1px',
                                        background: editForm.transfer_type === card.value ? (card.starred ? 'rgba(var(--v-theme-warning), 0.08)' : 'rgba(var(--v-theme-primary), 0.06)') : 'transparent',
                                        transition: 'all 0.2s ease',
                                    }"
                                    @click="editForm.transfer_type = card.value; if (card.value.startsWith('115_') && editForm.monitor_enabled && editForm.monitor_mode === 'performance') editForm.monitor_mode = 'compatibility';"
                                >
                                    <v-card-text style="padding: 14px;">
                                        <div class="d-flex align-center">
                                            <v-icon :color="editForm.transfer_type === card.value ? (card.starred ? 'warning' : 'primary') : undefined" size="22" class="mr-2">{{ card.icon }}</v-icon>
                                            <span style="font-weight: 600; font-size: 14px;">{{ card.title }}</span>
                                            <v-icon v-if="card.starred" color="amber" size="16" class="ml-1" title="推荐使用">mdi-star</v-icon>
                                            <v-icon v-if="editForm.transfer_type === card.value" :color="card.starred ? 'warning' : 'primary'" size="16" class="ml-auto">mdi-check-circle</v-icon>
                                        </div>
                                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-top: 6px; line-height: 1.5;">{{ card.description }}</div>
                                    </v-card-text>
                                </v-card>
                            </div>
                        </div>

                        <v-expand-transition>
                            <div v-if="editForm.transfer_type.startsWith('115_')" class="mb-3">
                                <div style="margin-top: 4px; padding: 14px; border-radius: 14px; background: rgba(255,152,0,0.06); border: 1px solid rgba(255,152,0,0.18);">
                                    <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; margin-bottom: 10px;">
                                        <v-icon color="warning" size="18">mdi-cloud-cog</v-icon>
                                        <span>115 账号</span>
                                    </div>
                                    <v-select v-model="editForm.use_115_config" :items="available115Configs" item-title="title" item-value="value" label="选择 115 配置" variant="outlined" density="compact" hide-details placeholder="请选择要使用的 115 配置" no-data-text="暂无 115 配置，请先在网盘管理中添加"></v-select>
                                    <div style="margin-top: 10px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); line-height: 1.7;">
                                        <v-icon size="14" color="warning" class="mr-1">mdi-alert-circle-outline</v-icon>
                                        选择 115 操作模式后，请使用上方源目录和目标目录旁的 <strong>云盘文件夹选择器</strong> 重新选择路径。
                                    </div>
                                </div>
                            </div>
                        </v-expand-transition>


                        <v-switch v-model="editForm.overwrite_enabled" label="启用覆盖" color="warning" hide-details density="compact"></v-switch>

                        <v-expand-transition>
                            <div v-if="editForm.overwrite_enabled" class="mt-3">
                                <v-select v-model="editForm.overwrite_mode" :items="overwriteModeItems" item-title="title" item-value="value" label="覆盖方式" variant="outlined" density="compact" hide-details></v-select>
                            </div>
                        </v-expand-transition>

                        <v-divider class="my-4"></v-divider>

                        <v-switch v-model="editForm.monitor_enabled" label="开启实时监控" color="success" hide-details density="compact"></v-switch>
                        <v-expand-transition>
                            <div v-if="editForm.monitor_enabled" class="mt-3">
                                <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: rgba(var(--v-theme-on-surface),0.8);">监控模式</div>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    <v-card
                                        v-for="card in monitorModeCards"
                                        :key="card.value"
                                        variant="outlined"
                                        :style="{
                                            borderRadius: '12px',
                                            cursor: (card.value === 'performance' && (editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_'))) ? 'not-allowed' : 'pointer',
                                            borderColor: editForm.monitor_mode === card.value ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-on-surface), 0.12)',
                                            borderWidth: editForm.monitor_mode === card.value ? '2px' : '1px',
                                            background: editForm.monitor_mode === card.value ? 'rgba(var(--v-theme-primary), 0.06)' : 'transparent',
                                            opacity: (card.value === 'performance' && (editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_'))) ? 0.45 : 1,
                                            transition: 'all 0.2s ease',
                                        }"
                                        @click="if (card.value === 'performance' && (editForm.transfer_type.startsWith('115_') || editForm.transfer_type.startsWith('cd2_'))) return; editForm.monitor_mode = card.value;"
                                    >
                                        <v-card-text style="padding: 14px;">
                                            <div class="d-flex align-center">
                                                <v-icon :color="editForm.monitor_mode === card.value ? 'primary' : undefined" size="22" class="mr-2">{{ card.icon }}</v-icon>
                                                <span style="font-weight: 600; font-size: 14px;">{{ card.title }}</span>
                                                <v-chip v-if="card.value === 'performance' && editForm.transfer_type.startsWith('115_')" size="x-small" color="warning" variant="tonal" class="ml-2">115 模式 API 轮询</v-chip>
                                                <v-chip v-if="card.value === 'performance' && editForm.transfer_type.startsWith('cd2_')" size="x-small" color="cyan" variant="tonal" class="ml-2">CD2 模式 API 轮询</v-chip>
                                                <v-icon v-if="editForm.monitor_mode === card.value" color="primary" size="16" class="ml-auto">mdi-check-circle</v-icon>
                                            </div>
                                            <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-top: 6px; line-height: 1.5;">{{ card.description }}</div>
                                        </v-card-text>
                                    </v-card>
                                </div>
                            </div>
                        </v-expand-transition>

                        <v-switch v-model="editForm.category_by_media_type" label="按类别分类" color="info" hide-details density="compact" class="mt-2"></v-switch>
                        <v-switch v-model="editForm.category_by_secondary" label="按类型分类" color="info" hide-details density="compact" class="mt-1"></v-switch>
                        <v-switch v-model="editForm.delete_empty_dirs" label="整理完成删除空文件夹" color="warning" hide-details density="compact" class="mt-2"></v-switch>
                        <div style="margin-top: 14px; padding: 14px; border-radius: 14px; background: rgba(61,111,213,0.05); border: 1px solid rgba(61,111,213,0.12);">
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; margin-bottom: 6px;">
                                <v-icon color="deep-purple" size="18">mdi-file-document-multiple-outline</v-icon>
                                <span>元数据下载</span>
                            </div>
                            <v-switch v-model="editForm.download_metadata" label="下载元数据" color="deep-purple" hide-details density="compact"></v-switch>
                            <v-expand-transition>
                                <div v-if="editForm.download_metadata">
                                    <div style="margin-top: 10px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.62); line-height: 1.7;">
                                        这里控制当前文件整理配置在整理完成后是否生成 NFO、海报和背景图，以及已有元数据是否允许覆盖。
                                    </div>
                                    <v-switch v-model="editForm.metadata_nfo_enabled" label="生成 NFO 元数据文件" color="deep-purple" hide-details density="compact" class="mt-3"></v-switch>
                                    <v-switch v-model="editForm.metadata_images_enabled" label="下载海报和背景图" color="deep-purple" hide-details density="compact" class="mt-3"></v-switch>
                                    <v-switch v-model="editForm.metadata_overwrite_enabled" label="已有元数据时允许覆盖" color="deep-purple" hide-details density="compact" class="mt-3"></v-switch>
                                </div>
                            </v-expand-transition>
                        </div>

                        <div style="margin-top: 14px; padding: 14px; border-radius: 14px; background: rgba(61,111,213,0.05); border: 1px solid rgba(61,111,213,0.12);">
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; margin-bottom: 6px;">
                                <v-icon color="primary" size="18">mdi-filmstrip-box-multiple</v-icon>
                                <span>媒体信息提取</span>
                            </div>
                            <v-switch v-model="editForm.media_info_extract_enabled" label="启用媒体信息提取" color="primary" hide-details density="compact" @update:modelValue="value => { if (!value) editForm.media_info_extract_reuse_enabled = false; }"></v-switch>
                            <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-top: 6px; line-height: 1.5;">文件名缺少参数时启用 ffprobe 提取媒体信息补全</div>
                            <v-expand-transition>
                                <div v-if="editForm.media_info_extract_enabled">
                                    <v-switch v-model="editForm.media_info_extract_reuse_enabled" label="媒体信息复用" color="primary" hide-details density="compact" class="mt-3"></v-switch>
                                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-top: 6px; line-height: 1.5;">同一个文件夹下只提取一个视频文件的媒体信息共享到其他文件补全文件名</div>
                                </div>
                            </v-expand-transition>
                        </div>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-actions style="padding: 12px 20px; justify-content: flex-end; gap: 8px;">
                        <v-btn variant="tonal" @click="editDialog = false" style="border-radius: 10px;">取消</v-btn>
                        <v-btn color="primary" variant="elevated" @click="saveConfig" :loading="saving" style="border-radius: 10px;">
                            <v-icon start size="18">mdi-content-save</v-icon>保存
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 本地文件选择对话框 -->
            <file-picker-dialog
                v-model="pickerDialog"
                :title="pickerTarget === 'source' ? '选择源目录' : '选择目标目录'"
                @selected="val => { if(pickerTarget==='source') editForm.source_path = val; else editForm.target_path = val; }"
            ></file-picker-dialog>

            <!-- 115 云盘文件夹选择器弹窗 -->
            <v-dialog v-model="cloud115PickerDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(255,152,0,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="warning">mdi-cloud-search-outline</v-icon>
                                <span>{{ cloud115PickerTarget === 'source' ? '选择 115 源目录' : '选择 115 目标目录' }}</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="cloud115PickerDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>

                    <!-- 路径导航 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <template v-for="(p, idx) in cloud115Path" :key="idx">
                                <v-chip size="small" :color="idx === cloud115Path.length - 1 ? 'warning' : 'default'" variant="tonal" @click="goToCloud115Path(idx)" style="cursor: pointer; border-radius: 6px;">{{ p.name }}</v-chip>
                                <v-icon v-if="idx < cloud115Path.length - 1" size="14" color="grey">mdi-chevron-right</v-icon>
                            </template>
                        </div>
                    </div>

                    <v-card-text style="height: 320px; padding: 0;">
                        <div v-if="cloud115Loading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="warning"></v-progress-circular>
                        </div>
                        <div v-else-if="cloud115Folders.length > 0" style="padding: 8px;">
                            <div v-for="folder in cloud115Folders" :key="folder.cid" @click="enterCloud115Folder(folder)" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,152,0,0.08)'" onmouseout="this.style.background='rgba(var(--v-theme-on-surface),0.03)'">
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
                    <div v-if="cloud115CreateMode" style="padding: 12px 16px; background: rgba(76,175,80,0.08); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-text-field v-model="cloud115CreateName" label="新文件夹名称" placeholder="输入文件夹名称" variant="outlined" density="compact" hide-details autofocus @keyup.enter="createCloud115Folder" style="flex: 1;"></v-text-field>
                            <v-btn color="success" variant="elevated" size="small" @click="createCloud115Folder" :loading="cloud115CreateLoading" style="border-radius: 8px;">
                                <v-icon size="18">mdi-check</v-icon>
                            </v-btn>
                            <v-btn variant="text" size="small" @click="cloud115CreateMode = false" style="border-radius: 8px;">
                                <v-icon size="18">mdi-close</v-icon>
                            </v-btn>
                        </div>
                    </div>
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackCloud115" :disabled="cloud115Path.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-btn variant="tonal" color="success" @click="cloud115CreateMode = !cloud115CreateMode" style="border-radius: 8px; margin-left: 8px;">
                            <v-icon left size="18">mdi-folder-plus</v-icon>新建
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="warning" variant="elevated" @click="selectCloud115Folder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- CD2 云盘文件夹选择器弹窗 -->
            <v-dialog v-model="cloudCd2PickerDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(0,188,212,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="cyan">mdi-cloud-search-outline</v-icon>
                                <span>{{ cloudCd2PickerTarget === 'source' ? '选择 CD2 源目录' : '选择 CD2 目标目录' }}</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="cloudCd2PickerDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>

                    <!-- 路径导航 -->
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <template v-for="(p, idx) in cloudCd2Path" :key="idx">
                                <v-chip size="small" :color="idx === cloudCd2Path.length - 1 ? 'cyan' : 'default'" variant="tonal" @click="goToCloudCd2Path(idx)" style="cursor: pointer; border-radius: 6px;">{{ p.name }}</v-chip>
                                <v-icon v-if="idx < cloudCd2Path.length - 1" size="14" color="grey">mdi-chevron-right</v-icon>
                            </template>
                        </div>
                    </div>

                    <v-card-text style="height: 320px; padding: 0;">
                        <div v-if="cloudCd2Loading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="cyan"></v-progress-circular>
                        </div>
                        <div v-else-if="cloudCd2Items.length > 0" style="padding: 8px;">
                            <div v-for="folder in cloudCd2Items" :key="folder.path" @click="enterCloudCd2Folder(folder)" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,188,212,0.08)'" onmouseout="this.style.background='rgba(var(--v-theme-on-surface),0.03)'">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <v-icon color="cyan" size="22">mdi-folder</v-icon>
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

                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackCloudCd2" :disabled="cloudCd2Path.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="cyan" variant="elevated" @click="selectCloudCd2Folder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 删除确认弹窗 -->
            <v-dialog v-model="deleteDialog" max-width="380px">
                <v-card style="border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                        <v-icon color="error" size="22" class="mr-2">mdi-alert-circle</v-icon>
                        确认删除
                    </v-card-title>
                    <v-card-text style="padding: 12px 20px;">确定要删除这个文件整理配置吗？</v-card-text>
                    <v-card-actions style="padding: 8px 20px 16px; justify-content: flex-end; gap: 8px;">
                        <v-btn variant="tonal" @click="deleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="doDelete" style="border-radius: 8px;">删除</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
