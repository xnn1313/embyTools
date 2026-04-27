// 文件管理 - 目录选择对话框（供其他页面调用）
const FilePickerDialog = {
    name: 'FilePickerDialog',
    props: {
        modelValue: { type: Boolean, default: false },
        title: { type: String, default: '选择目录' },
    },
    emits: ['update:modelValue', 'selected'],
    data() {
        return {
            loading: false,
            items: [],
            itemStack: [{ type: 'dir', name: '/', path: '/' }],
            windowWidth: window.innerWidth,
        };
    },
    computed: {
        currentItem() {
            return this.itemStack[this.itemStack.length - 1];
        },
        isMobile() {
            return this.windowWidth < 768;
        },
    },
    watch: {
        modelValue(val) {
            if (val) {
                this.itemStack = [{ type: 'dir', name: '/', path: '/' }];
                this.listDir('/');
            }
        },
    },
    mounted() {
        this._onResize = () => { this.windowWidth = window.innerWidth; };
        window.addEventListener('resize', this._onResize);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this._onResize);
    },
    methods: {
        async listDir(path) {
            this.loading = true;
            this.items = [];
            try {
                const result = await api.request('/filemanager/list', {
                    method: 'POST',
                    body: JSON.stringify({ path }),
                });
                if (result && result.success) {
                    this.items = (result.data || []).filter(i => i.type === 'dir');
                }
            } catch (e) {
                console.error('FilePickerDialog listDir error:', e);
            } finally {
                this.loading = false;
            }
        },
        navigate(item) {
            this.itemStack.push(item);
            this.listDir(item.path);
        },
        navigateByStack(index) {
            this.itemStack = this.itemStack.slice(0, index + 1);
            this.listDir(this.currentItem.path);
        },
        goUp() {
            if (this.itemStack.length > 1) {
                this.itemStack.pop();
                this.listDir(this.currentItem.path);
            }
        },
        selectCurrent() {
            this.$emit('selected', this.currentItem.path);
            this.$emit('update:modelValue', false);
        },
        close() {
            this.$emit('update:modelValue', false);
        },
    },
    template: `
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
        :max-width="isMobile ? '100%' : '600px'" :fullscreen="isMobile" scrollable>
        <v-card :style="isMobile ? 'border-radius: 0;' : 'border-radius: 16px; overflow: hidden;'">
            <v-card-title class="d-flex align-center" style="padding: 14px 20px; font-size: 16px; font-weight: 600;">
                <v-icon color="primary" size="22" class="mr-2">mdi-folder-search-outline</v-icon>
                {{ title }}
                <v-spacer></v-spacer>
                <v-btn icon variant="text" size="x-small" @click="close">
                    <v-icon size="20">mdi-close</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider></v-divider>

            <!-- 面包屑导航 -->
            <div class="fm-breadcrumb-bar" style="padding: 6px 12px; display: flex; align-items: center; min-height: 38px; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch;">
                <v-btn variant="text" size="small" density="compact" class="px-2 flex-shrink-0" @click="navigateByStack(0)">
                    <v-icon size="16" class="mr-1">mdi-folder-multiple-outline</v-icon>本地
                </v-btn>
                <template v-for="(item, idx) in itemStack.slice(1)" :key="item.path">
                    <v-icon size="14" class="flex-shrink-0" style="opacity: 0.4;">mdi-chevron-right</v-icon>
                    <v-btn variant="text" size="small" density="compact" class="px-1 flex-shrink-0" @click="navigateByStack(idx + 1)">
                        {{ item.name }}
                    </v-btn>
                </template>
            </div>
            <v-divider></v-divider>

            <!-- 返回按钮 + 当前路径 -->
            <div style="padding: 6px 16px; display: flex; align-items: center; gap: 8px;">
                <v-btn icon variant="text" size="small" :disabled="itemStack.length <= 1" @click="goUp">
                    <v-icon size="20">mdi-arrow-up-bold-outline</v-icon>
                </v-btn>
                <span style="font-size: 12px; font-family: monospace; opacity: 0.55; word-break: break-all;">{{ currentItem.path }}</span>
            </div>
            <v-divider></v-divider>

            <!-- 目录列表 -->
            <v-card-text :style="'padding: 0; overflow-y: auto;' + (isMobile ? ' flex: 1;' : ' min-height: 260px; max-height: 380px;')">
                <div v-if="loading" class="d-flex justify-center align-center py-10">
                    <v-progress-circular indeterminate color="primary" size="36"></v-progress-circular>
                </div>
                <div v-else-if="!items.length" class="text-center py-10" style="opacity: 0.5; font-size: 14px;">
                    空目录
                </div>
                <v-list v-else density="compact" style="padding: 4px 0;" bg-color="transparent">
                    <v-list-item
                        v-for="item in items"
                        :key="item.path"
                        @click="navigate(item)"
                        style="cursor: pointer;"
                        :class="isMobile ? 'px-3' : 'px-4'"
                    >
                        <template #prepend>
                            <v-icon color="primary" size="20">mdi-folder-outline</v-icon>
                        </template>
                        <v-list-item-title style="font-size: 14px;">{{ item.name }}</v-list-item-title>
                        <template #append>
                            <v-icon size="16" style="opacity: 0.35;">mdi-chevron-right</v-icon>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card-text>
            <v-divider></v-divider>

            <v-card-actions :style="isMobile
                ? 'padding: 12px 16px; flex-direction: column; gap: 10px; align-items: stretch;'
                : 'padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;'">
                <span v-if="!isMobile" style="font-size: 11px; font-family: monospace; opacity: 0.45; word-break: break-all; max-width: 55%;">{{ currentItem.path }}</span>
                <div v-if="isMobile" style="font-size: 12px; font-family: monospace; opacity: 0.5; word-break: break-all; text-align: center; padding-bottom: 4px;">{{ currentItem.path }}</div>
                <div :style="isMobile ? 'display: flex; gap: 10px;' : 'display: flex; gap: 8px; flex-shrink: 0;'">
                    <v-btn variant="tonal" :size="isMobile ? 'default' : 'small'" @click="close" :style="isMobile ? 'flex: 1; border-radius: 10px;' : 'border-radius: 8px;'">取消</v-btn>
                    <v-btn color="primary" variant="elevated" :size="isMobile ? 'default' : 'small'" @click="selectCurrent" :style="isMobile ? 'flex: 2; border-radius: 10px;' : 'border-radius: 8px;'">
                        <v-icon start size="16">mdi-check</v-icon>选择此目录
                    </v-btn>
                </div>
            </v-card-actions>
        </v-card>
    </v-dialog>
    `,
};


