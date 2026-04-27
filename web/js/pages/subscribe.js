const SubscribePage = {
    name: 'SubscribePage',
    data() {
        return {
            activeTab: 'subscribes',
            // ========== 订阅列表（合并） ==========
            loading: false,
            subscribes: [],
            total: 0,
            totalPages: 0,
            page: 1,
            pageSize: 15,
            keyword: '',
            filterStatus: '',
            filterType: '',
            filterMode: '',
            selectedIds: [],
            searchTimer: null,
            // ========== 订阅设置 ==========
            settingsLoading: false,
            settingsSaving: false,
            config: {
                enabled: false,
                schedule_enabled: true,
                use_115_config: '',
                transfer_folders: [],
                share_strm_folders: [],
                parse_mode: 3,
                ffprobe_enabled: true,
                ffprobe_trigger_fields: ['resolution', 'effect'],
                multi_thread_identify_enabled: false,
                multi_thread_identify_count: 2,
                subscribe_check_library: true,
                cron_expression: '0 */2 * * *',
                notify_template: '',
                hdhive_search_keywords_enabled: false,
                hdhive_search_keywords: [],
                hdhive_official_only: false,
                source_limit_enabled: false,
                source_limit_tg: 2,
                source_limit_hdhive: 2,
                channel_search_filter_enabled: false,
                channel_search_filter_channels: [],
                auto_delete_completed: false,
            },
            // ========== TG 频道监控 ==========
            tgMonitorConfig: {
                enabled: false,
                channels: [],
                collect_interval: 10,
            },
            tgMonitorStatus: {
                running: false,
                queue_size: 0,
            },
            tgMonitorChannelOptions: [],
            tgMonitorLoading: false,
            newHdhiveKeyword: '',
            // ffprobe 触发字段 catalog
            ffprobeFieldCatalog: [
                { key: 'resolution', label: '分辨率' },
                { key: 'effect', label: '特效(HDR/DV)' },
                { key: 'video_codec', label: '视频编码' },
                { key: 'audio_codec', label: '音频编码' },
                { key: 'frame_rate', label: '帧率' },
            ],
            // 115 文件夹浏览
            cloudFolderDialog: false,
            cloudFolderLoading: false,
            cloudFolders: [],
            cloudCurrentCid: '0',
            cloudFolderPath: [{ name: '根目录', cid: '0' }],
            newTransferFolderAlias: '',
            editingTransferFolderIndex: -1,
            // 新建文件夹
            createFolderMode: false,
            createFolderName: '',
            createFolderLoading: false,
            // 本地文件夹浏览
            localFolderDialog: false,
            localFolderLoading: false,
            localFolders: [],
            localCurrentPath: '',
            localParentPath: '',
            searchSources: [
                { title: 'TG+影巢', value: 'tg_hdhive' },
                { title: '影巢', value: 'hdhive' },
                { title: 'TG', value: 'tg' },
            ],
            // ========== 共用 ==========
            options: { resolutions: [], effects: [], resource_types: [], release_groups: [], speed_modes: [], configs_115: [] },
            statusOptions: [
                { value: '', title: '全部状态' },
                { value: 'active', title: '订阅中' },
                { value: 'paused', title: '已暂停' },
                { value: 'completed', title: '已完成' },
                { value: 'error', title: '异常' }
            ],
            typeOptions: [
                { value: '', title: '全部类型' },
                { value: 'movie', title: '电影' },
                { value: 'tv', title: '电视剧' }
            ],
            modeOptions: [
                { value: '', title: '全部模式' },
                { value: 'share_strm', title: '分享' },
                { value: 'transfer', title: '转存' }
            ],
            editDialog: false,
            editForm: {},
            editSaving: false,
            editMode: '',
            multiSelectMode: false,
            deleteDialog: false,
            deleteType: '',
            deleting: false,
            runningSubscribeId: '',
            runningBatch: false,
            singleDeleteDialog: false,
            singleDeleting: false,
            editTransferFolderCid: '',
            globalTransferFolders: [],
            shareStrmFolders: [],
            editPresets: [],
            // 订阅默认配置预设
            presetEditDialog: false,
            presetEditForm: {
                name: '', mode: 'share_strm', resolution: '', effect: '', resource_type: '',
                release_group: '', frame_rate: '', search_source: 'tg_hdhive',
                reshare_enabled: false, transfer_all_matches: false, run_immediately: false,
                transfer_folder_cid: '', strm_folder_path: ''
            },
            presetEditId: null,
            presetSaving: false,
            presetTransferFolders: [],
            presetStrmFolders: [],
        }
    },
    computed: {
        isPageAllSelected() {
            if (this.subscribes.length === 0) return false;
            return this.subscribes.every(s => this.selectedIds.includes(s.subscribe_id));
        },
        tgMonitorSelectedChannelIds() {
            return (this.tgMonitorConfig.channels || []).map(ch => ch.channel_id);
        },
        channelSearchFilterSelectedIds() {
            return (this.config.channel_search_filter_channels || []).map(ch => ch.channel_id);
        },
    },
    watch: {
        filterStatus() { this.page = 1; this.loadData(); },
        filterType() { this.page = 1; this.loadData(); },
        filterMode() { this.page = 1; this.loadData(); },
        keyword() {
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => { this.page = 1; this.loadData(); }, 300);
        },
        activeTab(val) {
            // 同步 tab 到 URL
            const base = 'subscribe';
            if (val === 'subscribes') {
                router.push(base);
            } else {
                router.push(base + '/' + val);
            }
            if (val === 'settings') this.loadSettings();
        }
    },
    async mounted() {
        // 从 URL 子路径恢复 tab 状态
        const hash = window.location.hash.replace(/^#\/?/, '');
        const parts = hash.split('/');
        if (parts[0] === 'subscribe' && parts[1]) {
            const validTabs = ['subscribes', 'settings'];
            if (validTabs.includes(parts[1])) {
                this.activeTab = parts[1];
            }
        }
        await Promise.all([this.loadData(), this.loadOptions()]);
        // 自动修复剧集订阅的集数信息
        {
            try { await api.request('/subscribe/repair-episodes', { method: 'POST' }); } catch(e) {}
            await this.loadData();
        }
    },
    methods: {
        // ========== 订阅列表 ==========
        async loadData() {
            this.loading = true;
            try {
                const res = await api.getSubscribes({
                    page: this.page, page_size: this.pageSize,
                    mode: this.filterMode || undefined,
                    status: this.filterStatus || undefined,
                    keyword: this.keyword || undefined,
                    type: this.filterType || undefined
                });
                this.subscribes = res.subscribes || [];
                this.total = res.total || 0;
                this.totalPages = res.total_pages || 0;
            } catch (e) {
                window.showMessage && window.showMessage('加载订阅失败', 'error');
            } finally { this.loading = false; }
        },
        goPage(p) {
            if (p < 1 || p > this.totalPages) return;
            this.page = p; this.loadData();
        },
        toggleSelectAll() {
            if (this.isPageAllSelected) {
                this.subscribes.forEach(s => {
                    const idx = this.selectedIds.indexOf(s.subscribe_id);
                    if (idx > -1) this.selectedIds.splice(idx, 1);
                });
            } else {
                this.subscribes.forEach(s => {
                    if (!this.selectedIds.includes(s.subscribe_id)) this.selectedIds.push(s.subscribe_id);
                });
            }
        },
        toggleSelect(id) {
            const idx = this.selectedIds.indexOf(id);
            if (idx > -1) this.selectedIds.splice(idx, 1);
            else this.selectedIds.push(id);
        },
        isSelected(id) { return this.selectedIds.includes(id); },
        getModeText(mode) { return mode === 'share_strm' ? '分享' : mode === 'transfer' ? '转存' : mode; },
        getModeColor(mode) { return mode === 'share_strm' ? 'blue' : 'purple'; },
        getEpisodeProgress(sub) {
            // 优先使用后端计算的 episode_progress（含跳集信息）
            if (sub.episode_progress) return sub.episode_progress;
            const lack = sub.lack_episode || [];
            const total = sub.total_episode || 0;
            if (!total || total <= 0) return '';
            const done = total - lack.length;
            if (done <= 0) return `${done}/${total}`;
            // 前端回退：检测跳集
            const startEp = sub.start_episode || 1;
            const lackSet = new Set(lack);
            const completed = [];
            for (let e = startEp; e <= total; e++) {
                if (!lackSet.has(e)) completed.push(e);
            }
            if (!completed.length) return `${done}/${total}`;
            const isSeq = completed.every((v, i) => v === startEp + i);
            if (isSeq) return `${done}/${total}`;
            // 跳集：格式化已完成集号
            const epDesc = this.formatEpisodeRange(completed);
            return `${done}/${total} (${epDesc})`;
        },
        formatEpisodeRange(eps) {
            if (!eps || !eps.length) return '';
            const ranges = [];
            let s = eps[0], e = eps[0];
            for (let i = 1; i < eps.length; i++) {
                if (eps[i] === e + 1) { e = eps[i]; }
                else { ranges.push([s, e]); s = e = eps[i]; }
            }
            ranges.push([s, e]);
            return ranges.map(([a, b]) => a === b ? `E${String(a).padStart(2,'0')}` : `E${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`).join(' ');
        },

        // ========== 订阅设置 ==========
        async loadSettings() {
            this.settingsLoading = true;
            try {
                const config = await api.getSubscribeConfig();
                if (config) {
                    this.config = { ...this.config, ...config };
                    if (!Array.isArray(this.config.transfer_folders)) this.config.transfer_folders = [];
                    if (!Array.isArray(this.config.share_strm_folders)) this.config.share_strm_folders = [];
                    if (!Array.isArray(this.config.presets)) this.config.presets = [];
                    if (!Array.isArray(this.config.hdhive_search_keywords)) this.config.hdhive_search_keywords = [];
                    if (!Array.isArray(this.config.ffprobe_trigger_fields)) this.config.ffprobe_trigger_fields = ['resolution', 'effect'];
                    if (!Array.isArray(this.config.channel_search_filter_channels)) this.config.channel_search_filter_channels = [];
                }
                // 加载 TG 频道监控配置
                const tgConfig = await api.getTgMonitorConfig();
                if (tgConfig) {
                    this.tgMonitorConfig = { ...this.tgMonitorConfig, ...tgConfig };
                    if (!Array.isArray(this.tgMonitorConfig.channels)) this.tgMonitorConfig.channels = [];
                }
                // 加载 TG 频道监控状态
                try {
                    const status = await api.getTgMonitorStatus();
                    if (status) this.tgMonitorStatus = status;
                } catch(e) {}
                // 加载 TG 搜索频道列表（用于频道选择下拉框）
                try {
                    const tgSearchRes = await api.request('/tg_search/config');
                    if (tgSearchRes && tgSearchRes.data && Array.isArray(tgSearchRes.data.channels)) {
                        this.tgMonitorChannelOptions = tgSearchRes.data.channels.map(ch => ({
                            title: ch.name || ch.channel_id,
                            value: ch.channel_id,
                            name: ch.name || ch.channel_id,
                            channel_id: ch.channel_id,
                        }));
                    }
                } catch(e) {}
            } catch (e) { console.error(e); }
            finally { this.settingsLoading = false; }
        },
        async saveConfig() {
            if (this.config.multi_thread_identify_enabled && (!this.config.multi_thread_identify_count || Number(this.config.multi_thread_identify_count) <= 1)) {
                window.showMessage && window.showMessage('多线程识别的线程数必须大于1', 'error');
                return;
            }
            this.settingsSaving = true;
            try {
                const res = await api.updateSubscribeConfig(this.config);
                // 同时保存 TG 频道监控配置
                const tgRes = await api.updateTgMonitorConfig(this.tgMonitorConfig);
                if (res.success && tgRes.success) {
                    window.showMessage && window.showMessage('订阅设置已保存', 'success');
                    // 根据 TG 频道监控配置自动启停
                    if (this.tgMonitorConfig.enabled && this.tgMonitorConfig.channels.length > 0) {
                        if (!this.tgMonitorStatus.running) {
                            try { await api.startTgMonitor(); } catch(e) {}
                        } else {
                            try { await api.restartTgMonitor(); } catch(e) {}
                        }
                    } else if (this.tgMonitorStatus.running) {
                        try { await api.stopTgMonitor(); } catch(e) {}
                    }
                    // 刷新监控状态
                    setTimeout(async () => {
                        try {
                            const status = await api.getTgMonitorStatus();
                            if (status) this.tgMonitorStatus = status;
                        } catch(e) {}
                    }, 2000);
                } else {
                    window.showMessage && window.showMessage(res.message || tgRes.message || '保存失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.settingsSaving = false; }
        },
        // ========== TG 频道监控控制 ==========
        async tgMonitorStart() {
            this.tgMonitorLoading = true;
            try {
                const res = await api.startTgMonitor();
                window.showMessage && window.showMessage(res.message || '启动中', res.success ? 'success' : 'error');
                setTimeout(async () => {
                    try { const s = await api.getTgMonitorStatus(); if (s) this.tgMonitorStatus = s; } catch(e) {}
                    this.tgMonitorLoading = false;
                }, 2000);
            } catch (e) { window.showMessage && window.showMessage('启动失败', 'error'); this.tgMonitorLoading = false; }
        },
        async tgMonitorStop() {
            this.tgMonitorLoading = true;
            try {
                const res = await api.stopTgMonitor();
                window.showMessage && window.showMessage(res.message || '已停止', res.success ? 'success' : 'error');
                try { const s = await api.getTgMonitorStatus(); if (s) this.tgMonitorStatus = s; } catch(e) {}
            } catch (e) { window.showMessage && window.showMessage('停止失败', 'error'); }
            finally { this.tgMonitorLoading = false; }
        },
        async tgMonitorRestart() {
            this.tgMonitorLoading = true;
            try {
                const res = await api.restartTgMonitor();
                window.showMessage && window.showMessage(res.message || '重启中', res.success ? 'success' : 'error');
                setTimeout(async () => {
                    try { const s = await api.getTgMonitorStatus(); if (s) this.tgMonitorStatus = s; } catch(e) {}
                    this.tgMonitorLoading = false;
                }, 3000);
            } catch (e) { window.showMessage && window.showMessage('重启失败', 'error'); this.tgMonitorLoading = false; }
        },
        async tgMonitorUpdateInterval() {
            const val = Math.max(1, Number(this.tgMonitorConfig.collect_interval) || 10);
            this.tgMonitorConfig.collect_interval = val;
            try {
                await api.updateTgMonitorConfig({ collect_interval: val });
            } catch(e) {}
        },
        tgMonitorOnChannelChange(selectedIds) {
            const channels = selectedIds.map(id => {
                const opt = this.tgMonitorChannelOptions.find(o => o.channel_id === id);
                return { channel_id: id, name: opt ? opt.name : id };
            });
            this.tgMonitorConfig.channels = channels;
        },
        channelSearchFilterOnChange(selectedIds) {
            const channels = selectedIds.map(id => {
                const opt = this.tgMonitorChannelOptions.find(o => o.channel_id === id);
                return { channel_id: id, name: opt ? opt.name : id };
            });
            this.config.channel_search_filter_channels = channels;
        },
        toggleFfprobeField(fieldKey) {
            if (this.settingsLoading || this.settingsSaving) return;
            const validKeys = this.ffprobeFieldCatalog.map(f => f.key);
            const selected = new Set((this.config.ffprobe_trigger_fields || []).filter(k => validKeys.includes(k)));
            if (selected.has(fieldKey)) { selected.delete(fieldKey); } else { selected.add(fieldKey); }
            this.config.ffprobe_trigger_fields = validKeys.filter(k => selected.has(k));
        },
        getFfprobeFieldChipStyle(item) {
            const selected = (this.config.ffprobe_trigger_fields || []).includes(item.key);
            if (selected) {
                return {
                    background: 'rgba(var(--v-theme-primary),0.10)',
                    color: 'rgb(var(--v-theme-primary))',
                    border: '1px solid rgba(var(--v-theme-primary),0.38)',
                    fontWeight: '700',
                    boxShadow: '0 0 0 1px rgba(var(--v-theme-primary),0.08) inset, 0 4px 10px rgba(var(--v-theme-primary),0.08)',
                };
            }
            return {
                background: 'rgba(var(--v-theme-on-surface),0.04)',
                border: '1px solid rgba(var(--v-theme-on-surface),0.14)',
                color: 'rgba(var(--v-theme-on-surface),0.78)',
                fontWeight: '500',
                boxShadow: 'none',
            };
        },
        addHdhiveKeyword() {
            const kw = this.newHdhiveKeyword.trim();
            if (kw && !this.config.hdhive_search_keywords.includes(kw)) {
                this.config.hdhive_search_keywords.push(kw);
            }
            this.newHdhiveKeyword = '';
        },
        removeHdhiveKeyword(index) {
            this.config.hdhive_search_keywords.splice(index, 1);
        },
        // ========== 115 文件夹浏览 ==========
        async openCloudFolderBrowser() {
            if (!this.config.use_115_config) {
                window.showMessage && window.showMessage('请先选择 115 配置', 'warning'); return;
            }
            this.editingTransferFolderIndex = -1;
            this.newTransferFolderAlias = '';
            this.cloudFolderDialog = true;
            this.cloudCurrentCid = '0';
            this.cloudFolderPath = [{ name: '根目录', cid: '0' }];
            await this.loadCloudFolders('0');
        },
        async openCloudFolderBrowserForEdit(index) {
            if (!this.config.use_115_config) {
                window.showMessage && window.showMessage('请先选择 115 配置', 'warning'); return;
            }
            this.editingTransferFolderIndex = index;
            this.newTransferFolderAlias = this.config.transfer_folders[index].alias || this.config.transfer_folders[index].name || '';
            this.cloudFolderDialog = true;
            this.cloudCurrentCid = this.config.transfer_folders[index].cid || '0';
            this.cloudFolderPath = [{ name: '根目录', cid: '0' }];
            await this.loadCloudFolders(this.cloudCurrentCid);
        },
        async loadCloudFolders(cid) {
            this.cloudFolderLoading = true;
            try {
                const res = await api.request(`/115/folders?config_name=${encodeURIComponent(this.config.use_115_config)}&cid=${cid}`);
                if (res.success) {
                    this.cloudFolders = res.data.folders || [];
                    this.cloudCurrentCid = cid;
                    if (res.data.path?.length > 0) this.cloudFolderPath = res.data.path;
                } else {
                    window.showMessage && window.showMessage(res.message || '加载文件夹失败', 'error');
                    this.cloudFolders = [];
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载文件夹失败', 'error');
                this.cloudFolders = [];
            } finally { this.cloudFolderLoading = false; }
        },
        async enterCloudFolder(folder) { await this.loadCloudFolders(folder.cid); },
        async goBackCloud() {
            if (this.cloudFolderPath.length > 1) {
                const parent = this.cloudFolderPath[this.cloudFolderPath.length - 2];
                await this.loadCloudFolders(parent.cid);
            }
        },
        async goToCloudPath(idx) { await this.loadCloudFolders(this.cloudFolderPath[idx].cid); },
        selectCloudFolder() {
            const currentName = this.cloudFolderPath.length > 0 ? this.cloudFolderPath[this.cloudFolderPath.length - 1].name : '根目录';
            const alias = this.newTransferFolderAlias.trim() || currentName;
            const folderData = { cid: this.cloudCurrentCid, name: currentName, alias: alias };
            if (this.editingTransferFolderIndex >= 0) {
                this.config.transfer_folders[this.editingTransferFolderIndex] = folderData;
            } else {
                const exists = this.config.transfer_folders.some(f => f.cid === this.cloudCurrentCid);
                if (exists) { window.showMessage && window.showMessage('该文件夹已添加', 'warning'); this.cloudFolderDialog = false; return; }
                this.config.transfer_folders.push(folderData);
            }
            window.showMessage && window.showMessage(`已${this.editingTransferFolderIndex >= 0 ? '更新' : '添加'}: ${alias}`, 'success');
            this.cloudFolderDialog = false;
        },
        removeTransferFolder(idx) { this.config.transfer_folders.splice(idx, 1); },
        toggleCreateFolderMode() {
            this.createFolderMode = !this.createFolderMode;
            this.createFolderName = '';
        },
        async createCloudFolder() {
            const name = this.createFolderName.trim();
            if (!name) { window.showMessage && window.showMessage('请输入文件夹名称', 'warning'); return; }
            this.createFolderLoading = true;
            try {
                const res = await api.request('/115/folders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config_name: this.config.use_115_config, parent_cid: this.cloudCurrentCid, folder_name: name })
                });
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '创建成功', 'success');
                    this.createFolderMode = false;
                    this.createFolderName = '';
                    await this.loadCloudFolders(this.cloudCurrentCid);
                } else {
                    window.showMessage && window.showMessage(res.message || '创建失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('创建文件夹失败', 'error');
            } finally { this.createFolderLoading = false; }
        },

        // ========== 本地文件夹浏览 ==========
        async openLocalFolderBrowser() {
            this.localFolderDialog = true;
            this.localCurrentPath = '';
            this.localParentPath = '';
            await this.loadLocalFolders('');
        },
        async loadLocalFolders(path) {
            this.localFolderLoading = true;
            try {
                const endpoint = path ? `/local/folders?path=${encodeURIComponent(path)}` : '/local/folders';
                const res = await api.request(endpoint);
                if (res.success) {
                    this.localFolders = res.data.folders || [];
                    this.localCurrentPath = res.data.current_path || '';
                    this.localParentPath = res.data.parent_path;
                } else {
                    window.showMessage && window.showMessage(res.message || '加载目录失败', 'error');
                    this.localFolders = [];
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载目录失败', 'error');
                this.localFolders = [];
            } finally { this.localFolderLoading = false; }
        },
        async enterLocalFolder(folder) {
            if (folder.no_access) { window.showMessage && window.showMessage('没有访问权限', 'warning'); return; }
            await this.loadLocalFolders(folder.path);
        },
        async goBackLocal() {
            if (this.localParentPath !== undefined && this.localParentPath !== '') await this.loadLocalFolders(this.localParentPath);
            else if (this.localCurrentPath) await this.loadLocalFolders('');
        },
        selectLocalFolder() {
            if (!this.localCurrentPath) { window.showMessage && window.showMessage('请先进入一个目录', 'warning'); return; }
            const exists = this.config.share_strm_folders.some(f => f.path === this.localCurrentPath);
            if (exists) { window.showMessage && window.showMessage('该路径已添加', 'warning'); this.localFolderDialog = false; return; }
            this.config.share_strm_folders.push({ path: this.localCurrentPath });
            window.showMessage && window.showMessage(`已添加: ${this.localCurrentPath}`, 'success');
            this.localFolderDialog = false;
        },
        removeStrmFolder(idx) { this.config.share_strm_folders.splice(idx, 1); },

        // ========== 订阅默认配置预设 ==========
        async loadPresetFolders() {
            try {
                const strmConfig = await api.getShareStrmConfig();
                this.presetTransferFolders = this.config.transfer_folders || [];
                if (strmConfig) {
                    const folders = strmConfig.strm_folders || [];
                    this.presetStrmFolders = folders.map(f => ({ title: f.name || f.path, value: f.path }));
                    if (this.presetStrmFolders.length === 0 && strmConfig.local_strm_path) {
                        this.presetStrmFolders = [{ title: strmConfig.local_strm_path, value: strmConfig.local_strm_path }];
                    }
                }
            } catch (e) { console.error(e); }
        },
        openPresetAdd() {
            this.presetEditId = null;
            this.presetEditForm = {
                name: '', mode: 'share_strm', resolution: '', effect: '', resource_type: '',
                release_group: '', frame_rate: '', search_source: 'tg_hdhive',
                reshare_enabled: false, transfer_all_matches: false, run_immediately: false,
                transfer_folder_cid: '', strm_folder_path: ''
            };
            this.presetEditDialog = true;
            this.loadPresetFolders();
        },
        openPresetEdit(preset) {
            this.presetEditId = preset.id;
            this.presetEditForm = { ...preset };
            this.presetEditDialog = true;
            this.loadPresetFolders();
        },
        savePreset() {
            if (!this.presetEditForm.name) {
                window.showMessage && window.showMessage('请输入配置名称', 'warning'); return;
            }
            if (!Array.isArray(this.config.presets)) this.config.presets = [];
            if (this.presetEditId) {
                const idx = this.config.presets.findIndex(p => p.id === this.presetEditId);
                if (idx > -1) {
                    this.presetEditForm.id = this.presetEditId;
                    this.config.presets.splice(idx, 1, { ...this.presetEditForm });
                }
            } else {
                this.presetEditForm.id = String(Date.now());
                this.config.presets.push({ ...this.presetEditForm });
            }
            this.presetEditDialog = false;
        },
        deletePreset(presetId) {
            if (!Array.isArray(this.config.presets)) return;
            this.config.presets = this.config.presets.filter(p => p.id !== presetId);
        },
        getPresetModeText(mode) { return mode === 'share_strm' ? '分享追更' : mode === 'transfer' ? '转存追更' : mode || '未设置'; },
        getPresetSummary(preset) {
            const parts = [];
            if (preset.resolution) parts.push(preset.resolution);
            if (preset.effect) parts.push(preset.effect);
            if (preset.resource_type) parts.push(preset.resource_type);
            if (preset.release_group) parts.push(preset.release_group);
            if (preset.frame_rate) parts.push(preset.frame_rate);
            return parts.length > 0 ? parts.join(' · ') : '无筛选条件';
        },

        // ========== 通知模板 ==========
        resetNotifyTemplate() {
            this.config.notify_template = [
                '\uD83C\uDFAC 订阅追更通知',
                '',
                '\uD83D\uDCCC {{ name }}{% if year %} ({{ year }}){% endif %}',
                '{% if season_ep %}\uD83D\uDCFA {{ season_ep }}',
                '{% endif %}\uD83D\uDCCB {{ mode_text }}',
                '{% if version %}\uD83C\uDFF7\uFE0F {{ version }}',
                '{% endif %}{% if strm_result %}',
                '\uD83D\uDCC1 {{ strm_result }}',
                '{% endif %}{% if ep_progress %}',
                '\uD83D\uDCCA {{ ep_progress }}',
                '{% endif %}',
            ].join('\n');
            window.showMessage && window.showMessage('已恢复默认通知模板', 'success');
        },

        // ========== 共用方法 ==========
        async loadOptions() {
            try { this.options = await api.getSubscribeOptions(); }
            catch (e) { console.error(e); }
        },
        openEdit(sub) {
            this.editForm = JSON.parse(JSON.stringify(sub));
            if (!Array.isArray(this.editForm.preset_ids)) this.editForm.preset_ids = [];
            this.editMode = sub.mode;
            this.editTransferFolderCid = (sub.transfer_folders && sub.transfer_folders.length > 0) ? sub.transfer_folders[0].cid : '';
            this.editDialog = true;
            this.loadShareStrmFolders();
            this.loadGlobalTransferFolders();
            this.loadEditPresets();
        },
        async loadEditPresets() {
            try {
                const subConfig = await api.getSubscribeConfig();
                this.editPresets = (subConfig && Array.isArray(subConfig.presets)) ? subConfig.presets : [];
            } catch (e) { console.error(e); }
        },
        async loadShareStrmFolders() {
            try {
                const strmConfig = await api.getShareStrmConfig();
                if (strmConfig) {
                    const folders = strmConfig.strm_folders || [];
                    this.shareStrmFolders = folders.map(f => ({
                        title: f.name || f.path,
                        value: f.path
                    }));
                    if (this.shareStrmFolders.length === 0 && strmConfig.local_strm_path) {
                        this.shareStrmFolders = [{ title: strmConfig.local_strm_path, value: strmConfig.local_strm_path }];
                    }
                    if (this.shareStrmFolders.length > 0) {
                        const hasMatch = this.shareStrmFolders.some(f => f.value === this.editForm.strm_folder_path);
                        if (!hasMatch) {
                            this.editForm.strm_folder_path = this.shareStrmFolders[0].value;
                        }
                    }
                }
            } catch (e) { console.error('Failed to load share STRM folders:', e); }
        },
        async loadGlobalTransferFolders() {
            try {
                const config = await api.getSubscribeConfig();
                if (config && config.transfer_folders) {
                    this.globalTransferFolders = config.transfer_folders;
                    if (this.globalTransferFolders.length > 0) {
                        const hasMatch = this.globalTransferFolders.some(f => f.cid === this.editTransferFolderCid);
                        if (!hasMatch) {
                            this.editTransferFolderCid = this.globalTransferFolders[0].cid;
                        }
                    }
                }
            } catch (e) { console.error('Failed to load transfer folders:', e); }
        },
        async saveEdit() {
            this.editSaving = true;
            try {
                if (this.editForm.mode === 'transfer' && this.editTransferFolderCid) {
                    const folder = this.globalTransferFolders.find(f => f.cid === this.editTransferFolderCid);
                    if (folder) {
                        this.editForm.transfer_folders = [{ ...folder }];
                    }
                }
                const res = await api.updateSubscribe(this.editForm.subscribe_id, this.editForm);
                if (res.success) {
                    const idx = this.subscribes.findIndex(s => s.subscribe_id === this.editForm.subscribe_id);
                    if (idx > -1) {
                        Object.assign(this.subscribes[idx], JSON.parse(JSON.stringify(this.editForm)));
                    }
                    window.showMessage && window.showMessage('更新成功', 'success');
                    this.editDialog = false;
                    this.loadData();
                } else {
                    window.showMessage && window.showMessage(res.message || '更新失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('更新失败', 'error'); }
            finally { this.editSaving = false; }
        },
        confirmDelete(type) {
            this.deleteType = type;
            this.deleteDialog = true;
        },
        async executeDelete() {
            this.deleting = true;
            try {
                let res;
                if (this.deleteType === 'all') {
                    res = await api.request('/subscribe/all', {
                        method: 'DELETE',
                        body: JSON.stringify({ mode: this.filterMode || undefined })
                    });
                } else {
                    res = await api.request('/subscribe/batch', {
                        method: 'DELETE',
                        body: JSON.stringify({ subscribe_ids: this.selectedIds })
                    });
                }
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '删除成功', 'success');
                    this.selectedIds = [];
                    await this.loadData();
                    this.deleteDialog = false;
                } else {
                    window.showMessage && window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('删除失败', 'error'); }
            finally { this.deleting = false; }
        },
        async runSingle(subscribeId) {
            this.runningSubscribeId = subscribeId;
            try {
                const res = await api.runSubscribe(subscribeId);
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '已开始执行', 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '执行失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('执行失败', 'error'); }
            finally { this.runningSubscribeId = ''; }
        },
        confirmSingleDelete() {
            this.singleDeleteDialog = true;
        },
        async executeSingleDelete() {
            this.singleDeleting = true;
            try {
                const res = await api.deleteSubscribe(this.editForm.subscribe_id);
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '删除成功', 'success');
                    this.singleDeleteDialog = false;
                    this.editDialog = false;
                    await this.loadData();
                } else {
                    window.showMessage && window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('删除失败', 'error'); }
            finally { this.singleDeleting = false; }
        },
        async runBatch() {
            if (this.selectedIds.length === 0) return;
            this.runningBatch = true;
            try {
                const res = await api.runSubscribesBatch(this.selectedIds);
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '已开始执行', 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '执行失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('执行失败', 'error'); }
            finally { this.runningBatch = false; }
        },
        getStatusColor(status) {
            const map = { active: 'success', paused: 'warning', completed: 'info', error: 'error' };
            return map[status] || 'default';
        },
        getStatusText(status) {
            const map = { active: '订阅中', paused: '已暂停', completed: '已完成', error: '异常' };
            return map[status] || status;
        },
        formatTime(t) {
            if (!t) return '-';
            return t.replace('T', ' ').substring(0, 19);
        },
        getImgUrl(url) {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return 'https://image.tmdb.org/t/p/w500' + url;
        }
    },
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">订阅</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,172,255,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <v-btn v-if="activeTab === 'settings'" color="primary" @click="saveConfig" size="small" style="border-radius: 8px;" :loading="settingsSaving">
                        <v-icon left size="18">mdi-content-save</v-icon>
                        保存设置
                    </v-btn>
                </div>
            </div>

            <!-- Tab 切换 -->
            <v-card style="border-radius: 12px; margin-bottom: 16px; background: rgba(var(--v-theme-on-surface),0.04); border: 1px solid rgba(var(--v-theme-on-surface),0.1);" elevation="0">
                <v-tabs v-model="activeTab" color="primary" bg-color="transparent" show-arrows density="comfortable" align-tabs="center">
                    <v-tab value="subscribes" style="font-size: 14px; font-weight: 500;">
                        <v-icon size="16" style="margin-right: 6px;">mdi-rss</v-icon>
                        订阅列表
                    </v-tab>
                    <v-tab value="settings" style="font-size: 14px; font-weight: 500;">
                        <v-icon size="16" style="margin-right: 6px;">mdi-cog-transfer</v-icon>
                        订阅设置
                    </v-tab>
                </v-tabs>
            </v-card>

            <!-- ==================== 订阅列表 ==================== -->
            <div v-show="activeTab === 'subscribes'">
                <div class="glass-card" style="padding: 16px 20px; border-radius: 16px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <v-select v-model="filterMode" :items="modeOptions" item-title="title" item-value="value"
                            label="模式" density="compact" variant="outlined" hide-details style="max-width: 140px; min-width: 120px;"></v-select>
                        <v-select v-model="filterStatus" :items="statusOptions" item-title="title" item-value="value"
                            label="状态" density="compact" variant="outlined" hide-details style="max-width: 130px; min-width: 110px;"></v-select>
                        <v-select v-model="filterType" :items="typeOptions" item-title="title" item-value="value"
                            label="类型" density="compact" variant="outlined" hide-details style="max-width: 130px; min-width: 110px;"></v-select>
                        <v-text-field v-model="keyword" label="搜索订阅" density="compact" variant="outlined" hide-details clearable
                            prepend-inner-icon="mdi-magnify"
                            style="max-width: 200px; min-width: 160px;"></v-text-field>
                        <v-spacer></v-spacer>
                        <template v-if="multiSelectMode">
                            <v-btn v-if="subscribes.length > 0" :color="isPageAllSelected ? 'primary' : 'default'"
                                :variant="isPageAllSelected ? 'tonal' : 'outlined'" size="small" @click="toggleSelectAll" style="border-radius: 8px;">
                                <v-icon left size="18">{{ isPageAllSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>全选本页
                            </v-btn>
                            <v-btn v-if="selectedIds.length > 0" color="success" variant="tonal" size="small"
                                @click="runBatch" :loading="runningBatch" style="border-radius: 8px;">
                                <v-icon left size="18">mdi-play</v-icon>立即执行 ({{ selectedIds.length }})
                            </v-btn>
                            <v-btn v-if="selectedIds.length > 0" color="error" variant="tonal" size="small"
                                @click="confirmDelete('selected')" style="border-radius: 8px;">
                                <v-icon left size="18">mdi-delete</v-icon>删除选中 ({{ selectedIds.length }})
                            </v-btn>
                        </template>
                        <v-btn color="error" variant="outlined" size="small" @click="confirmDelete('all')" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete-sweep</v-icon>清空全部
                        </v-btn>
                        <v-btn icon variant="text" size="small" :color="multiSelectMode ? 'primary' : undefined" @click="multiSelectMode = !multiSelectMode; if(!multiSelectMode) selectedIds = []" title="多选模式">
                            <v-icon size="20">mdi-checkbox-multiple-outline</v-icon>
                        </v-btn>
                        <v-btn icon variant="text" size="small" @click="loadData" :loading="loading">
                            <v-icon size="20">mdi-refresh</v-icon>
                        </v-btn>
                    </div>
                </div>

                <div class="glass-card" style="padding: 16px 20px; border-radius: 16px;">
                    <div v-if="loading && subscribes.length === 0" style="display: flex; justify-content: center; padding: 50px;">
                        <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
                    </div>
                    <div v-else-if="subscribes.length === 0" style="text-align: center; padding: 60px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                        <v-icon size="56" color="grey-darken-1">mdi-rss</v-icon>
                        <p style="margin-top: 16px; font-size: 15px;">暂无订阅</p>
                        <p style="font-size: 13px;">前往看板搜索并添加订阅</p>
                    </div>
                    <div v-else class="sub-grid">
                        <div v-for="sub in subscribes" :key="sub.subscribe_id" class="sub-card" :class="{'sub-card-selected': multiSelectMode && isSelected(sub.subscribe_id)}" @click="multiSelectMode ? toggleSelect(sub.subscribe_id) : openEdit(sub)">
                            <div class="sub-card-poster">
                                <img v-if="sub.poster_path" :src="getImgUrl(sub.poster_path)" class="sub-card-poster-img" />
                                <div v-else class="sub-card-poster-placeholder">
                                    <v-icon size="32" color="grey-darken-1">mdi-movie</v-icon>
                                </div>
                            </div>
                            <div class="sub-card-body">
                                <div class="sub-card-title">{{ sub.name }}<span v-if="sub.type === 'tv'"> · S{{ String(sub.current_season).padStart(2, '0') }}</span></div>
                                <div class="sub-card-chips">
                                    <v-chip size="x-small" :color="getStatusColor(sub.status)" variant="flat">{{ getStatusText(sub.status) }}</v-chip>
                                    <v-chip size="x-small" :color="getModeColor(sub.mode)" variant="tonal">{{ getModeText(sub.mode) }}</v-chip>
                                    <v-chip v-if="sub.reshare_enabled" size="x-small" color="orange" variant="tonal">转存再分享</v-chip>
                                </div>
                                <div class="sub-card-meta">
                                    <span>{{ sub.year }} · {{ sub.type === 'movie' ? '电影' : '电视剧' }}</span>
                                    <span v-if="sub.type === 'tv' && sub.total_episode > 0 && sub.lack_episode && sub.lack_episode.length > 0" :style="{color: sub.lack_episode.length === sub.total_episode ? '#F44336' : '#FF9800'}"> · {{ getEpisodeProgress(sub) }}</span>
                                    <span v-if="sub.type === 'tv' && sub.total_episode > 0 && (!sub.lack_episode || sub.lack_episode.length === 0) && sub.status === 'completed'" style="color: #4CAF50;"> · {{ sub.total_episode }}/{{ sub.total_episode }}</span>
                                    <span v-if="sub.resolution"> · {{ sub.resolution }}</span>
                                    <span v-if="sub.effect"> · {{ sub.effect }}</span>
                                    <span v-if="sub.resource_type"> · {{ sub.resource_type }}</span>
                                    <span v-if="sub.release_group"> · {{ sub.release_group }}</span>
                                    <span v-if="sub.frame_rate"> · {{ sub.frame_rate }}</span>
                                </div>
                                <div class="sub-card-info">
                                    <span>TMDB: {{ sub.tmdb_id }}</span>
                                    <span v-if="sub.last_run_time"> · {{ formatTime(sub.last_run_time) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-if="totalPages > 1" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
                        <v-btn variant="text" size="small" :disabled="page <= 1" @click="goPage(1)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-double-left</v-icon></v-btn>
                        <v-btn variant="text" size="small" :disabled="page <= 1" @click="goPage(page - 1)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-left</v-icon></v-btn>
                        <span style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6); padding: 0 12px;">{{ page }} / {{ totalPages }} 页 (共 {{ total }} 条)</span>
                        <v-btn variant="text" size="small" :disabled="page >= totalPages" @click="goPage(page + 1)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-right</v-icon></v-btn>
                        <v-btn variant="text" size="small" :disabled="page >= totalPages" @click="goPage(totalPages)" style="min-width: 36px;"><v-icon size="18">mdi-chevron-double-right</v-icon></v-btn>
                    </div>
                </div>
            </div>

            <!-- ==================== 订阅设置 ==================== -->
            <div v-show="activeTab === 'settings'">
                <div class="glass-card" style="padding: 20px; border-radius: 16px;">
                    <v-progress-linear v-if="settingsLoading" indeterminate color="primary" class="mb-4"></v-progress-linear>

                    <v-switch v-model="config.enabled" label="启用订阅功能" color="primary" hide-details class="mb-4"></v-switch>
                    <v-divider class="mb-4"></v-divider>
                    <div class="text-subtitle-2 mb-2">基本设置</div>

                    <v-select v-model="config.parse_mode"
                        :items="(options.speed_modes||[]).map(m=>({title:m.name,value:m.value}))"
                        item-title="title" item-value="value" label="解析模式"
                        variant="outlined" density="compact" class="mb-3"></v-select>

                    <v-switch v-model="config.schedule_enabled" label="定时执行订阅" color="primary" hide-details class="mb-3"></v-switch>
                    <v-text-field v-if="config.schedule_enabled" v-model="config.cron_expression" label="定时执行 (Cron)"
                        variant="outlined" density="compact" class="mb-3"
                        hint="默认每2小时执行一次: 0 */2 * * *" persistent-hint></v-text-field>

                    <v-switch v-model="config.ffprobe_enabled" label="媒体信息提取" color="primary" hide-details class="mb-3"></v-switch>
                    <div v-if="config.ffprobe_enabled" style="margin-left: 4px; margin-bottom: 12px;">
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6); margin-bottom: 8px; line-height: 1.6;">缺少以下任一字段时触发 ffprobe</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            <v-chip
                                v-for="item in ffprobeFieldCatalog"
                                :key="item.key"
                                variant="outlined"
                                size="small"
                                :style="getFfprobeFieldChipStyle(item)"
                                :disabled="settingsLoading || settingsSaving"
                                @click="toggleFfprobeField(item.key)"
                            >{{ item.label }}</v-chip>
                        </div>
                        <div style="margin-top: 6px; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5);">已选 {{ (config.ffprobe_trigger_fields||[]).length }} 个字段{{ (config.ffprobe_trigger_fields||[]).length ? '；文件缺少其中任一字段即触发 ffprobe' : '；未选择时不触发 ffprobe' }}</div>
                    </div>
                    <v-switch v-model="config.verbose_identify_log" label="识别详细日志" color="primary" hide-details class="mb-3" hint="关闭后识别阶段只输出结果摘要，不显示逐文件识别过程" persistent-hint></v-switch>
                    <!-- tracking_create_folder 已移除，默认始终创建媒体文件夹和季文件夹 -->
                    <v-switch v-model="config.multi_thread_identify_enabled" label="多线程识别" color="primary" hide-details class="mb-3"></v-switch>
                    <v-text-field v-if="config.multi_thread_identify_enabled"
                        v-model.number="config.multi_thread_identify_count"
                        label="线程数" type="number" min="2"
                        :rules="[v => (Number(v) > 1) || '线程数必须大于1']"
                        variant="outlined" density="compact" class="mb-3"
                    ></v-text-field>
                    <v-switch v-model="config.subscribe_check_library" label="添加订阅前检测入库" color="primary" hide-details class="mb-3" hint="开启后添加剧集订阅时自动检测 Emby 已有集数，自动设置开始集数从缺集处开始追更" persistent-hint></v-switch>
                    <v-switch v-model="config.auto_delete_completed" label="订阅完成后自动删除" color="primary" hide-details class="mb-3" hint="开启后电影或剧集订阅完成时自动删除该订阅，等同于手动删除" persistent-hint></v-switch>

                    <v-divider class="my-4"></v-divider>
                    <div class="text-subtitle-2 mb-2">影巢订阅搜索关键词</div>
                    <v-switch v-model="config.hdhive_search_keywords_enabled" label="启用影巢搜索关键词筛选" color="primary" hide-details class="mb-3" hint="开启后，影巢搜索结果将按关键词筛选，仅获取匹配的资源。关键词支持匹配资源名称和资源说明（remark）" persistent-hint></v-switch>
                    <div v-if="config.hdhive_search_keywords_enabled">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <v-text-field
                                v-model="newHdhiveKeyword"
                                label="关键词（匹配任一即获取）"
                                variant="outlined"
                                density="compact"
                                hide-details
                                prepend-inner-icon="mdi-tag-search-outline"
                                placeholder="输入关键词后回车添加"
                                @keyup.enter="addHdhiveKeyword"
                                style="flex: 1;"
                            ></v-text-field>
                            <v-btn color="primary" variant="tonal" size="small" @click="addHdhiveKeyword" style="border-radius: 8px; height: 40px;">
                                <v-icon size="18">mdi-plus</v-icon>
                            </v-btn>
                        </div>
                        <div v-if="config.hdhive_search_keywords.length > 0" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                            <v-chip v-for="(kw, idx) in config.hdhive_search_keywords" :key="idx" closable @click:close="removeHdhiveKeyword(idx)" size="small" variant="tonal" color="info">
                                {{ kw }}
                            </v-chip>
                        </div>
                        <div v-else style="font-size: 12px; opacity: 0.5; padding-left: 4px; margin-bottom: 12px;">未添加关键词，开启后不会筛选任何影巢资源</div>
                        <v-switch v-model="config.hdhive_official_only" label="只获取官组资源" color="success" hide-details class="mb-3" hint="开启后仅获取标记为官组的资源，与关键词筛选叠加生效" persistent-hint></v-switch>
                        <div style="padding: 12px 16px; background: rgba(61,111,213,0.08); border-radius: 10px; border: 1px solid rgba(61,111,213,0.2); margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <v-icon color="info" size="16">mdi-information-outline</v-icon>
                                <span style="font-size: 12px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.75);">关键词筛选说明</span>
                            </div>
                            <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0;">
                                关键词同时匹配资源的名称（发布者昵称）和资源说明（remark），匹配到其中一个关键词即视为命中。说明为空的资源将被跳过。开启「只获取官组资源」后会先过滤官组，再按关键词筛选。
                            </p>
                        </div>
                    </div>

                    <v-divider class="my-4"></v-divider>
                    <div class="text-subtitle-2 mb-2">资源来源数量限制</div>
                    <v-switch v-model="config.source_limit_enabled" label="启用来源数量限制" color="primary" hide-details class="mb-3" hint="开启后，订阅搜索时对 TG 频道和影巢分别限制获取的资源个数，从搜索结果中随机选取指定数量" persistent-hint></v-switch>
                    <div v-if="config.source_limit_enabled" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                        <v-text-field v-model.number="config.source_limit_tg" label="TG 个数" type="number" min="1" variant="outlined" density="compact" hide-details style="max-width: 110px; min-width: 80px;"></v-text-field>
                        <v-text-field v-model.number="config.source_limit_hdhive" label="影巢个数" type="number" min="1" variant="outlined" density="compact" hide-details style="max-width: 110px; min-width: 80px;"></v-text-field>
                        <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.45);">从搜索结果中随机选取，影巢先筛选再选取</span>
                    </div>

                    <v-divider class="my-4"></v-divider>
                    <div class="text-subtitle-2 mb-2">频道搜索指定来源</div>
                    <v-switch v-model="config.channel_search_filter_enabled" label="启用频道搜索指定来源" color="primary" hide-details class="mb-3" hint="开启后，订阅搜索 TG 频道时仅搜索选定的频道，不再搜索全部频道" persistent-hint></v-switch>
                    <div v-if="config.channel_search_filter_enabled">
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-bottom: 12px; line-height: 1.6;">
                            选择订阅搜索时要搜索的 TG 频道，频道列表来自「看板 → 设置 → TG 频道管理」。
                        </div>
                        <v-select
                            :model-value="channelSearchFilterSelectedIds"
                            @update:model-value="channelSearchFilterOnChange"
                            :items="tgMonitorChannelOptions"
                            item-title="title"
                            item-value="channel_id"
                            label="搜索频道（多选）"
                            variant="outlined"
                            density="compact"
                            multiple
                            chips
                            closable-chips
                            class="mb-3"
                            no-data-text="无可用频道，请先在看板设置中添加 TG 频道"
                        ></v-select>
                    </div>

                    <v-divider class="my-4"></v-divider>
                    <div class="text-subtitle-2 mb-2">转存设置</div>

                    <v-select v-model="config.use_115_config"
                        :items="[{title:'请选择',value:''},...(options.configs_115||[]).filter(c=>!c.has_open_token).map(c=>({title:c.name,value:c.name}))]"
                        item-title="title" item-value="value" label="转存用 115 配置"
                        variant="outlined" density="compact" class="mb-3"
                        hint="仅用于转存模式，分享模式解析账号使用「115 分享 STRM」配置" persistent-hint></v-select>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div class="text-subtitle-2">转存文件夹 ({{ config.transfer_folders.length }})</div>
                        <v-btn color="success" variant="tonal" size="small" @click="openCloudFolderBrowser" :disabled="!config.use_115_config" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-plus</v-icon>浏览 115 文件夹
                        </v-btn>
                    </div>
                    <div v-if="config.transfer_folders.length > 0" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                        <div v-for="(f, i) in config.transfer_folders" :key="i"
                            style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                                <v-icon color="warning" size="20">mdi-folder</v-icon>
                                <div style="min-width: 0; flex: 1;">
                                    <div style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.85);">{{ f.alias || f.name || 'CID: ' + f.cid }}</div>
                                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">{{ f.name }} · CID: {{ f.cid }}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 4px; flex-shrink: 0;">
                                <v-btn icon size="x-small" variant="text" color="info" @click="openCloudFolderBrowserForEdit(i)" :disabled="!config.use_115_config"><v-icon size="16">mdi-pencil</v-icon></v-btn>
                                <v-btn icon size="x-small" variant="text" color="error" @click="removeTransferFolder(i)"><v-icon size="16">mdi-delete</v-icon></v-btn>
                            </div>
                        </div>
                    </div>
                    <div v-else style="padding: 20px; text-align: center; color: rgba(var(--v-theme-on-surface),0.35); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 10px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1); margin-bottom: 12px;">
                        <v-icon size="28" color="grey">mdi-folder-plus-outline</v-icon>
                        <p style="margin-top: 6px; font-size: 12px;">点击上方按钮浏览 115 网盘添加文件夹</p>
                    </div>

                    <v-divider class="my-4"></v-divider>
                    <div style="padding: 16px; background: rgba(61,111,213,0.08); border-radius: 10px; border: 1px solid rgba(61,111,213,0.2); margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <v-icon color="info" size="18">mdi-information-outline</v-icon>
                            <span class="text-subtitle-2" style="color: rgba(var(--v-theme-on-surface),0.85);">STRM 输出路径</span>
                        </div>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0;">
                            STRM 路径已统一从「115 分享 STRM」配置读取，请在该页面管理路径。每个订阅可在编辑弹窗中选择具体路径。
                        </p>
                    </div>
                    <div style="padding: 16px; background: rgba(255,165,0,0.08); border-radius: 10px; border: 1px solid rgba(255,165,0,0.2); margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <v-icon color="warning" size="18">mdi-alert-circle-outline</v-icon>
                            <span class="text-subtitle-2" style="color: rgba(var(--v-theme-on-surface),0.85);">影巢积分限制</span>
                        </div>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0;">
                            订阅解锁影巢付费资源时，积分限制使用「工具箱 → HDHive 解析」中的设置，超出限制的资源将自动跳过。官组资源不受积分限制影响。
                        </p>
                    </div>
                    <div style="padding: 16px; background: rgba(255,165,0,0.08); border-radius: 10px; border: 1px solid rgba(255,165,0,0.2); margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <v-icon color="warning" size="18">mdi-alert-circle-outline</v-icon>
                            <span class="text-subtitle-2" style="color: rgba(var(--v-theme-on-surface),0.85);">搜索源配置</span>
                        </div>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0;">
                            TG 频道与账号请到「看板 → 设置」中配置，HDHive 账号请到「工具箱 → HDHive 解析」中配置。
                        </p>
                    </div>
                    <div style="padding: 16px; background: rgba(255,165,0,0.08); border-radius: 10px; border: 1px solid rgba(255,165,0,0.2); margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <v-icon color="warning" size="18">mdi-alert-circle-outline</v-icon>
                            <span class="text-subtitle-2" style="color: rgba(var(--v-theme-on-surface),0.85);">媒体信息提取与转存目录</span>
                        </div>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0;">
                            媒体信息提取会先转存到「最近接收」目录获取下载链接，可以搭配工具箱-清理助手来自动清理目录，所以转存文件夹不建议设置在最近接收目录。
                        </p>
                    </div>

                    <v-divider class="mb-4"></v-divider>

                    <!-- 订阅默认配置预设 -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div class="text-subtitle-2">订阅默认配置 ({{ (config.presets || []).length }})</div>
                        <v-btn color="success" variant="tonal" size="small" @click="openPresetAdd" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-plus</v-icon>添加配置
                        </v-btn>
                    </div>
                    <div v-if="(config.presets || []).length > 0" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                        <div v-for="p in config.presets" :key="p.id"
                            style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); cursor: pointer; transition: all 0.2s;"
                            @click="openPresetEdit(p)">
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                                <v-icon color="primary" size="20">mdi-tune-variant</v-icon>
                                <div style="min-width: 0; flex: 1;">
                                    <div style="font-size: 13px; font-weight: 500; color: rgba(var(--v-theme-on-surface),0.85);">{{ p.name }}</div>
                                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">{{ getPresetModeText(p.mode) }} · {{ getPresetSummary(p) }}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 4px; flex-shrink: 0;" @click.stop>
                                <v-btn icon size="x-small" variant="text" color="info" @click="openPresetEdit(p)"><v-icon size="16">mdi-pencil</v-icon></v-btn>
                                <v-btn icon size="x-small" variant="text" color="error" @click="deletePreset(p.id)"><v-icon size="16">mdi-delete</v-icon></v-btn>
                            </div>
                        </div>
                    </div>
                    <div v-else style="padding: 20px; text-align: center; color: rgba(var(--v-theme-on-surface),0.35); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 10px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1); margin-bottom: 12px;">
                        <v-icon size="28" color="grey">mdi-tune-variant</v-icon>
                        <p style="margin-top: 6px; font-size: 12px;">添加预设配置后，添加订阅时可快速选用</p>
                    </div>

                    <v-divider class="my-4"></v-divider>

                    <!-- TG 频道监控 -->
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon color="deep-purple" size="22">mdi-antenna</v-icon>
                        <span class="text-subtitle-1" style="font-weight: 600;">TG 频道监控</span>
                        <v-chip v-if="tgMonitorStatus.running" size="x-small" color="success" variant="tonal">运行中</v-chip>
                        <v-chip v-else size="x-small" color="grey" variant="tonal">已停止</v-chip>
                    </div>
                    <v-switch v-model="tgMonitorConfig.enabled" label="启用 TG 频道监控" color="deep-purple" hide-details class="mb-3"></v-switch>
                    <div v-if="tgMonitorConfig.enabled">
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-bottom: 12px; line-height: 1.6;">
                            实时监听已选频道的新消息，自动匹配活跃订阅并处理。频道列表来自「看板 → 设置 → TG 频道管理」。
                        </div>
                        <v-select
                            :model-value="tgMonitorSelectedChannelIds"
                            @update:model-value="tgMonitorOnChannelChange"
                            :items="tgMonitorChannelOptions"
                            item-title="title"
                            item-value="channel_id"
                            label="监控频道（多选）"
                            variant="outlined"
                            density="compact"
                            multiple
                            chips
                            closable-chips
                            class="mb-3"
                            no-data-text="无可用频道，请先在看板设置中添加 TG 频道"
                        ></v-select>
                        <v-row dense class="mb-3">
                            <v-col cols="5" sm="3">
                                <v-text-field
                                    v-model.number="tgMonitorConfig.collect_interval"
                                    label="收集间隔(秒)"
                                    type="number"
                                    min="1"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    @change="tgMonitorUpdateInterval"
                                ></v-text-field>
                            </v-col>
                            <v-col cols="7" sm="9" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <v-btn color="success" variant="tonal" size="small" @click="tgMonitorStart" :loading="tgMonitorLoading" :disabled="tgMonitorStatus.running" style="border-radius: 8px;">
                                    <v-icon left size="16">mdi-play</v-icon>启动
                                </v-btn>
                                <v-btn color="error" variant="tonal" size="small" @click="tgMonitorStop" :loading="tgMonitorLoading" :disabled="!tgMonitorStatus.running" style="border-radius: 8px;">
                                    <v-icon left size="16">mdi-stop</v-icon>停止
                                </v-btn>
                                <v-btn color="warning" variant="tonal" size="small" @click="tgMonitorRestart" :loading="tgMonitorLoading" :disabled="!tgMonitorStatus.running" style="border-radius: 8px;">
                                    <v-icon left size="16">mdi-restart</v-icon>重启
                                </v-btn>
                            </v-col>
                        </v-row>
                        <div v-if="tgMonitorStatus.queue_size > 0" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-bottom: 8px;">
                            <v-icon size="14" color="info">mdi-tray-full</v-icon> 队列中待处理: {{ tgMonitorStatus.queue_size }} 个批次
                        </div>
                        <div style="padding: 12px 16px; background: rgba(103,58,183,0.08); border-radius: 10px; border: 1px solid rgba(103,58,183,0.2); margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <v-icon color="deep-purple" size="16">mdi-information-outline</v-icon>
                                <span style="font-size: 12px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.75);">监控说明</span>
                            </div>
                            <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0; line-height: 1.6;">
                                收到消息后等待「收集间隔」秒数，期间有新消息则重新计时，静默后开始逐条解析匹配。监控日志显示在订阅日志中。当监控任务进行中时，定时订阅扫描将自动跳过。保存设置后自动启停监控。
                            </p>
                        </div>
                    </div>

                    <v-divider class="my-4"></v-divider>

                    <!-- 通知模板自定义 -->
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon color="primary" size="22">mdi-bell-cog-outline</v-icon>
                        <span class="text-subtitle-1" style="font-weight: 600;">通知模板自定义</span>
                    </div>
                    <div style="padding: 12px 16px; background: rgba(61,111,213,0.08); border-radius: 10px; border: 1px solid rgba(61,111,213,0.2); margin-bottom: 12px;">
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0 0 4px;">
                            支持 Jinja2 语法。转存和分享订阅共用此模板。可用变量：
                        </p>
                        <p style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin: 0; font-family: monospace; line-height: 1.6;" v-pre>
                            {{ name }} {{ year }} {{ season_ep }} {{ mode_text }} {{ version }} {{ ep_progress }}<br>
                            {{ resolution }} {{ effect }} {{ resource_type }} {{ release_group }}<br>
                            {{ video_codec }} {{ audio_codec }} {{ media_type }} {{ strm_result }} {{ share_link }}<br>
                            {{ strm_files }}（列表） {{ all_items }}（列表） {{ sub }}（订阅对象）
                        </p>
                    </div>
                    <v-textarea v-model="config.notify_template" label="通知模板" variant="outlined" density="compact"
                        rows="8" no-resize class="mb-2" style="font-family: monospace; font-size: 13px;"
                        placeholder="留空使用默认模板"
                        hint="滚动查看完整内容"
                        persistent-hint></v-textarea>
                    <v-btn variant="text" size="small" color="warning" class="mt-1 mb-3" @click="resetNotifyTemplate">
                        <v-icon start size="16">mdi-restore</v-icon>
                        恢复默认模板
                    </v-btn>

                </div>
            </div>

            <!-- ==================== 编辑弹窗 ==================== -->
            <v-dialog v-model="editDialog" max-width="650" scrollable class="sub-edit-dialog">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title class="sub-edit-title">
                        <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                            <v-icon color="primary" size="20" style="flex-shrink: 0;">mdi-pencil</v-icon>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">编辑订阅 - {{ editForm.name }}</span>
                        </div>
                        <v-btn icon variant="text" size="small" @click="editDialog = false" style="flex-shrink: 0;"><v-icon>mdi-close</v-icon></v-btn>
                    </v-card-title>
                    <v-card-text class="sub-edit-content">
                        <v-select v-if="editPresets.length > 0" v-model="editForm.preset_ids"
                            :items="editPresets.map(p => ({title: p.name, value: p.id}))"
                            item-title="title" item-value="value" label="预设配置（多选，按选择顺序匹配）"
                            variant="outlined" density="compact" class="mb-3"
                            prepend-inner-icon="mdi-tune-variant" multiple chips closable-chips
                            hint="按选择顺序依次匹配，首个匹配的预设决定执行方式" persistent-hint></v-select>
                        <v-row dense>
                            <v-col cols="6" md="6">
                                <v-select v-model="editForm.mode"
                                    :items="[{title:'分享 STRM',value:'share_strm'},{title:'转存',value:'transfer'}]"
                                    item-title="title" item-value="value" label="模式" variant="outlined" density="compact"
                                    @update:model-value="editMode = editForm.mode"></v-select>
                            </v-col>
                            <v-col cols="6" md="6">
                                <v-select v-model="editForm.status"
                                    :items="[{title:'订阅中',value:'active'},{title:'已暂停',value:'paused'},{title:'已完成',value:'completed'}]"
                                    item-title="title" item-value="value" label="状态" variant="outlined" density="compact"></v-select>
                            </v-col>
                            <v-col cols="6" md="6">
                                <v-select v-model="editForm.resolution" :items="options.resolutions" item-title="label"
                                    item-value="value" label="分辨率" variant="outlined" density="compact"></v-select>
                            </v-col>
                            <v-col cols="6" md="6">
                                <v-select v-model="editForm.effect" :items="options.effects" item-title="label"
                                    item-value="value" label="特效" variant="outlined" density="compact"></v-select>
                            </v-col>
                            <v-col cols="6" md="6">
                                <v-select v-model="editForm.resource_type" :items="options.resource_types" item-title="label"
                                    item-value="value" label="来源类型" variant="outlined" density="compact"></v-select>
                            </v-col>
                            <v-col cols="6" md="6">
                                <v-autocomplete v-model="editForm.release_group" :items="options.release_groups" item-title="label"
                                    item-value="value" label="制作组" variant="outlined" density="compact"
                                    clearable auto-select-first></v-autocomplete>
                            </v-col>
                            <v-col cols="6" md="3">
                                <v-select
                                    :model-value="editForm.frame_rate ? 'custom' : ''"
                                    :items="[{title:'不限',value:''},{title:'自定义',value:'custom'}]"
                                    item-title="title" item-value="value" label="帧率"
                                    @update:model-value="val => { editForm.frame_rate = val === 'custom' ? (editForm.frame_rate || '60fps') : '' }"
                                    variant="outlined" density="compact"></v-select>
                            </v-col>
                            <v-col v-if="editForm.frame_rate" cols="6" md="3">
                                <v-text-field v-model="editForm.frame_rate" label="自定义帧率"
                                    variant="outlined" density="compact"
                                    placeholder="如 60fps"></v-text-field>
                            </v-col>
                            <v-col cols="6" md="6">
                                <v-select v-model="editForm.search_source"
                                    :items="[{title:'TG+影巢',value:'tg_hdhive'},{title:'影巢',value:'hdhive'},{title:'TG',value:'tg'}]"
                                    item-title="title" item-value="value" label="搜索来源" variant="outlined" density="compact"></v-select>
                            </v-col>
                            <v-col v-if="editForm.type === 'tv'" cols="6" md="3">
                                <v-text-field v-model.number="editForm.total_episode" label="总集数" type="number"
                                    variant="outlined" density="compact" min="0"
                                    hint="该季总集数" persistent-hint></v-text-field>
                            </v-col>
                            <v-col v-if="editForm.type === 'tv'" cols="6" md="3">
                                <v-text-field v-model.number="editForm.start_episode" label="开始集数" type="number"
                                    variant="outlined" density="compact" min="1"
                                    hint="从第几集开始追" persistent-hint></v-text-field>
                            </v-col>
                            <v-col v-if="editForm.type === 'tv' && editForm.completed_episodes && editForm.completed_episodes.length > 0" cols="12">
                                <div style="padding: 8px 12px; background: rgba(76,175,80,0.08); border-radius: 8px; border: 1px solid rgba(76,175,80,0.2); font-size: 12px; color: rgba(var(--v-theme-on-surface),0.7);">
                                    <v-icon size="14" color="success" style="margin-right: 4px;">mdi-check-circle-outline</v-icon>
                                    已完成 {{ editForm.completed_episodes.length }} 集: {{ formatEpisodeRange(editForm.completed_episodes) }}
                                </div>
                            </v-col>
                            <v-col v-if="editMode === 'transfer'" cols="6" md="6">
                                <v-select v-model="editTransferFolderCid"
                                    :items="globalTransferFolders.map(f => ({title: f.alias || f.name || ('CID: ' + f.cid), value: f.cid}))"
                                    item-title="title" item-value="value" label="转存文件夹" variant="outlined" density="compact"
                                    no-data-text="请先在订阅设置中添加转存文件夹"></v-select>
                            </v-col>
                            <v-col v-if="editMode === 'share_strm'" cols="6" md="6">
                                <v-select v-model="editForm.strm_folder_path"
                                    :items="shareStrmFolders"
                                    item-title="title" item-value="value" label="STRM 输出路径" variant="outlined" density="compact"
                                    no-data-text="请先在 115 分享 STRM 配置中添加目录"></v-select>
                            </v-col>
                            <v-col cols="12">
                                <v-switch v-if="editMode === 'share_strm'" v-model="editForm.reshare_enabled" label="转存再分享模式" color="primary" hide-details density="compact" class="mb-1"></v-switch>
                                <v-switch v-model="editForm.transfer_all_matches" :label="editMode === 'share_strm' ? '多个分享全部生成分享 STRM（如果多个文件名字同时命中所选参数则全部生成分享 STRM）' : '多资源全部转存（如果多个文件名字同时命中所选参数则全部转存）'" color="primary" hide-details density="compact"></v-switch>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-card-actions class="sub-edit-actions">
                        <v-btn color="success" variant="tonal" @click="runSingle(editForm.subscribe_id); editDialog = false" :loading="runningSubscribeId === editForm.subscribe_id" style="border-radius: 8px;" size="small">
                            <v-icon left size="18">mdi-play</v-icon>立即执行
                        </v-btn>
                        <v-btn color="error" variant="tonal" @click="confirmSingleDelete" style="border-radius: 8px;" size="small">
                            <v-icon left size="18">mdi-delete</v-icon>删除
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="editDialog=false" style="border-radius: 8px;" size="small">取消</v-btn>
                        <v-btn color="primary" variant="elevated" @click="saveEdit" :loading="editSaving" style="border-radius: 8px;" size="small">保存</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 单个删除确认 -->
            <v-dialog v-model="singleDeleteDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>确认删除
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p>确定要删除订阅 <strong>{{ editForm.name }}</strong> 吗？</p>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">此操作不可撤销。</p>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="singleDeleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeSingleDelete" :loading="singleDeleting" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>确认删除
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 删除确认 -->
            <v-dialog v-model="deleteDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>确认删除
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p v-if="deleteType === 'all'">确定要删除<strong>全部</strong>订阅吗？</p>
                        <p v-else>确定要删除选中的 <strong>{{ selectedIds.length }}</strong> 个订阅吗？</p>
                        <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">此操作不可撤销。</p>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="deleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeDelete" :loading="deleting" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>确认删除
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 115 文件夹浏览弹窗 -->
            <v-dialog v-model="cloudFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>{{ editingTransferFolderIndex >= 0 ? '编辑转存文件夹' : '选择 115 转存文件夹' }}</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="cloudFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-text-field v-model="newTransferFolderAlias" label="文件夹别名" placeholder="留空则使用文件夹名" variant="outlined" density="compact" hide-details></v-text-field>
                    </div>
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            <template v-for="(p, idx) in cloudFolderPath" :key="idx">
                                <v-chip size="small" :color="idx === cloudFolderPath.length - 1 ? 'primary' : 'default'" variant="tonal" @click="goToCloudPath(idx)" style="cursor: pointer; border-radius: 6px;">{{ p.name }}</v-chip>
                                <v-icon v-if="idx < cloudFolderPath.length - 1" size="14" color="grey">mdi-chevron-right</v-icon>
                            </template>
                        </div>
                    </div>
                    <v-card-text style="height: 300px; padding: 0;">
                        <div v-if="cloudFolderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="cloudFolders.length > 0" style="padding: 8px;">
                            <div v-for="folder in cloudFolders" :key="folder.cid" @click="enterCloudFolder(folder)"
                                style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 4px 0; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(61,111,213,0.1)'" onmouseout="this.style.background='rgba(var(--v-theme-on-surface),0.03)'">
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
                        <v-btn variant="tonal" @click="goBackCloud" :disabled="cloudFolderPath.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-btn variant="tonal" color="success" @click="toggleCreateFolderMode" style="border-radius: 8px; margin-left: 8px;">
                            <v-icon left size="18">mdi-folder-plus</v-icon>新建
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCloudFolder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 本地文件夹浏览弹窗 -->
            <v-dialog v-model="localFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="info">mdi-folder-open</v-icon>
                                <span>选择本地 STRM 生成路径</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="localFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <div style="padding: 12px 16px; background: rgba(0,0,0,0.05); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.7);">
                            <v-icon size="16" color="info">mdi-map-marker</v-icon>
                            当前路径: {{ localCurrentPath || '选择盘符' }}
                        </div>
                    </div>
                    <v-card-text style="height: 300px; padding: 0;">
                        <div v-if="localFolderLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                            <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        </div>
                        <div v-else-if="localFolders.length > 0" style="padding: 8px;">
                            <div v-for="folder in localFolders" :key="folder.path" @click="enterLocalFolder(folder)"
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
                        <v-btn variant="tonal" @click="goBackLocal" :disabled="!localCurrentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectLocalFolder" :disabled="!localCurrentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- 预设配置编辑弹窗 -->
            <v-dialog v-model="presetEditDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon color="primary" size="20">mdi-tune-variant</v-icon>
                            <span>{{ presetEditId ? '编辑配置' : '添加配置' }}</span>
                        </div>
                        <v-btn icon variant="text" size="small" @click="presetEditDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text style="padding: 20px;">
                        <v-text-field v-model="presetEditForm.name" label="配置名称" variant="outlined" density="compact" class="mb-3"
                            placeholder="例：4K分享 / 1080p转存"></v-text-field>
                        <v-row dense>
                            <v-col cols="6">
                                <v-select v-model="presetEditForm.mode"
                                    :items="[{title:'分享追更',value:'share_strm'},{title:'转存追更',value:'transfer'}]"
                                    item-title="title" item-value="value" label="订阅模式"
                                    variant="outlined" density="compact" rounded="lg"></v-select>
                            </v-col>
                            <v-col cols="6">
                                <v-select v-model="presetEditForm.resolution" :items="options.resolutions || []"
                                    item-title="label" item-value="value" label="分辨率"
                                    variant="outlined" density="compact" rounded="lg"></v-select>
                            </v-col>
                            <v-col cols="6">
                                <v-select v-model="presetEditForm.effect" :items="options.effects || []"
                                    item-title="label" item-value="value" label="特效"
                                    variant="outlined" density="compact" rounded="lg"></v-select>
                            </v-col>
                            <v-col cols="6">
                                <v-select v-model="presetEditForm.resource_type" :items="options.resource_types || []"
                                    item-title="label" item-value="value" label="来源类型"
                                    variant="outlined" density="compact" rounded="lg"></v-select>
                            </v-col>
                            <v-col cols="6">
                                <v-autocomplete v-model="presetEditForm.release_group" :items="options.release_groups || []"
                                    item-title="label" item-value="value" label="制作组"
                                    variant="outlined" density="compact" rounded="lg"
                                    clearable auto-select-first></v-autocomplete>
                            </v-col>
                            <v-col cols="6" md="3">
                                <v-select
                                    :model-value="presetEditForm.frame_rate ? 'custom' : ''"
                                    :items="[{title:'不限',value:''},{title:'自定义',value:'custom'}]"
                                    item-title="title" item-value="value" label="帧率"
                                    @update:model-value="val => { presetEditForm.frame_rate = val === 'custom' ? (presetEditForm.frame_rate || '60fps') : '' }"
                                    variant="outlined" density="compact" rounded="lg"></v-select>
                            </v-col>
                            <v-col v-if="presetEditForm.frame_rate" cols="6" md="3">
                                <v-text-field v-model="presetEditForm.frame_rate" label="自定义帧率"
                                    variant="outlined" density="compact" rounded="lg"
                                    placeholder="如 60fps"></v-text-field>
                            </v-col>
                            <v-col cols="6">
                                <v-select v-model="presetEditForm.search_source"
                                    :items="[{title:'TG+影巢',value:'tg_hdhive'},{title:'影巢',value:'hdhive'},{title:'TG',value:'tg'}]"
                                    item-title="title" item-value="value" label="搜索来源"
                                    variant="outlined" density="compact" rounded="lg"></v-select>
                            </v-col>
                            <v-col v-if="presetEditForm.mode === 'transfer'" cols="6">
                                <v-select v-model="presetEditForm.transfer_folder_cid"
                                    :items="presetTransferFolders.map(f => ({title: f.alias || f.name || ('CID: ' + f.cid), value: f.cid}))"
                                    item-title="title" item-value="value" label="转存文件夹"
                                    variant="outlined" density="compact" rounded="lg"
                                    no-data-text="请先在订阅设置中添加转存文件夹"></v-select>
                            </v-col>
                            <v-col v-if="presetEditForm.mode === 'share_strm'" cols="6">
                                <v-select v-model="presetEditForm.strm_folder_path"
                                    :items="presetStrmFolders"
                                    item-title="title" item-value="value" label="STRM 输出路径"
                                    variant="outlined" density="compact" rounded="lg"
                                    no-data-text="请先在 115 分享 STRM 配置中添加目录"></v-select>
                            </v-col>
                            <v-col cols="12">
                                <v-switch v-if="presetEditForm.mode === 'share_strm'" v-model="presetEditForm.reshare_enabled" label="转存再分享模式" color="primary" hide-details density="compact" class="mb-1"></v-switch>
                                <v-switch v-model="presetEditForm.transfer_all_matches" :label="presetEditForm.mode === 'share_strm' ? '多个分享全部生成分享 STRM' : '多资源全部转存'" color="primary" hide-details density="compact" class="mb-1"></v-switch>
                                <v-switch v-model="presetEditForm.run_immediately" label="添加后立即执行" color="success" hide-details density="compact"></v-switch>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="tonal" rounded="pill" @click="presetEditDialog = false" size="small">取消</v-btn>
                        <v-btn color="primary" variant="elevated" rounded="pill" @click="savePreset" :loading="presetSaving" class="px-6" size="small">保存</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};

const subscribePageStyle = document.createElement('style');
subscribePageStyle.textContent = `
    .sub-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 12px;
    }
    .sub-card {
        position: relative;
        display: flex;
        background: rgba(var(--v-theme-on-surface),0.02);
        border-radius: 12px;
        border: 1px solid rgba(var(--v-theme-on-surface),0.06);
        cursor: pointer;
        transition: all 0.2s;
        overflow: hidden;
        min-height: 120px;
    }
    .sub-card:hover {
        background: rgba(61,111,213,0.08);
        border-color: rgba(61,111,213,0.2);
    }
    .sub-card-selected {
        background: rgba(61,111,213,0.12) !important;
        border-color: rgba(61,111,213,0.3) !important;
    }
    .sub-card-poster {
        flex-shrink: 0;
        width: 85px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.15);
    }
    .sub-card-poster-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    .sub-card-poster-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }
    .sub-card-body {
        flex: 1;
        min-width: 0;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .sub-card-title {
        font-size: 14px;
        font-weight: 500;
        color: rgba(var(--v-theme-on-surface),0.9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .sub-card-chips {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
    }
    .sub-card-meta {
        font-size: 12px;
        color: rgba(var(--v-theme-on-surface),0.5);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .sub-card-info {
        font-size: 11px;
        color: rgba(var(--v-theme-on-surface),0.35);
    }
    .sub-card-actions {
        display: flex;
        gap: 2px;
        margin-top: auto;
    }
    @media (max-width: 600px) {
        .sub-grid {
            grid-template-columns: 1fr;
        }
        .sub-edit-dialog .v-overlay__content {
            margin: 8px !important;
            max-height: calc(100vh - 16px) !important;
        }
        .sub-edit-title {
            padding: 12px 16px !important;
            font-size: 15px !important;
        }
        .sub-edit-content {
            padding: 12px !important;
        }
        .sub-edit-actions {
            flex-wrap: wrap;
            gap: 6px;
            padding: 12px !important;
        }
    }
    .sub-edit-title {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .sub-edit-content {
        padding: 20px;
    }
    .sub-edit-actions {
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
`;
document.head.appendChild(subscribePageStyle);
