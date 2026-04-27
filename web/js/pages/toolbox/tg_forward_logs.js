// TG 转发日志页面组件
const TgForwardLogsPage = {
    name: 'TgForwardLogsPage',

    data() {
        return {
            loading: false,
            logs: [],
            total: 0,
            totalPages: 0,
            page: 1,
            pageSize: 20,
            // 筛选
            keyword: '',
            keywordTimer: null,
            filterSourceId: '',
            filterTargetId: '',
            filterTgConfigId: '',
            filterForwardConfigId: '',
            filterStatus: '',
            // 筛选选项（从DB加载）
            filterOptions: {
                sources: [],
                targets: [],
                tg_accounts: [],
                forward_configs: [],
                statuses: [],
            },
            // 多选
            multiSelectMode: false,
            selectedIds: [],
            // 详情弹窗
            detailDialog: false,
            detailData: null,
            // 删除
            deleteDialog: false,
            deleteTargetType: 'selected', // 'selected' | 'all'
            deleting: false,
            // 高级筛选面板
            showAdvancedFilter: false,
        };
    },

    computed: {
        isPageAllSelected() {
            if (this.logs.length === 0) return false;
            return this.logs.every(item => this.selectedIds.includes(Number(item.id)));
        },
        selectedCount() {
            return this.selectedIds.length;
        },
        hasSelected() {
            return this.selectedCount > 0;
        },
        sourceOptions() {
            return [{ title: '全部源频道', value: '' }, ...this.filterOptions.sources.map(s => ({ title: s.name || s.id, value: s.id }))];
        },
        targetOptions() {
            return [{ title: '全部目标频道', value: '' }, ...this.filterOptions.targets.map(t => ({ title: t.name || t.id, value: t.id }))];
        },
        tgAccountOptions() {
            return [{ title: '全部 TG 账号', value: '' }, ...this.filterOptions.tg_accounts.map(a => ({ title: a.name || a.id, value: a.id }))];
        },
        forwardConfigOptions() {
            return [{ title: '全部转发配置', value: '' }, ...this.filterOptions.forward_configs.map(c => ({ title: c.name || c.id, value: c.id }))];
        },
        statusOptions() {
            return [
                { title: '全部状态', value: '' },
                ...this.filterOptions.statuses.map(s => ({ title: s === 'success' ? '成功' : s === 'failed' ? '失败' : s, value: s }))
            ];
        },
        activeFilterCount() {
            let count = 0;
            if (this.filterSourceId) count++;
            if (this.filterTargetId) count++;
            if (this.filterTgConfigId) count++;
            if (this.filterForwardConfigId) count++;
            if (this.filterStatus) count++;
            if (this.keyword) count++;
            return count;
        },
    },

    watch: {
        filterSourceId() { this.onFilterChange(); },
        filterTargetId() { this.onFilterChange(); },
        filterTgConfigId() { this.onFilterChange(); },
        filterForwardConfigId() { this.onFilterChange(); },
        filterStatus() { this.onFilterChange(); },
        keyword() {
            clearTimeout(this.keywordTimer);
            this.keywordTimer = setTimeout(() => {
                this.page = 1;
                this.resetSelection();
                this.loadData();
            }, 300);
        },
    },

    async mounted() {
        await Promise.all([this.loadFilterOptions(), this.loadData()]);
    },

    beforeUnmount() {
        clearTimeout(this.keywordTimer);
    },

    methods: {
        onFilterChange() {
            this.page = 1;
            this.resetSelection();
            this.loadData();
        },

        resetSelection() {
            this.selectedIds = [];
        },

        clearAllFilters() {
            this.keyword = '';
            this.filterSourceId = '';
            this.filterTargetId = '';
            this.filterTgConfigId = '';
            this.filterForwardConfigId = '';
            this.filterStatus = '';
        },

        async loadFilterOptions() {
            try {
                const res = await api.request('/tg_forward/logs/filter_options');
                if (res.success) {
                    this.filterOptions = res.data || this.filterOptions;
                }
            } catch (e) {
                console.error('加载筛选选项失败:', e);
            }
        },

        async loadData() {
            this.loading = true;
            try {
                const params = new URLSearchParams();
                params.set('page', this.page);
                params.set('page_size', this.pageSize);
                if (this.filterSourceId) params.set('source_id', this.filterSourceId);
                if (this.filterTargetId) params.set('target_id', this.filterTargetId);
                if (this.filterTgConfigId) params.set('tg_config_id', this.filterTgConfigId);
                if (this.filterForwardConfigId) params.set('forward_config_id', this.filterForwardConfigId);
                if (this.filterStatus) params.set('status', this.filterStatus);
                if (this.keyword) params.set('keyword', this.keyword);
                const res = await api.request('/tg_forward/logs?' + params.toString());
                if (res.success) {
                    this.logs = res.data.list || [];
                    this.total = res.data.total || 0;
                    this.totalPages = res.data.total_pages || 0;
                }
            } catch (e) {
                window.showMessage('加载日志失败', 'error');
            } finally {
                this.loading = false;
            }
        },

        goPage(page) {
            if (page < 1 || page > this.totalPages) return;
            this.page = page;
            this.loadData();
        },

        // ===== 多选 =====
        toggleMultiSelectMode() {
            this.multiSelectMode = !this.multiSelectMode;
            if (!this.multiSelectMode) {
                this.resetSelection();
            }
        },

        toggleSelect(logId) {
            const id = Number(logId);
            const idx = this.selectedIds.indexOf(id);
            if (idx > -1) {
                this.selectedIds.splice(idx, 1);
            } else {
                this.selectedIds.push(id);
            }
        },

        isSelected(logId) {
            return this.selectedIds.includes(Number(logId));
        },

        toggleSelectAllPage() {
            const pageIds = this.logs.map(l => Number(l.id));
            if (this.isPageAllSelected) {
                this.selectedIds = this.selectedIds.filter(id => !pageIds.includes(id));
            } else {
                this.selectedIds = Array.from(new Set([...this.selectedIds, ...pageIds]));
            }
        },

        // ===== 详情弹窗 =====
        openDetail(log) {
            this.detailData = log;
            this.detailDialog = true;
        },

        // ===== 删除 =====
        openDeleteSelected() {
            if (!this.hasSelected) return;
            this.deleteTargetType = 'selected';
            this.deleteDialog = true;
        },

        openDeleteAll() {
            this.deleteTargetType = 'all';
            this.deleteDialog = true;
        },

        async executeDelete() {
            this.deleting = true;
            try {
                let res;
                if (this.deleteTargetType === 'all') {
                    res = await api.request('/tg_forward/logs/all', { method: 'DELETE' });
                } else {
                    res = await api.request('/tg_forward/logs', {
                        method: 'DELETE',
                        body: JSON.stringify({ log_ids: this.selectedIds })
                    });
                }
                if (res.success) {
                    window.showMessage(res.message || '删除成功', 'success');
                    this.deleteDialog = false;
                    this.resetSelection();
                    this.multiSelectMode = false;
                    await Promise.all([this.loadData(), this.loadFilterOptions()]);
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (e) {
                window.showMessage('删除失败', 'error');
            } finally {
                this.deleting = false;
            }
        },

        // ===== 工具 =====
        getStatusText(s) {
            if (s === 'success') return '成功';
            if (s === 'failed') return '失败';
            return s || '未知';
        },
        getStatusColor(s) {
            if (s === 'success') return 'success';
            if (s === 'failed') return 'error';
            return 'grey';
        },
        getMsgTypeText(t) {
            const map = { text: '文本', photo: '图片', video: '视频', document: '文件', sticker: '贴纸', gif: 'GIF', audio: '音频', voice: '语音', button: '按钮', unknown: '未知' };
            return map[t] || t || '-';
        },
        getMsgTypeIcon(t) {
            const map = { text: 'mdi-text', photo: 'mdi-image', video: 'mdi-video', document: 'mdi-file', sticker: 'mdi-sticker-emoji', gif: 'mdi-gif', audio: 'mdi-music', voice: 'mdi-microphone', button: 'mdi-gesture-tap-button' };
            return map[t] || 'mdi-message-text';
        },
        formatTime(value) {
            const text = String(value || '').trim();
            if (!text) return '-';
            const date = new Date(text.replace(' ', 'T'));
            if (Number.isNaN(date.getTime())) return text;
            return date.toLocaleString('zh-CN', { hour12: false });
        },
        truncateText(text, max = 60) {
            const s = String(text || '').trim();
            if (!s) return '-';
            return s.length > max ? s.slice(0, max) + '...' : s;
        },
    },

    template: `
        <div>
            <!-- 工具栏 -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                <!-- 搜索 -->
                <v-text-field
                    v-model="keyword"
                    placeholder="搜索消息内容、频道名称、关键词..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    style="max-width: 320px; flex-shrink: 0;"
                ></v-text-field>

                <!-- 高级筛选按钮 -->
                <v-btn
                    variant="tonal"
                    :color="activeFilterCount > 0 ? 'primary' : undefined"
                    size="small"
                    @click="showAdvancedFilter = !showAdvancedFilter"
                    style="border-radius: 8px;"
                >
                    <v-icon left size="16">mdi-filter-variant</v-icon>
                    筛选
                    <v-badge v-if="activeFilterCount > 0" :content="activeFilterCount" color="primary" inline class="ml-1"></v-badge>
                </v-btn>

                <v-spacer></v-spacer>

                <!-- 多选模式 -->
                <v-btn
                    :variant="multiSelectMode ? 'elevated' : 'tonal'"
                    :color="multiSelectMode ? 'primary' : undefined"
                    size="small"
                    @click="toggleMultiSelectMode"
                    style="border-radius: 8px;"
                >
                    <v-icon left size="16">{{ multiSelectMode ? 'mdi-close' : 'mdi-checkbox-multiple-marked-outline' }}</v-icon>
                    {{ multiSelectMode ? '退出多选' : '多选' }}
                </v-btn>

                <!-- 清空所有 -->
                <v-btn variant="tonal" color="error" size="small" @click="openDeleteAll" style="border-radius: 8px;" :disabled="total === 0">
                    <v-icon left size="16">mdi-delete-sweep</v-icon>
                    清空全部
                </v-btn>
            </div>

            <!-- 高级筛选面板 -->
            <v-expand-transition>
                <div v-if="showAdvancedFilter" class="glass-card" style="padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon size="18" color="primary">mdi-filter-variant</v-icon>
                        <span style="font-size: 14px; font-weight: 500;">高级筛选</span>
                        <v-spacer></v-spacer>
                        <v-btn variant="text" size="x-small" color="primary" @click="clearAllFilters" :disabled="activeFilterCount === 0">
                            <v-icon size="14" class="mr-1">mdi-filter-remove</v-icon>
                            清除筛选
                        </v-btn>
                    </div>
                    <v-row dense>
                        <v-col cols="12" sm="6" md="4">
                            <v-select
                                v-model="filterForwardConfigId"
                                :items="forwardConfigOptions"
                                label="转发配置"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-select>
                        </v-col>
                        <v-col cols="12" sm="6" md="4">
                            <v-select
                                v-model="filterTgConfigId"
                                :items="tgAccountOptions"
                                label="TG 账号"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-select>
                        </v-col>
                        <v-col cols="12" sm="6" md="4">
                            <v-select
                                v-model="filterSourceId"
                                :items="sourceOptions"
                                label="源频道"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-select>
                        </v-col>
                        <v-col cols="12" sm="6" md="4">
                            <v-select
                                v-model="filterTargetId"
                                :items="targetOptions"
                                label="目标频道"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-select>
                        </v-col>
                        <v-col cols="12" sm="6" md="4">
                            <v-select
                                v-model="filterStatus"
                                :items="statusOptions"
                                label="状态"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-select>
                        </v-col>
                    </v-row>
                </div>
            </v-expand-transition>

            <!-- 多选操作栏 -->
            <v-expand-transition>
                <div v-if="multiSelectMode" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                    <v-checkbox
                        :model-value="isPageAllSelected"
                        @update:model-value="toggleSelectAllPage"
                        label="本页全选"
                        density="compact"
                        hide-details
                        color="primary"
                        style="flex: 0 0 auto;"
                    ></v-checkbox>
                    <v-chip v-if="hasSelected" size="small" color="primary" variant="tonal">
                        已选 {{ selectedCount }} 条
                    </v-chip>
                    <v-spacer></v-spacer>
                    <v-btn
                        v-if="hasSelected"
                        color="error"
                        variant="tonal"
                        size="small"
                        @click="openDeleteSelected"
                        style="border-radius: 8px;"
                    >
                        <v-icon left size="16">mdi-delete</v-icon>
                        删除选中 ({{ selectedCount }})
                    </v-btn>
                </div>
            </v-expand-transition>

            <!-- 加载中 -->
            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <!-- 日志列表 -->
            <div v-else-if="logs.length > 0">
                <div v-for="log in logs" :key="log.id"
                     class="glass-card"
                     :style="{
                         padding: '14px 16px',
                         borderRadius: '12px',
                         marginBottom: '8px',
                         cursor: 'pointer',
                         border: isSelected(log.id) ? '2px solid rgb(var(--v-theme-primary))' : '1px solid transparent',
                         background: isSelected(log.id) ? 'rgba(var(--v-theme-primary), 0.06)' : undefined,
                         transition: 'all 0.15s',
                     }"
                     @click="multiSelectMode ? toggleSelect(log.id) : openDetail(log)"
                >
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <!-- 多选复选框 -->
                        <v-checkbox
                            v-if="multiSelectMode"
                            :model-value="isSelected(log.id)"
                            @update:model-value="toggleSelect(log.id)"
                            @click.stop
                            density="compact"
                            hide-details
                            color="primary"
                            style="flex: 0 0 auto; margin-top: 2px;"
                        ></v-checkbox>

                        <!-- 状态图标 -->
                        <v-icon :color="getStatusColor(log.status)" size="20" style="flex-shrink: 0; margin-top: 2px;">
                            {{ log.status === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                        </v-icon>

                        <!-- 主要内容 -->
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                                <span :style="{ fontSize: '14px', fontWeight: 500, color: 'rgb(var(--v-theme-on-background))' }">
                                    {{ log.source_name || log.source_id }}
                                </span>
                                <v-icon size="14" color="grey">mdi-arrow-right</v-icon>
                                <span :style="{ fontSize: '14px', fontWeight: 500, color: 'rgb(var(--v-theme-on-background))' }">
                                    {{ log.target_name || log.target_id }}
                                </span>
                                <v-chip size="x-small" :color="getStatusColor(log.status)" variant="tonal">{{ getStatusText(log.status) }}</v-chip>
                                <v-chip v-if="log.message_type" size="x-small" variant="outlined">
                                    <v-icon start size="12">{{ getMsgTypeIcon(log.message_type) }}</v-icon>
                                    {{ getMsgTypeText(log.message_type) }}
                                </v-chip>
                                <v-chip v-if="log.super_forward" size="x-small" color="warning" variant="tonal">超级转发</v-chip>
                                <v-chip v-if="log.matched_keyword" size="x-small" color="info" variant="tonal">{{ log.matched_keyword }}</v-chip>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12px; opacity: 0.55;">
                                <span v-if="log.forward_config_name">
                                    <v-icon size="12">mdi-cog</v-icon> {{ log.forward_config_name }}
                                </span>
                                <span v-if="log.tg_config_name">
                                    <v-icon size="12">mdi-send</v-icon> {{ log.tg_config_name }}
                                </span>
                                <span>
                                    <v-icon size="12">mdi-clock-outline</v-icon> {{ formatTime(log.created_at) }}
                                </span>
                            </div>
                        </div>

                        <!-- 操作 -->
                        <v-btn v-if="!multiSelectMode" icon variant="text" size="x-small" @click.stop="openDetail(log)">
                            <v-icon size="18">mdi-chevron-right</v-icon>
                        </v-btn>
                    </div>
                </div>

                <!-- 分页 -->
                <div v-if="totalPages > 1" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
                    <v-btn icon variant="text" size="small" :disabled="page <= 1" @click="goPage(1)">
                        <v-icon size="18">mdi-page-first</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" size="small" :disabled="page <= 1" @click="goPage(page - 1)">
                        <v-icon size="18">mdi-chevron-left</v-icon>
                    </v-btn>
                    <span style="font-size: 13px; opacity: 0.6; min-width: 80px; text-align: center;">{{ page }} / {{ totalPages }}</span>
                    <v-btn icon variant="text" size="small" :disabled="page >= totalPages" @click="goPage(page + 1)">
                        <v-icon size="18">mdi-chevron-right</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" size="small" :disabled="page >= totalPages" @click="goPage(totalPages)">
                        <v-icon size="18">mdi-page-last</v-icon>
                    </v-btn>
                    <span style="font-size: 12px; opacity: 0.4; margin-left: 8px;">共 {{ total }} 条</span>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px;">
                <v-icon size="48" color="grey">mdi-text-box-search-outline</v-icon>
                <h3 style="margin-top: 12px; font-size: 16px;">暂无转发日志</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">
                    {{ activeFilterCount > 0 ? '当前筛选条件下没有匹配的日志记录' : '启动转发监控后，转发的消息将记录在此' }}
                </p>
                <v-btn v-if="activeFilterCount > 0" variant="tonal" color="primary" size="small" @click="clearAllFilters" style="margin-top: 12px; border-radius: 8px;">
                    <v-icon left size="16">mdi-filter-remove</v-icon>
                    清除筛选
                </v-btn>
            </div>

            <!-- 详情弹窗 -->
            <v-dialog v-model="detailDialog" max-width="640px" scrollable>
                <v-card v-if="detailData" style="border-radius: 16px; overflow: hidden;">
                    <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                        <v-icon :color="getStatusColor(detailData.status)" size="22" class="mr-2">
                            {{ detailData.status === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                        </v-icon>
                        转发详情
                        <v-spacer></v-spacer>
                        <v-btn icon variant="text" size="x-small" @click="detailDialog = false">
                            <v-icon size="20">mdi-close</v-icon>
                        </v-btn>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                        <!-- 基本信息 -->
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 14px; margin-bottom: 16px;">
                            <span style="opacity: 0.6;">状态</span>
                            <div>
                                <v-chip size="small" :color="getStatusColor(detailData.status)" variant="tonal">{{ getStatusText(detailData.status) }}</v-chip>
                                <v-chip v-if="detailData.super_forward" size="small" color="warning" variant="tonal" class="ml-1">超级转发</v-chip>
                            </div>

                            <span style="opacity: 0.6;">转发配置</span>
                            <span>{{ detailData.forward_config_name || detailData.forward_config_id || '-' }}</span>

                            <span style="opacity: 0.6;">TG 账号</span>
                            <span>{{ detailData.tg_config_name || detailData.tg_config_id || '-' }}</span>

                            <span style="opacity: 0.6;">源频道</span>
                            <div>
                                <span>{{ detailData.source_name || '-' }}</span>
                                <span v-if="detailData.source_id" style="opacity: 0.5; font-size: 12px; margin-left: 6px;">({{ detailData.source_id }})</span>
                            </div>

                            <span style="opacity: 0.6;">目标频道</span>
                            <div>
                                <span>{{ detailData.target_name || '-' }}</span>
                                <span v-if="detailData.target_id" style="opacity: 0.5; font-size: 12px; margin-left: 6px;">({{ detailData.target_id }})</span>
                            </div>

                            <span style="opacity: 0.6;">消息类型</span>
                            <div>
                                <v-chip size="small" variant="outlined">
                                    <v-icon start size="14">{{ getMsgTypeIcon(detailData.message_type) }}</v-icon>
                                    {{ getMsgTypeText(detailData.message_type) }}
                                </v-chip>
                            </div>

                            <span style="opacity: 0.6;">消息 ID</span>
                            <span>{{ detailData.message_id || '-' }}</span>

                            <span style="opacity: 0.6;">源消息链接</span>
                            <div>
                                <a v-if="detailData.message_link" :href="detailData.message_link" target="_blank" rel="noopener" style="color: rgb(var(--v-theme-primary)); text-decoration: none; word-break: break-all;">
                                    {{ detailData.message_link }}
                                    <v-icon size="12" class="ml-1">mdi-open-in-new</v-icon>
                                </a>
                                <span v-else>-</span>
                            </div>

                            <span style="opacity: 0.6;">匹配关键词</span>
                            <div>
                                <v-chip v-if="detailData.matched_keyword" size="small" color="info" variant="tonal">{{ detailData.matched_keyword }}</v-chip>
                                <span v-else style="opacity: 0.5;">全部转发（无关键词过滤）</span>
                            </div>

                            <span style="opacity: 0.6;">时间</span>
                            <span>{{ formatTime(detailData.created_at) }}</span>
                        </div>

                        <!-- 错误信息 -->
                        <div v-if="detailData.status === 'failed' && detailData.error_message" style="margin-bottom: 16px;">
                            <div style="font-size: 13px; font-weight: 500; color: rgb(var(--v-theme-error)); margin-bottom: 6px;">
                                <v-icon size="14" color="error">mdi-alert</v-icon> 错误信息
                            </div>
                            <div style="padding: 10px 14px; background: rgba(var(--v-theme-error), 0.06); border-radius: 8px; font-size: 13px; word-break: break-all; border: 1px solid rgba(var(--v-theme-error), 0.15);">
                                {{ detailData.error_message }}
                            </div>
                        </div>

                        <!-- 消息内容 -->
                        <div v-if="detailData.message_text">
                            <div style="font-size: 13px; font-weight: 500; margin-bottom: 6px; opacity: 0.7;">
                                <v-icon size="14">mdi-message-text</v-icon> 消息内容
                            </div>
                            <div style="padding: 12px 14px; background: rgba(var(--v-theme-on-surface), 0.04); border-radius: 8px; font-size: 13px; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; line-height: 1.6; border: 1px solid rgba(var(--v-theme-on-surface), 0.06);">{{ detailData.message_text }}</div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>

            <!-- 删除确认弹窗 -->
            <v-dialog v-model="deleteDialog" max-width="420">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>
                        {{ deleteTargetType === 'all' ? '确认清空' : '确认删除' }}
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 20px;">
                        <template v-if="deleteTargetType === 'all'">
                            确定要清空<b>全部 {{ total }} 条</b>转发日志吗？此操作不可恢复。
                        </template>
                        <template v-else>
                            确定要删除选中的 <b>{{ selectedCount }} 条</b>转发日志吗？此操作不可恢复。
                        </template>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="deleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeDelete" :loading="deleting" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>
                            {{ deleteTargetType === 'all' ? '确认清空' : '确认删除' }}
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
