const TransferHistoryPage = {
    name: 'TransferHistoryPage',
    data() {
        return {
            loading: false,
            histories: [],
            total: 0,
            totalPages: 0,
            page: 1,
            pageSize: 15,
            keyword: '',
            keywordTimer: null,
            filterStatus: '',
            statusOptions: [
                { title: '全部状态', value: '' },
                { title: '成功', value: 'success' },
                { title: '失败', value: 'failed' }
            ],
            multiSelectMode: false,
            selectedIds: [],
            allMatchedSelected: false,
            selectingAllMatched: false,
            detailDialog: false,
            detailLoading: false,
            detailData: null,
            deleteDialog: false,
            deleteTargetType: 'selected',
            deleteTargetIds: [],
            deleteMode: 'history',
            deleting: false,
            reorganizeDialog: false,
            reorganizeTargetIds: [],
            reorganizeSubmitting: false,
            reorganizeProgressDialog: false,
            reorganizeForm: {
                target_path: '',
                transfer_type: '',
                download_metadata: false,
                metadata_nfo_enabled: false,
                metadata_images_enabled: false,
                metadata_overwrite_enabled: false,
                media_info_extract_enabled: false,
                auto_category: true,
                category_by_media_type: true,
                category_by_secondary: true,
                delete_empty_dirs: true,
                tmdb_id: '',
                media_type: '',
            },
            transferConfigs: [],
            transferConfigsLoading: false,
            tmdbSearchKeyword: '',
            tmdbSearchResults: [],
            tmdbSearchLoading: false,
            selectedTmdbItem: null,
            tmdbSearchDialog: false,
            folderBrowserDialog: false,
            folderBrowserPath: '/',
            folderBrowserItems: [],
            folderBrowserLoading: false,
        };
    },
    computed: {
        isPageAllSelected() {
            if (this.histories.length === 0) return false;
            return this.histories.every(item => this.selectedIds.includes(Number(item.id)));
        },
        selectedCount() {
            return this.selectedIds.length;
        },
        hasSelected() {
            return this.selectedCount > 0;
        },
        deleteModeOptions() {
            if (this.deleteTargetType === 'all_history') {
                return [{ title: '仅删除历史记录', value: 'history' }];
            }
            return [
                { title: '仅删除历史记录', value: 'history' },
                { title: '删除源文件', value: 'source' },
                { title: '删除媒体库文件', value: 'dest' },
                { title: '删除所有内容', value: 'all' }
            ];
        },
        targetPathOptions() {
            const seen = new Set();
            const items = [];
            for (const config of (this.transferConfigs || [])) {
                const tp = String(config.target_path || '').trim();
                if (tp && !seen.has(tp)) {
                    seen.add(tp);
                    items.push({ title: config.name ? `${config.name} → ${tp}` : tp, value: tp });
                }
            }
            return items;
        },
        transferTypeOptions() {
            return [
                { title: '移动', value: 'move' },
                { title: '复制', value: 'copy' },
                { title: '115移动', value: '115_move' },
                { title: '115复制', value: '115_copy' },
                { title: 'CD2移动', value: 'cd2_move' },
                { title: 'CD2复制', value: 'cd2_copy' },
            ];
        },
        detailResult() {
            return this.detailData ? (this.detailData.result_data || {}) : {};
        },
        detailMediaInfo() {
            return this.detailResult.media_info || {};
        },
        detailMetaInfo() {
            return this.detailResult.meta_info || {};
        },
        detailFiles() {
            return this.detailData && Array.isArray(this.detailData.files) ? this.detailData.files : [];
        },
        detailMediaProbe() {
            return this.detailResult.media_probe || {};
        },
        detailTimeUsage() {
            const val = this.detailResult.time_usage;
            if (!val && val !== 0) return '';
            const sec = Number(val);
            if (!Number.isFinite(sec) || sec < 0) return '';
            if (sec < 1) return `${Math.round(sec * 1000)}ms`;
            if (sec < 60) return `${sec.toFixed(1)}s`;
            return `${Math.floor(sec / 60)}m${Math.round(sec % 60)}s`;
        }
    },
    watch: {
        filterStatus() {
            this.page = 1;
            this.resetSelection();
            this.loadData();
        },
        keyword() {
            clearTimeout(this.keywordTimer);
            this.keywordTimer = setTimeout(() => {
                this.page = 1;
                this.resetSelection();
                this.loadData();
            }, 300);
        },
        'reorganizeForm.transfer_type'(val) {
            if (val && val.includes('copy')) {
                this.reorganizeForm.delete_empty_dirs = false;
            }
        }
    },
    async mounted() {
        await Promise.all([this.loadTransferConfigs(), this.loadData()]);
    },
    beforeUnmount() {
        clearTimeout(this.keywordTimer);
    },
    methods: {
        currentFilterParams(extra = {}) {
            return {
                page: this.page,
                page_size: this.pageSize,
                status: this.filterStatus || undefined,
                keyword: this.keyword || undefined,
                ...extra,
            };
        },
        resetSelection() {
            this.selectedIds = [];
            this.allMatchedSelected = false;
        },
        async loadTransferConfigs() {
            if (this.transferConfigsLoading) return;
            this.transferConfigsLoading = true;
            try {
                this.transferConfigs = await api.getFileTransferConfigs();
            } catch (error) {
                window.showMessage && window.showMessage('加载整理配置失败', 'error');
            } finally {
                this.transferConfigsLoading = false;
            }
        },
        async loadData() {
            this.loading = true;
            try {
                const data = await api.getTransferHistories(this.currentFilterParams());
                this.histories = data.list || [];
                this.total = data.total || 0;
                this.totalPages = data.total_pages || 0;
            } catch (error) {
                window.showMessage && window.showMessage('加载历史记录失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        goPage(page) {
            if (page < 1 || page > this.totalPages) return;
            this.page = page;
            this.loadData();
        },
        toggleMultiSelectMode() {
            this.multiSelectMode = !this.multiSelectMode;
            if (!this.multiSelectMode) {
                this.resetSelection();
            }
        },
        toggleSelect(historyId) {
            const normalizedId = Number(historyId);
            const index = this.selectedIds.indexOf(normalizedId);
            if (index > -1) {
                this.selectedIds.splice(index, 1);
                this.allMatchedSelected = false;
            } else {
                this.selectedIds.push(normalizedId);
            }
        },
        isSelected(historyId) {
            return this.selectedIds.includes(Number(historyId));
        },
        toggleSelectAllPage() {
            const currentPageIds = this.histories.map(item => Number(item.id));
            if (this.isPageAllSelected) {
                this.selectedIds = this.selectedIds.filter(id => !currentPageIds.includes(id));
                this.allMatchedSelected = false;
            } else {
                this.selectedIds = Array.from(new Set([...this.selectedIds, ...currentPageIds]));
            }
        },
        async selectAllMatched() {
            if (this.total <= 0) return;
            this.selectingAllMatched = true;
            try {
                const data = await api.getTransferHistories(this.currentFilterParams({ page: 1, page_size: 0, ids_only: true }));
                this.selectedIds = Array.isArray(data.ids) ? data.ids.map(id => Number(id)) : [];
                this.allMatchedSelected = this.selectedIds.length > 0;
            } catch (error) {
                window.showMessage && window.showMessage('加载全部记录失败', 'error');
            } finally {
                this.selectingAllMatched = false;
            }
        },
        normalizeTmdbImage(path) {
            const imagePath = String(path || '').trim();
            if (!imagePath) return '';
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
            if (imagePath.startsWith('/')) return `https://image.tmdb.org/t/p/w342${imagePath}`;
            return imagePath;
        },
        getDisplayTitle(item) {
            const payload = item || {};
            const title = String(payload.title || '').trim();
            const year = String(payload.year || '').trim();
            const seasons = String(payload.seasons || '').trim();
            const episodes = String(payload.episodes || '').trim();
            const parts = [];
            if (title) {
                if (year) {
                    parts.push(`${title} (${year})`);
                } else {
                    parts.push(title);
                }
            }
            if (seasons) parts.push(seasons);
            if (episodes) parts.push(episodes);
            return parts.join(' ').trim() || this.getBaseName(payload.src || payload.dest || '');
        },
        getBaseName(path) {
            return String(path || '').split('/').filter(Boolean).pop() || String(path || '');
        },
        getMediaTypeText(type) {
            const normalized = String(type || '').trim().toLowerCase();
            if (normalized === 'movie') return '电影';
            if (normalized === 'tv') return '电视剧';
            return normalized || '未知';
        },
        getModeText(mode) {
            const m = String(mode || '').toLowerCase();
            const mapping = {
                'move': '移动', 'copy': '复制',
                '115_move': '115移动', '115_copy': '115复制',
                'cd2_move': 'CD2移动', 'cd2_copy': 'CD2复制',
            };
            return mapping[m] || (m.includes('copy') ? '复制' : '移动');
        },
        getModeColor(mode) {
            const m = String(mode || '').toLowerCase();
            if (m.includes('115')) return 'deep-purple';
            if (m.includes('cd2')) return 'teal';
            if (m.includes('copy')) return 'info';
            return 'warning';
        },
        getStatusText(status) {
            const normalized = String(status || '').trim().toLowerCase();
            if (normalized === 'success') return '成功';
            if (normalized === 'failed') return '失败';
            return normalized || '未知';
        },
        getStatusColor(status) {
            return String(status || '').toLowerCase() === 'success' ? 'success' : 'error';
        },
        getResultStatusText(status) {
            const normalized = String(status || '').trim().toLowerCase();
            const mapping = {
                moved: '已移动',
                copied: '已复制',
                unchanged: '无需整理',
                failed: '整理失败',
                exists: '已跳过',
                skipped: '已跳过',
                completed: '批量完成',
                preview: '预览',
            };
            return mapping[normalized] || (status || '未知');
        },
        getResultStatusColor(status) {
            const normalized = String(status || '').trim().toLowerCase();
            const mapping = {
                moved: 'success',
                copied: 'success',
                unchanged: 'info',
                failed: 'error',
                exists: 'warning',
                skipped: 'warning',
                completed: 'primary',
                preview: 'primary',
            };
            return mapping[normalized] || 'grey';
        },
        formatTime(value) {
            const text = String(value || '').trim();
            if (!text) return '-';
            const date = new Date(text.replace(' ', 'T'));
            if (Number.isNaN(date.getTime())) return text;
            return date.toLocaleString('zh-CN');
        },
        formatSize(bytes) {
            const size = Number(bytes || 0);
            if (!Number.isFinite(size) || size <= 0) return '-';
            if (size < 1024) return `${size} B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
            if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
            return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
        },
        formatTimeUsage(val) {
            if (!val && val !== 0) return '';
            const sec = Number(val);
            if (!Number.isFinite(sec) || sec < 0) return '';
            if (sec < 1) return `${Math.round(sec * 1000)}ms`;
            if (sec < 60) return `${sec.toFixed(1)}s`;
            return `${Math.floor(sec / 60)}m${Math.round(sec % 60)}s`;
        },
        truncatePath(path, maxLength = 48) {
            const text = String(path || '').trim();
            if (!text) return '-';
            if (text.length <= maxLength) return text;
            return `${text.slice(0, maxLength - 3)}...`;
        },
        getSourcePath(item) {
            return String((item || {}).src || '').trim() || '-';
        },
        getDestPath(item) {
            return String((item || {}).dest || '').trim() || '-';
        },
        getErrorMessage(item) {
            const payload = item || {};
            return String(payload.errmsg || ((payload.result_data || {}).message) || '').trim();
        },
        async openDetail(item) {
            if (!item || !item.id) return;
            this.detailDialog = true;
            this.detailLoading = true;
            this.detailData = null;
            try {
                const detail = await api.getTransferHistory(item.id);
                if (!detail) {
                    throw new Error('记录不存在或已被替换');
                }
                this.detailData = detail;
            } catch (error) {
                this.detailDialog = false;
                window.showMessage && window.showMessage(error.message || '加载详情失败', 'error');
            } finally {
                this.detailLoading = false;
            }
        },
        getDetailOverview() {
            const mediaInfo = this.detailMediaInfo || {};
            return String(mediaInfo.overview || '').trim();
        },
        closeDetail() {
            this.detailDialog = false;
            this.detailLoading = false;
            this.detailData = null;
        },
        openDeleteDialog(type = 'selected', item = null) {
            if (type === 'selected' && this.selectedCount === 0) {
                window.showMessage && window.showMessage('请先选择要删除的记录', 'warning');
                return;
            }
            this.deleteTargetType = type;
            this.deleteMode = 'history';
            if (type === 'single' && item && item.id) {
                this.deleteTargetIds = [Number(item.id)];
            } else if (type === 'selected') {
                this.deleteTargetIds = this.selectedIds.slice();
            } else {
                this.deleteTargetIds = [];
            }
            this.deleteDialog = true;
        },
        getDeleteTargetCount() {
            if (this.deleteTargetType === 'single') return this.deleteTargetIds.length || 1;
            if (this.deleteTargetType === 'selected') return this.deleteTargetIds.length;
            return this.total;
        },
        getDeleteTargetText() {
            if (this.deleteTargetType === 'single') return '当前这条历史记录';
            if (this.deleteTargetType === 'selected') return `选中的 ${this.getDeleteTargetCount()} 条历史记录`;
            return '全部历史记录';
        },
        async executeDelete() {
            this.deleting = true;
            try {
                let response;
                if (this.deleteTargetType === 'single') {
                    response = await api.deleteTransferHistory(this.deleteTargetIds[0], { delete_mode: this.deleteMode });
                } else if (this.deleteTargetType === 'all_history') {
                    response = await api.clearTransferHistories();
                 } else {
                     response = await api.batchDeleteTransferHistories({
                         history_ids: this.deleteTargetIds,
                         delete_mode: this.deleteMode,
                     });
                 }
                 if (response && response.success) {
                     window.showMessage && window.showMessage(response.message || '删除成功', 'success');
                 } else {
                     window.showMessage && window.showMessage((response && response.message) || '删除失败', response && response.data ? 'warning' : 'error');
                 }
                 this.deleteDialog = false;
                 this.resetSelection();
                 if (this.detailDialog && (this.deleteTargetType !== 'selected' || this.deleteTargetIds.includes(Number(this.detailData && this.detailData.id)))) {
                    this.closeDetail();
                }
                await this.loadData();
            } catch (error) {
                window.showMessage && window.showMessage('删除失败', 'error');
             } finally {
                 this.deleting = false;
             }
        },
        resetReorganizeForm(item = null) {
            const configId = item && item.config_id ? String(item.config_id) : '';
            const matchedConfig = configId ? (this.transferConfigs || []).find(c => c.id === configId) : null;
            const defaultTargetPath = matchedConfig ? String(matchedConfig.target_path || '') : '';
            const defaultTransferType = matchedConfig ? String(matchedConfig.transfer_type || 'move') : (item && item.mode ? String(item.mode) : 'move');
            const isCopy = defaultTransferType.includes('copy');
            this.reorganizeForm = {
                target_path: defaultTargetPath,
                transfer_type: defaultTransferType,
                download_metadata: matchedConfig ? !!matchedConfig.download_metadata : false,
                metadata_nfo_enabled: matchedConfig ? !!matchedConfig.metadata_nfo_enabled : false,
                metadata_images_enabled: matchedConfig ? !!matchedConfig.metadata_images_enabled : false,
                metadata_overwrite_enabled: matchedConfig ? !!matchedConfig.metadata_overwrite_enabled : false,
                media_info_extract_enabled: false,
                auto_category: matchedConfig ? (matchedConfig.auto_category !== false) : true,
                category_by_media_type: matchedConfig ? (matchedConfig.category_by_media_type !== false) : true,
                category_by_secondary: matchedConfig ? (matchedConfig.category_by_secondary !== false) : true,
                delete_empty_dirs: isCopy ? false : (matchedConfig ? (matchedConfig.delete_empty_dirs !== false) : true),
                tmdb_id: '',
                media_type: '',
            };
            this.tmdbSearchKeyword = item && item.title ? String(item.title) : '';
            this.tmdbSearchResults = [];
            this.selectedTmdbItem = null;
        },
        openReorganizeDialog(type = 'selected', item = null) {
            if (type === 'selected' && this.selectedCount === 0) {
                window.showMessage && window.showMessage('请先选择要重整的记录', 'warning');
                return;
            }
            if (type === 'single' && item && item.id) {
                this.reorganizeTargetIds = [Number(item.id)];
            } else {
                this.reorganizeTargetIds = this.selectedIds.slice();
            }
            this.resetReorganizeForm(item);
            this.reorganizeDialog = true;
            this.loadTransferConfigs();
        },
        normalizeTmdbResult(item) {
            const payload = item || {};
            const mediaType = String(payload.media_type || payload.type || '').toLowerCase();
            if (!['movie', 'tv'].includes(mediaType)) {
                return null;
            }
            const itemId = payload.id || payload.tmdb_id || 0;
            const dateValue = String(payload.release_date || payload.first_air_date || payload.year || '').slice(0, 4);
            return {
                id: itemId,
                title: payload.title || payload.name || '',
                original_title: payload.original_title || payload.original_name || '',
                year: dateValue,
                media_type: mediaType === 'tv' ? 'tv' : 'movie',
                poster_path: this.normalizeTmdbImage(payload.poster_path || ''),
                overview: payload.overview || '',
            };
        },
        async searchTmdb() {
            const query = String(this.tmdbSearchKeyword || this.reorganizeForm.tmdb_id || '').trim();
            if (!query) {
                window.showMessage && window.showMessage('请输入名称或 TMDB ID', 'warning');
                return;
            }
            const mediaType = this.reorganizeForm.media_type || '';
            const searchType = mediaType === 'movie' ? 'movie' : (mediaType === 'tv' ? 'tv' : 'multi');
            this.tmdbSearchLoading = true;
            this.tmdbSearchDialog = true;
            try {
                const response = await api.request(`/tmdb/search?query=${encodeURIComponent(query)}&type=${searchType}&page=1`);
                if (response && response.success) {
                    this.tmdbSearchResults = Array.isArray(response.data)
                        ? response.data.map(item => this.normalizeTmdbResult(item)).filter(item => item && item.id && item.title)
                        : [];
                    if (this.tmdbSearchResults.length === 0) {
                        window.showMessage && window.showMessage('没有找到匹配结果', 'warning');
                    }
                } else {
                    window.showMessage && window.showMessage((response && response.message) || '搜索失败', 'error');
                }
            } catch (error) {
                window.showMessage && window.showMessage('搜索失败', 'error');
            } finally {
                this.tmdbSearchLoading = false;
            }
        },
        selectTmdbItem(item) {
            this.selectedTmdbItem = item;
            this.reorganizeForm.tmdb_id = item && item.id ? String(item.id) : '';
            this.reorganizeForm.media_type = item && item.media_type ? item.media_type : '';
            this.tmdbSearchDialog = false;
        },
        clearTmdbSelection() {
            this.selectedTmdbItem = null;
            this.reorganizeForm.tmdb_id = '';
            this.reorganizeForm.media_type = '';
        },
        async executeReorganize() {
            if (!this.reorganizeTargetIds.length) {
                window.showMessage && window.showMessage('缺少要重整的历史记录', 'warning');
                return;
            }
            this.reorganizeSubmitting = true;
            this.reorganizeProgressDialog = true;
            try {
                const rawTargetPath = this.reorganizeForm.target_path;
                const targetPath = typeof rawTargetPath === 'object' && rawTargetPath !== null ? (rawTargetPath.value || '') : String(rawTargetPath || '');
                const payload = {
                    history_ids: this.reorganizeTargetIds,
                    target_path: targetPath.trim() || undefined,
                    transfer_type: this.reorganizeForm.transfer_type || undefined,
                    download_metadata: !!this.reorganizeForm.download_metadata,
                    metadata_nfo_enabled: !!this.reorganizeForm.metadata_nfo_enabled,
                    metadata_images_enabled: !!this.reorganizeForm.metadata_images_enabled,
                    metadata_overwrite_enabled: !!this.reorganizeForm.metadata_overwrite_enabled,
                    media_info_extract_enabled: !!this.reorganizeForm.media_info_extract_enabled,
                    auto_category: !!this.reorganizeForm.auto_category,
                    category_by_media_type: !!this.reorganizeForm.category_by_media_type,
                    category_by_secondary: !!this.reorganizeForm.category_by_secondary,
                    delete_empty_dirs: !!this.reorganizeForm.delete_empty_dirs,
                    tmdb_id: this.reorganizeForm.tmdb_id || undefined,
                    media_type: this.reorganizeForm.media_type || undefined,
                };
                const response = await api.reorganizeTransferHistories(payload);
                this.reorganizeDialog = false;
                this.reorganizeProgressDialog = false;
                if (response && response.success) {
                    window.showMessage && window.showMessage(response.message || '重新整理成功', 'success');
                } else {
                    window.showMessage && window.showMessage((response && response.message) || '重新整理失败', response && response.data ? 'warning' : 'error');
                }
                const singleResult = response && response.data && response.data.result ? response.data.result : null;
                const firstBatchResult = response && response.data && Array.isArray(response.data.results) && response.data.results.length > 0
                    ? response.data.results[0].result
                    : null;
                const refreshedHistoryId = Number((singleResult && singleResult.history_id) || (firstBatchResult && firstBatchResult.history_id) || 0);
                this.resetSelection();
                await this.loadData();
                if (this.detailDialog && this.reorganizeTargetIds.length === 1 && refreshedHistoryId > 0) {
                    await this.openDetail({ id: refreshedHistoryId });
                }
            } catch (error) {
                this.reorganizeProgressDialog = false;
                window.showMessage && window.showMessage('重新整理失败', 'error');
            } finally {
                this.reorganizeSubmitting = false;
            }
        },
        openFolderBrowser() {
            this.folderBrowserPath = this.reorganizeForm.target_path || '/';
            this.folderBrowserItems = [];
            this.folderBrowserDialog = true;
            this.loadFolderBrowserItems();
        },
        async loadFolderBrowserItems() {
            this.folderBrowserLoading = true;
            try {
                const response = await api.request('/filemanager/list', {
                    method: 'POST',
                    body: JSON.stringify({ path: this.folderBrowserPath })
                });
                if (response && response.success) {
                    this.folderBrowserItems = (response.data || []).filter(item => item.type === 'dir');
                } else {
                    this.folderBrowserItems = [];
                }
            } catch (error) {
                this.folderBrowserItems = [];
            } finally {
                this.folderBrowserLoading = false;
            }
        },
        navigateFolderBrowser(path) {
            this.folderBrowserPath = path;
            this.loadFolderBrowserItems();
        },
        selectFolderBrowserPath() {
            this.reorganizeForm.target_path = this.folderBrowserPath;
            this.folderBrowserDialog = false;
        },
    },
    template: `
        <div>
            <div class="glass-card" style="padding: 16px 20px; border-radius: 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <v-select
                        v-model="filterStatus"
                        :items="statusOptions"
                        item-title="title"
                        item-value="value"
                        label="状态"
                        density="compact"
                        variant="outlined"
                        hide-details
                        style="max-width: 140px; min-width: 120px;"
                    ></v-select>
                    <v-text-field
                        v-model="keyword"
                        label="搜索标题 / 路径"
                        density="compact"
                        variant="outlined"
                        hide-details
                        clearable
                        prepend-inner-icon="mdi-magnify"
                        style="max-width: 260px; min-width: 220px;"
                    ></v-text-field>
                    <v-spacer></v-spacer>
                    <template v-if="multiSelectMode">
                        <v-chip v-if="selectedCount > 0" color="primary" size="small" variant="tonal" style="border-radius: 8px;">
                            已选 {{ selectedCount }} 条{{ allMatchedSelected ? '（已覆盖当前筛选结果）' : '' }}
                        </v-chip>
                        <v-btn v-if="histories.length > 0" :color="isPageAllSelected ? 'primary' : 'default'" :variant="isPageAllSelected ? 'tonal' : 'outlined'" size="small" @click="toggleSelectAllPage" style="border-radius: 8px;">
                            <v-icon left size="18">{{ isPageAllSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
                            全选本页
                        </v-btn>
                        <v-btn v-if="total > 0" color="primary" variant="outlined" size="small" :loading="selectingAllMatched" @click="selectAllMatched" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-checkbox-multiple-marked</v-icon>
                            全选全部 ({{ total }})
                        </v-btn>
                        <v-btn v-if="selectedCount > 0" color="success" variant="tonal" size="small" @click="openReorganizeDialog('selected')" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-refresh</v-icon>
                            重新整理 ({{ selectedCount }})
                        </v-btn>
                        <v-btn v-if="selectedCount > 0" color="error" variant="tonal" size="small" @click="openDeleteDialog('selected')" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>
                            删除选中 ({{ selectedCount }})
                        </v-btn>
                    </template>
                    <v-btn color="error" variant="outlined" size="small" @click="openDeleteDialog('all_history')" style="border-radius: 8px;">
                        <v-icon left size="18">mdi-delete-sweep</v-icon>
                        清空历史
                    </v-btn>
                    <v-btn icon variant="text" size="small" :color="multiSelectMode ? 'primary' : undefined" @click="toggleMultiSelectMode" title="多选模式">
                        <v-icon size="20">mdi-checkbox-multiple-outline</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" size="small" @click="loadData" :loading="loading" title="刷新">
                        <v-icon size="20">mdi-refresh</v-icon>
                    </v-btn>
                </div>
            </div>

            <div class="glass-card" style="padding: 16px 20px; border-radius: 16px;">
                <div v-if="loading && histories.length === 0" style="display: flex; justify-content: center; padding: 56px 0;">
                    <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
                </div>
                <div v-else-if="histories.length === 0" style="text-align: center; padding: 72px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                    <v-icon size="56" color="grey-darken-1">mdi-history</v-icon>
                    <p style="margin-top: 16px; font-size: 15px;">暂无整理历史</p>
                </div>
                <div v-else class="history-card-grid">
                    <div
                        v-for="item in histories"
                        :key="item.id"
                        class="history-item-card"
                        :class="{ 'history-item-selected': multiSelectMode && isSelected(item.id) }"
                        @click="multiSelectMode ? toggleSelect(item.id) : openDetail(item)"
                    >
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                            <div style="font-size: 15px; font-weight: 600; line-height: 1.4; color: rgb(var(--v-theme-on-surface)); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                {{ getDisplayTitle(item) }}
                            </div>
                            <div style="display: flex; gap: 4px; flex-shrink: 0;" @click.stop>
                                <v-btn icon variant="text" size="x-small" color="success" @click="openReorganizeDialog('single', item)" title="重新整理">
                                    <v-icon size="16">mdi-refresh</v-icon>
                                </v-btn>
                                <v-btn icon variant="text" size="x-small" color="info" @click="openDetail(item)" title="查看详情">
                                    <v-icon size="16">mdi-eye</v-icon>
                                </v-btn>
                            </div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                            <v-chip size="x-small" :color="getStatusColor(item.status)" variant="flat">{{ getStatusText(item.status) }}</v-chip>
                            <v-chip size="x-small" :color="getResultStatusColor(item.result_status)" variant="tonal">{{ getResultStatusText(item.result_status) }}</v-chip>
                            <v-chip size="x-small" :color="getModeColor(item.mode)" variant="tonal">{{ getModeText(item.mode) }}</v-chip>
                            <v-chip size="x-small" color="primary" variant="tonal">{{ getMediaTypeText(item.type) }}</v-chip>
                            <v-chip v-if="item.category" size="x-small" color="secondary" variant="tonal">{{ item.category }}</v-chip>
                        </div>
                        <div class="history-card-path" style="margin-bottom: 4px;">
                            <span class="history-path-label">源：</span>{{ getSourcePath(item) }}
                        </div>
                        <div class="history-card-path" style="margin-bottom: 8px;">
                            <span class="history-path-label">目标：</span>{{ getDestPath(item) }}
                        </div>
                        <div v-if="getErrorMessage(item)" style="font-size: 12px; line-height: 1.5; color: #FF4C51; background: rgba(255,76,81,0.08); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            {{ getErrorMessage(item) }}
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">
                            <span>{{ formatTime(item.date) }}</span>
                            <span v-if="item.time_usage" style="color: rgba(var(--v-theme-on-surface),0.4);">{{ formatTimeUsage(item.time_usage) }}</span>
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

            <v-dialog v-model="detailDialog" max-width="920" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-history</v-icon>
                                <span>整理历史详情</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="closeDetail"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="max-height: 72vh; padding: 16px;">
                        <div v-if="detailLoading" style="display: flex; justify-content: center; padding: 56px 0;"><v-progress-circular indeterminate color="primary"></v-progress-circular></div>
                        <div v-else-if="detailData">
                            <div style="margin-bottom: 16px;">
                                <div>
                                    <div style="font-size: 18px; font-weight: 700; color: rgb(var(--v-theme-on-surface)); line-height: 1.5; margin-bottom: 10px;">
                                        {{ getDisplayTitle(detailData) }}
                                    </div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                                        <v-chip size="small" :color="getStatusColor(detailData.status)" variant="flat">{{ getStatusText(detailData.status) }}</v-chip>
                                        <v-chip size="small" :color="getResultStatusColor(detailData.result_status)" variant="tonal">{{ getResultStatusText(detailData.result_status) }}</v-chip>
                                        <v-chip size="small" color="primary" variant="tonal">{{ getMediaTypeText(detailData.type) }}</v-chip>
                                        <v-chip size="small" color="secondary" variant="tonal">{{ getModeText(detailData.mode) }}</v-chip>
                                        <v-chip v-if="detailData.category" size="small" color="info" variant="tonal">{{ detailData.category }}</v-chip>
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 13px; color: rgba(var(--v-theme-on-surface),0.75);">
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">配置：</span>{{ detailData.config_name || '-' }}</div>
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">日期：</span>{{ formatTime(detailData.date) }}</div>
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">TMDB：</span>{{ detailData.tmdbid || '-' }}</div>
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">季集：</span>{{ detailData.seasons || '-' }} {{ detailData.episodes || '' }}</div>
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">文件数：</span>{{ detailResult.file_count || detailFiles.length || '-' }}</div>
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">大小：</span>{{ formatSize(detailResult.total_size_bytes) }}</div>
                                        <div><span style="color: rgba(var(--v-theme-on-surface),0.45);">IMDb：</span>{{ detailData.imdbid || '-' }}</div>
                                        <div v-if="detailTimeUsage"><span style="color: rgba(var(--v-theme-on-surface),0.45);">耗时：</span>{{ detailTimeUsage }}</div>
                                    </div>
                                    <div v-if="getErrorMessage(detailData)" style="margin-top: 12px; padding: 10px 12px; background: rgba(255,76,81,0.08); border-radius: 10px; color: #FF4C51; font-size: 13px; line-height: 1.6;">
                                        {{ getErrorMessage(detailData) }}
                                    </div>
                                </div>
                            </div>

                            <div style="display: grid; gap: 14px;">
                                <div style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px;">
                                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">路径信息</div>
                                    <div style="font-size: 13px; line-height: 1.7; word-break: break-all;"><span style="color: rgba(var(--v-theme-on-surface),0.45);">源路径：</span>{{ getSourcePath(detailData) }}</div>
                                    <div style="font-size: 13px; line-height: 1.7; word-break: break-all;"><span style="color: rgba(var(--v-theme-on-surface),0.45);">目标路径：</span>{{ getDestPath(detailData) }}</div>
                                </div>
                                <div v-if="detailMediaProbe && (detailMediaProbe.resolution || detailMediaProbe.video_codec || detailMediaProbe.audio_codec || detailMediaProbe.effect)" style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px;">
                                    <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">媒体探测信息</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                        <v-chip v-if="detailMediaProbe.resolution" size="small" color="primary" variant="tonal">{{ detailMediaProbe.resolution }}</v-chip>
                                        <v-chip v-if="detailMediaProbe.video_codec" size="small" color="info" variant="tonal">{{ detailMediaProbe.video_codec }}</v-chip>
                                        <v-chip v-if="detailMediaProbe.audio_codec" size="small" color="secondary" variant="tonal">{{ detailMediaProbe.audio_codec }}</v-chip>
                                        <v-chip v-if="detailMediaProbe.effect" size="small" :color="detailMediaProbe.effect.includes('DV') ? 'deep-purple' : (detailMediaProbe.effect.includes('HDR') ? 'orange' : 'grey')" variant="tonal">{{ detailMediaProbe.effect }}</v-chip>
                                        <v-chip v-if="detailMediaProbe.frame_rate" size="small" color="grey" variant="tonal">{{ detailMediaProbe.frame_rate }}fps</v-chip>
                                        <v-chip v-if="detailMediaProbe.bit_depth" size="small" color="grey" variant="tonal">{{ detailMediaProbe.bit_depth }}</v-chip>
                                    </div>
                                </div>
                                <div style="padding: 14px 16px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                        <span style="font-size: 14px; font-weight: 600;">产出文件</span>
                                        <v-chip size="x-small" color="primary" variant="tonal">{{ detailFiles.length }}</v-chip>
                                    </div>
                                    <div v-if="detailFiles.length === 0" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.45);">暂无文件记录</div>
                                    <div v-else style="display: flex; flex-direction: column; gap: 8px;">
                                        <div v-for="(file, index) in detailFiles" :key="index" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.72); word-break: break-all; padding: 8px 10px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 8px;">
                                            {{ file }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                    <v-card-actions v-if="detailData && !detailLoading" style="padding: 12px 16px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <v-btn color="success" variant="tonal" size="small" @click="openReorganizeDialog('single', detailData)" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-refresh</v-icon>
                            重新整理
                        </v-btn>
                        <v-btn color="error" variant="tonal" size="small" @click="openDeleteDialog('single', detailData)" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>
                            删除
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn variant="text" size="small" @click="closeDetail" style="border-radius: 8px;">关闭</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-model="deleteDialog" max-width="460">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; display: flex; align-items: center; gap: 8px;">
                        <v-icon color="error">mdi-alert</v-icon>
                        <span>确认删除</span>
                    </v-card-title>
                    <v-card-text style="padding: 0 20px 16px;">
                        <p style="margin-bottom: 12px; line-height: 1.7;">确定要删除{{ getDeleteTargetText() }}吗？</p>
                        <v-radio-group v-model="deleteMode" :disabled="deleteTargetType === 'all_history'" hide-details>
                            <v-radio v-for="item in deleteModeOptions" :key="item.value" :value="item.value" color="primary">
                                <template #label>
                                    <span>{{ item.title }}</span>
                                </template>
                            </v-radio>
                        </v-radio-group>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.45); margin-top: 10px; line-height: 1.7;">
                            {{ deleteTargetType === 'all_history' ? '清空历史只会删除数据库中的记录，不会删除磁盘文件。' : '删除源文件或媒体库文件后不可恢复，请谨慎操作。' }}
                        </div>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="deleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="error" variant="elevated" @click="executeDelete" :loading="deleting" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-delete</v-icon>
                            确认删除
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-model="reorganizeDialog" max-width="780" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="success">mdi-refresh</v-icon>
                                <span>重新整理</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="reorganizeDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="padding: 16px;">
                        <div style="font-size: 13px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.7); margin-bottom: 10px;">基础设置</div>
                        <v-row dense>
                            <v-col cols="12" md="8">
                                <v-combobox
                                    v-model="reorganizeForm.target_path"
                                    :items="targetPathOptions"
                                    item-title="title"
                                    item-value="value"
                                    label="目标目录"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    placeholder="留空自动匹配"
                                >
                                    <template #append-inner>
                                        <v-icon style="cursor: pointer;" @click.stop="openFolderBrowser" title="浏览目录">mdi-folder-open-outline</v-icon>
                                    </template>
                                </v-combobox>
                            </v-col>
                            <v-col cols="12" md="4">
                                <v-select
                                    v-model="reorganizeForm.transfer_type"
                                    :items="transferTypeOptions"
                                    item-title="title"
                                    item-value="value"
                                    label="整理方式"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                ></v-select>
                            </v-col>
                        </v-row>

                        <div style="font-size: 13px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.7); margin-top: 18px; margin-bottom: 10px;">媒体信息</div>
                        <v-row dense>
                            <v-col cols="12" md="6">
                                <v-select
                                    v-model="reorganizeForm.media_type"
                                    :items="[{ title: '自动', value: '' }, { title: '电影', value: 'movie' }, { title: '电视剧', value: 'tv' }]"
                                    item-title="title"
                                    item-value="value"
                                    label="媒体类型"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                ></v-select>
                            </v-col>
                            <v-col v-if="reorganizeForm.media_type === 'movie' || reorganizeForm.media_type === 'tv'" cols="12" md="6">
                                <v-text-field
                                    v-model="reorganizeForm.tmdb_id"
                                    label="TMDB编号"
                                    variant="outlined"
                                    density="comfortable"
                                    hide-details
                                    placeholder="留空自动识别"
                                >
                                    <template #append-inner>
                                        <v-icon style="cursor: pointer;" @click.stop="searchTmdb" title="搜索TMDB">mdi-magnify</v-icon>
                                    </template>
                                </v-text-field>
                            </v-col>
                        </v-row>
                        <div v-if="selectedTmdbItem" style="padding: 10px 14px; border-radius: 10px; background: rgba(61,111,213,0.08); margin-top: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 40px; min-width: 40px; height: 56px; border-radius: 6px; overflow: hidden; background: rgba(var(--v-theme-on-surface),0.06); display: flex; align-items: center; justify-content: center;">
                                    <img v-if="selectedTmdbItem.poster_path" :src="selectedTmdbItem.poster_path" style="width: 100%; height: 100%; object-fit: cover;" />
                                    <v-icon v-else size="20" color="grey">mdi-filmstrip</v-icon>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 600;">{{ selectedTmdbItem.title }} <span v-if="selectedTmdbItem.year">({{ selectedTmdbItem.year }})</span></div>
                                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin-top: 2px;">{{ selectedTmdbItem.media_type === 'tv' ? '电视剧' : '电影' }} · ID {{ selectedTmdbItem.id }}</div>
                                </div>
                                <v-btn icon variant="text" size="x-small" color="warning" @click="clearTmdbSelection" title="清除选择"><v-icon size="16">mdi-close</v-icon></v-btn>
                            </div>
                        </div>

                        <div style="font-size: 13px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.7); margin-top: 18px; margin-bottom: 10px;">高级选项</div>
                        <v-row dense>
                            <v-col cols="12" md="4">
                                <v-switch v-model="reorganizeForm.download_metadata" color="primary" hide-details density="compact" inset label="下载元数据"></v-switch>
                            </v-col>
                            <v-col v-if="reorganizeForm.download_metadata" cols="12" md="4">
                                <v-switch v-model="reorganizeForm.metadata_nfo_enabled" color="primary" hide-details density="compact" inset label="生成 NFO"></v-switch>
                            </v-col>
                            <v-col v-if="reorganizeForm.download_metadata" cols="12" md="4">
                                <v-switch v-model="reorganizeForm.metadata_images_enabled" color="primary" hide-details density="compact" inset label="下载海报封面"></v-switch>
                            </v-col>
                            <v-col v-if="reorganizeForm.download_metadata" cols="12" md="4">
                                <v-switch v-model="reorganizeForm.metadata_overwrite_enabled" color="primary" hide-details density="compact" inset label="覆盖已有元数据"></v-switch>
                            </v-col>
                            <v-col cols="12" md="4">
                                <v-switch v-model="reorganizeForm.media_info_extract_enabled" color="primary" hide-details density="compact" inset label="媒体信息提取"></v-switch>
                            </v-col>
                            <v-col cols="12" md="4">
                                <v-switch v-model="reorganizeForm.category_by_media_type" color="primary" hide-details density="compact" inset label="按类别分类"></v-switch>
                            </v-col>
                            <v-col cols="12" md="4">
                                <v-switch v-model="reorganizeForm.category_by_secondary" color="primary" hide-details density="compact" inset label="按类型分类"></v-switch>
                            </v-col>
                            <v-col cols="12" md="4">
                                <v-switch v-model="reorganizeForm.delete_empty_dirs" color="primary" hide-details density="compact" inset label="删除空文件夹" :disabled="reorganizeForm.transfer_type && reorganizeForm.transfer_type.includes('copy')"></v-switch>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-card-actions style="padding: 16px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="reorganizeDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="success" variant="elevated" :loading="reorganizeSubmitting" @click="executeReorganize" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-refresh</v-icon>
                            开始重整
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-model="tmdbSearchDialog" max-width="600" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-movie-search</v-icon>
                                <span>TMDB 搜索</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="tmdbSearchDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                            <v-text-field
                                v-model="tmdbSearchKeyword"
                                label="名称或 TMDB ID"
                                variant="outlined"
                                density="compact"
                                hide-details
                                clearable
                                style="flex: 1;"
                                @keyup.enter="searchTmdb"
                            ></v-text-field>
                            <v-btn color="primary" variant="tonal" :loading="tmdbSearchLoading" @click="searchTmdb" style="border-radius: 8px;">
                                <v-icon left size="18">mdi-magnify</v-icon>
                                搜索
                            </v-btn>
                        </div>
                        <div v-if="tmdbSearchLoading" style="display: flex; justify-content: center; padding: 32px 0;">
                            <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
                        </div>
                        <div v-else-if="tmdbSearchResults.length === 0" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.45); padding: 24px 0; text-align: center;">暂无搜索结果</div>
                        <div v-else style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                            <div
                                v-for="item in tmdbSearchResults"
                                :key="item.id + '_' + item.media_type"
                                :style="{
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(var(--v-theme-on-surface),0.08)',
                                    background: 'rgba(var(--v-theme-on-surface),0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }"
                                @click="selectTmdbItem(item)"
                            >
                                <div style="width: 54px; min-width: 54px; height: 80px; border-radius: 8px; overflow: hidden; background: rgba(var(--v-theme-on-surface),0.06); display: flex; align-items: center; justify-content: center;">
                                    <img v-if="item.poster_path" :src="item.poster_path" style="width: 100%; height: 100%; object-fit: cover;" />
                                    <v-icon v-else size="24" color="grey">mdi-filmstrip</v-icon>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                                        <div style="font-size: 14px; font-weight: 600; color: rgb(var(--v-theme-on-surface));">{{ item.title }} <span v-if="item.year" style="color: rgba(var(--v-theme-on-surface),0.55);">({{ item.year }})</span></div>
                                        <v-chip size="x-small" color="primary" variant="tonal">{{ item.media_type === 'tv' ? '电视剧' : '电影' }}</v-chip>
                                    </div>
                                    <div v-if="item.original_title && item.original_title !== item.title" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 4px;">{{ item.original_title }}</div>
                                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.45); margin-bottom: 4px;">TMDB ID: {{ item.id }}</div>
                                    <div v-if="item.overview" style="font-size: 12px; line-height: 1.6; color: rgba(var(--v-theme-on-surface),0.68); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                        {{ item.overview }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>

            <v-dialog v-model="folderBrowserDialog" max-width="560" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>选择目录</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="folderBrowserDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="padding: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 8px 12px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 8px; font-size: 13px; word-break: break-all; color: rgba(var(--v-theme-on-surface),0.75);">
                            <v-icon size="16" color="primary">mdi-folder</v-icon>
                            {{ folderBrowserPath }}
                        </div>
                        <div v-if="folderBrowserPath !== '/'" style="margin-bottom: 8px;">
                            <v-btn variant="text" size="small" @click="navigateFolderBrowser(folderBrowserPath.split('/').slice(0, -1).join('/') || '/')" style="border-radius: 8px;">
                                <v-icon left size="18">mdi-arrow-up</v-icon>
                                上级目录
                            </v-btn>
                        </div>
                        <div v-if="folderBrowserLoading" style="display: flex; justify-content: center; padding: 32px 0;">
                            <v-progress-circular indeterminate color="primary" size="28"></v-progress-circular>
                        </div>
                        <div v-else-if="folderBrowserItems.length === 0" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.45); padding: 20px 0; text-align: center;">空目录</div>
                        <div v-else style="display: flex; flex-direction: column; gap: 4px; max-height: 360px; overflow-y: auto;">
                            <div
                                v-for="item in folderBrowserItems"
                                :key="item.path"
                                style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s;"
                                @click="navigateFolderBrowser(item.path)"
                                @mouseenter="$event.currentTarget.style.background='rgba(var(--v-theme-on-surface),0.06)'"
                                @mouseleave="$event.currentTarget.style.background='transparent'"
                            >
                                <v-icon size="18" color="primary">mdi-folder</v-icon>
                                <span style="font-size: 13px; color: rgb(var(--v-theme-on-surface));">{{ item.name }}</span>
                            </div>
                        </div>
                    </v-card-text>
                    <v-card-actions style="padding: 12px 16px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <v-spacer></v-spacer>
                        <v-btn variant="text" @click="folderBrowserDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="primary" variant="elevated" @click="selectFolderBrowserPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>
                            选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <v-dialog v-model="reorganizeProgressDialog" persistent max-width="320">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; padding: 24px; text-align: center;">
                    <v-progress-circular indeterminate color="primary" size="42"></v-progress-circular>
                    <div style="margin-top: 16px; font-size: 15px; font-weight: 600;">正在重新整理</div>
                    <div style="margin-top: 8px; font-size: 13px; color: rgba(var(--v-theme-on-surface),0.55);">
                        共 {{ reorganizeTargetIds.length }} 条记录，请稍候...
                    </div>
                </v-card>
            </v-dialog>
        </div>
    `
};
