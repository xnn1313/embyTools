// Emby 缺集检测页面组件（含顶部 tab 栏：缺集检测 / 缺集补全）
const EmbyGapCheckerPage = {
    name: 'EmbyGapCheckerPage',

    components: {
        EmbyGapFillerPage
    },

    data() {
        return {
            activeTab: 'detect',
            embyConfigs: [],
            selectedConfigId: '',
            scanning: false,
            progress: '',
            scanError: null,
            pollTimer: null,
            result: null,
            resultLoading: false,
            // 媒体库多选
            libraries: [],
            selectedLibraryIds: [],
            loadingLibraries: false,
            // 多选
            multiSelectMode: false,
            selectedIds: [],
        }
    },

    computed: {
        details() {
            return (this.result && this.result.details) ? this.result.details : [];
        },
        isAllSelected() {
            return this.details.length > 0 && this.selectedIds.length === this.details.length;
        },
        selectedItems() {
            return this.details.filter((_, idx) => this.selectedIds.includes(idx));
        },
    },

    async mounted() {
        this.parseSubRoute();
        this._routeHandler = () => this.parseSubRoute();
        window.addEventListener('route-change', this._routeHandler);
        await this.loadEmbyConfigs();
        await this.checkStatus();
    },

    beforeUnmount() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        if (this._routeHandler) {
            window.removeEventListener('route-change', this._routeHandler);
        }
    },

    methods: {
        async loadEmbyConfigs() {
            try {
                const res = await api.request('/emby/configs');
                const embyList = (res.success && res.data) ? res.data : [];
                const res2 = await api.request('/fast_transfer/configs');
                const ftList = (res2.success && res2.data) ? res2.data : [];
                this.embyConfigs = [
                    ...embyList.map(c => ({ title: `[Emby助手] ${c.name || c.id}`, value: c.id })),
                    ...ftList.map(c => ({ title: `[秒传播放] ${c.name || c.id}`, value: c.id }))
                ];
                if (this.embyConfigs.length > 0 && !this.selectedConfigId) {
                    this.selectedConfigId = this.embyConfigs[0].value;
                }
                if (this.selectedConfigId) {
                    await this.loadLibraries();
                }
            } catch (e) {
                console.error('Failed to load Emby configs:', e);
            }
        },

        async loadLibraries() {
            if (!this.selectedConfigId) {
                this.libraries = [];
                this.selectedLibraryIds = [];
                return;
            }
            this.loadingLibraries = true;
            try {
                const res = await api.request('/emby/gap_scan/libraries', {
                    method: 'POST',
                    body: JSON.stringify({ config_id: this.selectedConfigId })
                });
                const libs = (res.success && res.data) ? res.data : [];
                this.libraries = libs.map(l => ({ title: l.name + (l.type ? ` (${l.type})` : ''), value: l.id }));
                this.selectedLibraryIds = this.libraries.map(l => l.value);
            } catch (e) {
                console.error('Failed to load libraries:', e);
                this.libraries = [];
                this.selectedLibraryIds = [];
            } finally {
                this.loadingLibraries = false;
            }
        },

        async onConfigChange(newVal) {
            this.selectedConfigId = newVal;
            await this.loadLibraries();
        },

        async startScan() {
            if (!this.selectedConfigId) {
                window.showMessage && window.showMessage('请先选择 Emby 配置', 'warning');
                return;
            }
            this.scanning = true;
            this.scanError = null;
            this.progress = '启动扫描...';
            try {
                const body = { config_id: this.selectedConfigId };
                if (this.selectedLibraryIds.length > 0 && this.selectedLibraryIds.length < this.libraries.length) {
                    body.library_ids = this.selectedLibraryIds;
                }
                const res = await api.request('/emby/gap_scan/start', {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                if (res.success) {
                    window.showMessage && window.showMessage('扫描任务已启动', 'success');
                    this.startPolling();
                } else {
                    window.showMessage && window.showMessage(res.message || '启动失败', 'error');
                    this.scanning = false;
                    this.progress = '';
                }
            } catch (e) {
                window.showMessage && window.showMessage('启动扫描失败', 'error');
                this.scanning = false;
                this.progress = '';
            }
        },

        startPolling() {
            if (this.pollTimer) clearInterval(this.pollTimer);
            this.pollTimer = setInterval(async () => {
                try {
                    const res = await api.request('/emby/gap_scan/status');
                    if (res.success) {
                        const st = res.data;
                        this.progress = st.progress || '';
                        if (!st.running) {
                            clearInterval(this.pollTimer);
                            this.pollTimer = null;
                            this.scanning = false;
                            if (st.error) {
                                this.scanError = st.error;
                                window.showMessage && window.showMessage(`扫描失败: ${st.error}`, 'error');
                            } else if (st.has_result) {
                                window.showMessage && window.showMessage('扫描完成！', 'success');
                                await this.loadResult();
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            }, 1500);
        },

        async checkStatus() {
            try {
                const res = await api.request('/emby/gap_scan/status');
                if (res.success) {
                    const st = res.data;
                    if (st.running) {
                        this.scanning = true;
                        this.progress = st.progress || '扫描中...';
                        this.startPolling();
                    } else if (st.has_result) {
                        this.progress = st.progress || '';
                        await this.loadResult();
                    }
                }
            } catch (e) { /* ignore */ }
        },

        async loadResult() {
            this.resultLoading = true;
            try {
                const res = await api.request('/emby/gap_scan/result');
                if (res.success) {
                    this.result = res.data;
                    this.selectedIds = [];
                    this.multiSelectMode = false;
                }
            } catch (e) { /* ignore */ }
            finally { this.resultLoading = false; }
        },

        downloadJson() {
            if (!this.result) return;
            const blob = new Blob([JSON.stringify(this.result, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'emby_gap_report.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        async clearResult() {
            try {
                const res = await api.request('/emby/gap_scan/clear', { method: 'POST' });
                if (res.success) {
                    this.result = null;
                    this.progress = '';
                    this.scanError = null;
                    this.selectedIds = [];
                    this.multiSelectMode = false;
                    window.showMessage && window.showMessage('已清空检测结果', 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '清空失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('清空失败', 'error');
            }
        },

        // 多选相关
        toggleMultiSelect() {
            this.multiSelectMode = !this.multiSelectMode;
            if (!this.multiSelectMode) {
                this.selectedIds = [];
            }
        },
        toggleSelectItem(idx) {
            const pos = this.selectedIds.indexOf(idx);
            if (pos >= 0) {
                this.selectedIds.splice(pos, 1);
            } else {
                this.selectedIds.push(idx);
            }
        },
        isItemSelected(idx) {
            return this.selectedIds.includes(idx);
        },
        toggleSelectAll() {
            if (this.isAllSelected) {
                this.selectedIds = [];
            } else {
                this.selectedIds = this.details.map((_, idx) => idx);
            }
        },
        parseSubRoute() {
            const hash = window.location.hash.slice(1).replace(/^\//, '');
            if (hash === 'toolbox/emby_gap_checker/filler') {
                this.activeTab = 'filler';
            } else {
                this.activeTab = 'detect';
            }
        },
        switchTab(tab) {
            if (tab === 'filler') {
                router.push('toolbox/emby_gap_checker/filler');
            } else {
                router.push('toolbox/emby_gap_checker');
            }
        },
        sendSelectedToFiller() {
            if (this.selectedItems.length === 0) {
                window.showMessage && window.showMessage('请先选择要补全的剧集', 'warning');
                return;
            }
            router.push('toolbox/emby_gap_checker/filler');
        },
    },

    template: `
        <div>
            <!-- 顶部 Tab 栏 -->
            <v-card style="border-radius: 12px; margin-bottom: 16px; background: rgba(var(--v-theme-on-surface),0.04); border: 1px solid rgba(var(--v-theme-on-surface),0.1);" elevation="0">
                <v-tabs :model-value="activeTab" @update:model-value="switchTab" color="primary" bg-color="transparent" density="comfortable" grow>
                    <v-tab value="detect">
                        <v-icon size="16" style="margin-right: 6px;">mdi-magnify-scan</v-icon>
                        缺集检测
                    </v-tab>
                    <v-tab value="filler">
                        <v-icon size="16" style="margin-right: 6px;">mdi-puzzle-plus-outline</v-icon>
                        缺集补全
                        <v-chip v-if="selectedItems.length > 0" size="x-small" color="primary" variant="flat" style="margin-left: 6px;">{{ selectedItems.length }}</v-chip>
                    </v-tab>
                </v-tabs>
            </v-card>

            <!-- ====== 缺集检测 Tab ====== -->
            <div v-show="activeTab === 'detect'">
                <!-- 扫描控制区 -->
                <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <v-icon color="primary" size="22">mdi-magnify-scan</v-icon>
                        <span style="font-size: 16px; font-weight: 500;">Emby 缺集检测</span>
                    </div>

                    <v-select :model-value="selectedConfigId"
                        :items="embyConfigs"
                        item-title="title" item-value="value"
                        label="选择 Emby 配置"
                        variant="outlined" density="compact" class="mb-3"
                        :disabled="scanning"
                        hint="从 Emby 助手或秒传播放中选择一个配置" persistent-hint
                        @update:model-value="onConfigChange"></v-select>

                    <v-select v-model="selectedLibraryIds"
                        :items="libraries"
                        item-title="title" item-value="value"
                        label="指定媒体库（默认全部）"
                        variant="outlined" density="compact" class="mb-3"
                        :disabled="scanning || loadingLibraries"
                        :loading="loadingLibraries"
                        multiple chips closable-chips clearable
                        hint="切换配置后自动刷新，默认全选" persistent-hint></v-select>

                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <v-btn color="primary" variant="elevated" @click="startScan"
                            :loading="scanning" :disabled="!selectedConfigId || scanning"
                            style="border-radius: 10px; min-width: 130px;">
                            <v-icon left size="18">mdi-play</v-icon>
                            {{ scanning ? '扫描中...' : '开始扫描' }}
                        </v-btn>
                        <span v-if="progress" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6);">{{ progress }}</span>
                    </div>

                    <div style="margin-top: 10px; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">
                        遍历 Emby 中所有剧集，检测每季中是否存在缺集（根据最小集号到最大集号范围判断），结果推送到 TG
                    </div>

                    <div v-if="scanError" style="margin-top: 12px; padding: 10px 14px; background: rgba(255,76,81,0.1); border-radius: 8px; border: 1px solid rgba(255,76,81,0.3); font-size: 13px; color: #FF4C51;">
                        <v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>
                        {{ scanError }}
                    </div>
                </div>

                <!-- 扫描结果区 -->
                <div class="glass-card" style="padding: 20px; border-radius: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon color="info" size="22">mdi-format-list-bulleted</v-icon>
                            <span style="font-size: 16px; font-weight: 500;">检测结果</span>
                            <v-chip v-if="result && details.length > 0" size="x-small" variant="tonal" color="info">{{ details.length }}</v-chip>
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <!-- 多选模式按钮组 -->
                            <template v-if="multiSelectMode && details.length > 0">
                                <v-btn :color="isAllSelected ? 'primary' : 'default'"
                                    :variant="isAllSelected ? 'tonal' : 'outlined'" size="small"
                                    @click="toggleSelectAll" style="border-radius: 8px;">
                                    <v-icon left size="18">{{ isAllSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
                                    全选
                                </v-btn>
                                <v-btn v-if="selectedIds.length > 0" color="primary" variant="tonal" size="small"
                                    @click="sendSelectedToFiller" style="border-radius: 8px;">
                                    <v-icon left size="18">mdi-puzzle-plus-outline</v-icon>
                                    补全 ({{ selectedIds.length }})
                                </v-btn>
                            </template>
                            <v-btn v-if="result && details.length > 0" icon variant="text" size="small"
                                :color="multiSelectMode ? 'primary' : undefined"
                                @click="toggleMultiSelect" title="多选模式">
                                <v-icon size="20">mdi-checkbox-multiple-outline</v-icon>
                            </v-btn>
                            <v-btn v-if="result" icon variant="text" size="small" @click="clearResult" title="清空结果" :disabled="scanning">
                                <v-icon size="20">mdi-delete-outline</v-icon>
                            </v-btn>
                            <v-btn v-if="result" icon variant="text" size="small" @click="downloadJson" title="下载 JSON">
                                <v-icon size="20">mdi-download</v-icon>
                            </v-btn>
                            <v-btn icon variant="text" size="small" @click="loadResult" :loading="resultLoading" title="刷新">
                                <v-icon size="20">mdi-refresh</v-icon>
                            </v-btn>
                        </div>
                    </div>

                    <div v-if="resultLoading && !result" style="display: flex; justify-content: center; padding: 30px;">
                        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
                    </div>

                    <div v-else-if="!result" style="text-align: center; padding: 40px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                        <v-icon size="48" color="grey-darken-1">mdi-television-off</v-icon>
                        <p style="margin-top: 12px; font-size: 14px;">暂无检测结果</p>
                        <p style="font-size: 12px;">选择 Emby 配置并点击「开始扫描」</p>
                    </div>

                    <div v-else>
                        <!-- 摘要 -->
                        <div style="padding: 12px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; margin-bottom: 12px;">
                            <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">{{ result.summary }}</div>
                            <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">
                                共扫描 {{ result.total_series_scanned }} 个剧集，{{ result.total_series_with_gaps }} 个存在缺集
                            </div>
                        </div>

                        <!-- 缺集详情（支持多选） -->
                        <div v-if="details.length > 0" style="display: flex; flex-direction: column; gap: 8px;">
                            <div v-for="(item, idx) in details" :key="idx"
                                @click="multiSelectMode ? toggleSelectItem(idx) : null"
                                :style="{
                                    padding: '12px 16px',
                                    background: multiSelectMode && isItemSelected(idx) ? 'rgba(var(--v-theme-primary),0.1)' : 'rgba(var(--v-theme-on-surface),0.03)',
                                    borderRadius: '10px',
                                    border: multiSelectMode && isItemSelected(idx) ? '1px solid rgba(var(--v-theme-primary),0.4)' : '1px solid rgba(var(--v-theme-on-surface),0.08)',
                                    cursor: multiSelectMode ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease',
                                }">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <v-icon v-if="multiSelectMode" size="20"
                                        :color="isItemSelected(idx) ? 'primary' : 'grey'"
                                        style="flex-shrink: 0;">
                                        {{ isItemSelected(idx) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
                                    </v-icon>
                                    <div style="flex: 1;">
                                        <div style="font-size: 14px; font-weight: 500; margin-bottom: 6px; color: rgba(var(--v-theme-on-surface),0.9);">
                                            {{ item.name }}
                                            <span v-if="item.year" style="font-weight: 400; color: rgba(var(--v-theme-on-surface),0.4); font-size: 12px; margin-left: 6px;">({{ item.year }})</span>
                                            <v-chip v-if="item.tmdb_id" size="x-small" variant="tonal" color="info" style="margin-left: 6px;">TMDB:{{ item.tmdb_id }}</v-chip>
                                        </div>
                                        <div v-for="s in item.seasons" :key="s.season"
                                            style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6); margin-left: 4px; margin-bottom: 2px;">
                                            <v-chip size="x-small" color="warning" variant="flat" style="margin-right: 6px;">S{{ String(s.season).padStart(2, '0') }}</v-chip>
                                            缺少: <span style="color: #FF9800;">{{ s.missing }}</span>
                                            <span style="color: rgba(var(--v-theme-on-surface),0.4);"> ({{ s.missing_count }}集)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else style="text-align: center; padding: 30px; color: rgba(var(--v-theme-on-surface),0.5);">
                            <v-icon size="40" color="success">mdi-check-circle</v-icon>
                            <p style="margin-top: 8px;">所有剧集集数完整，无缺集！</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ====== 缺集补全 Tab ====== -->
            <div v-show="activeTab === 'filler'">
                <EmbyGapFillerPage :selected-items="selectedItems" />
            </div>
        </div>
    `
};
