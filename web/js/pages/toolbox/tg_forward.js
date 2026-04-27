// TG 转发页面组件
const TgForwardPage = {
    name: 'TgForwardPage',

    components: {
        TgForwardLogsPage,
    },

    data() {
        return {
            subTab: 'config',
            configs: [],
            loading: false,
            saving: false,
            tgApiConfigs: [],
            monitorStatus: {},
            statusPolling: null,
            // 编辑弹窗
            editDialog: false,
            editingConfig: null,
            editForm: {
                name: '',
                tg_config_id: '',
                source_id: '',
                source_name: '',
                target_id: '',
                keywords: [],
                blacklist: [],
                message_types: ['all'],
                enabled: true,
                super_forward: false,
            },
            newKeyword: '',
            newBlacklistItem: '',
            // 源频道选择器
            pickerDialog: false,
            pickerLoading: false,
            pickerSearch: '',
            myChannels: [],
            // 目标选择器
            targetPickerDialog: false,
            targetPickerLoading: false,
            targetPickerSearch: '',
            targetChannels: [],
            // 删除确认
            deleteDialog: false,
            deletingConfig: null,
            deleting: false,
            // 操作中状态
            startingMonitor: {},
            stoppingMonitor: {},
        }
    },

    computed: {
        filteredPickerChannels() {
            const blocked = ['-1003092300229', '-1003714442743'];
            let list = this.myChannels.filter(ch => !blocked.includes(String(ch.id)));
            if (!this.pickerSearch) return list;
            const kw = this.pickerSearch.toLowerCase();
            return list.filter(ch =>
                (ch.name || '').toLowerCase().includes(kw) ||
                String(ch.id).includes(kw) ||
                (ch.username || '').toLowerCase().includes(kw)
            );
        },
        filteredTargetChannels() {
            const blocked = ['-1003092300229', '-1003714442743'];
            let list = this.targetChannels.filter(ch => !blocked.includes(String(ch.id)));
            if (!this.targetPickerSearch) return list;
            const kw = this.targetPickerSearch.toLowerCase();
            return list.filter(ch =>
                (ch.name || '').toLowerCase().includes(kw) ||
                String(ch.id).includes(kw) ||
                (ch.username || '').toLowerCase().includes(kw)
            );
        },
        messageTypeOptions() {
            return [
                { title: '全部', value: 'all' },
                { title: '文本', value: 'text' },
                { title: '图片', value: 'photo' },
                { title: '视频', value: 'video' },
                { title: '文件', value: 'document' },
                { title: '内联按钮', value: 'button' },
                { title: '贴纸', value: 'sticker' },
                { title: 'GIF', value: 'gif' },
                { title: '音频', value: 'audio' },
                { title: '语音', value: 'voice' },
            ];
        }
    },

    async mounted() {
        this.parseSubTab();
        this.routeHandler = () => this.parseSubTab();
        window.addEventListener('route-change', this.routeHandler);
        await Promise.all([this.loadConfigs(), this.loadTgApiConfigs()]);
        this.pollStatus();
        this.statusPolling = setInterval(() => this.pollStatus(), 10000);
    },

    beforeUnmount() {
        if (this.statusPolling) clearInterval(this.statusPolling);
        if (this.routeHandler) window.removeEventListener('route-change', this.routeHandler);
    },

    methods: {
        parseSubTab() {
            const hash = window.location.hash.slice(1).replace(/^\//, '');
            if (hash.includes('tg_forward/logs')) {
                this.subTab = 'logs';
            } else {
                this.subTab = 'config';
            }
        },

        switchTab(tab) {
            this.subTab = tab;
            if (tab === 'logs') {
                router.push('toolbox/tg_forward/logs');
            } else {
                router.push('toolbox/tg_forward');
            }
        },

        async loadConfigs() {
            this.loading = true;
            try {
                const res = await api.request('/tg_forward/configs');
                if (res.success) {
                    this.configs = res.data || [];
                }
            } catch (e) {
                console.error('加载转发配置失败:', e);
            } finally {
                this.loading = false;
            }
        },

        async loadTgApiConfigs() {
            try {
                const configs = await api.getTgApiConfigs();
                this.tgApiConfigs = configs || [];
            } catch (e) {
                console.error('加载 TG API 配置失败:', e);
            }
        },

        async pollStatus() {
            try {
                const res = await api.request('/tg_forward/status');
                if (res.success) {
                    this.monitorStatus = res.data || {};
                }
            } catch (e) { /* ignore */ }
        },

        isRunning(configId) {
            return this.monitorStatus[configId]?.running || false;
        },

        getStats(configId) {
            return this.monitorStatus[configId]?.stats || {};
        },

        getTgConfigName(configId) {
            const cfg = this.tgApiConfigs.find(c => c.id === configId);
            return cfg ? (cfg.name || cfg.id) : configId || '未选择';
        },

        getTypeIcon(type) {
            if (type === 'channel') return 'mdi-bullhorn';
            if (type === 'supergroup') return 'mdi-account-group';
            if (type === 'bot') return 'mdi-robot';
            if (type === 'user') return 'mdi-account';
            return 'mdi-chat';
        },

        getTypeLabel(type) {
            if (type === 'channel') return '频道';
            if (type === 'supergroup') return '超级群组';
            if (type === 'group') return '群组';
            if (type === 'bot') return '机器人';
            if (type === 'user') return '用户';
            return type;
        },

        // ===== CRUD =====
        openAdd() {
            this.editingConfig = null;
            this.editForm = {
                name: '',
                tg_config_id: '',
                source_id: '',
                source_name: '',
                target_id: '',
                target_name: '',
                keywords: [],
                blacklist: [],
                message_types: ['all'],
                enabled: true,
                super_forward: false,
            };
            this.newKeyword = '';
            this.newBlacklistItem = '';
            this.editDialog = true;
        },

        openEdit(config) {
            this.editingConfig = config;
            this.editForm = {
                name: config.name || '',
                tg_config_id: config.tg_config_id || '',
                source_id: config.source_id || '',
                source_name: config.source_name || '',
                target_id: config.target_id || '',
                target_name: config.target_name || '',
                keywords: [...(config.keywords || [])],
                blacklist: [...(config.blacklist || [])],
                message_types: [...(config.message_types || ['all'])],
                enabled: config.enabled !== false,
                super_forward: config.super_forward || false,
            };
            this.newKeyword = '';
            this.newBlacklistItem = '';
            this.editDialog = true;
        },

        addKeyword() {
            const kw = this.newKeyword.trim();
            if (kw && !this.editForm.keywords.includes(kw)) {
                this.editForm.keywords.push(kw);
            }
            this.newKeyword = '';
        },

        removeKeyword(index) {
            this.editForm.keywords.splice(index, 1);
        },

        addBlacklistItem() {
            const item = this.newBlacklistItem.trim();
            if (item && !this.editForm.blacklist.includes(item)) {
                this.editForm.blacklist.push(item);
            }
            this.newBlacklistItem = '';
        },

        removeBlacklistItem(index) {
            this.editForm.blacklist.splice(index, 1);
        },

        onMessageTypesChange(val) {
            if (val.includes('all') && val.length > 1) {
                // 如果选了"全部"又选了其他，保留最后选的
                if (val[val.length - 1] === 'all') {
                    this.editForm.message_types = ['all'];
                } else {
                    this.editForm.message_types = val.filter(v => v !== 'all');
                }
            }
        },

        async saveConfig() {
            if (!this.editForm.name.trim()) {
                window.showMessage('请填写配置名称', 'error');
                return;
            }
            if (!this.editForm.tg_config_id) {
                window.showMessage('请选择 TG 账号', 'error');
                return;
            }
            if (!this.editForm.source_id) {
                window.showMessage('请选择源频道/群组', 'error');
                return;
            }
            if (!this.editForm.target_id) {
                window.showMessage('请填写目标 ID', 'error');
                return;
            }
            this.saving = true;
            try {
                const payload = { ...this.editForm };
                let res;
                if (this.editingConfig && this.editingConfig.id) {
                    res = await api.request('/tg_forward/configs/' + this.editingConfig.id, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await api.request('/tg_forward/configs', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }
                if (res.success) {
                    window.showMessage(this.editingConfig ? '配置已更新' : '配置已添加', 'success');
                    this.editDialog = false;
                    await this.loadConfigs();
                } else {
                    window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (e) {
                window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },

        confirmDelete(config) {
            this.deletingConfig = config;
            this.deleteDialog = true;
        },

        async executeDelete() {
            if (!this.deletingConfig) return;
            this.deleting = true;
            try {
                const res = await api.request('/tg_forward/configs/' + this.deletingConfig.id, { method: 'DELETE' });
                if (res.success) {
                    window.showMessage('已删除', 'success');
                    this.deleteDialog = false;
                    this.deletingConfig = null;
                    await this.loadConfigs();
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (e) {
                window.showMessage('删除失败', 'error');
            } finally {
                this.deleting = false;
            }
        },

        // ===== 监控控制 =====
        async startMonitor(configId) {
            this.startingMonitor[configId] = true;
            this.startingMonitor = { ...this.startingMonitor };
            try {
                const res = await api.request('/tg_forward/start/' + configId, { method: 'POST' });
                if (res.success) {
                    window.showMessage(res.message || '监控已启动', 'success');
                    setTimeout(() => this.pollStatus(), 2000);
                } else {
                    window.showMessage(res.message || '启动失败', 'error');
                }
            } catch (e) {
                window.showMessage('启动失败', 'error');
            } finally {
                this.startingMonitor[configId] = false;
                this.startingMonitor = { ...this.startingMonitor };
            }
        },

        async stopMonitor(configId) {
            this.stoppingMonitor[configId] = true;
            this.stoppingMonitor = { ...this.stoppingMonitor };
            try {
                const res = await api.request('/tg_forward/stop/' + configId, { method: 'POST' });
                if (res.success) {
                    window.showMessage(res.message || '监控已停止', 'success');
                    setTimeout(() => this.pollStatus(), 1000);
                } else {
                    window.showMessage(res.message || '停止失败', 'error');
                }
            } catch (e) {
                window.showMessage('停止失败', 'error');
            } finally {
                this.stoppingMonitor[configId] = false;
                this.stoppingMonitor = { ...this.stoppingMonitor };
            }
        },

        // ===== 频道选择器 =====
        async openSourcePicker() {
            if (!this.editForm.tg_config_id) {
                window.showMessage('请先选择 TG 账号', 'warning');
                return;
            }
            this.pickerDialog = true;
            this.pickerSearch = '';
            this.pickerLoading = true;
            try {
                // 切换到选中的 TG 配置
                await api.request('/tg_search/config', {
                    method: 'PUT',
                    body: JSON.stringify({ use_tg_config: this.editForm.tg_config_id })
                });
                const res = await api.request('/tg_search/my_channels');
                if (res.success) {
                    this.myChannels = res.data || [];
                } else {
                    window.showMessage(res.message || '获取频道列表失败', 'error');
                }
            } catch (e) {
                window.showMessage('获取频道列表失败', 'error');
            } finally {
                this.pickerLoading = false;
            }
        },

        selectSource(ch) {
            this.editForm.source_id = String(ch.id);
            this.editForm.source_name = ch.name || String(ch.id);
            this.pickerDialog = false;
        },

        // ===== 目标选择器 =====
        async openTargetPicker() {
            if (!this.editForm.tg_config_id) {
                window.showMessage('请先选择 TG 账号', 'warning');
                return;
            }
            this.targetPickerDialog = true;
            this.targetPickerSearch = '';
            this.targetPickerLoading = true;
            try {
                await api.request('/tg_search/config', {
                    method: 'PUT',
                    body: JSON.stringify({ use_tg_config: this.editForm.tg_config_id })
                });
                const res = await api.request('/tg_search/my_channels');
                if (res.success) {
                    this.targetChannels = res.data || [];
                } else {
                    window.showMessage(res.message || '获取频道列表失败', 'error');
                }
            } catch (e) {
                window.showMessage('获取频道列表失败', 'error');
            } finally {
                this.targetPickerLoading = false;
            }
        },

        selectTarget(ch) {
            this.editForm.target_id = String(ch.id);
            this.editForm.target_name = ch.name || String(ch.id);
            this.targetPickerDialog = false;
        },

        formatTime(ts) {
            if (!ts) return '-';
            const d = new Date(ts * 1000);
            return d.toLocaleString('zh-CN', { hour12: false });
        },
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">TG 转发</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,172,255,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div v-if="subTab === 'config'" style="display: flex; gap: 8px; align-items: center;">
                        <v-btn color="success" @click="openAdd" size="small" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-plus</v-icon>
                            添加配置
                        </v-btn>
                    </div>
                </div>
            </div>

            <!-- 顶部 Tab 菜单 -->
            <div style="display: flex; gap: 6px; margin-bottom: 16px;">
                <v-btn
                    :variant="subTab === 'config' ? 'elevated' : 'tonal'"
                    :color="subTab === 'config' ? 'primary' : undefined"
                    size="small"
                    @click="switchTab('config')"
                    style="border-radius: 8px;"
                >
                    <v-icon left size="16">mdi-cog</v-icon>
                    配置
                </v-btn>
                <v-btn
                    :variant="subTab === 'logs' ? 'elevated' : 'tonal'"
                    :color="subTab === 'logs' ? 'primary' : undefined"
                    size="small"
                    @click="switchTab('logs')"
                    style="border-radius: 8px;"
                >
                    <v-icon left size="16">mdi-text-box-search-outline</v-icon>
                    日志
                </v-btn>
            </div>

            <!-- 日志子页面 -->
            <TgForwardLogsPage v-if="subTab === 'logs'"></TgForwardLogsPage>

            <!-- 配置页面内容 -->
            <template v-if="subTab === 'config'">

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <!-- 配置列表 -->
            <v-row v-else-if="configs.length > 0">
                <v-col v-for="config in configs" :key="config.id" cols="12" lg="6">
                    <div class="glass-card" style="padding: 20px; border-radius: 16px; position: relative;">
                        <!-- 运行状态指示 -->
                        <div style="position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 6px;">
                            <v-chip :color="isRunning(config.id) ? 'success' : 'grey'" size="small" :variant="isRunning(config.id) ? 'elevated' : 'tonal'">
                                <v-icon start size="12">{{ isRunning(config.id) ? 'mdi-circle' : 'mdi-circle-outline' }}</v-icon>
                                {{ isRunning(config.id) ? '运行中' : '已停止' }}
                            </v-chip>
                        </div>

                        <!-- 配置名称 -->
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding-right: 100px;">
                            <v-icon color="primary" size="22">mdi-swap-horizontal</v-icon>
                            <span :style="{ fontSize: '16px', fontWeight: 600, color: 'rgb(var(--v-theme-on-background))' }">{{ config.name }}</span>
                            <v-chip v-if="config.super_forward" size="x-small" color="warning" variant="tonal">超级转发</v-chip>
                            <v-chip v-if="!config.enabled" size="x-small" color="warning" variant="tonal">已禁用</v-chip>
                        </div>

                        <!-- 配置信息 -->
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-icon size="16" color="grey">mdi-send</v-icon>
                                <span style="font-size: 13px; opacity: 0.6;">TG 账号:</span>
                                <v-chip size="x-small" variant="tonal" color="primary">{{ getTgConfigName(config.tg_config_id) }}</v-chip>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-icon size="16" color="grey">mdi-import</v-icon>
                                <span style="font-size: 13px; opacity: 0.6;">源:</span>
                                <span :style="{ fontSize: '13px', color: 'rgb(var(--v-theme-on-background))' }">{{ config.source_name || config.source_id }}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-icon size="16" color="grey">mdi-export</v-icon>
                                <span style="font-size: 13px; opacity: 0.6;">目标:</span>
                                <span :style="{ fontSize: '13px', color: 'rgb(var(--v-theme-on-background))' }">{{ config.target_name || config.target_id }}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-icon size="16" color="grey">mdi-tag-outline</v-icon>
                                <span style="font-size: 13px; opacity: 0.6;">关键词:</span>
                                <template v-if="config.keywords && config.keywords.length > 0">
                                    <v-chip v-for="kw in config.keywords" :key="kw" size="x-small" variant="outlined" color="info" style="margin: 1px;">{{ kw }}</v-chip>
                                </template>
                                <span v-else style="font-size: 12px; opacity: 0.4;">全部转发</span>
                            </div>
                            <div v-if="config.blacklist && config.blacklist.length > 0" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-icon size="16" color="grey">mdi-cancel</v-icon>
                                <span style="font-size: 13px; opacity: 0.6;">黑名单:</span>
                                <v-chip v-for="item in config.blacklist" :key="item" size="x-small" variant="outlined" color="error" style="margin: 1px;">{{ item }}</v-chip>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-icon size="16" color="grey">mdi-format-list-bulleted-type</v-icon>
                                <span style="font-size: 13px; opacity: 0.6;">消息类型:</span>
                                <template v-if="config.message_types && config.message_types.length > 0">
                                    <v-chip v-for="t in config.message_types" :key="t" size="x-small" variant="tonal" style="margin: 1px;">{{ messageTypeOptions.find(o => o.value === t)?.title || t }}</v-chip>
                                </template>
                            </div>
                        </div>

                        <!-- 运行统计 -->
                        <div v-if="isRunning(config.id) && getStats(config.id).started_at" style="padding: 10px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 10px; margin-bottom: 12px;">
                            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; opacity: 0.7;">
                                <span>匹配: {{ getStats(config.id).matched || 0 }}</span>
                                <span>转发: {{ getStats(config.id).forwarded || 0 }}</span>
                                <span>错误: {{ getStats(config.id).errors || 0 }}</span>
                                <span v-if="getStats(config.id).last_forward">最后转发: {{ formatTime(getStats(config.id).last_forward) }}</span>
                            </div>
                        </div>

                        <!-- 操作按钮 -->
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <v-btn v-if="!isRunning(config.id)" color="success" size="small" variant="tonal" @click="startMonitor(config.id)" :loading="startingMonitor[config.id]" :disabled="!config.enabled" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-play</v-icon> 启动
                            </v-btn>
                            <v-btn v-else color="warning" size="small" variant="tonal" @click="stopMonitor(config.id)" :loading="stoppingMonitor[config.id]" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-stop</v-icon> 停止
                            </v-btn>
                            <v-btn size="small" variant="tonal" @click="openEdit(config)" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-pencil</v-icon> 编辑
                            </v-btn>
                            <v-btn size="small" variant="tonal" color="error" @click="confirmDelete(config)" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-delete</v-icon> 删除
                            </v-btn>
                        </div>
                    </div>
                </v-col>
            </v-row>

            <!-- 空状态 -->
            <div v-else class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px;">
                <v-icon size="48" color="grey">mdi-swap-horizontal</v-icon>
                <h3 style="margin-top: 12px; font-size: 16px;">暂无转发配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"创建 TG 消息转发规则</p>
            </div>

            <!-- 编辑弹窗 -->
            <v-dialog v-model="editDialog" max-width="560px" scrollable>
                <v-card style="border-radius: 16px; overflow: hidden;">
                    <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                        <v-icon color="primary" size="22" class="mr-2">mdi-swap-horizontal</v-icon>
                        {{ editingConfig ? '编辑转发配置' : '添加转发配置' }}
                        <v-spacer></v-spacer>
                        <v-btn icon variant="text" size="x-small" @click="editDialog = false">
                            <v-icon size="20">mdi-close</v-icon>
                        </v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                        <!-- 配置名称 -->
                        <v-text-field v-model="editForm.name" label="配置名称" variant="outlined" density="comfortable" hide-details class="mb-3" placeholder="如: 资源转发"></v-text-field>

                        <!-- TG 账号选择 -->
                        <v-select
                            v-model="editForm.tg_config_id"
                            :items="tgApiConfigs.map(c => ({ title: c.name || c.id, value: c.id }))"
                            label="TG 账号"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            class="mb-3"
                            prepend-inner-icon="mdi-send"
                            no-data-text="请先在 TG 助手中添加配置"
                            placeholder="选择用于监控和转发的 TG 账号"
                        ></v-select>

                        <!-- 源频道/群组 -->
                        <div class="mb-3">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-text-field
                                    v-model="editForm.source_id"
                                    label="源 ID"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    prepend-inner-icon="mdi-import"
                                    placeholder="如 -1002167886055"
                                    style="flex: 1;"
                                ></v-text-field>
                                <v-btn color="primary" variant="tonal" size="small" @click="openSourcePicker" style="border-radius: 8px; height: 48px;">
                                    <v-icon size="18">mdi-format-list-checks</v-icon>
                                </v-btn>
                            </div>
                            <div v-if="editForm.source_name" style="font-size: 12px; opacity: 0.5; margin-top: 4px; padding-left: 4px;">
                                {{ editForm.source_name }}
                            </div>
                        </div>

                        <!-- 目标频道/群组 -->
                        <div class="mb-3">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-text-field
                                    v-model="editForm.target_id"
                                    label="目标 ID"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    prepend-inner-icon="mdi-export"
                                    placeholder="如 -1002167886055"
                                    style="flex: 1;"
                                ></v-text-field>
                                <v-btn color="primary" variant="tonal" size="small" @click="openTargetPicker" style="border-radius: 8px; height: 48px;">
                                    <v-icon size="18">mdi-format-list-checks</v-icon>
                                </v-btn>
                            </div>
                            <div v-if="editForm.target_name" style="font-size: 12px; opacity: 0.5; margin-top: 4px; padding-left: 4px;">
                                {{ editForm.target_name }}
                            </div>
                        </div>

                        <!-- 关键词 -->
                        <div class="mb-3">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <v-text-field
                                    v-model="newKeyword"
                                    label="关键词（匹配任一即转发）"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    prepend-inner-icon="mdi-tag-outline"
                                    placeholder="输入关键词后回车添加"
                                    @keyup.enter="addKeyword"
                                    style="flex: 1;"
                                ></v-text-field>
                                <v-btn color="primary" variant="tonal" size="small" @click="addKeyword" style="border-radius: 8px; height: 48px;">
                                    <v-icon size="18">mdi-plus</v-icon>
                                </v-btn>
                            </div>
                            <div v-if="editForm.keywords.length > 0" style="display: flex; flex-wrap: wrap; gap: 6px;">
                                <v-chip v-for="(kw, idx) in editForm.keywords" :key="idx" closable @click:close="removeKeyword(idx)" size="small" variant="tonal" color="info">
                                    {{ kw }}
                                </v-chip>
                            </div>
                            <div v-else style="font-size: 12px; opacity: 0.5; padding-left: 4px;">不填关键词则转发所有匹配类型的消息</div>
                        </div>

                        <!-- 黑名单 -->
                        <div class="mb-3">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <v-text-field
                                    v-model="newBlacklistItem"
                                    label="黑名单（支持正则，命中则不转发）"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    prepend-inner-icon="mdi-cancel"
                                    placeholder="输入规则后回车添加"
                                    @keyup.enter="addBlacklistItem"
                                    style="flex: 1;"
                                ></v-text-field>
                                <v-btn color="error" variant="tonal" size="small" @click="addBlacklistItem" style="border-radius: 8px; height: 48px;">
                                    <v-icon size="18">mdi-plus</v-icon>
                                </v-btn>
                            </div>
                            <div v-if="editForm.blacklist.length > 0" style="display: flex; flex-wrap: wrap; gap: 6px;">
                                <v-chip v-for="(item, idx) in editForm.blacklist" :key="idx" closable @click:close="removeBlacklistItem(idx)" size="small" variant="tonal" color="error">
                                    {{ item }}
                                </v-chip>
                            </div>
                            <div v-else style="font-size: 12px; opacity: 0.5; padding-left: 4px;">不填则不过滤，支持正则表达式（如 广告|推广）</div>
                        </div>

                        <!-- 消息类型 -->
                        <v-select
                            v-model="editForm.message_types"
                            :items="messageTypeOptions"
                            label="消息类型"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            class="mb-3"
                            prepend-inner-icon="mdi-format-list-bulleted-type"
                            multiple
                            chips
                            closable-chips
                            @update:model-value="onMessageTypesChange"
                        ></v-select>

                        <!-- 超级转发开关 -->
                        <v-switch v-model="editForm.super_forward" color="warning" hide-details density="comfortable" class="mb-1">
                            <template v-slot:label>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span>超级转发</span>
                                    <v-chip size="x-small" color="warning" variant="tonal">绕过限制</v-chip>
                                </div>
                            </template>
                        </v-switch>
                        <div style="font-size: 12px; opacity: 0.5; padding-left: 4px; margin-bottom: 12px;">开启后将下载媒体并重新发送，可转发受保护频道/群组的消息（关闭时遇到受保护频道也会自动回退）</div>

                        <!-- 启用开关 -->
                        <v-switch v-model="editForm.enabled" label="启用" color="primary" hide-details density="comfortable"></v-switch>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-actions style="padding: 12px 20px; gap: 8px; justify-content: flex-end;">
                        <v-btn variant="tonal" size="small" @click="editDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="primary" variant="elevated" size="small" @click="saveConfig" :loading="saving" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-check</v-icon> 保存
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 删除确认弹窗 -->
            <v-dialog v-model="deleteDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>确认删除
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 20px;">
                        确定要删除转发配置「<b>{{ deletingConfig?.name }}</b>」吗？删除后无法恢复。
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="deleteDialog = false; deletingConfig = null" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeDelete" :loading="deleting" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>确认删除
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 目标选择器弹窗 -->
            <v-dialog v-model="targetPickerDialog" max-width="600px" scrollable>
                <v-card style="border-radius: 16px; overflow: hidden;">
                    <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                        <v-icon color="primary" size="22" class="mr-2">mdi-format-list-checks</v-icon>
                        选择目标频道/群组
                        <v-spacer></v-spacer>
                        <v-btn icon variant="text" size="x-small" @click="targetPickerDialog = false">
                            <v-icon size="20">mdi-close</v-icon>
                        </v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <div style="padding: 12px 20px 8px;">
                        <v-text-field
                            v-model="targetPickerSearch"
                            label="搜索频道名称/ID"
                            variant="outlined"
                            density="compact"
                            hide-details
                            prepend-inner-icon="mdi-magnify"
                            clearable
                        ></v-text-field>
                    </div>
                    <v-card-text style="padding: 0 20px; max-height: 50vh; overflow-y: auto;">
                        <div v-if="targetPickerLoading" style="text-align: center; padding: 40px;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                            <div style="margin-top: 12px; font-size: 13px; opacity: 0.6;">正在获取频道列表...</div>
                        </div>
                        <div v-else-if="filteredTargetChannels.length === 0" style="text-align: center; padding: 40px; opacity: 0.5;">
                            <v-icon size="40" color="grey">mdi-forum-remove-outline</v-icon>
                            <p style="margin-top: 8px;">{{ targetPickerSearch ? '没有匹配的频道' : '未获取到频道/群组' }}</p>
                        </div>
                        <div v-else>
                            <div v-for="ch in filteredTargetChannels" :key="ch.id"
                                 @click="selectTarget(ch)"
                                 style="padding: 12px; border-radius: 10px; margin-bottom: 6px; cursor: pointer; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: all 0.15s;"
                                 :style="{ background: String(ch.id) === editForm.target_id ? 'rgba(var(--v-theme-primary), 0.08)' : 'rgba(var(--v-theme-on-surface),0.02)', border: String(ch.id) === editForm.target_id ? '2px solid rgb(var(--v-theme-primary))' : '1px solid rgba(var(--v-theme-on-surface),0.08)' }">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <v-icon size="18" :color="String(ch.id) === editForm.target_id ? 'primary' : 'grey'">{{ getTypeIcon(ch.type) }}</v-icon>
                                    <div style="flex: 1; min-width: 0;">
                                        <div :style="{ fontSize: '14px', fontWeight: 500, color: 'rgb(var(--v-theme-on-background))' }">{{ ch.name }}</div>
                                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px; flex-wrap: wrap;">
                                            <v-chip size="x-small" variant="outlined" :color="ch.type === 'channel' ? 'blue' : ch.type === 'bot' ? 'purple' : 'teal'">{{ getTypeLabel(ch.type) }}</v-chip>
                                            <span style="font-size: 11px; opacity: 0.5;">ID: {{ ch.id }}</span>
                                            <span v-if="ch.username" style="font-size: 11px; opacity: 0.5;">@{{ ch.username }}</span>
                                            <span v-if="ch.members_count" style="font-size: 11px; opacity: 0.5;">{{ ch.members_count }} 成员</span>
                                        </div>
                                    </div>
                                    <v-icon v-if="String(ch.id) === editForm.target_id" color="primary" size="20">mdi-check-circle</v-icon>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>

            </template>

            <!-- 频道选择器弹窗 -->
            <v-dialog v-model="pickerDialog" max-width="600px" scrollable>
                <v-card style="border-radius: 16px; overflow: hidden;">
                    <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                        <v-icon color="primary" size="22" class="mr-2">mdi-format-list-checks</v-icon>
                        选择源频道/群组
                        <v-spacer></v-spacer>
                        <v-btn icon variant="text" size="x-small" @click="pickerDialog = false">
                            <v-icon size="20">mdi-close</v-icon>
                        </v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <div style="padding: 12px 20px 8px;">
                        <v-text-field
                            v-model="pickerSearch"
                            label="搜索频道名称/ID"
                            variant="outlined"
                            density="compact"
                            hide-details
                            prepend-inner-icon="mdi-magnify"
                            clearable
                        ></v-text-field>
                    </div>
                    <v-card-text style="padding: 0 20px; max-height: 50vh; overflow-y: auto;">
                        <div v-if="pickerLoading" style="text-align: center; padding: 40px;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                            <div style="margin-top: 12px; font-size: 13px; opacity: 0.6;">正在获取频道列表...</div>
                        </div>
                        <div v-else-if="filteredPickerChannels.length === 0" style="text-align: center; padding: 40px; opacity: 0.5;">
                            <v-icon size="40" color="grey">mdi-forum-remove-outline</v-icon>
                            <p style="margin-top: 8px;">{{ pickerSearch ? '没有匹配的频道' : '未获取到频道/群组' }}</p>
                        </div>
                        <div v-else>
                            <div v-for="ch in filteredPickerChannels" :key="ch.id"
                                 @click="selectSource(ch)"
                                 style="padding: 12px; border-radius: 10px; margin-bottom: 6px; cursor: pointer; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: all 0.15s;"
                                 :style="{ background: String(ch.id) === editForm.source_id ? 'rgba(var(--v-theme-primary), 0.08)' : 'rgba(var(--v-theme-on-surface),0.02)', border: String(ch.id) === editForm.source_id ? '2px solid rgb(var(--v-theme-primary))' : '1px solid rgba(var(--v-theme-on-surface),0.08)' }">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <v-icon size="18" :color="String(ch.id) === editForm.source_id ? 'primary' : 'grey'">{{ getTypeIcon(ch.type) }}</v-icon>
                                    <div style="flex: 1; min-width: 0;">
                                        <div :style="{ fontSize: '14px', fontWeight: 500, color: 'rgb(var(--v-theme-on-background))' }">{{ ch.name }}</div>
                                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px; flex-wrap: wrap;">
                                            <v-chip size="x-small" variant="outlined" :color="ch.type === 'channel' ? 'blue' : 'teal'">{{ getTypeLabel(ch.type) }}</v-chip>
                                            <span style="font-size: 11px; opacity: 0.5;">ID: {{ ch.id }}</span>
                                            <span v-if="ch.username" style="font-size: 11px; opacity: 0.5;">@{{ ch.username }}</span>
                                            <span v-if="ch.members_count" style="font-size: 11px; opacity: 0.5;">{{ ch.members_count }} 成员</span>
                                        </div>
                                    </div>
                                    <v-icon v-if="String(ch.id) === editForm.source_id" color="primary" size="20">mdi-check-circle</v-icon>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>
        </div>
    `
};
