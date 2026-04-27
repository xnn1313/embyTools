// Docker 管理页面组件
const DockerManagerPage = {
    name: 'DockerManagerPage',

    data() {
        return {
            activeTab: 'containers',
            dockerAvailable: null,
            dockerInfo: null,
            // ========== 容器管理 ==========
            containersLoading: false,
            containers: [],
            containerStats: {},
            containerKeyword: '',
            containerFilter: 'all',
            containerActionLoading: {},
            containerMultiSelect: false,
            containerSelectedIds: [],
            // ========== 镜像管理 ==========
            imagesLoading: false,
            images: [],
            imageKeyword: '',
            imageFilter: 'all',
            imageActionLoading: {},
            imageMultiSelect: false,
            imageSelectedIds: [],
            // ========== 操作日志 ==========
            logLoading: false,
            logs: [],
            logTotal: 0,
            logTotalPages: 0,
            logPage: 1,
            logPageSize: 15,
            logFilterStatus: '',
            logFilterOperation: '',
            logKeyword: '',
            logMultiSelectMode: false,
            logSelectedIds: [],
            logDetailDialog: false,
            logDetailData: null,
            logDeleteDialog: false,
            logDeleteType: '',
            logDeleting: false,
            // ========== 设置 ==========
            settingsLoading: false,
            savingUpdateCheck: false,
            savingNotify: false,
            savingAutoUpdate: false,
            savingMirrors: false,
            savingProxy: false,
            dockerConfig: {
                // 定时检查更新（独立，和以前一样）
                update_check_enabled: true,
                update_check_cron: '*/20 * * * *',
                update_check_log_enabled: true,
                update_check_containers: [],
                update_check_concurrency: 2,
                // 更新通知（纯 TG 通知开关）
                update_notify_enabled: true,
                update_notify_containers: [],
                // 自动更新（触发式，非定时）
                auto_update_enabled: false,
                auto_update_containers: [],
                auto_update_notify: true,
                auto_update_progress_report: false,
                delete_old_images: false,
                update_progress_rounds: 6,
                update_progress_interval: 10,
            },
            dockerSettingsTab: 'update_notify',
            daemonConfig: {},
            daemonProxy: '',
            daemonProxyCurrent: '',
            newSysMirror: '',
            // ========== 更新检查 ==========
            checkingUpdates: false,
            updateCheckProgress: { status: 'idle', total: 0, current: 0, current_image: '', results: [] },
            // ========== 容器更新弹窗 ==========
            updateDialog: false,
            updateTaskId: '',
            updateProgress: { status: '', step: 0, total_steps: 5, step_name: '', log_lines: [], container_name: '' },
            // ========== 弹窗 ==========
            confirmDialog: false,
            confirmTitle: '',
            confirmMessage: '',
            confirmAction: null,
            // 轮询
            _pollTimers: {},
        };
    },

    computed: {
        filteredContainers() {
            let list = this.containers;
            if (this.containerFilter === 'running') list = list.filter(c => c.state === 'running');
            else if (this.containerFilter === 'stopped') list = list.filter(c => c.state === 'exited');
            else if (this.containerFilter === 'update') list = list.filter(c => c.has_update);
            if (this.containerKeyword) {
                const kw = this.containerKeyword.toLowerCase();
                list = list.filter(c => c.name.toLowerCase().includes(kw) || c.image.toLowerCase().includes(kw));
            }
            return list;
        },
        containerCounts() {
            const all = this.containers.length;
            const running = this.containers.filter(c => c.state === 'running').length;
            const stopped = this.containers.filter(c => c.state === 'exited').length;
            const hasUpdate = this.containers.filter(c => c.has_update).length;
            return { all, running, stopped, hasUpdate };
        },
        filteredImages() {
            let list = this.images;
            if (this.imageFilter === 'dangling') list = list.filter(i => i.tag === '<none>');
            else if (this.imageFilter === 'unused') list = list.filter(i => !i.in_used);
            if (this.imageKeyword) {
                const kw = this.imageKeyword.toLowerCase();
                list = list.filter(i => i.tag.toLowerCase().includes(kw) || i.id.toLowerCase().includes(kw));
            }
            return list;
        },
        imageCounts() {
            const all = this.images.length;
            const dangling = this.images.filter(i => i.tag === '<none>').length;
            const unused = this.images.filter(i => !i.in_used).length;
            return { all, dangling, unused };
        },
        canCleanImages() {
            return this.imageFilter === 'unused' || this.imageFilter === 'dangling';
        },
        containerNames() {
            return this.containers.map(c => ({ title: c.name, value: c.name }));
        },
        isLogPageAllSelected() {
            if (this.logs.length === 0) return false;
            return this.logs.every(l => this.logSelectedIds.includes(l.id));
        },
        updateProgressPercent() {
            const p = this.updateCheckProgress;
            if (!p || !p.total) return 0;
            return Math.min(100, (p.current / p.total) * 100);
        },
        isAllContainersSelected() {
            const list = this.filteredContainers;
            return list.length > 0 && list.every(c => this.containerSelectedIds.includes(c.id));
        },
        isAllImagesSelected() {
            const list = this.filteredImages;
            return list.length > 0 && list.every(i => this.imageSelectedIds.includes(i.full_id));
        },
    },

    watch: {
        activeTab(val) {
            const base = 'docker_manager';
            if (val === 'containers') router.push(base);
            else router.push(base + '/' + val);
            this._stopAllPolling();
            this._startPollingForTab(val);
        },
        logFilterStatus() { this.logPage = 1; this.loadLogs(); },
        logFilterOperation() { this.logPage = 1; this.loadLogs(); },
        logKeyword() {
            clearTimeout(this._logKwTimer);
            this._logKwTimer = setTimeout(() => { this.logPage = 1; this.loadLogs(); }, 300);
        },
    },

    async mounted() {
        const hash = window.location.hash.replace(/^#\/?/, '');
        const parts = hash.split('/');
        const tabPart = parts[1];
        if (tabPart) {
            const validTabs = ['containers', 'images', 'logs', 'settings'];
            if (validTabs.includes(tabPart)) this.activeTab = tabPart;
        }
        await this.checkDocker();
        if (this.dockerAvailable) {
            this._startPollingForTab(this.activeTab);
        }
    },

    beforeUnmount() {
        this._stopAllPolling();
    },

    methods: {
        // ========== 轮询管理 ==========
        _startPollingForTab(tab) {
            if (tab === 'containers') {
                this.loadContainers();
                this.loadContainerStats();
                this._pollTimers.containers = setInterval(() => this.loadContainers(), 5000);
                this._pollTimers.stats = setInterval(() => this.loadContainerStats(), 8000);
                this._resumeUpdateCheckIfRunning();
            } else if (tab === 'images') {
                this.loadImages();
                this._pollTimers.images = setInterval(() => this.loadImages(), 10000);
            } else if (tab === 'logs') {
                this.loadLogs();
                this._pollTimers.logs = setInterval(() => this.loadLogs(), 5000);
            } else if (tab === 'settings') {
                this.loadContainers();
                this.loadSettings();
                this.loadDaemonConfig();
            }
        },
        _stopAllPolling() {
            Object.keys(this._pollTimers).forEach(k => {
                clearInterval(this._pollTimers[k]);
                delete this._pollTimers[k];
            });
        },

        async checkDocker() {
            try {
                const res = await api.request('/docker/available');
                this.dockerAvailable = res.success && res.data && res.data.available;
                if (this.dockerAvailable) {
                    const infoRes = await api.request('/docker/info');
                    if (infoRes.success) this.dockerInfo = infoRes.data;
                }
            } catch (e) { this.dockerAvailable = false; }
        },

        // ========== 容器管理 ==========
        async loadContainers() {
            try {
                const res = await api.request('/docker/containers');
                if (res.success) this.containers = res.data || [];
            } catch (e) { console.error(e); }
        },

        async loadContainerStats() {
            try {
                const res = await api.request('/docker/containers/stats');
                if (res.success) this.containerStats = res.data || {};
            } catch (e) {}
        },

        isNanShareContainer(containerName) {
            return (containerName || '').toLowerCase().includes('nanshare');
        },

        async containerAction(containerId, action, containerName) {
            this.containerActionLoading[containerId] = true;
            try {
                let url, method;
                if (action === 'update' && this.isNanShareContainer(containerName)) {
                    url = '/docker/self_update'; method = 'POST';
                } else if (action === 'remove') {
                    url = `/docker/container/${containerId}/remove?force=true`; method = 'DELETE';
                } else {
                    url = `/docker/container/${containerId}/${action}`; method = 'POST';
                }
                const res = await api.request(url, { method });
                if (res.success) {
                    if (action === 'update' && this.isNanShareContainer(containerName)) {
                        window.showMessage && window.showMessage('NanShare 自更新已提交，容器将自动重启...', 'success');
                    } else if (action === 'update' && res.data && res.data.task_id) {
                        this.openUpdateDialog(res.data.task_id, containerName);
                    } else {
                        window.showMessage && window.showMessage(res.message || '操作成功', 'success');
                    }
                } else {
                    window.showMessage && window.showMessage(res.message || '操作失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage(`操作失败: ${e.message}`, 'error');
            } finally { this.containerActionLoading[containerId] = false; }
        },

        openUpdateDialog(taskId, containerName) {
            this.updateTaskId = taskId;
            this.updateProgress = { status: 'running', step: 0, total_steps: 5, step_name: '准备中...', log_lines: [], container_name: containerName };
            this.updateDialog = true;
            this._pollTimers.containerUpdate = setInterval(() => this._pollContainerUpdateProgress(), 1000);
        },
        async _pollContainerUpdateProgress() {
            if (!this.updateTaskId) return;
            try {
                const res = await api.request(`/docker/container/update_progress/${this.updateTaskId}`);
                if (res.success && res.data) {
                    this.updateProgress = res.data;
                    this.$nextTick(() => {
                        const box = this.$refs.updateLogBox;
                        if (box) box.scrollTop = box.scrollHeight;
                    });
                    if (res.data.status === 'done' || res.data.status === 'failed') {
                        clearInterval(this._pollTimers.containerUpdate);
                        delete this._pollTimers.containerUpdate;
                        this.loadContainers();
                        if (res.data.status === 'done') {
                            window.showMessage && window.showMessage(`容器 ${res.data.container_name || ''} 更新成功`, 'success');
                        }
                    }
                }
            } catch (e) {}
        },
        closeUpdateDialog() {
            this.updateDialog = false;
            if (this._pollTimers.containerUpdate) {
                clearInterval(this._pollTimers.containerUpdate);
                delete this._pollTimers.containerUpdate;
            }
        },

        confirmContainerAction(containerId, action, containerName) {
            const actionNames = { stop: '停止', remove: '删除', restart: '重启' };
            const isSelf = action === 'update' && this.isNanShareContainer(containerName);
            if (isSelf) {
                this.confirmTitle = 'NanShare 自更新';
                this.confirmMessage = '将拉取最新镜像并重建 NanShare 容器。\n更新过程中服务会短暂不可用，更新完成后请刷新页面。确定继续？';
                this.confirmAction = () => this.containerAction(containerId, action, containerName);
                this.confirmDialog = true;
            } else if (action === 'stop' || action === 'restart') {
                this.confirmTitle = `${actionNames[action]}容器`;
                this.confirmMessage = `确定要${actionNames[action]}容器 "${containerName}" 吗？`;
                this.confirmAction = () => this.containerAction(containerId, action, containerName);
                this.confirmDialog = true;
            } else if (action === 'remove') {
                this.confirmTitle = '删除容器';
                this.confirmMessage = `确定要删除容器 "${containerName}" 吗？`;
                this.confirmAction = () => this.containerAction(containerId, action, containerName);
                this.confirmDialog = true;
            } else {
                this.containerAction(containerId, action, containerName);
            }
        },

        getStateColor(state) {
            return { running: 'success', exited: 'error', paused: 'warning', restarting: 'info', created: 'grey' }[state] || 'grey';
        },
        getStateText(state) {
            return { running: '运行中', exited: '已停止', paused: '已暂停', restarting: '重启中', created: '已创建' }[state] || state;
        },
        getStateIcon(state) {
            return { running: 'mdi-play-circle', exited: 'mdi-stop-circle', paused: 'mdi-pause-circle', restarting: 'mdi-loading', created: 'mdi-circle-outline' }[state] || 'mdi-help-circle';
        },

        // ========== 容器多选 ==========
        toggleContainerMultiSelect() {
            this.containerMultiSelect = !this.containerMultiSelect;
            this.containerSelectedIds = [];
        },
        toggleContainerSelect(id) {
            const idx = this.containerSelectedIds.indexOf(id);
            if (idx >= 0) this.containerSelectedIds.splice(idx, 1);
            else this.containerSelectedIds.push(id);
        },
        toggleAllContainers() {
            if (this.isAllContainersSelected) {
                this.containerSelectedIds = [];
            } else {
                this.containerSelectedIds = this.filteredContainers.map(c => c.id);
            }
        },
        async batchContainerAction(action) {
            const ids = [...this.containerSelectedIds];
            if (!ids.length) return;
            const actionNames = { update: '更新', start: '启动', stop: '停止', restart: '重启' };
            const needConfirm = ['stop', 'restart'];
            const doIt = async () => {
                for (const cid of ids) {
                    const c = this.containers.find(x => x.id === cid);
                    await this.containerAction(cid, action, c ? c.name : cid);
                }
                this.containerSelectedIds = [];
                this.containerMultiSelect = false;
            };
            if (needConfirm.includes(action)) {
                this.confirmTitle = `批量${actionNames[action]}`;
                this.confirmMessage = `确定要${actionNames[action]} ${ids.length} 个容器吗？`;
                this.confirmAction = doIt;
                this.confirmDialog = true;
            } else {
                await doIt();
            }
        },
        async updateAllContainers() {
            const list = this.containers.filter(c => c.has_update);
            if (!list.length) return;
            for (const c of list) {
                await this.containerAction(c.id, 'update', c.name);
            }
        },

        // ========== 镜像多选 ==========
        toggleImageMultiSelect() {
            this.imageMultiSelect = !this.imageMultiSelect;
            this.imageSelectedIds = [];
        },
        toggleImageSelect(fullId) {
            const idx = this.imageSelectedIds.indexOf(fullId);
            if (idx >= 0) this.imageSelectedIds.splice(idx, 1);
            else this.imageSelectedIds.push(fullId);
        },
        toggleAllImages() {
            if (this.isAllImagesSelected) {
                this.imageSelectedIds = [];
            } else {
                this.imageSelectedIds = this.filteredImages.map(i => i.full_id);
            }
        },
        async batchDeleteImages() {
            const ids = [...this.imageSelectedIds];
            if (!ids.length) return;
            this.confirmTitle = '批量删除镜像';
            this.confirmMessage = `确定要删除 ${ids.length} 个镜像吗？`;
            this.confirmAction = async () => {
                for (const fid of ids) {
                    await this.removeImage(fid);
                }
                this.imageSelectedIds = [];
                this.imageMultiSelect = false;
            };
            this.confirmDialog = true;
        },

        // ========== 镜像管理 ==========
        async loadImages() {
            try {
                const res = await api.request('/docker/images');
                if (res.success) this.images = res.data || [];
            } catch (e) { console.error(e); }
        },
        confirmImageRemove(imageId, imageTag) {
            this.confirmTitle = '删除镜像';
            this.confirmMessage = `确定要删除镜像 "${imageTag || imageId}" 吗？`;
            this.confirmAction = () => this.removeImage(imageId);
            this.confirmDialog = true;
        },
        async removeImage(imageId) {
            this.imageActionLoading[imageId] = true;
            try {
                const res = await api.request(`/docker/image/${imageId}/remove`, { method: 'DELETE' });
                if (res.success) { window.showMessage && window.showMessage('镜像已删除', 'success'); this.loadImages(); }
                else window.showMessage && window.showMessage(res.message || '删除失败', 'error');
            } catch (e) { window.showMessage && window.showMessage('删除失败: ' + e.message, 'error'); }
            finally { this.imageActionLoading[imageId] = false; }
        },
        async cleanImages() {
            try {
                const res = await api.request('/docker/images/clean', { method: 'POST' });
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || '清理完成', 'success');
                    this.loadImages();
                } else { window.showMessage && window.showMessage(res.message || '清理失败', 'error'); }
            } catch (e) { window.showMessage && window.showMessage('清理失败: ' + e.message, 'error'); }
        },

        // ========== 更新检测 ==========
        async checkUpdates() {
            this.checkingUpdates = true;
            this.updateCheckProgress = { status: 'running', total: 0, current: 0, current_image: '准备中...', results: [] };
            try {
                await api.request('/docker/check_updates', { method: 'POST' });
                this._pollTimers.updateCheck = setInterval(() => this._pollUpdateProgress(), 1500);
            } catch (e) {
                window.showMessage && window.showMessage('操作失败', 'error');
                this.checkingUpdates = false;
            }
        },
        async _pollUpdateProgress() {
            try {
                const res = await api.request('/docker/check_updates/progress');
                if (res.success) {
                    this.updateCheckProgress = res.data;
                    if (res.data.status === 'done') {
                        clearInterval(this._pollTimers.updateCheck);
                        delete this._pollTimers.updateCheck;
                        this.checkingUpdates = false;
                        this.loadContainers();
                        const updates = (res.data.results || []).filter(r => r.has_update).length;
                        window.showMessage && window.showMessage(`检查完成，${updates} 个镜像有更新`, updates > 0 ? 'warning' : 'success');
                    }
                }
            } catch (e) {}
        },
        async _resumeUpdateCheckIfRunning() {
            if (this._pollTimers.updateCheck) return;
            try {
                const res = await api.request('/docker/check_updates/progress');
                if (res.success && res.data && res.data.status === 'running') {
                    this.checkingUpdates = true;
                    this.updateCheckProgress = res.data;
                    this._pollTimers.updateCheck = setInterval(() => this._pollUpdateProgress(), 1500);
                }
            } catch (e) {}
        },

        // ========== 操作日志 ==========
        async loadLogs() {
            try {
                const params = new URLSearchParams({ page: this.logPage, page_size: this.logPageSize });
                if (this.logFilterStatus) params.append('status', this.logFilterStatus);
                if (this.logFilterOperation) params.append('operation', this.logFilterOperation);
                if (this.logKeyword) params.append('keyword', this.logKeyword);
                const res = await api.request(`/docker/logs?${params}`);
                if (res.success) {
                    this.logs = res.data.list || [];
                    this.logTotal = res.data.total || 0;
                    this.logTotalPages = res.data.total_pages || 0;
                }
            } catch (e) { console.error(e); }
        },
        async openLogDetail(logItem) {
            this.logDetailData = logItem;
            this.logDetailDialog = true;
            try { const res = await api.request(`/docker/logs/${logItem.id}`); if (res.success) this.logDetailData = res.data; } catch (e) {}
        },
        logGoPage(p) { this.logPage = p; this.loadLogs(); },
        toggleLogSelectAll() {
            if (this.isLogPageAllSelected) this.logSelectedIds = [];
            else this.logSelectedIds = this.logs.map(l => l.id);
        },
        toggleLogSelect(id) {
            const idx = this.logSelectedIds.indexOf(id);
            if (idx >= 0) this.logSelectedIds.splice(idx, 1);
            else this.logSelectedIds.push(id);
        },
        openLogDeleteDialog(type) { this.logDeleteType = type; this.logDeleteDialog = true; },
        async doDeleteLogs() {
            this.logDeleting = true;
            try {
                if (this.logDeleteType === 'all') {
                    const res = await api.request('/docker/logs/all', { method: 'DELETE' });
                    if (res.success) { window.showMessage && window.showMessage(res.message || '已清空', 'success'); this.logs = []; this.logTotal = 0; }
                } else {
                    const res = await api.request('/docker/logs', { method: 'DELETE', body: JSON.stringify({ log_ids: this.logSelectedIds }) });
                    if (res.success) { window.showMessage && window.showMessage(res.message || '已删除', 'success'); this.logSelectedIds = []; this.loadLogs(); }
                }
            } catch (e) { window.showMessage && window.showMessage('删除失败', 'error'); }
            finally { this.logDeleting = false; this.logDeleteDialog = false; }
        },
        getOperationText(op) {
            return { start: '启动', stop: '停止', restart: '重启', remove: '删除', update: '更新', clean: '清理', check_update: '检查更新', self_update: '自更新', pull: '拉取', config: '配置' }[op] || op;
        },
        getOperationIcon(op) {
            return { start: 'mdi-play', stop: 'mdi-stop', restart: 'mdi-restart', remove: 'mdi-delete', update: 'mdi-cloud-download', clean: 'mdi-broom', check_update: 'mdi-magnify', self_update: 'mdi-cellphone-arrow-down', pull: 'mdi-download', config: 'mdi-cog' }[op] || 'mdi-docker';
        },
        getOperationColor(op) {
            return { start: 'success', stop: 'warning', restart: 'info', remove: 'error', update: 'primary', clean: 'orange', check_update: 'info', self_update: 'purple', pull: 'teal', config: 'cyan' }[op] || 'grey';
        },

        // ========== 设置 ==========
        async loadSettings() {
            this.settingsLoading = true;
            try {
                const res = await api.request('/docker/config');
                if (res.success && res.data) Object.assign(this.dockerConfig, res.data);
            } catch (e) { console.error(e); }
            finally { this.settingsLoading = false; }
        },
        async loadDaemonConfig() {
            try {
                const res = await api.request('/docker/daemon');
                if (res.success) {
                    this.daemonConfig = res.data || {};
                    const p = (res.data || {}).proxies || {};
                    this.daemonProxyCurrent = p['http-proxy'] || p['https-proxy'] || '';
                }
            } catch (e) {}
        },
        async saveUpdateCheckSettings() {
            this.savingUpdateCheck = true;
            try {
                const payload = { 
                    update_check_enabled: this.dockerConfig.update_check_enabled, 
                    update_check_cron: this.dockerConfig.update_check_cron,
                    update_check_log_enabled: this.dockerConfig.update_check_log_enabled,
                    update_check_containers: this.dockerConfig.update_check_containers,
                    update_check_concurrency: parseInt(this.dockerConfig.update_check_concurrency) || 2
                };
                const res = await api.request('/docker/config', { method: 'POST', body: JSON.stringify(payload) });
                if (res.success) window.showMessage && window.showMessage('定时检查更新设置已保存', 'success');
                else window.showMessage && window.showMessage(res.message || '保存失败', 'error');
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.savingUpdateCheck = false; }
        },
        async saveNotifySettings() {
            this.savingNotify = true;
            try {
                const payload = { 
                    update_notify_enabled: this.dockerConfig.update_notify_enabled, 
                    update_notify_containers: this.dockerConfig.update_notify_containers 
                };
                const res = await api.request('/docker/config', { method: 'POST', body: JSON.stringify(payload) });
                if (res.success) window.showMessage && window.showMessage('TG 更新通知设置已保存', 'success');
                else window.showMessage && window.showMessage(res.message || '保存失败', 'error');
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.savingNotify = false; }
        },
        async saveAutoUpdateSettings() {
            this.savingAutoUpdate = true;
            try {
                const payload = { 
                    auto_update_enabled: this.dockerConfig.auto_update_enabled,
                    auto_update_containers: this.dockerConfig.auto_update_containers,
                    auto_update_notify: this.dockerConfig.auto_update_notify,
                    auto_update_progress_report: this.dockerConfig.auto_update_progress_report,
                    delete_old_images: this.dockerConfig.delete_old_images,
                    update_progress_rounds: this.dockerConfig.update_progress_rounds,
                    update_progress_interval: this.dockerConfig.update_progress_interval,
                };
                const res = await api.request('/docker/config', { method: 'POST', body: JSON.stringify(payload) });
                if (res.success) window.showMessage && window.showMessage('自动更新设置已保存', 'success');
                else window.showMessage && window.showMessage(res.message || '保存失败', 'error');
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.savingAutoUpdate = false; }
        },
        // 加速源编辑
        addSysMirror() {
            const m = this.newSysMirror.trim();
            if (!m) return;
            if (!this.daemonConfig['registry-mirrors']) this.daemonConfig['registry-mirrors'] = [];
            if (!this.daemonConfig['registry-mirrors'].includes(m)) this.daemonConfig['registry-mirrors'].push(m);
            this.newSysMirror = '';
        },
        removeSysMirror(index) { this.daemonConfig['registry-mirrors'].splice(index, 1); },
        moveSysMirrorUp(index) {
            if (index <= 0) return;
            const arr = this.daemonConfig['registry-mirrors'];
            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
        },
        moveSysMirrorDown(index) {
            const arr = this.daemonConfig['registry-mirrors'];
            if (index >= arr.length - 1) return;
            [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
        },
        async saveSysMirrors() {
            this.savingMirrors = true;
            try {
                const mirrors = this.daemonConfig['registry-mirrors'] || [];
                const res = await api.request('/docker/daemon/mirrors', { method: 'POST', body: JSON.stringify({ mirrors }) });
                if (res.success) {
                    window.showMessage && window.showMessage('系统镜像源已更新并生效', 'success');
                    this.checkDocker();
                } else { window.showMessage && window.showMessage(res.message || '保存失败', 'error'); }
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.savingMirrors = false; }
        },
        async saveDaemonProxy() {
            this.savingProxy = true;
            try {
                const proxy = this.daemonProxy || '';
                const res = await api.request('/docker/daemon/proxy', { method: 'POST', body: JSON.stringify({ proxy }) });
                if (res.success) {
                    window.showMessage && window.showMessage('Docker 拉取代理已更新并生效', 'success');
                    this.daemonProxyCurrent = proxy;
                    if (proxy) {
                        // 代理设置后需要刷新 daemon 配置（后端会自动清除镜像加速源）
                        this.loadDaemonConfig();
                    }
                } else { window.showMessage && window.showMessage(res.message || '保存失败', 'error'); }
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.savingProxy = false; }
        },
        formatTime(t) { if (!t) return ''; return t.replace('T', ' ').substring(0, 19); },
    },

    template: `
        <div>
            <div v-if="dockerAvailable === false" style="text-align: center; padding: 60px 20px;">
                <v-icon size="72" color="grey-darken-1">mdi-docker</v-icon>
                <p style="margin-top: 16px; font-size: 18px; font-weight: 500;">Docker 不可用</p>
                <p style="font-size: 14px; color: rgba(var(--v-theme-on-surface),0.5); margin-top: 8px;">请添加环境变量 &nbsp;&nbsp;<code style="background: rgba(var(--v-theme-on-surface),0.08); padding: 2px 8px; border-radius: 4px; font-size: 13px;">/var/run/docker.sock:/var/run/docker.sock:ro</code></p>
                <v-btn color="primary" variant="tonal" class="mt-4" @click="checkDocker" style="border-radius: 10px;"><v-icon left>mdi-refresh</v-icon> 重新检测</v-btn>
            </div>

            <template v-else-if="dockerAvailable">
                <v-card style="border-radius: 12px; margin-bottom: 16px; background: rgba(var(--v-theme-on-surface),0.04); border: 1px solid rgba(var(--v-theme-on-surface),0.1);" elevation="0">
                    <v-tabs v-model="activeTab" color="primary" bg-color="transparent" density="comfortable" grow>
                        <v-tab value="containers"><v-icon size="16" class="mr-1">mdi-view-grid-outline</v-icon>容器管理</v-tab>
                        <v-tab value="images"><v-icon size="16" class="mr-1">mdi-layers-outline</v-icon>镜像管理</v-tab>
                        <v-tab value="logs"><v-icon size="16" class="mr-1">mdi-clipboard-text-clock-outline</v-icon>日志</v-tab>
                        <v-tab value="settings"><v-icon size="16" class="mr-1">mdi-cog-outline</v-icon>设置</v-tab>
                    </v-tabs>
                </v-card>

                <!-- ==================== 容器管理 ==================== -->
                <div v-show="activeTab === 'containers'">
                    <!-- 过滤芯片 -->
                    <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;">
                        <v-chip size="small" :color="containerFilter === 'all' ? 'primary' : undefined" :variant="containerFilter === 'all' ? 'flat' : 'tonal'" @click="containerFilter = 'all'" style="cursor: pointer;">全部 {{ containerCounts.all }}</v-chip>
                        <v-chip size="small" :color="containerFilter === 'running' ? 'success' : undefined" :variant="containerFilter === 'running' ? 'flat' : 'tonal'" @click="containerFilter = 'running'" style="cursor: pointer;">运行中 {{ containerCounts.running }}</v-chip>
                        <v-chip size="small" :color="containerFilter === 'stopped' ? 'grey' : undefined" :variant="containerFilter === 'stopped' ? 'flat' : 'tonal'" @click="containerFilter = 'stopped'" style="cursor: pointer;">已停止 {{ containerCounts.stopped }}</v-chip>
                        <v-chip size="small" :color="containerFilter === 'update' ? 'warning' : undefined" :variant="containerFilter === 'update' ? 'flat' : 'tonal'" @click="containerFilter = 'update'" style="cursor: pointer;">有更新 {{ containerCounts.hasUpdate }}</v-chip>
                    </div>
                    <!-- 操作栏 -->
                    <div style="display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; align-items: center;">
                        <v-text-field v-model="containerKeyword" label="搜索" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 180px; min-width: 120px; flex: 1;"></v-text-field>
                        <v-btn variant="tonal" size="small" color="info" @click="checkUpdates" :loading="checkingUpdates" style="border-radius: 8px;"><v-icon left size="16">mdi-cloud-search-outline</v-icon>检查更新</v-btn>
                        <v-btn variant="tonal" size="small" :color="containerMultiSelect ? 'primary' : undefined" @click="toggleContainerMultiSelect" style="border-radius: 8px;"><v-icon left size="16">mdi-checkbox-multiple-outline</v-icon>多选</v-btn>
                        <v-btn v-if="containerFilter === 'update' && containerCounts.hasUpdate > 0 && !containerMultiSelect" variant="elevated" size="small" color="warning" @click="updateAllContainers" style="border-radius: 8px;"><v-icon left size="16">mdi-update</v-icon>全部更新</v-btn>
                    </div>
                    <!-- 多选工具栏 -->
                    <div v-if="containerMultiSelect" style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; align-items: center; padding: 8px 12px; border-radius: 10px; background: rgba(var(--v-theme-primary),0.06);">
                        <v-btn size="x-small" :color="isAllContainersSelected ? 'primary' : undefined" :variant="isAllContainersSelected ? 'tonal' : 'outlined'" @click="toggleAllContainers" style="border-radius: 6px;"><v-icon left size="14">{{ isAllContainersSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>全选</v-btn>
                        <span style="font-size: 13px; margin-right: 6px;">已选 {{ containerSelectedIds.length }}</span>
                        <v-btn size="x-small" variant="tonal" color="primary" :disabled="!containerSelectedIds.length" @click="batchContainerAction('update')" style="border-radius: 6px;"><v-icon left size="14">mdi-cloud-download</v-icon>更新</v-btn>
                        <v-btn size="x-small" variant="tonal" color="success" :disabled="!containerSelectedIds.length" @click="batchContainerAction('start')" style="border-radius: 6px;"><v-icon left size="14">mdi-play</v-icon>启动</v-btn>
                        <v-btn size="x-small" variant="tonal" color="warning" :disabled="!containerSelectedIds.length" @click="batchContainerAction('stop')" style="border-radius: 6px;"><v-icon left size="14">mdi-stop</v-icon>停止</v-btn>
                        <v-btn size="x-small" variant="tonal" color="info" :disabled="!containerSelectedIds.length" @click="batchContainerAction('restart')" style="border-radius: 6px;"><v-icon left size="14">mdi-restart</v-icon>重启</v-btn>
                        <v-spacer></v-spacer>
                        <v-btn size="x-small" variant="text" @click="toggleContainerMultiSelect"><v-icon size="16">mdi-close</v-icon></v-btn>
                    </div>

                    <!-- 更新检查进度 -->
                    <div v-if="checkingUpdates || updateCheckProgress.status === 'running'" class="glass-card" style="padding: 12px 16px; border-radius: 12px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <v-progress-circular indeterminate size="16" width="2" color="primary"></v-progress-circular>
                            <span style="font-size: 13px; font-weight: 600;">检查更新</span>
                            <span v-if="updateCheckProgress.total" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6);">{{ updateCheckProgress.current }}/{{ updateCheckProgress.total }}</span>
                            <span v-if="updateCheckProgress.current_image" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px;">{{ updateCheckProgress.current_image }}</span>
                        </div>
                        <v-progress-linear :model-value="updateProgressPercent" color="primary" height="6" rounded style="border-radius: 6px;"></v-progress-linear>
                    </div>

                    <!-- 容器卡片 -->
                    <div class="glass-card" style="padding: 16px; border-radius: 14px;">
                        <div v-if="containers.length === 0" style="text-align: center; padding: 50px 20px; color: rgba(var(--v-theme-on-surface),0.4);">
                            <v-icon size="48" color="grey-darken-1">mdi-docker</v-icon><p style="margin-top: 12px;">暂无容器</p>
                        </div>
                        <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px;">
                            <div v-for="c in filteredContainers" :key="c.id" class="docker-card" :class="{'docker-card-update': c.has_update, 'docker-card-selected': containerMultiSelect && containerSelectedIds.includes(c.id)}" @click="containerMultiSelect ? toggleContainerSelect(c.id) : null" :style="containerMultiSelect ? 'cursor:pointer' : ''">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                    <v-icon :color="getStateColor(c.state)" size="20">{{ getStateIcon(c.state) }}</v-icon>
                                    <span style="font-size: 15px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ c.name }}</span>
                                    <v-chip v-if="c.has_update" size="x-small" color="warning" variant="flat">有更新</v-chip>
                                    <v-chip :color="getStateColor(c.state)" size="x-small" variant="tonal">{{ getStateText(c.state) }}</v-chip>
                                </div>
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="c.image"><v-icon size="12" class="mr-1">mdi-layers</v-icon>{{ c.image }}</div>
                                <div v-if="c.ports && c.ports.length" style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-bottom: 4px;"><v-icon size="11" class="mr-1">mdi-lan-connect</v-icon>{{ c.ports.join(', ') }}</div>
                                <!-- CPU / 内存 -->
                                <div v-if="containerStats[c.id] && c.state === 'running'" style="display: flex; gap: 12px; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 4px;">
                                    <span><v-icon size="11" class="mr-1">mdi-cpu-64-bit</v-icon>CPU {{ containerStats[c.id].cpu_percent }}%</span>
                                    <span><v-icon size="11" class="mr-1">mdi-memory</v-icon>{{ containerStats[c.id].mem_usage_human }} / {{ containerStats[c.id].mem_limit_human }}</span>
                                </div>
                                <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.35);">{{ c.status }} · {{ c.created }}</div>
                                <div style="display: flex; gap: 4px; margin-top: 8px; justify-content: flex-end;">
                                    <v-btn v-if="c.state !== 'running'" icon variant="text" size="x-small" color="success" @click="containerAction(c.id,'start',c.name)" :loading="containerActionLoading[c.id]" title="启动"><v-icon size="18">mdi-play</v-icon></v-btn>
                                    <v-btn v-if="c.state === 'running'" icon variant="text" size="x-small" color="warning" @click="confirmContainerAction(c.id,'stop',c.name)" title="停止"><v-icon size="18">mdi-stop</v-icon></v-btn>
                                    <v-btn icon variant="text" size="x-small" color="info" @click="confirmContainerAction(c.id,'restart',c.name)" title="重启"><v-icon size="18">mdi-restart</v-icon></v-btn>
                                    <v-btn icon variant="text" size="x-small" :color="isNanShareContainer(c.name) ? 'purple' : 'primary'" @click="confirmContainerAction(c.id,'update',c.name)" :title="isNanShareContainer(c.name) ? '自更新' : '更新'" :loading="containerActionLoading[c.id]"><v-icon size="18">mdi-cloud-download</v-icon></v-btn>
                                    <v-btn icon variant="text" size="x-small" color="error" @click="confirmContainerAction(c.id,'remove',c.name)" title="删除"><v-icon size="18">mdi-delete-outline</v-icon></v-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ==================== 镜像管理 ==================== -->
                <div v-show="activeTab === 'images'">
                    <!-- 过滤芯片 -->
                    <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;">
                        <v-chip size="small" :color="imageFilter === 'all' ? 'primary' : undefined" :variant="imageFilter === 'all' ? 'flat' : 'tonal'" @click="imageFilter = 'all'" style="cursor: pointer;">全部 {{ imageCounts.all }}</v-chip>
                        <v-chip size="small" :color="imageFilter === 'dangling' ? 'warning' : undefined" :variant="imageFilter === 'dangling' ? 'flat' : 'tonal'" @click="imageFilter = 'dangling'" style="cursor: pointer;">无标签 {{ imageCounts.dangling }}</v-chip>
                        <v-chip size="small" :color="imageFilter === 'unused' ? 'grey' : undefined" :variant="imageFilter === 'unused' ? 'flat' : 'tonal'" @click="imageFilter = 'unused'" style="cursor: pointer;">未使用 {{ imageCounts.unused }}</v-chip>
                    </div>
                    <!-- 操作栏 -->
                    <div style="display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; align-items: center;">
                        <v-text-field v-model="imageKeyword" label="搜索" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 180px; min-width: 120px; flex: 1;"></v-text-field>
                        <v-btn color="warning" variant="tonal" size="small" :disabled="!canCleanImages" @click="cleanImages" style="border-radius: 8px;"><v-icon left size="16">mdi-broom</v-icon>清理镜像</v-btn>
                        <v-btn variant="tonal" size="small" :color="imageMultiSelect ? 'primary' : undefined" @click="toggleImageMultiSelect" style="border-radius: 8px;"><v-icon left size="16">mdi-checkbox-multiple-outline</v-icon>多选</v-btn>
                    </div>
                    <!-- 多选工具栏 -->
                    <div v-if="imageMultiSelect" style="display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; align-items: center; padding: 8px 12px; border-radius: 10px; background: rgba(var(--v-theme-primary),0.06);">
                        <v-btn size="x-small" :color="isAllImagesSelected ? 'primary' : undefined" :variant="isAllImagesSelected ? 'tonal' : 'outlined'" @click="toggleAllImages" style="border-radius: 6px;"><v-icon left size="14">{{ isAllImagesSelected ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>全选</v-btn>
                        <span style="font-size: 13px; margin-right: 6px;">已选 {{ imageSelectedIds.length }}</span>
                        <v-btn size="x-small" variant="tonal" color="error" :disabled="!imageSelectedIds.length" @click="batchDeleteImages" style="border-radius: 6px;"><v-icon left size="14">mdi-delete-outline</v-icon>删除</v-btn>
                        <v-spacer></v-spacer>
                        <v-btn size="x-small" variant="text" @click="toggleImageMultiSelect"><v-icon size="16">mdi-close</v-icon></v-btn>
                    </div>
                    <div class="glass-card" style="padding: 16px; border-radius: 14px;">
                        <div v-if="images.length === 0" style="text-align: center; padding: 50px 20px; color: rgba(var(--v-theme-on-surface),0.4);"><v-icon size="48" color="grey-darken-1">mdi-layers</v-icon><p style="margin-top: 12px;">暂无镜像</p></div>
                        <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px;">
                            <div v-for="img in filteredImages" :key="img.id" class="docker-card" :class="{'docker-card-selected': imageMultiSelect && imageSelectedIds.includes(img.full_id)}" @click="imageMultiSelect ? toggleImageSelect(img.full_id) : null" :style="imageMultiSelect ? 'cursor:pointer' : ''">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                    <v-icon size="18" color="primary">mdi-layers</v-icon>
                                    <span style="font-size: 14px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="img.tag">{{ img.tag }}</span>
                                    <v-chip v-if="img.in_used" size="x-small" color="success" variant="tonal">使用中</v-chip>
                                    <v-chip v-else size="x-small" color="grey" variant="tonal">未使用</v-chip>
                                </div>
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 2px;">ID: {{ img.id }}</div>
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.45);">{{ img.size_human }} · {{ img.created }}</div>
                                <div style="display: flex; gap: 4px; margin-top: 8px; justify-content: flex-end;">
                                    <v-btn v-if="!img.in_used" icon variant="text" size="x-small" color="error" @click="confirmImageRemove(img.full_id, img.tag)" title="删除"><v-icon size="18">mdi-delete-outline</v-icon></v-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ==================== 操作日志 ==================== -->
                <div v-show="activeTab === 'logs'">
                    <div class="glass-card" style="padding: 12px 16px; border-radius: 14px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <v-text-field v-model="logKeyword" label="搜索" density="compact" variant="outlined" hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 200px; min-width: 150px;"></v-text-field>
                            <v-select v-model="logFilterStatus" :items="[{title:'全部状态',value:''},{title:'成功',value:'success'},{title:'失败',value:'failed'}]" item-title="title" item-value="value" label="状态" density="compact" variant="outlined" hide-details style="max-width: 120px;"></v-select>
                            <v-select v-model="logFilterOperation" :items="[{title:'全部操作',value:''},{title:'启动',value:'start'},{title:'停止',value:'stop'},{title:'重启',value:'restart'},{title:'删除',value:'remove'},{title:'更新',value:'update'},{title:'清理',value:'clean'},{title:'检查更新',value:'check_update'},{title:'自更新',value:'self_update'},{title:'配置',value:'config'}]" item-title="title" item-value="value" label="操作" density="compact" variant="outlined" hide-details style="max-width: 130px;"></v-select>
                            <v-spacer></v-spacer>
                            <template v-if="logMultiSelectMode">
                                <v-btn v-if="logSelectedIds.length > 0" color="error" variant="tonal" size="small" @click="openLogDeleteDialog('selected')" style="border-radius: 8px;"><v-icon left size="16">mdi-delete</v-icon>删除选中 ({{ logSelectedIds.length }})</v-btn>
                            </template>
                            <v-btn color="error" variant="outlined" size="small" @click="openLogDeleteDialog('all')" style="border-radius: 8px;"><v-icon left size="16">mdi-delete-sweep</v-icon>清空全部</v-btn>
                            <v-btn icon variant="text" size="small" :color="logMultiSelectMode ? 'primary' : undefined" @click="logMultiSelectMode = !logMultiSelectMode; if(!logMultiSelectMode) logSelectedIds = []" title="多选"><v-icon size="20">mdi-checkbox-multiple-outline</v-icon></v-btn>
                        </div>
                    </div>
                    <div class="glass-card" style="padding: 16px; border-radius: 14px;">
                        <div v-if="logs.length === 0" style="text-align: center; padding: 50px 20px; color: rgba(var(--v-theme-on-surface),0.4);"><v-icon size="48" color="grey-darken-1">mdi-clipboard-text-clock-outline</v-icon><p style="margin-top: 12px;">暂无操作日志</p></div>
                        <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 10px;">
                            <div v-for="l in logs" :key="l.id" class="docker-card docker-log-card" :class="{'docker-card-selected': logMultiSelectMode && logSelectedIds.includes(l.id)}" @click="logMultiSelectMode ? toggleLogSelect(l.id) : openLogDetail(l)">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                    <v-icon :color="getOperationColor(l.operation)" size="18">{{ getOperationIcon(l.operation) }}</v-icon>
                                    <v-chip :color="getOperationColor(l.operation)" size="x-small" variant="tonal">{{ getOperationText(l.operation) }}</v-chip>
                                    <v-chip :color="l.status === 'success' ? 'success' : 'error'" size="x-small" variant="flat">{{ l.status === 'success' ? '成功' : '失败' }}</v-chip>
                                    <v-spacer></v-spacer>
                                    <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.35);">{{ formatTime(l.created_at) }}</span>
                                </div>
                                <div v-if="l.target_name || l.target_id" style="font-size: 13px; font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ l.target_name || l.target_id }}</div>
                                <div v-if="l.image" style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.45); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ l.image }}</div>
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-top: 4px;">{{ l.message }}</div>
                            </div>
                        </div>
                        <div v-if="logTotalPages > 1" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 16px;">
                            <v-btn variant="text" size="small" :disabled="logPage <= 1" @click="logGoPage(1)"><v-icon size="18">mdi-chevron-double-left</v-icon></v-btn>
                            <v-btn variant="text" size="small" :disabled="logPage <= 1" @click="logGoPage(logPage - 1)"><v-icon size="18">mdi-chevron-left</v-icon></v-btn>
                            <span style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6); padding: 0 8px;">{{ logPage }} / {{ logTotalPages }} ({{ logTotal }})</span>
                            <v-btn variant="text" size="small" :disabled="logPage >= logTotalPages" @click="logGoPage(logPage + 1)"><v-icon size="18">mdi-chevron-right</v-icon></v-btn>
                            <v-btn variant="text" size="small" :disabled="logPage >= logTotalPages" @click="logGoPage(logTotalPages)"><v-icon size="18">mdi-chevron-double-right</v-icon></v-btn>
                        </div>
                    </div>
                </div>

                <!-- ==================== 设置 ==================== -->
                <div v-show="activeTab === 'settings'">
                    <!-- 自定义加速源（daemon.json 可编辑） -->
                    <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div class="text-subtitle-1" style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <v-icon size="20" color="info">mdi-server-network</v-icon> 自定义加速源
                            </div>
                            <v-btn color="info" variant="tonal" size="small" :loading="savingMirrors" @click="saveSysMirrors" style="border-radius: 10px;"><v-icon left size="16">mdi-content-save</v-icon>保存并生效</v-btn>
                        </div>
                        <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-bottom: 10px;">修改 /etc/docker/daemon.json 的 registry-mirrors，保存后自动 reload docker daemon</div>
                        <div v-if="daemonConfig['registry-mirrors'] && daemonConfig['registry-mirrors'].length > 0" style="margin-bottom: 10px;">
                            <div v-for="(m, idx) in daemonConfig['registry-mirrors']" :key="'sys'+idx" style="display: flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 8px; margin-bottom: 3px; background: rgba(var(--v-theme-on-surface),0.03);">
                                <v-chip size="x-small" color="info" variant="flat">{{ idx + 1 }}</v-chip>
                                <span style="flex: 1; font-size: 13px;">{{ m }}</span>
                                <v-btn icon variant="text" size="x-small" @click="moveSysMirrorUp(idx)" :disabled="idx === 0"><v-icon size="16">mdi-arrow-up</v-icon></v-btn>
                                <v-btn icon variant="text" size="x-small" @click="moveSysMirrorDown(idx)" :disabled="idx === daemonConfig['registry-mirrors'].length - 1"><v-icon size="16">mdi-arrow-down</v-icon></v-btn>
                                <v-btn icon variant="text" size="x-small" color="error" @click="removeSysMirror(idx)"><v-icon size="16">mdi-close</v-icon></v-btn>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <v-text-field v-model="newSysMirror" label="添加加速源" variant="outlined" density="compact" hide-details placeholder="https://mirror.example.com" @keyup.enter="addSysMirror" style="flex: 1;"></v-text-field>
                            <v-btn color="info" variant="tonal" size="small" @click="addSysMirror" style="border-radius: 8px;"><v-icon left size="16">mdi-plus</v-icon>添加</v-btn>
                        </div>
                    </div>

                    <!-- 代理 -->
                    <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div class="text-subtitle-1" style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <v-icon size="20" color="cyan">mdi-shield-outline</v-icon> 代理
                            </div>
                            <v-btn color="cyan" variant="tonal" size="small" :loading="savingProxy" @click="saveDaemonProxy" style="border-radius: 10px;"><v-icon left size="16">mdi-content-save</v-icon>保存并生效</v-btn>
                        </div>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                            <v-icon size="14" color="info">mdi-information-outline</v-icon> 此处代理用于拉取镜像，设置代理后将自动清除镜像加速源并使用 Docker 官方源+代理拉取
                        </div>
                        <div v-if="daemonProxyCurrent" style="font-size: 12px; margin-bottom: 8px; padding: 6px 12px; border-radius: 8px; background: rgba(var(--v-theme-on-surface),0.04); display: flex; align-items: center; gap: 6px;">
                            <v-icon size="14" color="success">mdi-check-circle</v-icon>
                            <span style="color: rgba(var(--v-theme-on-surface),0.5);">当前系统代理：</span>
                            <span style="font-weight: 500;">{{ daemonProxyCurrent }}</span>
                        </div>
                        <div v-else style="font-size: 12px; margin-bottom: 8px; padding: 6px 12px; border-radius: 8px; background: rgba(var(--v-theme-on-surface),0.04); display: flex; align-items: center; gap: 6px;">
                            <v-icon size="14" color="grey">mdi-close-circle-outline</v-icon>
                            <span style="color: rgba(var(--v-theme-on-surface),0.4);">当前系统代理：未设置</span>
                        </div>
                        <v-text-field v-model="daemonProxy" label="Docker 拉取镜像代理" variant="outlined" density="compact" placeholder="http://127.0.0.1:7890 或 socks5://..." hint="写入 daemon.json 并 reload，仅用于 Docker 拉取镜像" persistent-hint></v-text-field>
                    </div>

                    <!-- Docker 信息 -->
                    <div v-if="dockerInfo" class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div class="text-subtitle-2 mb-2" style="display: flex; align-items: center; gap: 6px;">
                            <v-icon size="18" color="primary">mdi-information-outline</v-icon> Docker 信息
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px;">
                            <v-chip size="small" variant="tonal" color="primary">v{{ dockerInfo.server_version }}</v-chip>
                            <v-chip size="small" variant="tonal">{{ dockerInfo.os }}</v-chip>
                            <v-chip size="small" variant="tonal">{{ dockerInfo.architecture }}</v-chip>
                            <v-chip size="small" variant="tonal" color="success">{{ dockerInfo.containers_running }} 运行</v-chip>
                            <v-chip size="small" variant="tonal" color="grey">{{ dockerInfo.containers_stopped }} 停止</v-chip>
                            <v-chip size="small" variant="tonal" color="info">{{ dockerInfo.images }} 镜像</v-chip>
                        </div>
                    </div>

                    <!-- 定时检查更新 -->
                    <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div class="text-subtitle-2" style="display: flex; align-items: center; gap: 6px;">
                                <v-icon size="18" color="info">mdi-update</v-icon> 定时检查更新
                            </div>
                            <v-btn color="info" variant="tonal" size="small" :loading="savingUpdateCheck" @click="saveUpdateCheckSettings" style="border-radius: 10px;"><v-icon left size="16">mdi-content-save</v-icon>保存设置</v-btn>
                        </div>
                        <v-switch v-model="dockerConfig.update_check_enabled" label="启用定时检查更新" color="primary" hide-details class="mb-3"></v-switch>
                        <template v-if="dockerConfig.update_check_enabled">
                            <v-text-field v-model="dockerConfig.update_check_cron" label="Cron 表达式" variant="outlined" density="compact" hint="默认 */20 * * * *（每20分钟检查一次），格式：分 时 日 月 周" persistent-hint class="mb-3" placeholder="*/20 * * * *"></v-text-field>
                            <v-select v-model="dockerConfig.update_check_containers" :items="containerNames" item-title="title" item-value="value" label="检查容器" multiple chips variant="outlined" density="compact" class="mb-3" hint="选择定时检查的容器，不选择则检查全部（手动检查不受此限制）" persistent-hint></v-select>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <v-text-field v-model.number="dockerConfig.update_check_concurrency" label="并发数" type="number" variant="outlined" density="compact" hide-details :min="1" :max="10" style="max-width: 100px; flex-shrink: 0;"></v-text-field>
                                <span class="text-caption text-medium-emphasis">同时检查的镜像数量，默认 2，设为 1 则逐个检查</span>
                            </div>
                            <v-switch v-model="dockerConfig.update_check_log_enabled" label="输出检查日志" color="primary" hide-details class="mb-1" hint="关闭后仅输出有更新的镜像，不输出已是最新的" persistent-hint></v-switch>
                        </template>
                    </div>

                    <!-- 更新通知 -->
                    <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div class="text-subtitle-2" style="display: flex; align-items: center; gap: 6px;">
                                <v-icon size="18" color="orange">mdi-bell-outline</v-icon> TG 更新通知
                            </div>
                            <v-btn color="orange" variant="tonal" size="small" :loading="savingNotify" @click="saveNotifySettings" style="border-radius: 10px;"><v-icon left size="16">mdi-content-save</v-icon>保存设置</v-btn>
                        </div>
                        <v-switch v-model="dockerConfig.update_notify_enabled" label="启用 TG 更新通知" color="orange" hide-details class="mb-3"></v-switch>
                        <v-select v-if="dockerConfig.update_notify_enabled" v-model="dockerConfig.update_notify_containers" :items="containerNames" item-title="title" item-value="value" label="通知容器" multiple chips variant="outlined" density="compact" class="mb-3" hint="选择容器在有更新时发送 TG 通知，不选择则通知所有容器" persistent-hint></v-select>
                    </div>

                    <!-- 自动更新 -->
                    <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div class="text-subtitle-2" style="display: flex; align-items: center; gap: 6px;">
                                <v-icon size="18" color="success">mdi-sync</v-icon> 自动更新
                            </div>
                            <v-btn color="success" variant="tonal" size="small" :loading="savingAutoUpdate" @click="saveAutoUpdateSettings" style="border-radius: 10px;"><v-icon left size="16">mdi-content-save</v-icon>保存设置</v-btn>
                        </div>
                        <v-switch v-model="dockerConfig.auto_update_enabled" label="启用自动更新" color="success" hide-details class="mb-3" hint="检测到更新时自动执行更新" persistent-hint></v-switch>
                        
                        <template v-if="dockerConfig.auto_update_enabled">
                            <v-select v-model="dockerConfig.auto_update_containers" :items="containerNames" item-title="title" item-value="value" label="自动更新容器" multiple chips variant="outlined" density="compact" class="mb-3" hint="被选中的容器检测到新版本时自动更新" persistent-hint></v-select>
                            
                            <v-row class="mb-1">
                                <v-col cols="12" md="4">
                                    <v-switch v-model="dockerConfig.auto_update_notify" label="更新通知" color="success" hide-details hint="更新任务创建时发送通知" persistent-hint></v-switch>
                                </v-col>
                                <v-col cols="12" md="4">
                                    <v-switch v-model="dockerConfig.auto_update_progress_report" label="进度汇报" color="info" hide-details hint="追踪更新任务进度并发送通知" persistent-hint></v-switch>
                                </v-col>
                                <v-col cols="12" md="4">
                                    <v-switch v-model="dockerConfig.delete_old_images" label="清理旧镜像" color="warning" hide-details hint="更新后清理无标签且不在使用的镜像" persistent-hint></v-switch>
                                </v-col>
                            </v-row>
                            
                            <v-row v-if="dockerConfig.auto_update_progress_report" class="mb-1">
                                <v-col cols="12" md="6"><v-text-field v-model.number="dockerConfig.update_progress_rounds" label="追踪轮数" variant="outlined" density="compact" type="number" hint="进度追踪的最大轮数" persistent-hint></v-text-field></v-col>
                                <v-col cols="12" md="6"><v-text-field v-model.number="dockerConfig.update_progress_interval" label="追踪间隔（秒）" variant="outlined" density="compact" type="number" hint="每轮间隔秒数" persistent-hint></v-text-field></v-col>
                            </v-row>
                        </template>
                    </div>

                </div>

                <!-- ==================== 弹窗 ==================== -->
                <v-dialog v-model="logDetailDialog" max-width="700px" scrollable>
                    <v-card v-if="logDetailData" style="border-radius: 16px;">
                        <v-card-title class="d-flex align-center" style="padding: 14px 20px;">
                            <v-icon :color="getOperationColor(logDetailData.operation)" size="20" class="mr-2">{{ getOperationIcon(logDetailData.operation) }}</v-icon>
                            {{ getOperationText(logDetailData.operation) }} 详情
                            <v-spacer></v-spacer>
                            <v-btn icon variant="text" size="small" @click="logDetailDialog = false"><v-icon size="20">mdi-close</v-icon></v-btn>
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text style="padding: 16px;">
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 13px; margin-bottom: 16px;">
                                <span style="color: rgba(var(--v-theme-on-surface),0.5);">操作类型</span>
                                <v-chip :color="getOperationColor(logDetailData.operation)" size="small" variant="tonal">{{ getOperationText(logDetailData.operation) }}</v-chip>
                                <span style="color: rgba(var(--v-theme-on-surface),0.5);">目标</span>
                                <span>{{ logDetailData.target_name || logDetailData.target_id || '-' }}</span>
                                <span style="color: rgba(var(--v-theme-on-surface),0.5);">镜像</span>
                                <span>{{ logDetailData.image || '-' }}</span>
                                <span style="color: rgba(var(--v-theme-on-surface),0.5);">状态</span>
                                <v-chip :color="logDetailData.status === 'success' ? 'success' : 'error'" size="small" variant="flat">{{ logDetailData.status === 'success' ? '成功' : '失败' }}</v-chip>
                                <span style="color: rgba(var(--v-theme-on-surface),0.5);">消息</span>
                                <span>{{ logDetailData.message }}</span>
                                <span style="color: rgba(var(--v-theme-on-surface),0.5);">时间</span>
                                <span>{{ formatTime(logDetailData.created_at) }}</span>
                            </div>
                            <div v-if="logDetailData.detail_log && logDetailData.detail_log.length > 0">
                                <div class="text-subtitle-2 mb-2">详细日志</div>
                                <div style="background: rgba(var(--v-theme-on-surface),0.04); border-radius: 10px; padding: 12px; max-height: 350px; overflow-y: auto;">
                                    <div v-for="(line, idx) in logDetailData.detail_log" :key="idx" style="font-size: 12px; line-height: 1.8; font-family: monospace; word-break: break-all;" :style="{ color: line.includes('OK') || line.includes('成功') ? 'rgb(var(--v-theme-success))' : line.includes('失败') || line.includes('错误') ? 'rgb(var(--v-theme-error))' : 'rgba(var(--v-theme-on-surface),0.7)' }">{{ line }}</div>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-dialog>
                <v-dialog v-model="updateDialog" max-width="600px" persistent>
                    <v-card style="border-radius: 16px;">
                        <v-card-title style="padding: 20px; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <v-icon :color="updateProgress.status === 'done' ? 'success' : updateProgress.status === 'failed' ? 'error' : 'primary'" size="24">{{ updateProgress.status === 'done' ? 'mdi-check-circle' : updateProgress.status === 'failed' ? 'mdi-close-circle' : 'mdi-update' }}</v-icon>
                            更新容器 {{ updateProgress.container_name || '' }}
                        </v-card-title>
                        <v-card-text style="padding: 0 20px 12px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                <v-progress-linear :model-value="updateProgress.total_steps > 0 ? (updateProgress.step / updateProgress.total_steps * 100) : 0" :color="updateProgress.status === 'done' ? 'success' : updateProgress.status === 'failed' ? 'error' : 'primary'" height="8" rounded style="flex: 1;"></v-progress-linear>
                                <span style="font-size: 13px; white-space: nowrap; color: rgba(var(--v-theme-on-surface),0.6);">{{ updateProgress.step }}/{{ updateProgress.total_steps }}</span>
                            </div>
                            <div v-if="updateProgress.step_name && updateProgress.status === 'running'" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                <v-progress-circular indeterminate size="14" width="2" color="primary"></v-progress-circular>
                                {{ updateProgress.step_name }}
                            </div>
                            <div ref="updateLogBox" style="background: rgba(var(--v-theme-on-surface),0.04); border-radius: 10px; padding: 12px; max-height: 300px; overflow-y: auto; min-height: 100px;">
                                <div v-for="(line, idx) in (updateProgress.log_lines || [])" :key="idx" style="font-size: 12px; line-height: 1.8; font-family: monospace; word-break: break-all;" :style="{ color: line.includes('✅') ? 'rgb(var(--v-theme-success))' : line.includes('❌') ? 'rgb(var(--v-theme-error))' : 'rgba(var(--v-theme-on-surface),0.7)' }">{{ line }}</div>
                                <div v-if="!updateProgress.log_lines || updateProgress.log_lines.length === 0" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.3);">等待日志...</div>
                            </div>
                        </v-card-text>
                        <v-card-actions style="padding: 12px 20px 20px;"><v-spacer></v-spacer>
                            <v-btn variant="tonal" @click="closeUpdateDialog" style="border-radius: 10px;">{{ updateProgress.status === 'done' || updateProgress.status === 'failed' ? '关闭' : '取消' }}</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
                <v-dialog v-model="confirmDialog" max-width="420px">
                    <v-card style="border-radius: 16px;">
                        <v-card-title style="padding: 20px; font-size: 18px; font-weight: 600;"><v-icon color="warning" size="24" class="mr-2">mdi-alert-circle</v-icon>{{ confirmTitle }}</v-card-title>
                        <v-card-text style="padding: 0 20px 12px; font-size: 14px; line-height: 1.6; white-space: pre-line;">{{ confirmMessage }}</v-card-text>
                        <v-card-actions style="padding: 12px 20px 20px; gap: 8px;"><v-spacer></v-spacer>
                            <v-btn variant="tonal" @click="confirmDialog = false" style="border-radius: 10px;">取消</v-btn>
                            <v-btn color="warning" variant="elevated" @click="confirmDialog = false; confirmAction && confirmAction()" style="border-radius: 10px;">确定</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
                <v-dialog v-model="logDeleteDialog" max-width="380px">
                    <v-card style="border-radius: 16px;">
                        <v-card-title style="padding: 20px; font-size: 18px; font-weight: 600;"><v-icon color="error" size="24" class="mr-2">mdi-delete-alert</v-icon>{{ logDeleteType === 'all' ? '清空全部日志' : '删除选中日志' }}</v-card-title>
                        <v-card-text style="padding: 0 20px 12px; font-size: 14px;">{{ logDeleteType === 'all' ? '确定要清空所有操作日志吗？' : '确定要删除选中的 ' + logSelectedIds.length + ' 条日志吗？' }}</v-card-text>
                        <v-card-actions style="padding: 12px 20px 20px; gap: 8px;"><v-spacer></v-spacer>
                            <v-btn variant="tonal" @click="logDeleteDialog = false" style="border-radius: 10px;">取消</v-btn>
                            <v-btn color="error" variant="elevated" @click="doDeleteLogs" :loading="logDeleting" style="border-radius: 10px;">确定删除</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
            </template>

            <div v-else style="display: flex; justify-content: center; padding: 60px;"><v-progress-circular indeterminate color="primary" size="40"></v-progress-circular></div>
        </div>
    `
};

// Docker 管理样式
const dockerManagerStyle = document.createElement('style');
dockerManagerStyle.textContent = `
    .docker-card { background: rgba(var(--v-theme-on-surface), 0.03); border: 1px solid rgba(var(--v-theme-on-surface), 0.08); border-radius: 12px; padding: 14px; transition: all 0.2s; cursor: default; }
    .docker-card:hover { background: rgba(var(--v-theme-on-surface), 0.06); border-color: rgba(61, 111, 213, 0.2); }
    .docker-card-update { border-color: rgba(255, 180, 0, 0.3); background: rgba(255, 180, 0, 0.04); }
    .docker-log-card { cursor: pointer; }
    .docker-card-selected { background: rgba(61, 111, 213, 0.12) !important; border-color: rgba(61, 111, 213, 0.3) !important; }
`;
document.head.appendChild(dockerManagerStyle);