// 文件管理完整页面
const FileManagerPage = {
    name: 'FileManagerPage',
    data() {
        return {
            loading: false,
            items: [],
            filter: '',
            sort: 'name',
            order: 'asc',
            sortOptions: [
                { value: 'name', label: '名称', icon: 'mdi-sort-alphabetical-ascending' },
                { value: 'size', label: '大小', icon: 'mdi-sort-numeric-ascending' },
                { value: 'type', label: '类型', icon: 'mdi-file-document-multiple-outline' },
                { value: 'time', label: '时间', icon: 'mdi-sort-clock-ascending-outline' },
            ],
            selectMode: false,
            selected: [],
            itemStack: [{ type: 'dir', name: '/', path: '/' }],

            newFolderDialog: false,
            newFolderName: '',
            newFolderLoading: false,

            renameDialog: false,
            renameItem: null,
            newName: '',
            renameLoading: false,

            deleteDialog: false,
            deleteItem: null,
            deleteLoading: false,

            batchDeleteDialog: false,
            batchDeleteLoading: false,

            organizeDialog: false,
            organizeItem: null,
            organizeAction: 'preview',
            organizeConfigId: '',
            organizeLoading: false,
            organizeResult: null,
            transferConfigs: [],
            transferConfigsLoading: false,

            // ED2K Hash
            ed2kDialog: false,
            ed2kTab: 'queue',
            ed2kSettingsThreads: 1,
            ed2kSettingsDeleteSource: false,
            ed2kSettingsLoading: false,
            ed2kQueueData: { tasks: [], page: 1, total: 0, total_pages: 0, stats: {}, overall_progress: 0, eta_seconds: null },
            ed2kQueuePage: 1,
            ed2kQueueTimer: null,
            ed2kMultiSelect: false,
            ed2kSelectedIds: [],
            ed2kDeleteDialog: false,
            ed2kDeleteType: '',
            ed2kDeleting: false,
            ed2kCopyDialog: false,
            ed2kCopyText: '',

            // 收藏夹
            favorites: [],
            favDialog: false,
            favLoading: false,

            windowWidth: window.innerWidth,
        };
    },
    computed: {
        currentItem() {
            return this.itemStack[this.itemStack.length - 1];
        },
        pathSegments() {
            return this.itemStack.slice(1);
        },
        filteredDirs() {
            const q = this.filter.toLowerCase();
            return this.items.filter(i => i.type === 'dir' && i.name.toLowerCase().includes(q));
        },
        filteredFiles() {
            const q = this.filter.toLowerCase();
            return this.items.filter(i => i.type === 'file' && i.name.toLowerCase().includes(q));
        },
        isMobile() {
            return this.windowWidth < 768;
        },
        listScrollStyle() {
            if (this.isMobile) {
                return 'max-height: calc(100vh - 220px); overflow-y: auto;';
            }
            return 'max-height: calc(100vh - 260px); overflow-y: auto;';
        },
        sortSummary() {
            return `当前：${this.getSortLabel(this.sort)} ${this.getOrderText(this.order)}`;
        },
        isCurrentFavorited() {
            const cur = this.currentItem.path;
            return cur !== '/' && this.favorites.some(f => f.path === cur);
        },
    },
    async mounted() {
        this._onResize = () => { this.windowWidth = window.innerWidth; };
        window.addEventListener('resize', this._onResize);
        await Promise.all([this.loadFiles(), this.loadFavorites()]);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this._onResize);
        if (this.ed2kQueueTimer) { clearInterval(this.ed2kQueueTimer); this.ed2kQueueTimer = null; }
    },
    methods: {
        async loadFiles() {
            this.loading = true;
            this.items = [];
            try {
                const params = new URLSearchParams({
                    sort: this.sort,
                    order: this.order,
                });
                const result = await api.request('/filemanager/list?' + params.toString(), {
                    method: 'POST',
                    body: JSON.stringify(this.currentItem),
                });
                if (result && result.success) {
                    this.items = result.data || [];
                } else {
                    window.showMessage && window.showMessage((result && result.message) || '加载失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载文件列表失败', 'error');
            } finally {
                this.loading = false;
            }
        },

        navigate(item) {
            const idx = this.itemStack.findIndex(i => i.path === item.path);
            if (idx >= 0) {
                this.itemStack = this.itemStack.slice(0, idx + 1);
            } else {
                this.itemStack.push(item);
            }
            this.filter = '';
            this.selected = [];
            this.loadFiles();
        },

        navigateByStack(index) {
            this.itemStack = this.itemStack.slice(0, index + 1);
            this.filter = '';
            this.selected = [];
            this.loadFiles();
        },

        goUp() {
            if (this.itemStack.length > 1) {
                this.itemStack.pop();
                this.filter = '';
                this.selected = [];
                this.loadFiles();
            }
        },

        listItemClick(item) {
            if (this.selectMode) {
                this.toggleItemSelected(item);
                return;
            }
            if (item.type === 'dir') {
                this.navigate(item);
            }
        },

        changeSort(sort) {
            if (this.sort === sort) {
                this.order = this.order === 'asc' ? 'desc' : 'asc';
            } else {
                this.sort = sort;
                this.order = sort === 'time' ? 'desc' : 'asc';
            }
            this.loadFiles();
        },

        getSortLabel(sort) {
            const labelMap = {
                name: '名称',
                size: '大小',
                type: '类型',
                time: '时间',
            };
            return labelMap[sort] || '名称';
        },

        getOrderText(order = this.order) {
            return order === 'asc' ? '升序' : '降序';
        },

        getOrderIcon(order = this.order) {
            return order === 'asc' ? 'mdi-chevron-up' : 'mdi-chevron-down';
        },

        getSortIcon(sort = this.sort, order = this.order) {
            const iconMap = {
                name: {
                    asc: 'mdi-sort-alphabetical-ascending',
                    desc: 'mdi-sort-alphabetical-descending',
                },
                size: {
                    asc: 'mdi-sort-numeric-ascending',
                    desc: 'mdi-sort-numeric-descending',
                },
                type: {
                    asc: 'mdi-sort-alphabetical-ascending',
                    desc: 'mdi-sort-alphabetical-descending',
                },
                time: {
                    asc: 'mdi-sort-clock-ascending-outline',
                    desc: 'mdi-sort-clock-descending-outline',
                },
            };

            if (!iconMap[sort]) {
                return 'mdi-sort';
            }
            return iconMap[sort][order] || iconMap[sort].asc;
        },

        toggleSelectMode() {
            this.selectMode = !this.selectMode;
            if (!this.selectMode) this.selected = [];
        },

        isItemSelected(item) {
            return this.selected.some(i => i.path === item.path);
        },

        toggleItemSelected(item) {
            const idx = this.selected.findIndex(i => i.path === item.path);
            if (idx >= 0) {
                this.selected.splice(idx, 1);
            } else {
                this.selected.push(item);
            }
        },

        showRename(item) {
            this.renameItem = item;
            this.newName = item.name;
            this.renameDialog = true;
        },

        async doRename() {
            if (!this.newName.trim() || !this.renameItem) return;
            this.renameLoading = true;
            try {
                const result = await api.request('/filemanager/rename?new_name=' + encodeURIComponent(this.newName.trim()), {
                    method: 'POST',
                    body: JSON.stringify(this.renameItem),
                });
                if (result && result.success) {
                    window.showMessage && window.showMessage('重命名成功', 'success');
                    this.renameDialog = false;
                    this.renameItem = null;
                    await this.loadFiles();
                } else {
                    window.showMessage && window.showMessage((result && result.message) || '重命名失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('重命名失败', 'error');
            } finally {
                this.renameLoading = false;
            }
        },

        showDelete(item) {
            this.deleteItem = item;
            this.deleteDialog = true;
        },

        async doDelete() {
            if (!this.deleteItem) return;
            this.deleteLoading = true;
            try {
                const result = await api.request('/filemanager/delete', {
                    method: 'POST',
                    body: JSON.stringify(this.deleteItem),
                });
                if (result && result.success) {
                    window.showMessage && window.showMessage('删除成功', 'success');
                    this.deleteDialog = false;
                    this.deleteItem = null;
                    await this.loadFiles();
                } else {
                    window.showMessage && window.showMessage((result && result.message) || '删除失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('删除失败', 'error');
            } finally {
                this.deleteLoading = false;
            }
        },

        async doBatchDelete() {
            this.batchDeleteLoading = true;
            let failCount = 0;
            for (const item of this.selected) {
                try {
                    const result = await api.request('/filemanager/delete', {
                        method: 'POST',
                        body: JSON.stringify(item),
                    });
                    if (!result || !result.success) failCount++;
                } catch (e) {
                    failCount++;
                }
            }
            this.batchDeleteLoading = false;
            this.batchDeleteDialog = false;
            if (failCount > 0) {
                window.showMessage && window.showMessage(`批量删除完成，${failCount} 个失败`, 'warning');
            } else {
                window.showMessage && window.showMessage('批量删除成功', 'success');
            }
            this.selected = [];
            this.selectMode = false;
            await this.loadFiles();
        },

        async doMkdir() {
            if (!this.newFolderName.trim()) return;
            this.newFolderLoading = true;
            try {
                const result = await api.request('/filemanager/mkdir?name=' + encodeURIComponent(this.newFolderName.trim()), {
                    method: 'POST',
                    body: JSON.stringify(this.currentItem),
                });
                if (result && result.success) {
                    window.showMessage && window.showMessage('创建成功', 'success');
                    this.newFolderDialog = false;
                    this.newFolderName = '';
                    await this.loadFiles();
                } else {
                    window.showMessage && window.showMessage((result && result.message) || '创建失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('创建目录失败', 'error');
            } finally {
                this.newFolderLoading = false;
            }
        },

        async ensureTransferConfigs() {
            if (this.transferConfigsLoading) {
                return;
            }
            this.transferConfigsLoading = true;
            try {
                this.transferConfigs = await api.getFileTransferConfigs();
            } catch (e) {
                window.showMessage && window.showMessage('加载文件整理配置失败', 'error');
            } finally {
                this.transferConfigsLoading = false;
            }
        },

        openOrganizeDialog(item, action = 'preview') {
            this.organizeItem = item;
            this.organizeAction = action;
            this.organizeConfigId = '';
            this.organizeResult = null;
            this.organizeDialog = true;
            this.ensureTransferConfigs();
        },

        closeOrganizeDialog() {
            if (this.organizeLoading) {
                return;
            }
            this.organizeDialog = false;
            this.organizeItem = null;
            this.organizeAction = 'preview';
            this.organizeConfigId = '';
            this.organizeResult = null;
        },

        getOrganizeConfigItems() {
            return [
                { title: '自动匹配配置', value: '' },
                ...(this.transferConfigs || []).map(config => ({
                    title: config.name ? `${config.name} · ${config.source_path}` : config.source_path,
                    value: config.id,
                })),
            ];
        },

        getOrganizeItemTypeLabel(item) {
            return item && item.type === 'dir' ? '目录' : '文件';
        },

        getOrganizeStatusLabel(status) {
            const labelMap = {
                preview: '预览结果',
                moved: '已移动',
                copied: '已复制',
                unchanged: '无需整理',
                exists: '已跳过',
                failed: '整理失败',
                completed: '批量完成',
                skipped: '已跳过',
            };
            return labelMap[String(status || '').toLowerCase()] || (status || '未知状态');
        },

        getOrganizeStatusColor(status) {
            const colorMap = {
                preview: 'primary',
                moved: 'success',
                copied: 'success',
                unchanged: 'info',
                exists: 'warning',
                failed: 'error',
                completed: 'primary',
                skipped: 'warning',
            };
            return colorMap[String(status || '').toLowerCase()] || 'grey';
        },

        getTransferTypeLabel(value) {
            const map = { 'move': '移动', 'copy': '复制', '115_move': '115 移动', '115_copy': '115 复制' };
            return map[String(value || '').toLowerCase()] || '移动';
        },

        getOrganizeResultItems(result = this.organizeResult) {
            return Array.isArray((result || {}).results) ? result.results : [];
        },

        getBaseName(path) {
            return String(path || '').split('/').filter(Boolean).pop() || String(path || '');
        },

        getOrganizeResultTitle(result) {
            const payload = result || {};
            const mediaInfo = payload.media_info || {};
            const metaInfo = payload.meta_info || {};
            return mediaInfo.title_year || mediaInfo.title || metaInfo.name || this.getBaseName(payload.source_path);
        },

        formatDuration(value) {
            const seconds = Number(value || 0);
            if (!Number.isFinite(seconds)) {
                return '';
            }
            if (seconds < 1) {
                return `${Math.max(Math.round(seconds * 1000), 1)} ms`;
            }
            if (seconds < 60) {
                return `${seconds < 10 ? seconds.toFixed(2) : seconds.toFixed(1)} 秒`;
            }
            const minutes = Math.floor(seconds / 60);
            const remain = (seconds % 60).toFixed(1);
            return `${minutes} 分 ${remain} 秒`;
        },

        async runOrganize(action = 'preview') {
            if (!this.organizeItem || !this.organizeItem.path) {
                return;
            }
            this.organizeLoading = true;
            this.organizeAction = action;
            this.organizeResult = null;
            try {
                const response = action === 'organize'
                    ? await api.organizeFileTransfer(this.organizeItem.path, this.organizeConfigId)
                    : await api.previewFileTransfer(this.organizeItem.path, this.organizeConfigId);
                if (response && response.success) {
                    this.organizeResult = response.data || null;
                    if (action === 'organize') {
                        window.showMessage && window.showMessage(response.message || '文件整理已执行', 'success');
                        await this.loadFiles();
                    }
                } else {
                    window.showMessage && window.showMessage((response && response.message) || (action === 'organize' ? '整理失败' : '预览失败'), 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage(action === 'organize' ? '整理失败' : '预览失败', 'error');
            } finally {
                this.organizeLoading = false;
            }
        },

        getFileIcon(item) {
            if (item.type === 'dir') return 'mdi-folder-outline';
            const ext = (item.extension || '').toLowerCase();
            const iconMap = {
                zip: 'mdi-folder-zip-outline', rar: 'mdi-folder-zip-outline', '7z': 'mdi-folder-zip-outline',
                htm: 'mdi-language-html5', html: 'mdi-language-html5',
                js: 'mdi-nodejs', json: 'mdi-file-document-outline',
                md: 'mdi-language-markdown-outline',
                pdf: 'mdi-file-pdf',
                png: 'mdi-file-image', jpg: 'mdi-file-image', jpeg: 'mdi-file-image',
                gif: 'mdi-file-image', bmp: 'mdi-file-image', webp: 'mdi-file-image',
                mp4: 'mdi-filmstrip', mkv: 'mdi-filmstrip', avi: 'mdi-filmstrip',
                wmv: 'mdi-filmstrip', mov: 'mdi-filmstrip', ts: 'mdi-filmstrip',
                mp3: 'mdi-music', flac: 'mdi-music', aac: 'mdi-music',
                txt: 'mdi-file-document-outline', nfo: 'mdi-file-document-outline',
                xls: 'mdi-file-excel', xlsx: 'mdi-file-excel',
                srt: 'mdi-subtitles-outline', ass: 'mdi-subtitles-outline',
            };
            return iconMap[ext] || 'mdi-file-outline';
        },

        formatSize(bytes) {
            if (!bytes) return '';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
            return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
        },

        formatTime(ts) {
            if (!ts) return '';
            return new Date(ts * 1000).toLocaleString('zh-CN');
        },

        // ========== ED2K Hash ==========
        goRoot() {
            this.itemStack = [{ type: 'dir', name: '/', path: '/' }];
            this.filter = '';
            this.selected = [];
            this.loadFiles();
        },

        async submitEd2k(item) {
            try {
                const result = await api.ed2kHashSubmit(item.path);
                if (result && result.success) {
                    window.showMessage && window.showMessage(result.message || '已提交', 'success');
                } else {
                    window.showMessage && window.showMessage((result && result.message) || '提交失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('提交 ED2K 任务失败', 'error');
            }
        },

        async openEd2kDialog() {
            this.ed2kDialog = true;
            this.ed2kTab = 'queue';
            this.ed2kQueuePage = 1;
            this.ed2kMultiSelect = false;
            this.ed2kSelectedIds = [];
            // 加载设置
            try {
                const cfg = await api.ed2kHashSettingsGet();
                this.ed2kSettingsThreads = cfg.threads || 1;
                this.ed2kSettingsDeleteSource = !!cfg.delete_source;
            } catch (e) { /* ignore */ }
            // 加载队列
            await this.loadEd2kQueue();
            if (this.ed2kQueueTimer) clearInterval(this.ed2kQueueTimer);
            this.ed2kQueueTimer = setInterval(() => {
                if (this.ed2kDialog) this.loadEd2kQueue();
            }, 2000);
        },

        closeEd2kDialog() {
            this.ed2kDialog = false;
            this.ed2kMultiSelect = false;
            this.ed2kSelectedIds = [];
            if (this.ed2kQueueTimer) { clearInterval(this.ed2kQueueTimer); this.ed2kQueueTimer = null; }
        },

        async saveEd2kSettings() {
            this.ed2kSettingsLoading = true;
            try {
                const result = await api.ed2kHashSettingsUpdate({ threads: this.ed2kSettingsThreads, delete_source: this.ed2kSettingsDeleteSource });
                if (result && result.success) {
                    window.showMessage && window.showMessage(result.message || '保存成功', 'success');
                } else {
                    window.showMessage && window.showMessage((result && result.message) || '保存失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('保存设置失败', 'error');
            } finally {
                this.ed2kSettingsLoading = false;
            }
        },

        async loadEd2kQueue() {
            try {
                const data = await api.ed2kHashQueue(this.ed2kQueuePage, 20);
                this.ed2kQueueData = data || this.ed2kQueueData;
            } catch (e) { /* ignore */ }
        },

        async ed2kQueueChangePage(page) {
            this.ed2kQueuePage = page;
            await this.loadEd2kQueue();
        },

        // 多选
        ed2kToggleMultiSelect() {
            this.ed2kMultiSelect = !this.ed2kMultiSelect;
            if (!this.ed2kMultiSelect) this.ed2kSelectedIds = [];
        },
        ed2kToggleSelect(taskId) {
            const idx = this.ed2kSelectedIds.indexOf(taskId);
            if (idx > -1) this.ed2kSelectedIds.splice(idx, 1);
            else this.ed2kSelectedIds.push(taskId);
        },
        ed2kIsSelected(taskId) {
            return this.ed2kSelectedIds.includes(taskId);
        },
        ed2kIsPageAllSelected() {
            const tasks = (this.ed2kQueueData.tasks || []);
            if (!tasks.length) return false;
            return tasks.every(t => this.ed2kSelectedIds.includes(t.id));
        },
        ed2kToggleSelectAllPage() {
            const ids = (this.ed2kQueueData.tasks || []).map(t => t.id);
            if (this.ed2kIsPageAllSelected()) {
                this.ed2kSelectedIds = this.ed2kSelectedIds.filter(id => !ids.includes(id));
            } else {
                ids.forEach(id => { if (!this.ed2kSelectedIds.includes(id)) this.ed2kSelectedIds.push(id); });
            }
        },

        // 删除
        ed2kConfirmDelete(type) {
            this.ed2kDeleteType = type;
            this.ed2kDeleteDialog = true;
        },
        async ed2kExecuteDelete() {
            this.ed2kDeleting = true;
            try {
                let res;
                if (this.ed2kDeleteType === 'all') {
                    res = await api.ed2kHashRemove([], true);
                } else {
                    res = await api.ed2kHashRemove(this.ed2kSelectedIds);
                }
                if (res && res.success) {
                    window.showMessage && window.showMessage(res.message || '删除成功', 'success');
                    this.ed2kSelectedIds = [];
                    this.ed2kDeleteDialog = false;
                    await this.loadEd2kQueue();
                } else {
                    window.showMessage && window.showMessage((res && res.message) || '删除失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('删除失败', 'error');
            } finally {
                this.ed2kDeleting = false;
            }
        },

        ed2kFallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            textArea.setAttribute('readonly', '');
            document.body.appendChild(textArea);
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, text.length);
            try {
                const ok = document.execCommand('copy');
                return !!ok;
            } catch (err) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        },

        async _doCopyText(text, successMsg) {
            // 方法1: Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(text);
                    window.showMessage && window.showMessage(successMsg || '已复制', 'success');
                    return;
                } catch (e) { /* fallback below */ }
            }
            // 方法2: Clipboard API (不检查 isSecureContext，部分浏览器仍可用)
            if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(text);
                    window.showMessage && window.showMessage(successMsg || '已复制', 'success');
                    return;
                } catch (e) { /* fallback below */ }
            }
            // 方法3: execCommand fallback
            if (this.ed2kFallbackCopy(text)) {
                window.showMessage && window.showMessage(successMsg || '已复制', 'success');
                return;
            }
            // 方法4: 全部失败，弹窗让用户手动复制
            this.ed2kCopyText = text;
            this.ed2kCopyDialog = true;
        },

        async copyEd2kLink(link) {
            await this._doCopyText(link, '已复制');
        },

        copyAllEd2kLinks() {
            const tasks = this.ed2kQueueData.tasks || [];
            let links;
            if (this.ed2kMultiSelect && this.ed2kSelectedIds.length > 0) {
                links = tasks.filter(t => t.status === 'completed' && t.ed2k_link && this.ed2kSelectedIds.includes(t.id)).map(t => t.ed2k_link);
                if (!links.length) {
                    window.showMessage && window.showMessage('选中的任务中没有已完成的链接', 'warning');
                    return;
                }
            } else {
                links = tasks.filter(t => t.status === 'completed' && t.ed2k_link).map(t => t.ed2k_link);
                if (!links.length) {
                    window.showMessage && window.showMessage('当前页没有已完成的链接', 'warning');
                    return;
                }
            }
            const text = links.join('\n');
            this._doCopyText(text, `已复制 ${links.length} 条链接`);
        },

        ed2kStatusText(status) {
            const map = { pending: '等待中', running: '生成中', completed: '已完成', failed: '失败', cancelled: '已取消' };
            return map[status] || status;
        },

        ed2kStatusColor(status) {
            const map = { pending: 'grey', running: 'primary', completed: 'success', failed: 'error', cancelled: 'warning' };
            return map[status] || 'grey';
        },

        formatEta(seconds) {
            if (seconds == null || seconds <= 0) return '';
            if (seconds < 60) return `约 ${Math.round(seconds)} 秒`;
            if (seconds < 3600) return `约 ${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
            return `约 ${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分`;
        },

        formatDurationSec(sec) {
            if (sec == null) return '';
            if (sec < 1) return '<1s';
            if (sec < 60) return sec.toFixed(1) + 's';
            return Math.floor(sec / 60) + 'm' + Math.round(sec % 60) + 's';
        },

        // ========== 收藏夹 ==========
        async loadFavorites() {
            this.favLoading = true;
            try {
                this.favorites = await api.fileManagerFavorites();
            } catch (e) { /* ignore */ }
            finally { this.favLoading = false; }
        },
        async toggleFavorite() {
            const cur = this.currentItem.path;
            if (cur === '/') {
                window.showMessage && window.showMessage('根目录不能收藏', 'warning');
                return;
            }
            if (this.isCurrentFavorited) {
                const res = await api.fileManagerFavoriteRemove(cur);
                if (res && res.success) {
                    window.showMessage && window.showMessage('已取消收藏', 'success');
                    await this.loadFavorites();
                }
            } else {
                const name = this.currentItem.name || cur.replace(/\/$/, '').split('/').pop() || cur;
                const res = await api.fileManagerFavoriteAdd(cur, name);
                if (res && res.success) {
                    window.showMessage && window.showMessage('收藏成功', 'success');
                    await this.loadFavorites();
                } else {
                    window.showMessage && window.showMessage((res && res.message) || '收藏失败', 'error');
                }
            }
        },
        async openFavDialog() {
            this.favDialog = true;
            await this.loadFavorites();
        },
        goToFavorite(fav) {
            this.favDialog = false;
            this.$nextTick(() => {
                // 构建完整路径层级，让面包屑导航可以逐级点击
                const stack = [{ type: 'dir', name: '/', path: '/' }];
                const parts = fav.path.replace(/\/+$/, '').split('/').filter(Boolean);
                let cumulative = '';
                for (const part of parts) {
                    cumulative += '/' + part;
                    stack.push({ type: 'dir', name: part, path: cumulative });
                }
                this.itemStack = stack;
                this.filter = '';
                this.selected = [];
                this.loadFiles();
            });
        },
        async removeFavorite(fav) {
            await api.fileManagerFavoriteRemove(fav.path);
            await this.loadFavorites();
        },
    },
    template: `
    <div>
        <!-- 面包屑工具栏 -->
        <v-card class="mb-3 glass-card" style="border-radius: 16px; overflow: hidden;">
            <v-toolbar flat density="compact" color="transparent">
                <!-- 面包屑：移动端横向滚动，PC端正常排列 -->
                <div style="flex: 1; overflow-x: auto; display: flex; align-items: center; white-space: nowrap; -webkit-overflow-scrolling: touch;"
                    class="fm-breadcrumb-scroll">
                    <v-btn variant="text" density="compact" class="px-2 flex-shrink-0" @click="navigateByStack(0)">
                        <v-icon size="18" class="mr-1">mdi-folder-multiple-outline</v-icon>
                        <span style="font-size: 13px;">本地</span>
                    </v-btn>
                    <template v-for="(seg, idx) in pathSegments" :key="seg.path">
                        <v-icon size="16" class="flex-shrink-0" style="opacity: 0.35;">mdi-chevron-right</v-icon>
                        <v-btn variant="text" density="compact" class="px-1 flex-shrink-0" @click="navigateByStack(idx + 1)" :style="'min-width: 0;' + (isMobile ? ' max-width: 120px;' : ' max-width: 160px;')">
                            <span style="font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ seg.name }}</span>
                        </v-btn>
                    </template>
                </div>
                <!-- 工具按钮 -->
                <div class="d-flex align-center flex-shrink-0">
                    <v-menu location="bottom end">
                        <template #activator="{ props }">
                            <v-btn icon variant="text" v-bind="props" size="small" :title="sortSummary">
                                <v-icon>{{ getSortIcon() }}</v-icon>
                            </v-btn>
                        </template>
                        <v-list density="compact" style="min-width: 190px;">
                            <v-list-subheader style="font-size: 12px; color: rgba(var(--v-theme-on-surface), 0.72);">{{ sortSummary }}</v-list-subheader>
                            <v-list-item
                                v-for="option in sortOptions"
                                :key="option.value"
                                @click="changeSort(option.value)"
                            >
                                <template #prepend>
                                    <v-icon size="18">{{ sort === option.value ? getSortIcon(option.value, order) : option.icon }}</v-icon>
                                </template>
                                <v-list-item-title style="font-size: 13px;">按{{ option.label }}排序</v-list-item-title>
                                <template #append>
                                    <v-chip
                                        v-if="sort === option.value"
                                        size="x-small"
                                        color="primary"
                                        variant="tonal"
                                        style="min-width: 22px; justify-content: center; font-weight: 700; color: rgb(var(--v-theme-primary));"
                                    >
                                        <v-icon size="14">{{ getOrderIcon(order) }}</v-icon>
                                    </v-chip>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <v-tooltip text="返回上一级" location="bottom" v-if="itemStack.length > 1">
                        <template #activator="{ props }">
                            <v-btn icon variant="text" v-bind="props" @click="goUp" size="small">
                                <v-icon>mdi-arrow-up-bold-outline</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>
                    <v-tooltip text="新建文件夹" location="bottom">
                        <template #activator="{ props }">
                            <v-btn icon variant="text" v-bind="props" @click="newFolderDialog = true" size="small">
                                <v-icon>mdi-folder-plus-outline</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>
                </div>
            </v-toolbar>
        </v-card>

        <!-- 快捷工具栏 -->
        <div class="mb-3 d-flex align-center flex-wrap" style="gap: 6px;">
            <v-btn size="small" variant="tonal" color="primary" @click="goRoot" style="border-radius: 10px; text-transform: none;">
                <v-icon start size="16">mdi-home-outline</v-icon>根目录
            </v-btn>
            <v-btn size="small" variant="tonal" @click="newFolderDialog = true" style="border-radius: 10px; text-transform: none;">
                <v-icon start size="16">mdi-folder-plus-outline</v-icon>新建文件夹
            </v-btn>
            <v-btn size="small" variant="tonal" color="teal" @click="openEd2kDialog" style="border-radius: 10px; text-transform: none;">
                <v-icon start size="16">mdi-link-variant</v-icon>ED2K
                <v-badge v-if="ed2kQueueData.stats && (ed2kQueueData.stats.running || ed2kQueueData.stats.pending)"
                    :content="(ed2kQueueData.stats.running || 0) + (ed2kQueueData.stats.pending || 0)"
                    color="teal" inline class="ml-1"></v-badge>
            </v-btn>
            <v-btn icon size="small" :variant="isCurrentFavorited ? 'flat' : 'text'" :color="isCurrentFavorited ? 'amber' : 'default'" @click="toggleFavorite" :disabled="currentItem.path === '/'" :title="isCurrentFavorited ? '取消收藏' : '收藏当前文件夹'" style="width: 36px; height: 36px;">
                <v-icon size="24">{{ isCurrentFavorited ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
            </v-btn>
            <v-btn icon size="small" variant="text" color="amber-darken-2" @click="openFavDialog" v-if="favorites.length > 0" title="收藏夹" style="position: relative; width: 36px; height: 36px;">
                <v-icon size="24">mdi-folder-star-outline</v-icon>
                <span style="position: absolute; top: 2px; right: 2px; background: #FF8F00; color: #fff; font-size: 9px; font-weight: 600; min-width: 13px; height: 13px; line-height: 13px; border-radius: 7px; text-align: center; padding: 0 3px;">{{ favorites.length }}</span>
            </v-btn>
        </div>

        <!-- 文件列表 -->
        <v-card class="glass-card" style="border-radius: 16px; overflow: hidden;">
            <!-- 列表工具栏 -->
            <v-toolbar flat density="compact" color="transparent">
                <v-text-field
                    v-model="filter"
                    hide-details
                    flat
                    density="compact"
                    variant="solo-filled"
                    placeholder="搜索 ..."
                    prepend-inner-icon="mdi-filter-outline"
                    :class="isMobile ? 'me-1' : 'me-2'"
                    :style="isMobile ? 'flex: 1; min-width: 0;' : 'max-width: 280px;'"
                ></v-text-field>
                <v-spacer v-if="!isMobile"></v-spacer>
                <v-tooltip :text="selectMode ? '退出选择' : '多选模式'" location="bottom">
                    <template #activator="{ props }">
                        <v-btn icon variant="text" v-bind="props" @click="toggleSelectMode" size="small">
                            <v-icon :color="selectMode ? 'primary' : ''">{{ selectMode ? 'mdi-selection-remove' : 'mdi-select' }}</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <v-tooltip text="刷新" location="bottom">
                    <template #activator="{ props }">
                        <v-btn icon variant="text" v-bind="props" @click="loadFiles" size="small">
                            <v-icon>mdi-refresh</v-icon>
                        </v-btn>
                    </template>
                </v-tooltip>
                <template v-if="selected.length > 0">
                    <v-chip size="x-small" color="primary" variant="tonal" class="mx-1" v-if="!isMobile">{{ selected.length }} 已选</v-chip>
                    <v-tooltip text="删除选中" location="bottom">
                        <template #activator="{ props }">
                            <v-btn icon variant="text" v-bind="props" @click="batchDeleteDialog = true" size="small">
                                <v-icon color="error">mdi-delete-outline</v-icon>
                            </v-btn>
                        </template>
                    </v-tooltip>
                </template>
            </v-toolbar>

            <!-- 加载中 -->
            <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 200px;">
                <v-progress-circular size="48" indeterminate color="primary"></v-progress-circular>
            </div>

            <!-- 空目录 -->
            <div v-else-if="!filteredDirs.length && !filteredFiles.length"
                class="text-center d-flex align-center justify-center"
                style="min-height: 200px; opacity: 0.5; font-size: 14px;">
                {{ filter ? '没有匹配的目录或文件' : '空目录' }}
            </div>

            <!-- 列表 -->
            <div v-else :style="listScrollStyle">
                <v-list subheader style="padding: 4px 0;" bg-color="transparent">
                    <v-hover v-for="item in [...filteredDirs, ...filteredFiles]" :key="item.path" v-slot="{ isHovering, props: hoverProps }">
                        <v-list-item
                            v-bind="hoverProps"
                            :class="isMobile ? 'px-3 pe-1' : 'px-3 pe-1'"
                            :style="item.type === 'dir' ? 'cursor: pointer;' : ''"
                            @click="listItemClick(item)"
                        >
                            <template #prepend>
                                <v-list-item-action v-if="selectMode" start>
                                    <v-checkbox
                                        :model-value="isItemSelected(item)"
                                        @update:model-value="toggleItemSelected(item)"
                                        hide-details
                                        density="compact"
                                        @click.stop
                                    ></v-checkbox>
                                </v-list-item-action>
                                <v-icon
                                    v-else
                                    :icon="getFileIcon(item)"
                                    :color="item.type === 'dir' ? 'primary' : ''"
                                    size="22"
                                ></v-icon>
                            </template>

                            <v-list-item-title style="font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.name }}</v-list-item-title>
                            <v-list-item-subtitle v-if="item.size" style="font-size: 12px;">{{ formatSize(item.size) }}</v-list-item-subtitle>

                            <template #append>
                                <!-- PC端：悬停时显示操作按钮 -->
                                <span v-if="!isMobile && isHovering && !selectMode" class="d-flex align-center">
                                    <v-tooltip text="整理预览" location="bottom">
                                        <template #activator="{ props: tp }">
                                            <v-btn icon size="small" variant="text" v-bind="tp" @click.stop="openOrganizeDialog(item, 'preview')" density="compact">
                                                <v-icon size="18" color="primary">mdi-eye-outline</v-icon>
                                            </v-btn>
                                        </template>
                                    </v-tooltip>
                                    <v-tooltip text="立即整理" location="bottom">
                                        <template #activator="{ props: tp }">
                                            <v-btn icon size="small" variant="text" v-bind="tp" @click.stop="openOrganizeDialog(item, 'organize')" density="compact">
                                                <v-icon size="18" color="success">mdi-folder-sync-outline</v-icon>
                                            </v-btn>
                                        </template>
                                    </v-tooltip>
                                    <v-tooltip text="重命名" location="bottom">
                                        <template #activator="{ props: tp }">
                                            <v-btn icon size="small" variant="text" v-bind="tp" @click.stop="showRename(item)" density="compact">
                                                <v-icon size="18">mdi-rename</v-icon>
                                            </v-btn>
                                        </template>
                                    </v-tooltip>
                                    <v-tooltip text="生成 ED2K" location="bottom">
                                        <template #activator="{ props: tp }">
                                            <v-btn icon size="small" variant="text" v-bind="tp" @click.stop="submitEd2k(item)" density="compact">
                                                <v-icon size="18" color="teal">mdi-link-variant</v-icon>
                                            </v-btn>
                                        </template>
                                    </v-tooltip>
                                    <v-tooltip text="删除" location="bottom">
                                        <template #activator="{ props: tp }">
                                            <v-btn icon size="small" variant="text" v-bind="tp" @click.stop="showDelete(item)" density="compact">
                                                <v-icon size="18" color="error">mdi-delete-outline</v-icon>
                                            </v-btn>
                                        </template>
                                    </v-tooltip>
                                </span>
                                <!-- 移动端/非悬停：三点菜单 -->
                                <v-btn v-if="(isMobile || !isHovering) && !selectMode" icon size="small" variant="text" @click.stop density="compact">
                                    <v-icon size="20">mdi-dots-vertical</v-icon>
                                    <v-menu activator="parent" :close-on-content-click="true">
                                        <v-list density="compact" style="min-width: 140px;">
                                            <v-list-item @click.stop="openOrganizeDialog(item, 'preview')">
                                                <template #prepend>
                                                    <v-icon size="18" color="primary">mdi-eye-outline</v-icon>
                                                </template>
                                                <v-list-item-title style="font-size: 13px;">整理预览</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click.stop="openOrganizeDialog(item, 'organize')">
                                                <template #prepend>
                                                    <v-icon size="18" color="success">mdi-folder-sync-outline</v-icon>
                                                </template>
                                                <v-list-item-title style="font-size: 13px;">立即整理</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click.stop="showRename(item)">
                                                <template #prepend>
                                                    <v-icon size="18">mdi-rename</v-icon>
                                                </template>
                                                <v-list-item-title style="font-size: 13px;">重命名</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click.stop="submitEd2k(item)">
                                                <template #prepend>
                                                    <v-icon size="18" color="teal">mdi-link-variant</v-icon>
                                                </template>
                                                <v-list-item-title style="font-size: 13px;">生成 ED2K</v-list-item-title>
                                            </v-list-item>
                                            <v-list-item @click.stop="showDelete(item)">
                                                <template #prepend>
                                                    <v-icon size="18" color="error">mdi-delete-outline</v-icon>
                                                </template>
                                                <v-list-item-title style="font-size: 13px; color: rgb(var(--v-theme-error));">删除</v-list-item-title>
                                            </v-list-item>
                                        </v-list>
                                    </v-menu>
                                </v-btn>
                            </template>
                        </v-list-item>
                    </v-hover>
                </v-list>
            </div>
        </v-card>

        <v-dialog v-model="organizeDialog" :max-width="isMobile ? '96%' : '860px'" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 14px 20px; font-size: 16px; font-weight: 600; gap: 10px;">
                    <v-icon color="primary" size="22">mdi-folder-sync-outline</v-icon>
                    <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ organizeItem ? organizeItem.name : '文件整理' }}</span>
                    <v-chip v-if="organizeItem" size="x-small" color="primary" variant="tonal">{{ getOrganizeItemTypeLabel(organizeItem) }}</v-chip>
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="closeOrganizeDialog">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 16px 20px;">
                    <div v-if="organizeItem" style="padding: 12px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.18);">
                        <div style="font-size: 12px; opacity: 0.64; margin-bottom: 6px;">选中路径</div>
                        <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ organizeItem.path }}</div>
                    </div>
                    <v-select
                        v-model="organizeConfigId"
                        class="mt-3"
                        :items="getOrganizeConfigItems()"
                        :loading="transferConfigsLoading"
                        label="使用整理配置"
                        variant="outlined"
                        density="compact"
                        hide-details
                    ></v-select>
                    <div style="margin-top: 8px; font-size: 12px; opacity: 0.66; line-height: 1.7;">
                        不指定配置时，会按当前路径自动匹配最合适的文件整理配置。手动选择配置适合跨源目录测试重命名、分类和目标路径预览。
                    </div>

                    <div v-if="organizeResult" style="margin-top: 16px;">
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px;">
                            <v-chip size="small" :color="getOrganizeStatusColor(organizeResult.status)" variant="tonal">{{ getOrganizeStatusLabel(organizeResult.status) }}</v-chip>
                            <v-chip v-if="organizeResult.config_name" size="small" color="primary" variant="outlined">{{ organizeResult.config_name }}</v-chip>
                            <v-chip v-if="organizeResult.transfer_type" size="small" color="info" variant="tonal">{{ getTransferTypeLabel(organizeResult.transfer_type) }}</v-chip>
                            <v-chip v-if="organizeResult.processed_count !== undefined" size="small" color="info" variant="outlined">已处理 {{ organizeResult.processed_count }}</v-chip>
                            <v-chip v-if="organizeResult.success_count !== undefined" size="small" color="success" variant="outlined">成功 {{ organizeResult.success_count }}</v-chip>
                            <v-chip v-if="organizeResult.failed_count !== undefined" size="small" color="error" variant="outlined">失败 {{ organizeResult.failed_count }}</v-chip>
                            <v-chip v-if="organizeResult.skipped_count !== undefined" size="small" color="warning" variant="outlined">跳过 {{ organizeResult.skipped_count }}</v-chip>
                            <v-chip v-if="organizeResult.time_usage_seconds" size="small" variant="outlined">{{ formatDuration(organizeResult.time_usage_seconds) }}</v-chip>
                        </div>

                        <div v-if="!getOrganizeResultItems(organizeResult).length" style="padding: 14px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.18); display: grid; gap: 10px;">
                            <div>
                                <div style="font-size: 16px; font-weight: 600; line-height: 1.5;">{{ getOrganizeResultTitle(organizeResult) }}</div>
                                <div v-if="organizeResult.meta_info && organizeResult.meta_info.season_episode" style="margin-top: 2px; font-size: 13px; opacity: 0.72;">{{ organizeResult.meta_info.season_episode }}</div>
                            </div>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <v-chip v-if="organizeResult.media_info && organizeResult.media_info.type" size="x-small" color="primary" variant="tonal">{{ organizeResult.media_info.type }}</v-chip>
                                <v-chip v-if="organizeResult.rename_preview && organizeResult.rename_preview.secondary_category" size="x-small" color="secondary" variant="tonal">{{ organizeResult.rename_preview.secondary_category }}</v-chip>
                                <v-chip v-if="organizeResult.meta_info && organizeResult.meta_info.resource_pix" size="x-small" color="pink" variant="tonal">{{ organizeResult.meta_info.resource_pix }}</v-chip>
                                <v-chip v-if="organizeResult.meta_info && organizeResult.meta_info.resource_team" size="x-small" color="cyan" variant="tonal">{{ organizeResult.meta_info.resource_team }}</v-chip>
                                <v-chip v-if="organizeResult.file_count !== undefined" size="x-small" color="info" variant="outlined">文件 {{ organizeResult.file_count }}</v-chip>
                                <v-chip v-if="organizeResult.total_size_bytes" size="x-small" variant="outlined">{{ formatSize(organizeResult.total_size_bytes) }}</v-chip>
                            </div>
                            <div>
                                <div style="font-size: 12px; opacity: 0.64; margin-bottom: 4px;">源路径</div>
                                <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ organizeResult.source_path }}</div>
                            </div>
                            <div v-if="organizeResult.destination_path">
                                <div style="font-size: 12px; opacity: 0.64; margin-bottom: 4px;">目标路径</div>
                                <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ organizeResult.destination_path }}</div>
                            </div>
                            <div v-if="organizeResult.rename_preview && (organizeResult.rename_preview.display_rendered || organizeResult.rename_preview.rendered)">
                                <div style="font-size: 12px; opacity: 0.64; margin-bottom: 4px;">命名预览</div>
                                <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ organizeResult.rename_preview.display_rendered || organizeResult.rename_preview.rendered }}</div>
                            </div>
                            <div v-if="organizeResult.media_info && organizeResult.media_info.overview" style="font-size: 13px; line-height: 1.7; opacity: 0.82;">{{ organizeResult.media_info.overview }}</div>
                            <div v-if="organizeResult.message" style="padding: 10px 12px; border-radius: 10px; background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.18); font-size: 13px; line-height: 1.7;">{{ organizeResult.message }}</div>
                        </div>

                        <div v-else style="display: grid; gap: 12px;">
                            <div
                                v-for="(resultItem, resultIndex) in getOrganizeResultItems(organizeResult)"
                                :key="(resultItem.source_path || '') + '_' + resultIndex"
                                style="padding: 14px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.18); display: grid; gap: 10px;"
                            >
                                <div style="display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap;">
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-size: 15px; font-weight: 600; line-height: 1.5;">{{ getOrganizeResultTitle(resultItem) }}</div>
                                        <div v-if="resultItem.meta_info && resultItem.meta_info.season_episode" style="margin-top: 2px; font-size: 13px; opacity: 0.72;">{{ resultItem.meta_info.season_episode }}</div>
                                    </div>
                                    <v-chip size="x-small" :color="getOrganizeStatusColor(resultItem.status)" variant="tonal">{{ getOrganizeStatusLabel(resultItem.status) }}</v-chip>
                                </div>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                    <v-chip v-if="resultItem.media_info && resultItem.media_info.type" size="x-small" color="primary" variant="tonal">{{ resultItem.media_info.type }}</v-chip>
                                    <v-chip v-if="resultItem.rename_preview && resultItem.rename_preview.secondary_category" size="x-small" color="secondary" variant="tonal">{{ resultItem.rename_preview.secondary_category }}</v-chip>
                                    <v-chip v-if="resultItem.meta_info && resultItem.meta_info.resource_pix" size="x-small" color="pink" variant="tonal">{{ resultItem.meta_info.resource_pix }}</v-chip>
                                    <v-chip v-if="resultItem.meta_info && resultItem.meta_info.resource_team" size="x-small" color="cyan" variant="tonal">{{ resultItem.meta_info.resource_team }}</v-chip>
                                    <v-chip v-if="resultItem.file_count !== undefined" size="x-small" color="info" variant="outlined">文件 {{ resultItem.file_count }}</v-chip>
                                    <v-chip v-if="resultItem.total_size_bytes" size="x-small" variant="outlined">{{ formatSize(resultItem.total_size_bytes) }}</v-chip>
                                </div>
                                <div>
                                    <div style="font-size: 12px; opacity: 0.64; margin-bottom: 4px;">源路径</div>
                                    <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ resultItem.source_path }}</div>
                                </div>
                                <div v-if="resultItem.destination_path">
                                    <div style="font-size: 12px; opacity: 0.64; margin-bottom: 4px;">目标路径</div>
                                    <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ resultItem.destination_path }}</div>
                                </div>
                                <div v-if="resultItem.rename_preview && (resultItem.rename_preview.display_rendered || resultItem.rename_preview.rendered)">
                                    <div style="font-size: 12px; opacity: 0.64; margin-bottom: 4px;">命名预览</div>
                                    <div style="font-family: monospace; font-size: 13px; word-break: break-all; line-height: 1.7;">{{ resultItem.rename_preview.display_rendered || resultItem.rename_preview.rendered }}</div>
                                </div>
                                <div v-if="resultItem.message" style="padding: 10px 12px; border-radius: 10px; background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.18); font-size: 13px; line-height: 1.7;">{{ resultItem.message }}</div>
                            </div>
                        </div>
                    </div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions :style="isMobile ? 'padding: 12px 16px; flex-direction: column; gap: 10px; align-items: stretch;' : 'padding: 10px 16px; display: flex; justify-content: flex-end; gap: 8px;'">
                    <v-btn variant="tonal" :disabled="organizeLoading" @click="closeOrganizeDialog" :style="isMobile ? 'width: 100%; border-radius: 10px;' : 'border-radius: 8px;'">关闭</v-btn>
                    <v-btn color="primary" variant="tonal" :loading="organizeLoading && organizeAction === 'preview'" :disabled="organizeLoading" @click="runOrganize('preview')" :style="isMobile ? 'width: 100%; border-radius: 10px;' : 'border-radius: 8px;'">
                        <v-icon start size="16">mdi-eye-outline</v-icon>整理预览
                    </v-btn>
                    <v-btn color="success" variant="elevated" :loading="organizeLoading && organizeAction === 'organize'" :disabled="organizeLoading" @click="runOrganize('organize')" :style="isMobile ? 'width: 100%; border-radius: 10px;' : 'border-radius: 8px;'">
                        <v-icon start size="16">mdi-folder-sync-outline</v-icon>立即整理
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 新建文件夹对话框 -->
        <v-dialog v-model="newFolderDialog" :max-width="isMobile ? '92%' : '400px'">
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 14px 20px; font-size: 16px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-folder-plus-outline</v-icon>
                    新建文件夹
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="newFolderDialog = false; newFolderName = ''">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 16px 20px;">
                    <v-text-field
                        v-model="newFolderName"
                        label="文件夹名称"
                        variant="outlined"
                        density="compact"
                        hide-details
                        autofocus
                        @keyup.enter="doMkdir"
                    ></v-text-field>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; justify-content: flex-end; gap: 8px;">
                    <v-btn variant="tonal" @click="newFolderDialog = false; newFolderName = ''" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="primary" variant="elevated" :disabled="!newFolderName.trim()" :loading="newFolderLoading" @click="doMkdir" style="border-radius: 8px;">
                        <v-icon start size="18">mdi-check</v-icon>新建
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 重命名对话框 -->
        <v-dialog v-model="renameDialog" :max-width="isMobile ? '92%' : '500px'">
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 14px 20px; font-size: 16px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-rename</v-icon>
                    重命名
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="renameDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 16px 20px;">
                    <v-text-field
                        v-model="newName"
                        label="新名称"
                        variant="outlined"
                        density="compact"
                        hide-details
                        autofocus
                        @keyup.enter="doRename"
                    ></v-text-field>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; justify-content: flex-end; gap: 8px;">
                    <v-btn variant="tonal" @click="renameDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="primary" variant="elevated" :disabled="!newName.trim()" :loading="renameLoading" @click="doRename" style="border-radius: 8px;">
                        <v-icon start size="18">mdi-check</v-icon>确定
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 删除确认对话框 -->
        <v-dialog v-model="deleteDialog" :max-width="isMobile ? '92%' : '380px'">
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title style="padding: 16px 20px; font-size: 16px; font-weight: 600;">
                    <v-icon color="error" size="22" class="mr-2">mdi-alert-circle</v-icon>
                    确认删除
                </v-card-title>
                <v-card-text style="padding: 8px 20px 12px;">
                    确定要删除{{ deleteItem && deleteItem.type === 'dir' ? '目录' : '文件' }}
                    <strong>{{ deleteItem && deleteItem.name }}</strong>？
                    <span v-if="deleteItem && deleteItem.type === 'dir'" style="color: rgb(var(--v-theme-error));">目录内所有内容也将被删除！</span>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; justify-content: flex-end; gap: 8px;">
                    <v-btn variant="tonal" @click="deleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="error" variant="elevated" :loading="deleteLoading" @click="doDelete" style="border-radius: 8px;">
                        <v-icon start size="18">mdi-delete</v-icon>删除
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 批量删除确认 -->
        <v-dialog v-model="batchDeleteDialog" :max-width="isMobile ? '92%' : '380px'">
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title style="padding: 16px 20px; font-size: 16px; font-weight: 600;">
                    <v-icon color="error" size="22" class="mr-2">mdi-alert-circle</v-icon>
                    批量删除
                </v-card-title>
                <v-card-text style="padding: 8px 20px 12px;">
                    确定要删除选中的 <strong>{{ selected.length }}</strong> 个项目吗？
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; justify-content: flex-end; gap: 8px;">
                    <v-btn variant="tonal" @click="batchDeleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="error" variant="elevated" :loading="batchDeleteLoading" @click="doBatchDelete" style="border-radius: 8px;">
                        <v-icon start size="18">mdi-delete</v-icon>删除
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ED2K 弹窗（合并设置+队列） -->
        <v-dialog v-model="ed2kDialog" :max-width="isMobile ? '98%' : '900px'" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden; max-height: 80vh; display: flex; flex-direction: column;">
                <v-card-title class="d-flex align-center" style="padding: 14px 20px; font-size: 16px; font-weight: 600; flex: none;">
                    <v-icon color="teal" size="22" class="mr-2">mdi-link-variant</v-icon>
                    ED2K
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="closeEd2kDialog">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>

                <v-tabs v-model="ed2kTab" color="teal" density="compact" style="min-height: 36px;">
                    <v-tab value="queue" style="text-transform: none; font-size: 13px; min-height: 36px;">
                        <v-icon start size="16">mdi-format-list-checks</v-icon>队列
                    </v-tab>
                    <v-tab value="settings" style="text-transform: none; font-size: 13px; min-height: 36px;">
                        <v-icon start size="16">mdi-cog-outline</v-icon>设置
                    </v-tab>
                </v-tabs>
                <v-divider></v-divider>

                <!-- ===== 队列 Tab ===== -->
                <div v-show="ed2kTab === 'queue'" style="flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                    <!-- 总进度 -->
                    <div style="padding: 12px 20px;" v-if="ed2kQueueData.stats && ed2kQueueData.stats.total > 0">
                        <div class="d-flex align-center flex-wrap" style="gap: 8px; margin-bottom: 8px;">
                            <v-chip size="x-small" color="info" variant="tonal">总计 {{ ed2kQueueData.stats.total }}</v-chip>
                            <v-chip size="x-small" color="grey" variant="tonal" v-if="ed2kQueueData.stats.pending">等待 {{ ed2kQueueData.stats.pending }}</v-chip>
                            <v-chip size="x-small" color="primary" variant="tonal" v-if="ed2kQueueData.stats.running">生成中 {{ ed2kQueueData.stats.running }}</v-chip>
                            <v-chip size="x-small" color="success" variant="tonal" v-if="ed2kQueueData.stats.completed">完成 {{ ed2kQueueData.stats.completed }}</v-chip>
                            <v-chip size="x-small" color="error" variant="tonal" v-if="ed2kQueueData.stats.failed">失败 {{ ed2kQueueData.stats.failed }}</v-chip>
                            <v-chip size="x-small" variant="outlined" v-if="ed2kQueueData.eta_seconds">{{ formatEta(ed2kQueueData.eta_seconds) }}</v-chip>
                        </div>
                        <v-progress-linear
                            :model-value="ed2kQueueData.overall_progress || 0"
                            color="teal" height="6" rounded style="border-radius: 4px;"
                        ></v-progress-linear>
                        <div style="font-size: 11px; opacity: 0.6; margin-top: 4px; text-align: right;">{{ (ed2kQueueData.overall_progress || 0).toFixed(1) }}%</div>
                    </div>
                    <v-divider v-if="ed2kQueueData.stats && ed2kQueueData.stats.total > 0"></v-divider>

                    <!-- 操作栏 -->
                    <div style="padding: 8px 20px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <template v-if="ed2kMultiSelect">
                            <v-chip v-if="ed2kSelectedIds.length > 0" color="teal" size="small" variant="tonal" style="border-radius: 8px;">
                                已选 {{ ed2kSelectedIds.length }}
                            </v-chip>
                            <v-btn v-if="(ed2kQueueData.tasks || []).length > 0" :color="ed2kIsPageAllSelected() ? 'teal' : 'default'" :variant="ed2kIsPageAllSelected() ? 'tonal' : 'outlined'" size="x-small" @click="ed2kToggleSelectAllPage" style="border-radius: 8px; text-transform: none;">
                                <v-icon start size="16">{{ ed2kIsPageAllSelected() ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>全选本页
                            </v-btn>
                            <v-btn v-if="ed2kSelectedIds.length > 0" color="error" variant="tonal" size="x-small" @click="ed2kConfirmDelete('selected')" style="border-radius: 8px; text-transform: none;">
                                <v-icon start size="16">mdi-delete</v-icon>删除选中 ({{ ed2kSelectedIds.length }})
                            </v-btn>
                        </template>
                        <v-spacer></v-spacer>
                        <v-btn v-if="(ed2kQueueData.tasks || []).some(t => t.status === 'completed' && t.ed2k_link)" color="teal" variant="tonal" size="x-small" @click="copyAllEd2kLinks" style="border-radius: 8px; text-transform: none;">
                            <v-icon start size="16">mdi-content-copy</v-icon>{{ ed2kMultiSelect && ed2kSelectedIds.length > 0 ? '复制选中 (' + ed2kSelectedIds.length + ')' : '复制链接' }}
                        </v-btn>
                        <v-btn color="error" variant="outlined" size="x-small" @click="ed2kConfirmDelete('all')" style="border-radius: 8px; text-transform: none;">
                            <v-icon start size="16">mdi-delete-sweep</v-icon>清空全部
                        </v-btn>
                        <v-btn icon variant="text" size="small" :color="ed2kMultiSelect ? 'teal' : undefined" @click="ed2kToggleMultiSelect" title="多选模式">
                            <v-icon size="20">mdi-checkbox-multiple-outline</v-icon>
                        </v-btn>
                        <v-btn icon variant="text" size="small" @click="loadEd2kQueue" title="刷新">
                            <v-icon size="20">mdi-refresh</v-icon>
                        </v-btn>
                    </div>
                    <v-divider></v-divider>

                    <!-- 任务列表 -->
                    <div style="flex: 1; min-height: 120px; overflow-y: auto;">
                        <div v-if="!ed2kQueueData.tasks || !ed2kQueueData.tasks.length"
                            class="text-center" style="padding: 56px 20px; opacity: 0.45; font-size: 14px;">
                            <v-icon size="48" color="grey-darken-1">mdi-clipboard-text-outline</v-icon>
                            <p style="margin-top: 12px;">队列为空</p>
                        </div>
                        <div v-else>
                            <div v-for="task in ed2kQueueData.tasks" :key="task.id"
                                :style="{
                                    padding: '10px 20px',
                                    borderBottom: '1px solid rgba(128,128,128,0.1)',
                                    background: ed2kMultiSelect && ed2kIsSelected(task.id) ? 'rgba(0,150,136,0.1)' : 'transparent',
                                    cursor: ed2kMultiSelect ? 'pointer' : 'default',
                                    transition: 'background 0.15s'
                                }"
                                @click="ed2kMultiSelect ? ed2kToggleSelect(task.id) : null"
                            >
                                <div class="d-flex align-center" style="gap: 8px;">
                                    <v-checkbox-btn v-if="ed2kMultiSelect" :model-value="ed2kIsSelected(task.id)" @update:model-value="ed2kToggleSelect(task.id)" @click.stop density="compact" color="teal" style="flex: 0 0 auto;"></v-checkbox-btn>
                                    <v-chip size="x-small" :color="ed2kStatusColor(task.status)" variant="tonal" style="min-width: 52px; justify-content: center;">{{ ed2kStatusText(task.status) }}</v-chip>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ task.filename }}</div>
                                        <div v-if="!isMobile" style="font-size: 11px; opacity: 0.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ task.filepath }}</div>
                                    </div>
                                    <span v-if="task.file_size && !isMobile" style="font-size: 11px; opacity: 0.55; flex-shrink: 0;">{{ formatSize(task.file_size) }}</span>
                                    <span v-if="task.duration != null && !isMobile" style="font-size: 11px; opacity: 0.55; flex-shrink: 0;">{{ formatDurationSec(task.duration) }}</span>
                                    <v-btn v-if="task.status === 'completed' && task.ed2k_link && !ed2kMultiSelect" icon size="x-small" variant="text" @click.stop="copyEd2kLink(task.ed2k_link)" title="复制链接">
                                        <v-icon size="16" color="teal">mdi-content-copy</v-icon>
                                    </v-btn>
                                </div>
                                <v-progress-linear
                                    v-if="task.status === 'running'"
                                    :model-value="task.progress || 0"
                                    color="teal" height="3" rounded
                                    style="margin-top: 6px; border-radius: 2px;"
                                ></v-progress-linear>
                                <div v-if="task.status === 'completed' && task.ed2k_link && !ed2kMultiSelect"
                                    style="margin-top: 4px; font-size: 11px; font-family: monospace; opacity: 0.6; word-break: break-all; line-height: 1.5; cursor: pointer;"
                                    @click.stop="copyEd2kLink(task.ed2k_link)" title="点击复制">
                                    {{ task.ed2k_link }}
                                </div>
                                <div v-if="task.status === 'failed' && task.error"
                                    style="margin-top: 4px; font-size: 11px; color: rgb(var(--v-theme-error)); line-height: 1.5;">
                                    {{ task.error }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 分页 -->
                    <v-divider v-if="ed2kQueueData.total_pages > 1"></v-divider>
                    <div v-if="ed2kQueueData.total_pages > 1" style="padding: 8px 20px; display: flex; justify-content: center; flex: none;">
                        <v-pagination
                            v-model="ed2kQueuePage"
                            :length="ed2kQueueData.total_pages"
                            :total-visible="isMobile ? 5 : 7"
                            density="compact" size="small" rounded
                            @update:model-value="ed2kQueueChangePage"
                        ></v-pagination>
                    </div>
                </div>

                <!-- ===== 设置 Tab ===== -->
                <div v-show="ed2kTab === 'settings'" style="padding: 20px; flex: 1; min-height: 0; overflow-y: auto;">
                    <div style="font-size: 13px; opacity: 0.72; margin-bottom: 16px; line-height: 1.6;">
                        设置同时生成 ED2K 哈希的并发线程数。默认 1 线程。<br>
                        <span style="color: rgb(var(--v-theme-primary));">若 CPU 和磁盘 IO 性能较好，可酌情调大以加速批量生成。</span>
                    </div>
                    <v-slider
                        v-model="ed2kSettingsThreads"
                        :min="1" :max="16" :step="1"
                        thumb-label="always"
                        color="teal"
                        hide-details
                    ></v-slider>
                    <div class="text-center mt-2" style="font-size: 14px; font-weight: 600;">{{ ed2kSettingsThreads }} 线程</div>

                    <v-divider style="margin: 20px 0 16px;"></v-divider>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-size: 14px; font-weight: 500;">生成完成后删除源文件</div>
                            <div style="font-size: 12px; opacity: 0.55; margin-top: 2px;">ED2K 生成成功后自动删除源文件（失败不删除），按队列逐个删除</div>
                        </div>
                        <v-switch v-model="ed2kSettingsDeleteSource" color="teal" hide-details density="compact" style="flex: none;"></v-switch>
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                        <v-btn color="teal" variant="elevated" :loading="ed2kSettingsLoading" @click="saveEd2kSettings" style="border-radius: 8px;">
                            <v-icon start size="18">mdi-check</v-icon>保存
                        </v-btn>
                    </div>
                </div>

                <v-divider></v-divider>
                <v-card-actions style="padding: 10px 16px; justify-content: flex-end;">
                    <v-btn variant="tonal" @click="closeEd2kDialog" style="border-radius: 8px;">关闭</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ED2K 删除确认 -->
        <v-dialog v-model="ed2kDeleteDialog" :max-width="isMobile ? '92%' : '380px'">
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title style="padding: 16px 20px; font-size: 16px; font-weight: 600;">
                    <v-icon color="error" size="22" class="mr-2">mdi-alert-circle</v-icon>
                    确认删除
                </v-card-title>
                <v-card-text style="padding: 8px 20px 12px;">
                    <template v-if="ed2kDeleteType === 'all'">
                        确定要删除<strong>全部</strong>任务吗？进行中的任务将被取消。
                    </template>
                    <template v-else>
                        确定要删除选中的 <strong>{{ ed2kSelectedIds.length }}</strong> 个任务吗？进行中的任务将被取消。
                    </template>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; justify-content: flex-end; gap: 8px;">
                    <v-btn variant="tonal" @click="ed2kDeleteDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="error" variant="elevated" :loading="ed2kDeleting" @click="ed2kExecuteDelete" style="border-radius: 8px;">
                        <v-icon start size="18">mdi-delete</v-icon>删除
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 收藏夹弹窗 -->
        <v-dialog v-model="favDialog" :max-width="isMobile ? '94%' : '480px'" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden; max-height: 80vh;">
                <v-card-title class="d-flex align-center" style="padding: 14px 20px; font-size: 16px; font-weight: 600;">
                    <v-icon color="amber-darken-2" size="22" class="mr-2">mdi-folder-star-outline</v-icon>
                    收藏夹
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="favDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <div style="max-height: 400px; overflow-y: auto;">
                    <div v-if="favLoading" class="text-center py-8">
                        <v-progress-circular indeterminate color="amber-darken-2" size="32"></v-progress-circular>
                    </div>
                    <div v-else-if="favorites.length === 0" class="text-center" style="padding: 48px 20px; opacity: 0.45; font-size: 14px;">
                        <v-icon size="48" color="grey-darken-1">mdi-star-off-outline</v-icon>
                        <p style="margin-top: 12px;">暂无收藏</p>
                    </div>
                    <div v-else>
                        <div v-for="(fav, idx) in favorites" :key="fav.path"
                            style="padding: 12px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer; transition: background 0.15s;"
                            @click="goToFavorite(fav)"
                            @mouseenter="$event.currentTarget.style.background='rgba(var(--v-theme-on-surface),0.05)'"
                            @mouseleave="$event.currentTarget.style.background='transparent'"
                        >
                            <div class="d-flex align-center" style="gap: 10px;">
                                <v-icon size="20" color="amber-darken-2">mdi-folder-star</v-icon>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ fav.name }}</div>
                                    <div style="font-size: 11px; opacity: 0.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ fav.path }}</div>
                                </div>
                                <v-btn icon size="x-small" variant="text" color="grey" @click.stop="removeFavorite(fav)" title="取消收藏">
                                    <v-icon size="16">mdi-close</v-icon>
                                </v-btn>
                            </div>
                        </div>
                    </div>
                </div>
                <v-divider></v-divider>
                <v-card-actions style="padding: 10px 16px; justify-content: flex-end;">
                    <v-btn variant="tonal" @click="favDialog = false" style="border-radius: 8px;">关闭</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ED2K 链接复制弹窗（复制失败 fallback） -->
        <v-dialog v-model="ed2kCopyDialog" :max-width="isMobile ? '96%' : '650px'" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden; max-height: 90vh;">
                <v-card-title style="padding: 16px 20px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon color="teal">mdi-link-variant</v-icon>
                            <span>ED2K 链接</span>
                        </div>
                        <v-btn icon variant="text" size="small" @click="ed2kCopyDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                    </div>
                </v-card-title>
                <v-card-text style="padding: 16px 20px; overflow-y: auto; flex: 1;">
                    <p style="margin-bottom: 12px; color: rgba(var(--v-theme-on-surface),0.6); font-size: 13px;">
                        自动复制失败，请手动全选复制下方内容：
                    </p>
                    <div style="background: rgba(0,0,0,0.3); padding: 14px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; word-break: break-all; font-size: 12px; line-height: 1.8; color: rgba(var(--v-theme-on-surface),0.9); user-select: all; -webkit-user-select: all;">{{ ed2kCopyText }}</div>
                </v-card-text>
                <v-card-actions style="padding: 12px 20px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.1); justify-content: flex-end; flex-shrink: 0; gap: 8px;">
                    <v-btn color="teal" variant="elevated" @click="ed2kFallbackCopy(ed2kCopyText)" style="border-radius: 8px;">
                        <v-icon start size="18">mdi-content-copy</v-icon>再次尝试复制
                    </v-btn>
                    <v-btn variant="text" @click="ed2kCopyDialog = false">关闭</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
    `,
};
