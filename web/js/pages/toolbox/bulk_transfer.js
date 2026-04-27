// 115大包筛选入库页面组件
const BulkTransferPage = {
    name: 'BulkTransferPage',

    data() {
        return {
            activeTab: 'main',
            // 配置
            config: {
                use_115_config: '',
                parse_mode: 3,
                transfer_folder: null,
                strm_folder_path: '',
                emby_config_id: '',
                mode: 'transfer',
                multi_version: false,
                recognize_threads_enabled: true,
                recognize_threads: 3,
                show_recognize_logs: false,
                reshare_enabled: false,
                api_delay_enabled: true,
                api_delay_min: 0.5,
                api_delay_max: 1.2,
            },
            configLoading: false,
            configSaving: false,
            configs115: [],
            embyConfigs: [],
            // 115 文件夹浏览
            cloudFolderDialog: false,
            cloudFolderLoading: false,
            cloudFolders: [],
            cloudCurrentCid: '0',
            cloudFolderPath: [{ name: '根目录', cid: '0' }],
            createFolderMode: false,
            createFolderName: '',
            createFolderLoading: false,
            // 本地文件夹浏览 (STRM目录)
            localFolderDialog: false,
            localFolderLoading: false,
            localFolders: [],
            localCurrentPath: '',
            localParentPath: '',
            // 扫描
            shareUrlInput: '',
            scanning: false,
            scanProgress: '',
            scanError: null,
            pollTimer: null,
            // 实时日志
            logs: [],
            logIndex: 0,
            // 步骤进度
            steps: [],
            summary: null,
            // 识别结果
            result: null,
            resultLoading: false,
            // 结果筛选
            resultFilter: 'all', // all, movie, tv, unrecognized
            // 转存
            transferring: false,
            transferProgress: '',
            transferResult: null,
            // 选择
            selectedMovieIds: [],
            selectedTvIds: [],
            // 入库检测
            libraryChecking: false,
            libraryChecked: false,
            movieInLibrary: [],     // [tmdb_id, ...]
            tvInLibrary: {},        // {tmdb_id: {season: [ep, ...]}}
            // 解析模式选项
            parseModeOptions: [
                { title: '葵花宝典', value: 3 },
                { title: '大包模式', value: 1 },
                { title: '最快', value: 0 },
            ],
            modeOptions: [
                { title: '转存模式', value: 'transfer' },
                { title: '分享 STRM', value: 'share_strm' },
            ],
            // 分页状态（性能优化）
            moviePageSize: 20,
            movieShowCount: 20,
            tvPageSize: 20,
            tvShowCount: 20,
            unrecognizedPageSize: 30,
            unrecognizedShowCount: 30,
            // 折叠状态（性能优化）
            expandedMovies: {},   // { tmdb_id: true }
            expandedTvShows: {},  // { tmdb_id: true }
            expandedSeasons: {},  // { 'tmdb_id-season': true }
            // 结果搜索关键词
            searchKeyword: '',
            // 手动识别弹窗（未识别项 TMDB 搜索）
            manualRecognizeDialog: false,
            manualRecognizeItem: null,
            manualTmdbKeyword: '',
            manualTmdbResults: [],
            manualTmdbLoading: false,
            manualRecognizing: false,
            // 重新识别源信息（已识别项重新归类时使用）
            reRecognizeSource: null,
            // 剧集季集选择弹窗
            manualSeasonDialog: false,
            manualSelectedTmdb: null,
            manualSeason: 1,
            manualEpisode: 0,
        }
    },

    computed: {
        filteredMovies() {
            if (!this.result) return [];
            const list = this.result.movies || [];
            const kw = (this.searchKeyword || '').trim().toLowerCase();
            if (!kw) return list;
            return list.filter(m => {
                const title = (m.title || '').toLowerCase();
                const tmdbId = String(m.tmdb_id || '');
                return title.includes(kw) || tmdbId.includes(kw);
            });
        },
        filteredTvshows() {
            if (!this.result) return [];
            const list = this.result.tvshows || [];
            const kw = (this.searchKeyword || '').trim().toLowerCase();
            if (!kw) return list;
            return list.filter(s => {
                const title = (s.title || '').toLowerCase();
                const tmdbId = String(s.tmdb_id || '');
                return title.includes(kw) || tmdbId.includes(kw);
            });
        },
        filteredUnrecognized() {
            if (!this.result) return [];
            const list = this.result.unrecognized || [];
            const kw = (this.searchKeyword || '').trim().toLowerCase();
            if (!kw) return list;
            return list.filter(item => {
                const name = (item.name || '').toLowerCase();
                return name.includes(kw);
            });
        },
        // 分页后的列表（性能优化，减少 DOM 节点）
        pagedMovies() {
            return this.filteredMovies.slice(0, this.movieShowCount);
        },
        pagedTvshows() {
            return this.filteredTvshows.slice(0, this.tvShowCount);
        },
        pagedUnrecognized() {
            return this.filteredUnrecognized.slice(0, this.unrecognizedShowCount);
        },
        hasMoreMovies() {
            return this.filteredMovies.length > this.movieShowCount;
        },
        hasMoreTvshows() {
            return this.filteredTvshows.length > this.tvShowCount;
        },
        hasMoreUnrecognized() {
            return this.filteredUnrecognized.length > this.unrecognizedShowCount;
        },
        // 日志限量（性能优化，只显示最近100条）
        visibleLogs() {
            const maxLogs = 100;
            if (this.logs.length <= maxLogs) return this.logs;
            return this.logs.slice(this.logs.length - maxLogs);
        },
        hasResult() {
            return this.result && (
                (this.result.movies && this.result.movies.length > 0) ||
                (this.result.tvshows && this.result.tvshows.length > 0) ||
                (this.result.unrecognized && this.result.unrecognized.length > 0)
            );
        },
        stats() {
            return this.result ? this.result.stats : null;
        },
        activeStep() {
            if (!Array.isArray(this.steps) || this.steps.length === 0) return null;
            return this.steps.find(step => step.status === 'running')
                || this.steps.find(step => step.status === 'error')
                || this.steps.find(step => step.status === 'done')
                || null;
        },
        inlineScanProgressText() {
            if (this.activeStep) {
                if (this.activeStep.message) {
                    return `${this.activeStep.name} · ${this.activeStep.message}`;
                }
                if (this.activeStep.total > 0) {
                    return `${this.activeStep.name} · ${this.activeStep.current || 0}/${this.activeStep.total}`;
                }
                return this.activeStep.name;
            }
            return this.scanProgress || '';
        },
        inlineScanProgressPercent() {
            if (!this.activeStep || !this.activeStep.total) return 0;
            return Math.max(0, Math.min(100, ((this.activeStep.current || 0) / this.activeStep.total) * 100));
        },
        showInlineScanProgress() {
            return !!(this.scanning || this.transferring || this.libraryChecking || this.scanProgress || this.activeStep || this.scanError);
        },
    },

    watch: {},


    async mounted() {
        this.parseSubRoute();
        this._routeHandler = () => this.parseSubRoute();
        window.addEventListener('route-change', this._routeHandler);
        await this.loadConfig();
        await this.loadConfigs115();
        await this.loadEmbyConfigs();
        await this.checkStatus();
    },

    beforeUnmount() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        if (this._configSaveTimer) {
            clearTimeout(this._configSaveTimer);
            this._configSaveTimer = null;
        }
        if (this._routeHandler) {
            window.removeEventListener('route-change', this._routeHandler);
        }
    },

    methods: {
        parseSubRoute() {
            const hash = window.location.hash.slice(1).replace(/^\//, '');
            if (hash === 'toolbox/bulk_transfer/settings') {
                this.activeTab = 'settings';
            } else {
                this.activeTab = 'main';
            }
        },
        switchTab(tab) {
            if (tab === 'settings') {
                router.push('toolbox/bulk_transfer/settings');
            } else {
                router.push('toolbox/bulk_transfer');
            }
        },

        // ========== 配置管理 ==========
        async loadConfig() {
            this.configLoading = true;
            try {
                const res = await api.request('/bulk_transfer/config');
                if (res.success && res.data) {
                    this.config = { ...this.config, ...res.data };
                }
            } catch (e) { console.error('加载配置失败:', e); }
            finally { this.configLoading = false; }
        },
        async saveConfig() {
            this.configSaving = true;
            try {
                this.normalizeRecognizeThreads();
                const res = await api.request('/bulk_transfer/config', {
                    method: 'POST',
                    body: JSON.stringify(this.config)
                });
                if (res.success) {
                    window.showMessage && window.showMessage('配置已保存', 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('保存失败', 'error'); }
            finally { this.configSaving = false; }
        },
        scheduleConfigSave() {
            if (this._configSaveTimer) clearTimeout(this._configSaveTimer);
            this._configSaveTimer = setTimeout(async () => {
                this.normalizeRecognizeThreads();
                if (this.configSaving) {
                    this.scheduleConfigSave();
                    return;
                }
                this.configSaving = true;
                try {
                    await api.request('/bulk_transfer/config', {
                        method: 'POST',
                        body: JSON.stringify(this.config)
                    });
                } catch (e) {
                    console.error('[大包筛选] 自动保存配置失败:', e);
                } finally {
                    this.configSaving = false;
                }
            }, 300);
        },
        normalizeRecognizeThreads() {
            const value = Number(this.config.recognize_threads);
            if (!Number.isFinite(value)) {
                this.config.recognize_threads = 3;
                return;
            }
            this.config.recognize_threads = Math.min(10, Math.max(1, Math.round(value)));
        },
        handleRecognizeThreadsToggle(value) {
            this.config.recognize_threads_enabled = !!value;
            this.normalizeRecognizeThreads();
            this.scheduleConfigSave();
        },
        handleRecognizeThreadsChange(value) {
            this.config.recognize_threads = value;
            this.normalizeRecognizeThreads();
            this.scheduleConfigSave();
        },
        handleRecognizeLogsToggle(value) {
            this.config.show_recognize_logs = !!value;
            this.scheduleConfigSave();
        },
        applyLibraryState(library) {
            const rawLibrary = library || {};
            this.libraryChecked = !!rawLibrary.checked;
            this.movieInLibrary = (rawLibrary.movie_in_library || []).map(id => String(id));
            this.tvInLibrary = Object.entries(rawLibrary.tv_in_library || {}).reduce((acc, [tmdbId, seasons]) => {
                acc[String(tmdbId)] = Object.entries(seasons || {}).reduce((seasonAcc, [seasonNum, episodes]) => {
                    seasonAcc[seasonNum] = (episodes || []).map(ep => Number(ep));
                    return seasonAcc;
                }, {});
                return acc;
            }, {});
        },
        consumeStatusLogs(status) {
            if (status.logs && status.logs.length > 0) {
                this.logs.push(...status.logs);
                this.logIndex = status.log_total || this.logs.length;
                this.$nextTick(() => {
                    const el = this.$refs.logPanel;
                    if (el) el.scrollTop = el.scrollHeight;
                });
            }
        },
        applyStatusState(status) {
            this.scanProgress = status.progress || '';
            this.steps = Array.isArray(status.steps) ? status.steps : [];
            this.summary = status.summary || null;
            this.scanning = !!status.running && ['scan', 'recognize', 'organize', 'library'].includes(status.phase);
            this.transferring = !!status.running && ['transfer', 'share_strm'].includes(status.phase);
            this.libraryChecking = !!status.running && status.phase === 'library';
        },
        shouldRefreshResult(status) {
            if (!status || !status.has_result || this.resultLoading) return false;
            // library / done 阶段允许持续刷新结果，保证识别完成后和 Emby 检测完成后页面都能立刻拿到结果。
            if (!this.result) return true;
            return status.phase === 'library' || status.phase === 'done';
        },
        async loadConfigs115() {
            try {
                const configs = await api.get115Configs();
                this.configs115 = (configs || []).filter(c => !c.has_open_token).map(c => ({ title: c.name, value: c.name }));
            } catch (e) { console.error(e); }
        },
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
            } catch (e) { console.error(e); }
        },

        // ========== 115 文件夹浏览 ==========
        async openCloudFolderBrowser() {
            if (!this.config.use_115_config) {
                window.showMessage && window.showMessage('请先选择 115 配置', 'warning');
                return;
            }
            this.cloudFolderDialog = true;
            this.cloudCurrentCid = '0';
            this.cloudFolderPath = [{ name: '根目录', cid: '0' }];
            await this.loadCloudFolders('0');
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
                    window.showMessage && window.showMessage(res.message || '加载失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载文件夹失败', 'error');
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
            const last = this.cloudFolderPath[this.cloudFolderPath.length - 1];
            const pathStr = '/' + this.cloudFolderPath.slice(1).map(p => p.name).join('/');
            this.config.transfer_folder = { cid: this.cloudCurrentCid, name: last.name, path: pathStr };
            this.cloudFolderDialog = false;
            window.showMessage && window.showMessage(`已选择: ${last.name}`, 'success');
        },
        removeTransferFolder() {
            this.config.transfer_folder = null;
        },
        async createCloudFolder() {
            const name = (this.createFolderName || '').trim();
            if (!name) { window.showMessage && window.showMessage('请输入文件夹名称', 'warning'); return; }
            this.createFolderLoading = true;
            try {
                const res = await api.request('/115/folders/create', {
                    method: 'POST',
                    body: JSON.stringify({ config_name: this.config.use_115_config, parent_cid: this.cloudCurrentCid, folder_name: name })
                });
                if (res.success) {
                    window.showMessage && window.showMessage('创建成功', 'success');
                    this.createFolderMode = false;
                    this.createFolderName = '';
                    await this.loadCloudFolders(this.cloudCurrentCid);
                } else {
                    window.showMessage && window.showMessage(res.message || '创建失败', 'error');
                }
            } catch (e) { window.showMessage && window.showMessage('创建失败', 'error'); }
            finally { this.createFolderLoading = false; }
        },

        // ========== 本地文件夹浏览 (STRM目录) ==========
        async openLocalFolderBrowser() {
            this.localFolderDialog = true;
            this.localCurrentPath = '';
            this.localParentPath = '';
            await this.loadLocalFolders('');
        },
        async loadLocalFolders(path) {
            this.localFolderLoading = true;
            try {
                const res = await api.request(`/local/folders?path=${encodeURIComponent(path || '')}`);
                if (res.success) {
                    this.localFolders = res.data.folders || [];
                    this.localCurrentPath = res.data.current_path || path;
                    this.localParentPath = res.data.parent_path || '';
                } else {
                    window.showMessage && window.showMessage(res.message || '加载失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载文件夹失败', 'error');
            } finally { this.localFolderLoading = false; }
        },
        enterLocalFolder(folder) {
            if (folder.no_access) return;
            this.loadLocalFolders(folder.path);
        },
        goBackLocal() {
            if (this.localParentPath !== undefined) {
                this.loadLocalFolders(this.localParentPath);
            }
        },
        selectLocalFolder() {
            this.config.strm_folder_path = this.localCurrentPath;
            this.localFolderDialog = false;
            window.showMessage && window.showMessage(`已选择: ${this.localCurrentPath}`, 'success');
        },

        // ========== 扫描与识别 ==========
        async startScan() {
            const urls = this.shareUrlInput.split('\n').map(s => s.trim()).filter(s => s);
            if (urls.length === 0) {
                window.showMessage && window.showMessage('请输入至少一个分享链接', 'warning');
                return;
            }
            this.scanning = true;
            this.scanError = null;
            this.result = null;
            this.transferResult = null;
            this.logs = [];
            this.logIndex = 0;
            this.scanProgress = '准备扫描分享链接...';
            // 任务启动后立即显示占位步骤，避免首轮轮询回来前页面没有任何扫描进度。
            this.steps = [
                { name: '扫描分享链接', status: 'running', current: 0, total: 0, message: '等待服务端返回扫描进度...' },
                { name: '识别媒体', status: 'pending', current: 0, total: 0, message: '' },
            ];
            if (this.config.emby_config_id) {
                this.steps.push({ name: 'Emby 入库检测', status: 'pending', current: 0, total: 0, message: '' });
            }
            this.summary = null;
            this.resultFilter = 'all';
            this.libraryChecking = false;
            this.applyLibraryState(null);
            try {
                const res = await api.request('/bulk_transfer/scan', {
                    method: 'POST',
                    body: JSON.stringify({ share_urls: urls })
                });
                if (res.success) {
                    window.showMessage && window.showMessage('扫描任务已启动', 'success');
                    this.startPolling();
                } else {
                    window.showMessage && window.showMessage(res.message || '启动失败', 'error');
                    this.scanning = false;
                }
            } catch (e) {
                window.showMessage && window.showMessage('启动失败', 'error');
                this.scanning = false;
            }
        },
        startPolling() {
            if (this.pollTimer) clearInterval(this.pollTimer);
            const tick = async () => {
                try {
                    const res = await api.request(`/bulk_transfer/status?log_since=${this.logIndex}`);
                    if (res.success) {
                        const st = res.data;
                        this.applyStatusState(st);
                        this.consumeStatusLogs(st);
                        if (this.shouldRefreshResult(st)) {
                            await this.loadResult();
                        }
                        if (!st.running) {
                            clearInterval(this.pollTimer);
                            this.pollTimer = null;
                            if (st.error) {
                                this.scanError = st.error;
                                window.showMessage && window.showMessage(`任务失败: ${st.error}`, 'error');
                            }
                            if (st.phase === 'done') {
                                if (this.shouldRefreshResult(st) || st.has_result) {
                                    await this.loadResult();
                                }
                                if (st.has_transfer_result) await this.loadTransferResult();
                                if (!st.error) {
                                    window.showMessage && window.showMessage('任务完成', 'success');
                                }
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            };
            tick();
            this.pollTimer = setInterval(tick, 1200);
        },
        async checkStatus() {
            try {
                const res = await api.request('/bulk_transfer/status?log_since=0');
                if (res.success) {
                    const st = res.data;
                    this.logs = st.logs || [];
                    this.logIndex = st.log_total || this.logs.length;
                    this.applyStatusState(st);
                    if (this.shouldRefreshResult(st) || st.has_result) {
                        await this.loadResult();
                    }
                    if (st.has_transfer_result) {
                        await this.loadTransferResult();
                    }
                    if (st.running) {
                        this.startPolling();
                    } else if (st.phase === 'done') {
                        this.scanError = st.error || null;
                    }
                }
            } catch (e) { /* ignore */ }
        },
        async loadResult() {
            this.resultLoading = true;
            try {
                const res = await api.request('/bulk_transfer/result');
                if (res.success && res.data) {
                    const prevMovieIds = new Set((this.selectedMovieIds || []).map(id => String(id)));
                    const prevTvIds = new Set((this.selectedTvIds || []).map(id => String(id)));
                    this.result = res.data;
                    const movieIds = new Set((this.result.movies || []).map(m => String(m.tmdb_id)));
                    const tvIds = new Set((this.result.tvshows || []).map(t => String(t.tmdb_id)));
                    this.selectedMovieIds = [...prevMovieIds].filter(id => movieIds.has(id));
                    this.selectedTvIds = [...prevTvIds].filter(id => tvIds.has(id));
                    this.applyLibraryState(this.result.library);
                } else {
                    const message = (res && res.message) ? res.message : '结果接口未返回有效数据';
                    console.error('[大包筛选] loadResult 返回失败:', message, res);
                    window.showMessage && window.showMessage(`加载识别结果失败: ${message}`, 'error');
                }
            } catch (e) {
                console.error('[大包筛选] loadResult 失败:', e);
                window.showMessage && window.showMessage('加载识别结果失败', 'error');
            }
            finally { this.resultLoading = false; }
        },
        async loadTransferResult() {
            try {
                const res = await api.request('/bulk_transfer/transfer_result');
                if (res.success && res.data) {
                    this.transferResult = res.data;
                }
            } catch (e) { /* ignore */ }
        },
        async clearAll() {
            try {
                await api.request('/bulk_transfer/clear', { method: 'POST' });
                this.result = null;
                this.transferResult = null;
                this.scanProgress = '';
                this.scanError = null;
                this.libraryChecking = false;
                this.selectedMovieIds = [];
                this.selectedTvIds = [];
                this.libraryChecked = false;
                this.movieInLibrary = [];
                this.tvInLibrary = {};
                this.logs = [];
                this.logIndex = 0;
                this.steps = [];
                this.summary = null;
                this.resultFilter = 'all';
                window.showMessage && window.showMessage('已清空', 'success');
            } catch (e) { window.showMessage && window.showMessage('清空失败', 'error'); }
        },

        // ========== 转存 ==========
        async startTransfer() {
            if (this.selectedMovieIds.length === 0 && this.selectedTvIds.length === 0) {
                window.showMessage && window.showMessage('请先选择要转存的媒体', 'warning');
                return;
            }
            this.transferring = true;
            this.transferResult = null;
            try {
                const res = await api.request('/bulk_transfer/transfer', {
                    method: 'POST',
                    body: JSON.stringify({
                        selected_items: {
                            movie_ids: this.selectedMovieIds,
                            tv_ids: this.selectedTvIds,
                        }
                    })
                });
                if (res.success) {
                    window.showMessage && window.showMessage('转存任务已启动', 'success');
                    this.startPolling();
                } else {
                    window.showMessage && window.showMessage(res.message || '启动失败', 'error');
                    this.transferring = false;
                }
            } catch (e) {
                window.showMessage && window.showMessage('启动失败', 'error');
                this.transferring = false;
            }
        },

        // ========== 选择 ==========
        toggleMovieSelect(tmdbId) {
            const idx = this.selectedMovieIds.indexOf(tmdbId);
            if (idx >= 0) this.selectedMovieIds.splice(idx, 1);
            else this.selectedMovieIds.push(tmdbId);
        },
        toggleTvSelect(tmdbId) {
            const idx = this.selectedTvIds.indexOf(tmdbId);
            if (idx >= 0) this.selectedTvIds.splice(idx, 1);
            else this.selectedTvIds.push(tmdbId);
        },
        isAllMoviesSelected() {
            const movies = this.result?.movies || [];
            return movies.length > 0 && movies.every(m => this.selectedMovieIds.includes(m.tmdb_id));
        },
        isAllTvSelected() {
            const tvshows = this.result?.tvshows || [];
            return tvshows.length > 0 && tvshows.every(t => this.selectedTvIds.includes(t.tmdb_id));
        },
        toggleAllMovies() {
            if (this.isAllMoviesSelected()) {
                this.selectedMovieIds = [];
            } else {
                this.selectedMovieIds = (this.result?.movies || []).map(m => m.tmdb_id);
            }
        },
        toggleAllTv() {
            if (this.isAllTvSelected()) {
                this.selectedTvIds = [];
            } else {
                this.selectedTvIds = (this.result?.tvshows || []).map(t => t.tmdb_id);
            }
        },
        selectAll() {
            this.selectedMovieIds = (this.result?.movies || []).map(m => m.tmdb_id);
            this.selectedTvIds = (this.result?.tvshows || []).map(t => t.tmdb_id);
        },
        deselectAll() {
            this.selectedMovieIds = [];
            this.selectedTvIds = [];
        },

        // ========== 入库检测 ==========
        async checkLibrary() {
            if (!this.config.emby_config_id) {
                window.showMessage && window.showMessage('请先在设置中配置 Emby 账号', 'warning');
                return;
            }
            if (!this.result) return;
            this.libraryChecking = true;
            this.applyLibraryState(null);
            if (this.result) {
                this.result = {
                    ...this.result,
                    library: {
                        ...(this.result.library || {}),
                        checked: false,
                        movie_in_library: [],
                        tv_in_library: {},
                    }
                };
            }
            try {
                const res = await api.request('/bulk_transfer/check_library', {
                    method: 'POST'
                });
                if (res.success) {
                    window.showMessage && window.showMessage(res.message || 'Emby 入库检测已启动', 'success');
                    this.startPolling();
                } else {
                    this.libraryChecking = false;
                    window.showMessage && window.showMessage(res.message || '入库检测启动失败', 'error');
                }
            } catch (e) {
                this.libraryChecking = false;
                window.showMessage && window.showMessage('入库检测失败', 'error');
            }
        },
        isMovieInLibrary(tmdbId) {
            return this.movieInLibrary.includes(String(tmdbId));
        },
        isTvFullyInLibrary(show) {
            const tmdbId = String(show.tmdb_id);
            const libSeasons = this.tvInLibrary[tmdbId];
            if (!libSeasons) return false;
            for (const season of (show.seasons_list || [])) {
                const libEps = libSeasons[season.season] || [];
                for (const ep of (season.episodes || [])) {
                    if (!libEps.includes(ep.episode)) return false;
                }
            }
            return true;
        },
        isTvEpisodeInLibrary(tmdbId, seasonNum, epNum) {
            const libSeasons = this.tvInLibrary[String(tmdbId)];
            if (!libSeasons) return false;
            return (libSeasons[seasonNum] || []).includes(epNum);
        },
        tvHasMissingEpisodes(show) {
            return !this.isTvFullyInLibrary(show);
        },
        selectNotInLibrary() {
            if (!this.libraryChecked) {
                window.showMessage && window.showMessage('请先检测入库状态', 'warning');
                return;
            }
            // 选择未入库的电影
            this.selectedMovieIds = (this.result?.movies || [])
                .filter(m => !this.isMovieInLibrary(m.tmdb_id))
                .map(m => m.tmdb_id);
            // 选择有缺集的电视剧
            this.selectedTvIds = (this.result?.tvshows || [])
                .filter(t => this.tvHasMissingEpisodes(t))
                .map(t => t.tmdb_id);
            const count = this.selectedMovieIds.length + this.selectedTvIds.length;
            window.showMessage && window.showMessage(`已选择 ${count} 个未入库项目`, 'success');
        },

        // ========== 工具函数 ==========
        formatSize(bytes) {
            if (!bytes || bytes <= 0) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let i = 0;
            let size = bytes;
            while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
            return size.toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
        },
        getPosterUrl(poster) {
            if (!poster) return '';
            if (poster.startsWith('http')) return poster;
            return 'https://image.tmdb.org/t/p/w300' + poster;
        },
        getModeLabel() {
            const m = this.config.mode;
            if (m === 'transfer') return '转存';
            if (m === 'share_strm') return this.config.reshare_enabled ? '转存再分享 STRM' : '分享 STRM';
            return m;
        },
        movieTotalSize(movie) {
            if (!movie.files) return 0;
            return movie.files.reduce((sum, f) => sum + (f.size || 0), 0);
        },
        showTotalSize(show) {
            let total = 0;
            for (const season of (show.seasons_list || [])) {
                for (const ep of (season.episodes || [])) {
                    for (const f of (ep.files || [])) {
                        total += f.size || 0;
                    }
                }
            }
            return total;
        },

        // ========== 分页方法（性能优化） ==========
        loadMoreMovies() {
            this.movieShowCount += this.moviePageSize;
        },
        loadMoreTvshows() {
            this.tvShowCount += this.tvPageSize;
        },
        loadMoreUnrecognized() {
            this.unrecognizedShowCount += this.unrecognizedPageSize;
        },
        resetPagination() {
            this.movieShowCount = this.moviePageSize;
            this.tvShowCount = this.tvPageSize;
            this.unrecognizedShowCount = this.unrecognizedPageSize;
        },

        // ========== 折叠方法（性能优化） ==========
        toggleMovieExpand(tmdbId) {
            this.expandedMovies = { ...this.expandedMovies, [tmdbId]: !this.expandedMovies[tmdbId] };
        },
        isMovieExpanded(tmdbId) {
            return !!this.expandedMovies[tmdbId];
        },
        toggleTvExpand(tmdbId) {
            this.expandedTvShows = { ...this.expandedTvShows, [tmdbId]: !this.expandedTvShows[tmdbId] };
        },
        isTvExpanded(tmdbId) {
            return !!this.expandedTvShows[tmdbId];
        },
        toggleSeasonExpand(tmdbId, season) {
            const key = `${tmdbId}-${season}`;
            this.expandedSeasons = { ...this.expandedSeasons, [key]: !this.expandedSeasons[key] };
        },
        isSeasonExpanded(tmdbId, season) {
            return !!this.expandedSeasons[`${tmdbId}-${season}`];
        },

        // ========== 手动识别（未识别项 TMDB 搜索） ==========
        openManualRecognize(item) {
            this.reRecognizeSource = null;
            this.manualRecognizeItem = item;
            // 从文件名中提取搜索关键词（去掉扩展名和常见后缀）
            let keyword = (item.name || '').replace(/\.[^.]+$/, '').replace(/[\[\](){}]/g, ' ').trim();
            this.manualTmdbKeyword = keyword.slice(0, 60);
            this.manualTmdbResults = [];
            this.manualRecognizeDialog = true;
        },
        openReRecognize(item, sourceType) {
            this.reRecognizeSource = { tmdb_id: item.tmdb_id, type: sourceType };
            this.manualRecognizeItem = { name: item.title + (item.year ? ' (' + item.year + ')' : ''), size: 0, fid: '' };
            this.manualTmdbKeyword = (item.title || '').slice(0, 60);
            this.manualTmdbResults = [];
            this.manualRecognizeDialog = true;
        },
        normalizeTmdbImage(path) {
            const imagePath = String(path || '').trim();
            if (!imagePath) return '';
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
            if (imagePath.startsWith('/')) return `https://image.tmdb.org/t/p/w342${imagePath}`;
            return imagePath;
        },
        normalizeTmdbResult(item) {
            const payload = item || {};
            // 后端返回 type，前端也可能是 media_type，兼容两种
            const mediaType = String(payload.media_type || payload.type || '').toLowerCase();
            if (!['movie', 'tv'].includes(mediaType)) return null;
            // 后端返回 year 或 release_date/first_air_date，兼容两种
            const dateValue = payload.year || String(payload.release_date || payload.first_air_date || '').slice(0, 4);
            return {
                // 后端返回 tmdb_id，原始 TMDB API 返回 id，兼容两种
                id: payload.tmdb_id || payload.id,
                title: payload.title || payload.name || '',
                original_title: payload.original_title || payload.original_name || '',
                year: dateValue,
                media_type: mediaType === 'tv' ? 'tv' : 'movie',
                poster_path: this.normalizeTmdbImage(payload.poster_path || ''),
                overview: payload.overview || '',
            };
        },
        async searchManualTmdb() {
            const query = String(this.manualTmdbKeyword || '').trim();
            if (!query) {
                window.showMessage && window.showMessage('请输入名称或 TMDB ID', 'warning');
                return;
            }
            this.manualTmdbLoading = true;
            console.log('[\u5927\u5305\u7b5b\u9009] TMDB \u641c\u7d22:', query);
            try {
                const response = await api.request(`/tmdb/search?query=${encodeURIComponent(query)}&type=multi&page=1`);
                console.log('[\u5927\u5305\u7b5b\u9009] TMDB \u641c\u7d22\u54cd\u5e94:', response);
                if (response && response.success) {
                    const raw = Array.isArray(response.data) ? response.data : [];
                    console.log('[\u5927\u5305\u7b5b\u9009] \u539f\u59cb\u7ed3\u679c\u6570:', raw.length, '\u7b2c\u4e00\u6761:', raw[0]);
                    this.manualTmdbResults = raw.map(item => this.normalizeTmdbResult(item)).filter(item => item && item.id && item.title);
                    console.log('[\u5927\u5305\u7b5b\u9009] \u6807\u51c6\u5316\u540e\u6570:', this.manualTmdbResults.length);
                    if (this.manualTmdbResults.length === 0) {
                        window.showMessage && window.showMessage('没有找到匹配结果', 'warning');
                    }
                } else {
                    console.error('[\u5927\u5305\u7b5b\u9009] TMDB \u641c\u7d22\u5931\u8d25:', response);
                    window.showMessage && window.showMessage((response && response.message) || '搜索失败', 'error');
                }
            } catch (error) {
                console.error('[\u5927\u5305\u7b5b\u9009] TMDB \u641c索异常:', error);
                window.showMessage && window.showMessage('搜索失败', 'error');
            } finally {
                this.manualTmdbLoading = false;
            }
        },
        selectManualTmdbItem(tmdbItem) {
            if (!this.manualRecognizeItem || !tmdbItem) return;
            if (tmdbItem.media_type === 'tv') {
                // 剧集：弹出季集选择
                this.manualSelectedTmdb = tmdbItem;
                this.manualSeason = 1;
                this.manualEpisode = 0;
                this.manualSeasonDialog = true;
            } else {
                // 电影：直接归类
                this.doManualRecognize(tmdbItem, null, null);
            }
        },
        confirmManualSeason() {
            if (!this.manualSelectedTmdb) return;
            this.manualSeasonDialog = false;
            this.doManualRecognize(this.manualSelectedTmdb, this.manualSeason, this.manualEpisode);
        },
        async doManualRecognize(tmdbItem, season, episode) {
            this.manualRecognizing = true;
            try {
                let url, body;
                if (this.reRecognizeSource) {
                    url = '/bulk_transfer/re_recognize';
                    body = {
                        source_tmdb_id: this.reRecognizeSource.tmdb_id,
                        source_type: this.reRecognizeSource.type,
                        tmdb_id: tmdbItem.id,
                        media_type: tmdbItem.media_type,
                        title: tmdbItem.title,
                        year: tmdbItem.year,
                        poster_path: tmdbItem.poster_path,
                    };
                } else {
                    url = '/bulk_transfer/manual_recognize';
                    body = {
                        fid: this.manualRecognizeItem.fid,
                        tmdb_id: tmdbItem.id,
                        media_type: tmdbItem.media_type,
                        title: tmdbItem.title,
                        year: tmdbItem.year,
                        poster_path: tmdbItem.poster_path,
                    };
                }
                if (season !== null && season !== undefined) body.season = season;
                if (episode !== null && episode !== undefined) body.episode = episode;
                const res = await api.request(url, {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                if (res.success) {
                    window.showMessage && window.showMessage(`已归类: ${tmdbItem.title} (${tmdbItem.year})`, 'success');
                    this.manualRecognizeDialog = false;
                    this.reRecognizeSource = null;
                    await this.loadResult();
                } else {
                    window.showMessage && window.showMessage(res.message || '归类失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('归类失败', 'error');
            } finally {
                this.manualRecognizing = false;
            }
        },
    },

    template: `
        <div>
            <!-- 顶部 Tab 栏 -->
            <v-card style="border-radius: 12px; margin-bottom: 16px; background: rgba(var(--v-theme-on-surface),0.04); border: 1px solid rgba(var(--v-theme-on-surface),0.1);" elevation="0">
                <v-tabs :model-value="activeTab" @update:model-value="switchTab" color="primary" bg-color="transparent" density="comfortable" grow>
                    <v-tab value="main">
                        <v-icon size="16" style="margin-right: 6px;">mdi-package-variant-closed</v-icon>
                        大包筛选
                    </v-tab>
                    <v-tab value="settings">
                        <v-icon size="16" style="margin-right: 6px;">mdi-cog-outline</v-icon>
                        设置
                    </v-tab>
                </v-tabs>
            </v-card>

            <!-- ====== 设置 Tab ====== -->
            <div v-show="activeTab === 'settings'">
                <div class="glass-card" style="padding: 20px; border-radius: 16px; position: relative;">
                    <!-- 右上角保存按钮 -->
                    <v-btn color="primary" variant="elevated" size="small" @click="saveConfig" :loading="configSaving"
                        style="position: absolute; top: 16px; right: 16px; border-radius: 10px; z-index: 1;">
                        <v-icon left size="16">mdi-content-save</v-icon>保存配置
                    </v-btn>

                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                        <v-icon color="primary" size="22">mdi-cog</v-icon>
                        <span style="font-size: 16px; font-weight: 500;">基础配置</span>
                    </div>

                    <!-- 115 账号 -->
                    <v-select v-model="config.use_115_config"
                        :items="[{title:'请选择',value:''},...configs115]"
                        item-title="title" item-value="value"
                        label="115 账号配置" variant="outlined" density="compact" class="mb-3"
                        hint="选择用于解析和转存的 115 账号" persistent-hint
                        prepend-inner-icon="mdi-cloud-outline"></v-select>

                    <!-- 解析模式 -->
                    <v-select v-model="config.parse_mode"
                        :items="parseModeOptions"
                        item-title="title" item-value="value"
                        label="解析模式" variant="outlined" density="compact" class="mb-3"
                        hint="葵花宝典最稳定但慢，大包模式适合大包，最快适合小包" persistent-hint></v-select>

                    <!-- 操作模式 -->
                    <v-select v-model="config.mode"
                        :items="modeOptions"
                        item-title="title" item-value="value"
                        label="操作模式" variant="outlined" density="compact" class="mb-3"
                        hint="转存模式直接转存到网盘，分享STRM模式生成STRM文件" persistent-hint></v-select>

                    <!-- 分享STRM子开关: 转存再分享 -->
                    <v-switch v-if="config.mode === 'share_strm'"
                        v-model="config.reshare_enabled"
                        label="转存再分享模式"
                        color="primary" density="compact" hide-details
                        style="margin-bottom: 12px;">
                    </v-switch>

                    <v-divider class="my-4"></v-divider>

                    <!-- 转存文件夹（仅转存模式） -->
                    <div v-if="config.mode === 'transfer'">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="font-size: 14px; font-weight: 500;">转存文件夹</div>
                            <v-btn color="success" variant="tonal" size="small" @click="openCloudFolderBrowser" :disabled="!config.use_115_config" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-folder-open</v-icon>浏览 115 文件夹
                            </v-btn>
                        </div>
                        <div v-if="config.transfer_folder"
                            style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <v-icon color="warning" size="20">mdi-folder</v-icon>
                                <div>
                                    <div style="font-size: 13px;">{{ config.transfer_folder.name || '根目录' }}</div>
                                    <div style="font-size: 11px; opacity: 0.4;">CID: {{ config.transfer_folder.cid }}</div>
                                </div>
                            </div>
                            <v-btn icon size="x-small" variant="text" color="error" @click="removeTransferFolder">
                                <v-icon size="16">mdi-delete</v-icon>
                            </v-btn>
                        </div>
                        <div v-else style="padding: 16px; text-align: center; color: rgba(var(--v-theme-on-surface),0.35); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 10px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1); margin-bottom: 12px;">
                            <v-icon size="28" color="grey">mdi-folder-plus-outline</v-icon>
                            <p style="margin-top: 6px; font-size: 12px;">点击上方按钮选择转存目标文件夹</p>
                        </div>
                    </div>

                    <!-- STRM 目录（分享STRM模式） -->
                    <div v-if="config.mode === 'share_strm'">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <div style="font-size: 14px; font-weight: 500;">STRM 生成目录</div>
                            <v-btn color="info" variant="tonal" size="small" @click="openLocalFolderBrowser" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-folder-open</v-icon>浏览本地目录
                            </v-btn>
                        </div>
                        <v-text-field v-model="config.strm_folder_path"
                            label="STRM 输出目录" variant="outlined" density="compact" class="mb-3"
                            hint="生成 STRM 文件的本地路径" persistent-hint
                            prepend-inner-icon="mdi-folder-outline"></v-text-field>
                    </div>

                    <v-divider class="my-4"></v-divider>

                    <!-- Emby 配置 -->
                    <div style="font-size: 14px; font-weight: 500; margin-bottom: 12px;">Emby 入库检测</div>
                    <v-select v-model="config.emby_config_id"
                        :items="embyConfigs"
                        item-title="title" item-value="value"
                        label="Emby 配置（必选）" variant="outlined" density="compact" class="mb-3"
                        hint="选择 Emby 配置用于检测入库状态，必须配置" persistent-hint
                        :rules="[v => !!v || '请选择 Emby 配置']"
                        prepend-inner-icon="mdi-server"></v-select>

                    <v-divider class="my-4"></v-divider>

                    <!-- 多版本保存 -->
                    <v-switch v-model="config.multi_version"
                        label="多版本全部保存"
                        color="primary" density="compact" hide-details
                        style="margin-bottom: 8px;">
                    </v-switch>
                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-bottom: 16px; padding-left: 4px;">
                        开启后同一部电影或同一集有多个文件时全部保存，关闭则随机选一个
                    </div>

                    <!-- 多线程识别 -->
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                        <v-switch v-model="config.recognize_threads_enabled"
                            @update:model-value="handleRecognizeThreadsToggle"
                            label="多线程识别"
                            color="primary" density="compact" hide-details
                            style="flex: 1 1 220px; min-width: 180px;">
                        </v-switch>
                        <v-text-field v-if="config.recognize_threads_enabled"
                            v-model.number="config.recognize_threads"
                            @update:model-value="handleRecognizeThreadsChange"
                            type="number" min="1" max="10" step="1"
                            variant="outlined" density="compact" hide-details
                            suffix="线程"
                            style="max-width: 96px; min-width: 96px; flex: 0 0 96px;"></v-text-field>
                    </div>
                    <v-switch v-model="config.show_recognize_logs"
                        @update:model-value="handleRecognizeLogsToggle"
                        label="识别日志是否显示"
                        color="primary" density="compact" hide-details
                        style="margin-bottom: 12px;">
                    </v-switch>
                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-bottom: 16px; padding-left: 4px;">
                        默认关闭，仅控制单个文件识别成功/失败日志是否在页面实时显示，系统日志仍会保留摘要和关键步骤
                    </div>

                    <!-- API 延迟 -->
                    <v-switch v-model="config.api_delay_enabled"
                        label="API 调用随机延迟"
                        color="primary" density="compact" hide-details
                        style="margin-bottom: 8px;">
                    </v-switch>
                    <div v-if="config.api_delay_enabled" style="display: flex; gap: 12px; margin-bottom: 12px;">
                        <v-text-field v-model.number="config.api_delay_min"
                            label="最小延迟(秒)" type="number" step="0.1" min="0"
                            variant="outlined" density="compact" hide-details style="flex: 1;"></v-text-field>
                        <v-text-field v-model.number="config.api_delay_max"
                            label="最大延迟(秒)" type="number" step="0.1" min="0"
                            variant="outlined" density="compact" hide-details style="flex: 1;"></v-text-field>
                    </div>
                </div>
            </div>

            <!-- ====== 主页 Tab ====== -->
            <div v-show="activeTab === 'main'">
                <!-- 输入区 -->
                <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon color="primary" size="22">mdi-link-variant</v-icon>
                        <span style="font-size: 16px; font-weight: 500;">分享链接</span>
                        <v-chip v-if="config.use_115_config" size="x-small" variant="tonal" color="success">
                            {{ config.use_115_config }}
                        </v-chip>
                        <v-chip size="x-small" variant="tonal" color="info">
                            {{ getModeLabel() }}
                        </v-chip>
                    </div>

                    <v-textarea v-model="shareUrlInput"
                        label="输入 115 分享链接（每行一个）"
                        variant="outlined" density="compact"
                        rows="4" auto-grow
                        :disabled="scanning || transferring"
                        placeholder="https://115cdn.com/s/xxxxx?password=xxxx&#10;https://115cdn.com/s/yyyyy?password=yyyy"
                        hide-details class="mb-3"></v-textarea>

                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <v-btn color="primary" variant="elevated" @click="startScan"
                            :loading="scanning" :disabled="scanning || transferring || !config.use_115_config"
                            style="border-radius: 10px;">
                            <v-icon left size="18">mdi-magnify-scan</v-icon>
                            {{ scanning ? '任务进行中...' : '开始扫描识别' }}
                        </v-btn>
                        <div v-if="showInlineScanProgress" style="display: flex; align-items: center; gap: 10px; min-width: 280px; flex: 1 1 320px; padding: 10px 12px; border-radius: 10px; background: rgba(var(--v-theme-primary),0.05); border: 1px solid rgba(var(--v-theme-primary),0.16);">
                            <v-icon v-if="activeStep && activeStep.status === 'done'" size="18" color="success">mdi-check-circle</v-icon>
                            <v-icon v-else-if="activeStep && activeStep.status === 'error'" size="18" color="error">mdi-alert-circle</v-icon>
                            <v-icon v-else size="18" color="primary" class="mdi-spin">mdi-loading</v-icon>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 12px; font-weight: 600; color: rgb(var(--v-theme-on-surface)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    {{ inlineScanProgressText || '等待任务开始...' }}
                                </div>
                                <v-progress-linear
                                    v-if="activeStep && activeStep.total > 0"
                                    :model-value="inlineScanProgressPercent"
                                    :color="activeStep && activeStep.status === 'done' ? 'success' : activeStep && activeStep.status === 'error' ? 'error' : 'primary'"
                                    height="6" rounded style="margin-top: 6px; border-radius: 6px;">
                                </v-progress-linear>
                                <v-progress-linear
                                    v-else
                                    :indeterminate="!!(scanning || transferring || libraryChecking)"
                                    :model-value="activeStep && activeStep.status === 'done' ? 100 : 0"
                                    :color="activeStep && activeStep.status === 'done' ? 'success' : activeStep && activeStep.status === 'error' ? 'error' : 'primary'"
                                    height="6" rounded style="margin-top: 6px; border-radius: 6px;">
                                </v-progress-linear>
                            </div>
                        </div>
                        <v-btn v-if="hasResult" color="success" variant="elevated" @click="startTransfer"
                            :loading="transferring" :disabled="scanning || transferring"
                            style="border-radius: 10px;">
                            <v-icon left size="18">mdi-send</v-icon>
                            {{ config.mode === 'transfer' ? '开始转存' : '生成 STRM' }}
                            ({{ selectedMovieIds.length + selectedTvIds.length }})
                        </v-btn>
                        <v-btn v-if="hasResult || scanError" variant="tonal" @click="clearAll"
                            :disabled="scanning || transferring"
                            style="border-radius: 10px;">
                            <v-icon left size="18">mdi-delete-outline</v-icon>清空
                        </v-btn>
                    </div>

                    <!-- 错误提示 -->
                    <div v-if="scanError" style="margin-top: 12px; padding: 10px 14px; background: rgba(255,76,81,0.1); border-radius: 8px; border: 1px solid rgba(255,76,81,0.3); font-size: 13px; color: #FF4C51;">
                        <v-icon size="16" color="error" style="margin-right: 4px;">mdi-alert-circle</v-icon>
                        {{ scanError }}
                    </div>

                    <!-- ====== 步骤进度面板 ====== -->
                    <div v-if="steps.length > 0 || scanProgress || summary || scanning || transferring || libraryChecking" style="margin-top: 14px; padding: 14px 16px; border-radius: 12px; background: rgba(var(--v-theme-on-surface),0.03); border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                            <v-icon size="16" color="primary">mdi-list-status</v-icon>
                            <span style="font-size: 13px; font-weight: 600;">任务进度</span>
                        </div>
                        <div v-if="scanProgress" style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.55); margin-bottom: 10px;">
                            {{ scanProgress }}
                        </div>
                        <div v-for="(step, si) in steps" :key="si" style="margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <v-icon v-if="step.status === 'done'" size="16" color="success">mdi-check-circle</v-icon>
                                <v-icon v-else-if="step.status === 'error'" size="16" color="error">mdi-alert-circle</v-icon>
                                <v-icon v-else-if="step.status === 'running'" size="16" color="primary" class="mdi-spin">mdi-loading</v-icon>
                                <v-icon v-else size="16" color="grey">mdi-circle-outline</v-icon>
                                <span style="font-size: 12px; font-weight: 500;" :style="{ color: step.status === 'done' ? '#56CA00' : step.status === 'error' ? '#FF4C51' : step.status === 'running' ? 'rgb(var(--v-theme-primary))' : 'rgba(var(--v-theme-on-surface),0.4)' }">
                                    {{ step.name }}
                                </span>
                                <span v-if="step.total > 0 && step.status !== 'pending'" style="font-size: 11px; font-weight: 600; color: rgba(var(--v-theme-on-surface),0.5); font-variant-numeric: tabular-nums; margin-left: auto;">
                                    {{ step.current }}/{{ step.total }}
                                </span>
                            </div>
                            <!-- 进度条: 有 total 时显示确定进度条, 否则显示不确定进度条 -->
                            <div v-if="step.status === 'running' || step.status === 'done'">
                                <v-progress-linear
                                    v-if="step.total > 0"
                                    :model-value="step.total > 0 ? (step.current / step.total * 100) : 0"
                                    :color="step.status === 'done' ? 'success' : 'primary'"
                                    height="6" rounded style="border-radius: 6px;">
                                </v-progress-linear>
                                <v-progress-linear
                                    v-else
                                    indeterminate
                                    color="primary"
                                    height="6" rounded style="border-radius: 6px;">
                                </v-progress-linear>
                            </div>
                            <div v-if="step.message && step.status !== 'pending'" style="font-size: 10px; color: rgba(var(--v-theme-on-surface),0.45); margin-top: 2px;">
                                {{ step.message }}
                            </div>
                        </div>
                        <!-- 汇总信息 -->
                        <div v-if="summary && !scanning" style="margin-top: 8px; padding: 10px 12px; background: rgba(86,202,0,0.06); border-radius: 8px; border: 1px solid rgba(86,202,0,0.15);">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <v-icon size="14" color="success">mdi-check-decagram</v-icon>
                                <span style="font-size: 12px; font-weight: 600; color: #56CA00;">{{ summary.library_checked ? '任务完成' : '扫描识别完成' }}</span>
                            </div>
                            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6);">
                                <span>总文件: <b>{{ summary.total_files }}</b></span>
                                <span>已识别: <b style="color: #56CA00;">{{ summary.recognized }}</b></span>
                                <span>电影: <b style="color: #3D6FD5;">{{ summary.movies }}</b></span>
                                <span>电视剧: <b style="color: #7C4DFF;">{{ summary.tvshows }}</b></span>
                                <span>未识别: <b style="color: #FF4C51;">{{ summary.unrecognized }}</b></span>
                            </div>
                            <div v-if="summary.library_checked" style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px;">
                                <span>Emby 检测: <b>{{ summary.library_completed_items }}/{{ summary.library_total_items }}</b></span>
                                <span>电影已入库: <b style="color: #56CA00;">{{ summary.movie_in_library }}</b></span>
                                <span>电影未入库: <b style="color: #FFB400;">{{ summary.movie_not_in_library }}</b></span>
                                <span>剧集完整入库: <b style="color: #56CA00;">{{ summary.tv_complete_in_library }}</b></span>
                                <span>剧集待补全: <b style="color: #FFB400;">{{ summary.tv_missing_or_not_in_library }}</b></span>
                            </div>
                        </div>
                    </div>

                    <!-- 实时日志面板（限量显示最近100条，性能优化） -->
                    <div v-if="logs.length > 0" style="margin-top: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">
                                <v-icon size="14" style="margin-right: 2px;">mdi-console</v-icon>
                                日志 ({{ logs.length }})
                                <span v-if="logs.length > 100" style="opacity: 0.6;"> · 仅显示最近100条</span>
                            </span>
                            <v-btn v-if="!scanning && !transferring" icon variant="text" size="x-small" @click="logs = []; logIndex = 0;">
                                <v-icon size="14">mdi-close</v-icon>
                            </v-btn>
                        </div>
                        <div ref="logPanel" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.15); border-radius: 8px; padding: 8px 10px; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.6;">
                            <div v-for="(log, idx) in visibleLogs" :key="idx"
                                :style="{ color: log.level === 'error' ? '#FF4C51' : log.level === 'warning' ? '#FFB400' : 'rgba(var(--v-theme-on-surface),0.7)' }">
                                <span style="color: rgba(var(--v-theme-on-surface),0.35); margin-right: 6px;">{{ log.time }}</span>{{ log.msg }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 统计信息 -->
                <div v-if="stats" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 120px; padding: 14px 16px; background: rgba(86,202,0,0.08); border-radius: 12px; border: 1px solid rgba(86,202,0,0.2); text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #56CA00;">{{ stats.recognized }}</div>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">已识别</div>
                    </div>
                    <div style="flex: 1; min-width: 120px; padding: 14px 16px; background: rgba(61,111,213,0.08); border-radius: 12px; border: 1px solid rgba(61,111,213,0.2); text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #3D6FD5;">{{ stats.movies }}</div>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">电影</div>
                    </div>
                    <div style="flex: 1; min-width: 120px; padding: 14px 16px; background: rgba(124,77,255,0.08); border-radius: 12px; border: 1px solid rgba(124,77,255,0.2); text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #7C4DFF;">{{ stats.tvshows }}</div>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">电视剧</div>
                    </div>
                    <div style="flex: 1; min-width: 120px; padding: 14px 16px; background: rgba(255,76,81,0.08); border-radius: 12px; border: 1px solid rgba(255,76,81,0.2); text-align: center;">
                        <div style="font-size: 24px; font-weight: 600; color: #FF4C51;">{{ stats.unrecognized }}</div>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">未识别</div>
                    </div>
                </div>

                <!-- 筛选 Tab + 搜索 + 多选工具栏 -->
                <div v-if="hasResult" class="glass-card" style="padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <v-btn-toggle v-model="resultFilter" mandatory density="compact" color="primary" variant="outlined" style="border-radius: 10px;">
                            <v-btn value="all" size="small" style="border-radius: 10px 0 0 10px;">全部</v-btn>
                            <v-btn value="movie" size="small">
                                电影 ({{ filteredMovies.length }})
                            </v-btn>
                            <v-btn value="tv" size="small">
                                电视剧 ({{ filteredTvshows.length }})
                            </v-btn>
                            <v-btn value="unrecognized" size="small" style="border-radius: 0 10px 10px 0;">
                                未识别 ({{ filteredUnrecognized.length }})
                            </v-btn>
                        </v-btn-toggle>
                        <!-- 搜索框 -->
                        <v-text-field
                            v-model="searchKeyword"
                            placeholder="搜索名称或 TMDB ID"
                            variant="outlined"
                            density="compact"
                            hide-details
                            clearable
                            prepend-inner-icon="mdi-magnify"
                            style="max-width: 220px; min-width: 140px; flex: 0 1 auto;"
                        ></v-text-field>
                        <v-spacer></v-spacer>
                        <v-chip v-if="selectedMovieIds.length + selectedTvIds.length > 0" color="primary" size="small" variant="tonal" style="border-radius: 8px;">
                            已选 {{ selectedMovieIds.length + selectedTvIds.length }}
                        </v-chip>
                        <v-btn color="primary" variant="tonal" size="small" @click="selectAll" style="border-radius: 8px; text-transform: none;">
                            <v-icon start size="16">mdi-checkbox-multiple-marked</v-icon>全选
                        </v-btn>
                        <v-btn color="warning" variant="tonal" size="small" @click="selectNotInLibrary" :disabled="!libraryChecked" style="border-radius: 8px; text-transform: none;">
                            <v-icon start size="16">mdi-playlist-check</v-icon>选择未入库
                        </v-btn>
                        <v-btn v-if="selectedMovieIds.length + selectedTvIds.length > 0" variant="outlined" size="small" @click="deselectAll" style="border-radius: 8px; text-transform: none;">
                            <v-icon start size="16">mdi-checkbox-blank-outline</v-icon>取消全选
                        </v-btn>
                        <v-btn color="teal" variant="tonal" size="small" @click="checkLibrary" :loading="libraryChecking" :disabled="!config.emby_config_id || scanning || transferring || libraryChecking" style="border-radius: 8px; text-transform: none;">
                            <v-icon start size="16">mdi-database-search</v-icon>{{ libraryChecked ? '重新检测' : '检测入库' }}
                        </v-btn>
                    </div>
                </div>

                <!-- 转存结果提示 -->
                <div v-if="transferResult" class="glass-card" style="padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(86,202,0,0.3); background: rgba(86,202,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <v-icon color="success" size="20">mdi-check-circle</v-icon>
                        <span style="font-size: 14px; font-weight: 500;">{{ transferResult.mode === 'transfer' ? '转存' : 'STRM 生成' }}完成</span>
                    </div>
                    <div style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.7);">
                        成功 <b style="color: #56CA00;">{{ transferResult.success }}</b> 个，
                        失败 <b style="color: #FF4C51;">{{ transferResult.fail }}</b> 个
                    </div>
                </div>

                <!-- ====== 电影列表（分页+折叠优化） ====== -->
                <div v-if="(resultFilter === 'all' || resultFilter === 'movie') && filteredMovies.length > 0">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon color="blue" size="20">mdi-movie-open</v-icon>
                            <span style="font-size: 15px; font-weight: 500;">电影</span>
                            <v-chip size="x-small" variant="tonal" color="blue">{{ filteredMovies.length }}</v-chip>
                        </div>
                        <v-btn size="small" variant="tonal" :color="isAllMoviesSelected() ? 'primary' : 'default'" @click="toggleAllMovies" style="border-radius: 8px;">
                            <v-icon left size="16">{{ isAllMoviesSelected() ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
                            全选电影
                        </v-btn>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 12px;">
                        <div v-for="movie in pagedMovies" :key="movie.tmdb_id"
                            @click="toggleMovieSelect(movie.tmdb_id)"
                            :style="{
                                padding: '12px', borderRadius: '12px', cursor: 'pointer',
                                background: selectedMovieIds.includes(movie.tmdb_id) ? 'rgba(var(--v-theme-primary),0.08)' : 'rgba(var(--v-theme-on-surface),0.03)',
                                border: selectedMovieIds.includes(movie.tmdb_id) ? '1px solid rgba(var(--v-theme-primary),0.3)' : '1px solid rgba(var(--v-theme-on-surface),0.08)',
                                transition: 'all 0.15s ease',
                            }">
                            <div style="display: flex; gap: 12px;">
                                <!-- 海报（懒加载） -->
                                <div style="flex-shrink: 0; width: 60px; height: 90px; border-radius: 8px; overflow: hidden; background: rgba(var(--v-theme-on-surface),0.08); position: relative;">
                                    <img v-if="movie.poster" :src="getPosterUrl(movie.poster)" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;"
                                        @error="$event.target.style.display='none'">
                                    <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                        <v-icon size="24" color="grey">mdi-movie</v-icon>
                                    </div>
                                    <span v-if="libraryChecked && isMovieInLibrary(movie.tmdb_id)" class="emby-library-badge has" style="position: absolute; top: 2px; right: 2px; font-size: 9px; padding: 0 4px;"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                                    <span v-if="libraryChecked && !isMovieInLibrary(movie.tmdb_id)" class="emby-library-badge not-has" style="position: absolute; top: 2px; right: 2px; font-size: 9px; padding: 0 4px;"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                                </div>
                                <!-- 信息 -->
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                                        <v-checkbox-btn :model-value="selectedMovieIds.includes(movie.tmdb_id)" @click.stop="toggleMovieSelect(movie.tmdb_id)" density="compact" color="primary" style="flex: 0 0 auto;"></v-checkbox-btn>
                                        <span style="font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">{{ movie.title }}</span>
                                        <v-btn icon variant="text" size="x-small" @click.stop="openReRecognize(movie, 'movie')" title="重新识别" style="flex: 0 0 auto; opacity: 0.5;" class="re-recognize-btn"><v-icon size="16">mdi-magnify</v-icon></v-btn>
                                    </div>
                                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 3px;">
                                        {{ movie.year }} · TMDB: {{ movie.tmdb_id }}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-bottom: 3px; flex-wrap: wrap;">
                                        <span><v-icon size="12">mdi-file-video</v-icon> {{ movie.file_count }} 个文件</span>
                                        <span v-if="movie.file_count > 1"><v-icon size="12">mdi-content-copy</v-icon> {{ movie.file_count }} 版本</span>
                                        <span><v-icon size="12">mdi-harddisk</v-icon> {{ formatSize(movieTotalSize(movie)) }}</span>
                                    </div>
                                    <div style="font-size: 10px; color: rgba(var(--v-theme-on-surface),0.35); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        <v-icon size="11">mdi-folder</v-icon> {{ movie.target_path }}
                                    </div>
                                </div>
                            </div>
                            <!-- 文件列表（折叠，点击展开，性能优化） -->
                            <div v-if="movie.files && movie.files.length > 0" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.06);">
                                <div @click.stop="toggleMovieExpand(movie.tmdb_id)" style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.45);">
                                    <v-icon size="14">{{ isMovieExpanded(movie.tmdb_id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                                    {{ movie.files.length }} 个文件
                                </div>
                                <div v-if="isMovieExpanded(movie.tmdb_id)" style="margin-top: 4px;">
                                    <div v-for="(f, fi) in movie.files" :key="fi" style="display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 11px;">
                                        <v-icon size="12" color="grey">mdi-file-video-outline</v-icon>
                                        <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(var(--v-theme-on-surface),0.6);">{{ f.name }}</span>
                                        <span style="flex-shrink: 0; color: rgba(var(--v-theme-on-surface),0.4); font-variant-numeric: tabular-nums;">{{ formatSize(f.size) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- 加载更多（分页性能优化） -->
                    <div v-if="hasMoreMovies" style="text-align: center; margin-bottom: 20px;">
                        <v-btn variant="tonal" size="small" @click="loadMoreMovies" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-arrow-down</v-icon>
                            加载更多电影 ({{ pagedMovies.length }}/{{ filteredMovies.length }})
                        </v-btn>
                    </div>
                </div>

                <!-- ====== 电视剧列表（分页+折叠优化） ====== -->
                <div v-if="(resultFilter === 'all' || resultFilter === 'tv') && filteredTvshows.length > 0">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon color="purple" size="20">mdi-television-classic</v-icon>
                            <span style="font-size: 15px; font-weight: 500;">电视剧</span>
                            <v-chip size="x-small" variant="tonal" color="purple">{{ filteredTvshows.length }}</v-chip>
                        </div>
                        <v-btn size="small" variant="tonal" :color="isAllTvSelected() ? 'primary' : 'default'" @click="toggleAllTv" style="border-radius: 8px;">
                            <v-icon left size="16">{{ isAllTvSelected() ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
                            全选电视剧
                        </v-btn>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                        <div v-for="show in pagedTvshows" :key="show.tmdb_id"
                            :style="{
                                padding: '12px', borderRadius: '12px',
                                background: selectedTvIds.includes(show.tmdb_id) ? 'rgba(var(--v-theme-primary),0.06)' : 'rgba(var(--v-theme-on-surface),0.03)',
                                border: selectedTvIds.includes(show.tmdb_id) ? '1px solid rgba(var(--v-theme-primary),0.25)' : '1px solid rgba(var(--v-theme-on-surface),0.08)',
                                transition: 'all 0.15s ease',
                            }">
                            <!-- 顶部: 海报 + 基本信息 -->
                            <div @click="toggleTvSelect(show.tmdb_id)" style="display: flex; gap: 12px; cursor: pointer;">
                                <div style="flex-shrink: 0; width: 60px; height: 90px; border-radius: 8px; overflow: hidden; background: rgba(var(--v-theme-on-surface),0.08); position: relative;">
                                    <img v-if="show.poster" :src="getPosterUrl(show.poster)" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;"
                                        @error="$event.target.style.display='none'">
                                    <div v-else style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                        <v-icon size="24" color="grey">mdi-television</v-icon>
                                    </div>
                                    <span v-if="libraryChecked && isTvFullyInLibrary(show)" class="emby-library-badge has" style="position: absolute; top: 2px; right: 2px; font-size: 9px; padding: 0 4px;"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                                    <span v-if="libraryChecked && !isTvFullyInLibrary(show)" class="emby-library-badge not-has" style="position: absolute; top: 2px; right: 2px; font-size: 9px; padding: 0 4px;"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                                        <v-checkbox-btn :model-value="selectedTvIds.includes(show.tmdb_id)" @click.stop="toggleTvSelect(show.tmdb_id)" density="compact" color="primary" style="flex: 0 0 auto;"></v-checkbox-btn>
                                        <span style="font-size: 13px; font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ show.title }}</span>
                                        <v-btn icon variant="text" size="x-small" @click.stop="openReRecognize(show, 'tv')" title="重新识别" style="flex: 0 0 auto; opacity: 0.5;" class="re-recognize-btn"><v-icon size="16">mdi-magnify</v-icon></v-btn>
                                    </div>
                                    <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 3px;">
                                        {{ show.year }} · TMDB: {{ show.tmdb_id }}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); flex-wrap: wrap;">
                                        <span><v-icon size="12">mdi-file-video</v-icon> {{ show.total_files }} 个文件</span>
                                        <span><v-icon size="12">mdi-calendar-blank</v-icon> {{ show.seasons_list.length }} 季</span>
                                        <span><v-icon size="12">mdi-harddisk</v-icon> {{ formatSize(showTotalSize(show)) }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 季集详情（折叠，点击展开，性能优化） -->
                            <div style="margin-top: 8px;">
                                <div @click.stop="toggleTvExpand(show.tmdb_id)" style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 11px; color: rgba(var(--v-theme-on-surface),0.45); padding: 4px 0;">
                                    <v-icon size="14">{{ isTvExpanded(show.tmdb_id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                                    {{ show.seasons_list.length }} 季 · {{ show.total_files }} 集文件
                                </div>
                                <div v-if="isTvExpanded(show.tmdb_id)">
                                    <div v-for="season in show.seasons_list" :key="season.season"
                                        style="margin-bottom: 6px; border-radius: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.06); overflow: hidden;">
                                        <!-- 季标题行（可折叠） -->
                                        <div @click.stop="toggleSeasonExpand(show.tmdb_id, season.season)" style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(var(--v-theme-on-surface),0.03); cursor: pointer;">
                                            <v-icon size="14">{{ isSeasonExpanded(show.tmdb_id, season.season) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                                            <v-chip size="x-small" color="purple" variant="flat">S{{ String(season.season).padStart(2, '0') }}</v-chip>
                                            <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6); font-weight: 500;">{{ season.episode_count }} 集</span>
                                            <span style="font-size: 10px; color: rgba(var(--v-theme-on-surface),0.35); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">{{ season.target_path }}</span>
                                        </div>
                                        <!-- 集列表（折叠） -->
                                        <div v-if="isSeasonExpanded(show.tmdb_id, season.season)" style="padding: 4px 10px;">
                                            <div v-for="ep in season.episodes" :key="ep.episode" style="margin-bottom: 3px;">
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <v-chip size="x-small" variant="tonal"
                                                        :color="libraryChecked && isTvEpisodeInLibrary(show.tmdb_id, season.season, ep.episode) ? 'success' : (ep.file_count > 1 ? 'warning' : 'default')"
                                                        style="font-size: 10px; flex-shrink: 0;">
                                                        E{{ String(ep.episode).padStart(2, '0') }}
                                                        <span v-if="ep.file_count > 1" style="margin-left: 2px; opacity: 0.7;">x{{ ep.file_count }}</span>
                                                        <v-icon v-if="libraryChecked && isTvEpisodeInLibrary(show.tmdb_id, season.season, ep.episode)" size="10" style="margin-left: 2px;">mdi-check</v-icon>
                                                    </v-chip>
                                                    <!-- 单文件直接显示名称 -->
                                                    <span v-if="ep.files && ep.files.length === 1" style="flex: 1; min-width: 0; font-size: 10px; color: rgba(var(--v-theme-on-surface),0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                        {{ ep.files[0].name }}
                                                    </span>
                                                    <span v-if="ep.files && ep.files.length === 1" style="flex-shrink: 0; font-size: 10px; color: rgba(var(--v-theme-on-surface),0.4); font-variant-numeric: tabular-nums;">
                                                        {{ formatSize(ep.files[0].size) }}
                                                    </span>
                                                </div>
                                                <!-- 多文件展示 -->
                                                <div v-if="ep.files && ep.files.length > 1" style="margin-left: 20px; margin-top: 2px;">
                                                    <div v-for="(f, fi) in ep.files" :key="fi" style="display: flex; align-items: center; gap: 4px; padding: 1px 0; font-size: 10px;">
                                                        <v-icon size="10" color="grey">mdi-file-video-outline</v-icon>
                                                        <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(var(--v-theme-on-surface),0.5);">{{ f.name }}</span>
                                                        <span style="flex-shrink: 0; color: rgba(var(--v-theme-on-surface),0.4); font-variant-numeric: tabular-nums;">{{ formatSize(f.size) }}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- 加载更多（分页性能优化） -->
                    <div v-if="hasMoreTvshows" style="text-align: center; margin-bottom: 20px;">
                        <v-btn variant="tonal" size="small" @click="loadMoreTvshows" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-arrow-down</v-icon>
                            加载更多电视剧 ({{ pagedTvshows.length }}/{{ filteredTvshows.length }})
                        </v-btn>
                    </div>
                </div>

                <!-- ====== 未识别列表（点击手动识别+分页优化） ====== -->
                <div v-if="(resultFilter === 'all' || resultFilter === 'unrecognized') && filteredUnrecognized.length > 0">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon color="error" size="20">mdi-help-circle</v-icon>
                        <span style="font-size: 15px; font-weight: 500;">未识别</span>
                        <v-chip size="x-small" variant="tonal" color="error">{{ filteredUnrecognized.length }}</v-chip>
                        <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">点击可手动识别</span>
                    </div>
                    <div class="glass-card" style="padding: 10px; border-radius: 12px;">
                        <div v-for="(item, idx) in pagedUnrecognized" :key="item.fid || idx"
                            @click="openManualRecognize(item)"
                            style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; margin-bottom: 4px; background: rgba(var(--v-theme-on-surface),0.03); cursor: pointer; transition: background 0.15s;"
                            onmouseover="this.style.background='rgba(var(--v-theme-primary),0.06)'" onmouseout="this.style.background='rgba(var(--v-theme-on-surface),0.03)'">
                            <v-icon size="16" color="grey">mdi-file-video-outline</v-icon>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.name }}</div>
                                <div style="font-size: 10px; color: rgba(var(--v-theme-on-surface),0.35);">
                                    {{ formatSize(item.size) }} · FID: {{ item.fid }}
                                </div>
                            </div>
                            <v-icon size="16" color="primary" style="flex-shrink: 0;">mdi-magnify</v-icon>
                        </div>
                    </div>
                    <!-- 加载更多（分页性能优化） -->
                    <div v-if="hasMoreUnrecognized" style="text-align: center; margin-top: 12px; margin-bottom: 20px;">
                        <v-btn variant="tonal" size="small" @click="loadMoreUnrecognized" style="border-radius: 8px;">
                            <v-icon left size="16">mdi-arrow-down</v-icon>
                            加载更多未识别 ({{ pagedUnrecognized.length }}/{{ filteredUnrecognized.length }})
                        </v-btn>
                    </div>
                </div>

                <!-- 空状态 -->
                <div v-if="!hasResult && !scanning && !scanError && !resultLoading" class="glass-card" style="padding: 40px 20px; border-radius: 16px; text-align: center;">
                    <v-icon size="56" color="grey-darken-1">mdi-package-variant</v-icon>
                    <p style="margin-top: 12px; font-size: 14px; color: rgba(var(--v-theme-on-surface),0.5);">输入分享链接并点击「开始扫描识别」</p>
                    <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.35);">支持多个链接，每行一个</p>
                </div>
            </div>

            <!-- ====== 115 文件夹浏览弹窗 ====== -->
            <v-dialog v-model="cloudFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-folder-open</v-icon>
                                <span>选择 115 转存文件夹</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="cloudFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
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
                    <div v-if="createFolderMode" style="padding: 12px 16px; background: rgba(76,175,80,0.08); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-text-field v-model="createFolderName" label="新文件夹名称" variant="outlined" density="compact" hide-details autofocus @keyup.enter="createCloudFolder" style="flex: 1;"></v-text-field>
                            <v-btn color="success" variant="elevated" size="small" @click="createCloudFolder" :loading="createFolderLoading" style="border-radius: 8px;"><v-icon size="18">mdi-check</v-icon></v-btn>
                            <v-btn variant="text" size="small" @click="createFolderMode = false" style="border-radius: 8px;"><v-icon size="18">mdi-close</v-icon></v-btn>
                        </div>
                    </div>
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackCloud" :disabled="cloudFolderPath.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-btn variant="tonal" color="success" @click="createFolderMode = !createFolderMode" style="border-radius: 8px; margin-left: 8px;">
                            <v-icon left size="18">mdi-folder-plus</v-icon>新建
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCloudFolder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- ====== 本地文件夹浏览弹窗 ====== -->
            <v-dialog v-model="localFolderDialog" max-width="550" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 16px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="info">mdi-folder-open</v-icon>
                                <span>选择 STRM 生成目录</span>
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
                                    <v-icon :color="folder.is_drive ? 'info' : 'warning'" size="22">{{ folder.is_drive ? 'mdi-harddisk' : 'mdi-folder' }}</v-icon>
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
                        <v-btn variant="tonal" @click="goBackLocal" :disabled="!localParentPath && localParentPath !== ''" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectLocalFolder" :disabled="!localCurrentPath" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <!-- ====== 手动识别 TMDB 搜索弹窗 ====== -->
            <v-dialog v-model="manualRecognizeDialog" max-width="600" scrollable>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 14px 20px; background: rgba(61,111,213,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="primary">mdi-movie-search</v-icon>
                                <span>手动识别 · TMDB 搜索</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="manualRecognizeDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <!-- 当前文件信息 -->
                    <div v-if="manualRecognizeItem" style="padding: 10px 20px; background: rgba(var(--v-theme-on-surface),0.03); border-bottom: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <v-icon size="14" style="margin-right: 4px;">mdi-file-video-outline</v-icon>{{ manualRecognizeItem.name }}
                        </div>
                        <div style="font-size: 10px; color: rgba(var(--v-theme-on-surface),0.35); margin-top: 2px;">
                            {{ formatSize(manualRecognizeItem.size) }} · FID: {{ manualRecognizeItem.fid }}
                        </div>
                    </div>
                    <v-card-text style="padding: 16px;">
                        <!-- 搜索栏 -->
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
                            <v-text-field
                                v-model="manualTmdbKeyword"
                                label="名称或 TMDB ID"
                                variant="outlined"
                                density="compact"
                                hide-details
                                clearable
                                style="flex: 1;"
                                @keyup.enter="searchManualTmdb"
                            ></v-text-field>
                            <v-btn color="primary" variant="tonal" :loading="manualTmdbLoading" @click="searchManualTmdb" style="border-radius: 8px;">
                                <v-icon left size="18">mdi-magnify</v-icon>
                                搜索
                            </v-btn>
                        </div>
                        <!-- 搜索中 -->
                        <div v-if="manualTmdbLoading" style="display: flex; justify-content: center; padding: 32px 0;">
                            <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
                        </div>
                        <!-- 无结果 -->
                        <div v-else-if="manualTmdbResults.length === 0" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.45); padding: 24px 0; text-align: center;">
                            输入名称或 TMDB ID 搜索，选择后归类到对应的电影或剧集
                        </div>
                        <!-- 搜索结果列表 -->
                        <div v-else style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                            <div
                                v-for="item in manualTmdbResults"
                                :key="item.id + '_' + item.media_type"
                                :style="{
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(var(--v-theme-on-surface),0.08)',
                                    background: 'rgba(var(--v-theme-on-surface),0.02)',
                                    cursor: manualRecognizing ? 'wait' : 'pointer',
                                    transition: 'all 0.15s ease',
                                    opacity: manualRecognizing ? 0.5 : 1,
                                }"
                                @click="selectManualTmdbItem(item)"
                            >
                                <!-- 海报 -->
                                <div style="width: 54px; min-width: 54px; height: 80px; border-radius: 8px; overflow: hidden; background: rgba(var(--v-theme-on-surface),0.06); display: flex; align-items: center; justify-content: center;">
                                    <img v-if="item.poster_path" :src="item.poster_path" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
                                    <v-icon v-else size="24" color="grey">mdi-filmstrip</v-icon>
                                </div>
                                <!-- 信息 -->
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                                        <div style="font-size: 14px; font-weight: 600; color: rgb(var(--v-theme-on-surface)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            {{ item.title }} <span v-if="item.year" style="color: rgba(var(--v-theme-on-surface),0.55);">({{ item.year }})</span>
                                        </div>
                                        <v-chip size="x-small" :color="item.media_type === 'tv' ? 'purple' : 'blue'" variant="tonal" style="flex-shrink: 0;">{{ item.media_type === 'tv' ? '电视剧' : '电影' }}</v-chip>
                                    </div>
                                    <div v-if="item.original_title && item.original_title !== item.title" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.original_title }}</div>
                                    <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.45); margin-bottom: 4px;">TMDB ID: {{ item.id }}</div>
                                    <div v-if="item.overview" style="font-size: 11px; line-height: 1.5; color: rgba(var(--v-theme-on-surface),0.55); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                        {{ item.overview }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>

            <!-- ====== 剧集季集选择弹窗 ====== -->
            <v-dialog v-model="manualSeasonDialog" max-width="400">
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px; overflow: hidden;">
                    <v-card-title style="padding: 14px 20px; background: rgba(124,77,255,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon color="purple">mdi-television-classic</v-icon>
                                <span>选择季集</span>
                            </div>
                            <v-btn icon variant="text" size="small" @click="manualSeasonDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                        </div>
                    </v-card-title>
                    <v-card-text style="padding: 20px;">
                        <!-- 剧集信息 -->
                        <div v-if="manualSelectedTmdb" style="display: flex; gap: 12px; margin-bottom: 20px; padding: 12px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px;">
                            <div style="width: 48px; min-width: 48px; height: 72px; border-radius: 8px; overflow: hidden; background: rgba(var(--v-theme-on-surface),0.06);">
                                <img v-if="manualSelectedTmdb.poster_path" :src="manualSelectedTmdb.poster_path" style="width: 100%; height: 100%; object-fit: cover;" />
                                <v-icon v-else size="24" color="grey" style="margin: 24px 12px;">mdi-television</v-icon>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 14px; font-weight: 600;">{{ manualSelectedTmdb.title }}</div>
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">{{ manualSelectedTmdb.year }} · TMDB: {{ manualSelectedTmdb.id }}</div>
                            </div>
                        </div>
                        <!-- 当前文件 -->
                        <div v-if="manualRecognizeItem" style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 16px; padding: 8px; background: rgba(var(--v-theme-on-surface),0.02); border-radius: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <v-icon size="12">mdi-file-video-outline</v-icon> {{ manualRecognizeItem.name }}
                        </div>
                        <!-- 季集输入 -->
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <v-text-field
                                v-model.number="manualSeason"
                                label="季 (Season)"
                                type="number"
                                variant="outlined"
                                density="compact"
                                hide-details
                                :min="0"
                                style="flex: 1;"
                            ></v-text-field>
                            <v-text-field
                                v-model.number="manualEpisode"
                                label="集 (Episode)"
                                type="number"
                                variant="outlined"
                                density="compact"
                                hide-details
                                :min="0"
                                style="flex: 1;"
                            ></v-text-field>
                        </div>
                        <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">
                            集号填 0 表示不指定具体集数
                        </div>
                    </v-card-text>
                    <v-card-actions style="padding: 12px 20px 20px; justify-content: flex-end; gap: 8px;">
                        <v-btn variant="tonal" @click="manualSeasonDialog = false" style="border-radius: 8px;">取消</v-btn>
                        <v-btn color="primary" variant="elevated" :loading="manualRecognizing" @click="confirmManualSeason" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>确认归类
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
