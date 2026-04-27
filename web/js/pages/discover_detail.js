const DiscoverDetailPage = {
    name: 'DiscoverDetailPage',
    data() {
        return {
            loading: true,
            detailData: null,
            mediaType: '',
            tmdbId: 0,
            doubanId: 0,
            source: 'tmdb',
            // 季/集
            detailSeasons: [],
            seasonEpisodesInfo: {},
            expandedSeason: null,
            seasonEpisodesLoading: {},
            // Emby
            libraryCheckEnabled: false,
            embySeasonEpisodes: {},
            episodeCheckLoading: false,
            mediaVersions: null,
            mediaVersionsLoading: false,
            // 订阅
            subscribedSet: {},
            isSubscribed: false,
            // 全局设置
            globalSettings: {
                emby_library_config: '',
                tmdb_library_check: false,
                douban_tmdb_fallback: false,
            },
            // 推荐 & 类似
            recommendations: [],
            similarMedia: [],
            recommendLoading: false,
            similarLoading: false,
            // 入库状态批量检测
            libraryStatus: {},
            // ===== 频道搜索弹窗 =====
            tgSearchDialogVisible: false,
            tgSearchDialogLoading: false,
            tgSearchDialogResults: [],
            tgSearchDialogKeyword: '',
            tgChannels: [],
            savedLinks: {},
            savingLinks: {},
            strmSavingLinks: {},
            strmSavedLinks: {},
            // ===== HDHive 弹窗 =====
            hdhiveDetailDialog: false,
            hdhiveDetailItem: null,
            hdhiveResources: [],
            hdhiveResourcesLoading: false,
            hdhiveSelectedAccount: '',
            savingResources: {},
            savedResources: {},
            strmSavingResources: {},
            strmSavedResources: {},
            // ===== 订阅弹窗 =====
            subscribeDialog: false,
            subscribeForm: {
                name: '', year: '', type: 'movie', tmdb_id: 0,
                poster_path: '', backdrop_path: '', overview: '',
                total_season: 0, total_episode: 0, current_season: 1, start_episode: 1,
                resolution: '', effect: '', resource_type: '', release_group: '',
                frame_rate: '',
                search_source: 'tg_hdhive',
                mode: 'share_strm',
                reshare_enabled: false,
                transfer_all_matches: false,
                run_immediately: false
            },
            subscribeSaving: false,
            subscribeTransferFolderCid: '',
            subscribeTransferFolders: [],
            subscribeShareStrmFolders: [],
            subscribePresets: [],
            selectedPresetIds: [],
            options: { resolutions: [], effects: [], resource_types: [], release_groups: [] },
            // ===== 共用配置 =====
            tgSearchConfig: {},
            shareStrmConfig: {},
            // 文件夹选择弹窗
            folderPickerDialog: false,
            folderPickerCallback: null,
            pickerFolderList: [],
            strmFolderPickerDialog: false,
            strmFolderPickerCallback: null,
            strmPickerFolderList: [],
        }
    },
    computed: {
        filteredSeasons() {
            return (this.detailSeasons || []).filter(s => s.season_number !== 0);
        },
        embyItemId() {
            return (this.mediaVersions && this.mediaVersions.emby_item_id) || '';
        },
        embyServer() {
            return (this.mediaVersions && this.mediaVersions.emby_server) || '';
        },
        embyServerId() {
            return (this.mediaVersions && this.mediaVersions.emby_server_id) || '';
        },
        embyWebUrl() {
            if (!this.embyServer || !this.embyItemId) return '';
            const base = this.embyServer.replace(/\/+$/, '');
            return `${base}/web/index.html#!/item?id=${this.embyItemId}&serverId=${this.embyServerId}`;
        },
    },
    watch: {
        'subscribeForm.current_season'(val) {
            if (this.subscribeForm.type === 'tv' && val > 0) {
                this.subscribeForm.total_episode = this.getSeasonEpisodeCount(val);
                this.subscribeForm.start_episode = 1;
                this.fetchEmbyStartEpisode(this.subscribeForm.tmdb_id, val);
            }
        },
        selectedPresetIds: {
            handler(val) {
                if (!val || val.length === 0) {
                    this.subscribeForm.mode = 'share_strm';
                    this.subscribeForm.resolution = '';
                    this.subscribeForm.effect = '';
                    this.subscribeForm.resource_type = '';
                    this.subscribeForm.release_group = '';
                    this.subscribeForm.frame_rate = '';
                    this.subscribeForm.search_source = 'tg_hdhive';
                    this.subscribeForm.reshare_enabled = false;
                    this.subscribeForm.transfer_all_matches = false;
                    this.subscribeForm.run_immediately = false;
                    this.subscribeTransferFolderCid = '';
                    this.subscribeForm.strm_folder_path = '';
                    return;
                }
                const firstPreset = this.subscribePresets.find(p => p.id === val[0]);
                if (!firstPreset) return;
                if (firstPreset.mode) this.subscribeForm.mode = firstPreset.mode;
                if (firstPreset.resolution !== undefined) this.subscribeForm.resolution = firstPreset.resolution;
                if (firstPreset.effect !== undefined) this.subscribeForm.effect = firstPreset.effect;
                if (firstPreset.resource_type !== undefined) this.subscribeForm.resource_type = firstPreset.resource_type;
                if (firstPreset.release_group !== undefined) this.subscribeForm.release_group = firstPreset.release_group;
                if (firstPreset.frame_rate !== undefined) this.subscribeForm.frame_rate = firstPreset.frame_rate;
                if (firstPreset.search_source) this.subscribeForm.search_source = firstPreset.search_source;
                if (firstPreset.reshare_enabled !== undefined) this.subscribeForm.reshare_enabled = firstPreset.reshare_enabled;
                if (firstPreset.transfer_all_matches !== undefined) this.subscribeForm.transfer_all_matches = firstPreset.transfer_all_matches;
                if (firstPreset.run_immediately !== undefined) this.subscribeForm.run_immediately = firstPreset.run_immediately;
                if (firstPreset.transfer_folder_cid) this.subscribeTransferFolderCid = firstPreset.transfer_folder_cid;
                if (firstPreset.strm_folder_path) this.subscribeForm.strm_folder_path = firstPreset.strm_folder_path;
            },
            deep: true
        }
    },
    async mounted() {
        this.parseRoute();
        await this.loadSettings();
        await this.fetchDetail();
    },
    methods: {
        parseRoute() {
            const route = router.getCurrentRoute();
            const parts = route.split('/');
            // discover/detail/movie/12345 or discover/detail/tv/12345
            if (parts.length >= 4) {
                this.mediaType = parts[2] || 'movie';
                this.tmdbId = parseInt(parts[3]) || 0;
            }
            // Check for cached data from discover page
            if (window.__discoverDetailCache) {
                const cache = window.__discoverDetailCache;
                this.detailData = cache;
                this.source = cache.source || 'tmdb';
                this.doubanId = cache.douban_id || 0;
                if (!this.tmdbId && cache.tmdb_id) this.tmdbId = cache.tmdb_id;
                if (!this.mediaType && cache.type) this.mediaType = cache.type;
                window.__discoverDetailCache = null;
            }
        },
        async loadSettings() {
            try {
                const config = await api.getSubscribeConfig();
                if (config) {
                    this.libraryCheckEnabled = !!(config.tmdb_library_check && config.emby_library_config);
                    this.globalSettings.emby_library_config = config.emby_library_config || '';
                    this.globalSettings.tmdb_library_check = !!config.tmdb_library_check;
                    this.globalSettings.douban_tmdb_fallback = !!config.douban_tmdb_fallback;
                }
            } catch (e) { console.error('loadSettings:', e); }
            try {
                const list = await api.getSubscribedTmdbIds();
                const set = {};
                for (const item of (list || [])) {
                    set[item.tmdb_id + '-' + item.type] = true;
                }
                this.subscribedSet = set;
            } catch (e) {}
            // 加载弹窗所需配置（并行）
            try {
                const [tgConfig, strmConfig, channels, optRes, hdhiveConfig] = await Promise.all([
                    api.request('/tg_search/config').catch(() => ({})),
                    api.getShareStrmConfig().catch(() => ({})),
                    api.getTgSearchChannels().catch(() => []),
                    api.request('/subscribe/options').catch(() => ({ data: {} })),
                    api.request('/hdhive/config').catch(() => ({})),
                ]);
                this.tgSearchConfig = tgConfig.data || tgConfig || {};
                this.shareStrmConfig = strmConfig || {};
                this.tgChannels = channels || [];
                if (hdhiveConfig.success && hdhiveConfig.data) {
                    this.hdhiveSelectedAccount = hdhiveConfig.data.use_hdhive_account || '';
                }
                const opts = optRes.data || optRes || {};
                if (opts.resolutions) this.options.resolutions = opts.resolutions;
                if (opts.effects) this.options.effects = opts.effects;
                if (opts.resource_types) this.options.resource_types = opts.resource_types;
                if (opts.release_groups) this.options.release_groups = opts.release_groups;
            } catch (e) { console.error('loadDialogConfigs:', e); }
        },
        async fetchDetail() {
            this.loading = true;
            try {
                if (this.tmdbId) {
                    const detail = await api.tmdbDetail(this.tmdbId, this.mediaType);
                    if (detail) {
                        this.detailData = {
                            ...detail,
                            source: this.source,
                            douban_id: this.doubanId || (this.detailData && this.detailData.douban_id) || '',
                        };
                        if (this.mediaType === 'tv' && detail.seasons) {
                            this.detailSeasons = detail.seasons;
                        }
                        this.isSubscribed = !!this.subscribedSet[this.tmdbId + '-' + this.mediaType];
                    }
                }
            } catch (e) { console.error('fetchDetail:', e); }
            finally {
                this.loading = false;
                if (this.detailData && this.detailData.type === 'tv' && this.detailSeasons.length > 0) {
                    this.loadEmbyEpisodeStatus();
                }
                if (this.detailData && this.globalSettings.emby_library_config) {
                    this.loadMediaVersions();
                }
                if (this.tmdbId) {
                    this.loadRecommendations();
                    this.loadSimilar();
                }
                // 主详情入库检测
                if (this.detailData && this.libraryCheckEnabled) {
                    this.checkLibraryStatusBatch([this.detailData]);
                }
            }
        },
        // ========== 季集 ==========
        async toggleSeason(seasonNum) {
            if (this.expandedSeason === seasonNum) {
                this.expandedSeason = null;
                return;
            }
            this.expandedSeason = seasonNum;
            if (!this.seasonEpisodesInfo[seasonNum]) {
                this.seasonEpisodesLoading[seasonNum] = true;
                try {
                    const eps = await api.tmdbEpisodes(this.tmdbId, seasonNum);
                    this.seasonEpisodesInfo = { ...this.seasonEpisodesInfo, [seasonNum]: eps || [] };
                } catch (e) { console.error(e); }
                finally { this.seasonEpisodesLoading = { ...this.seasonEpisodesLoading, [seasonNum]: false }; }
            }
        },
        // ========== Emby 入库 ==========
        async loadEmbyEpisodeStatus() {
            if (!this.libraryCheckEnabled || !this.detailData) return;
            this.episodeCheckLoading = true;
            try {
                const name = (this.detailData.title || this.detailData.original_title || '').trim();
                const year = this.detailData.year ? parseInt(this.detailData.year) : null;
                const data = await api.embySeasonEpisodesCheck(name, year, this.tmdbId);
                this.embySeasonEpisodes = data || {};
            } catch (e) { console.error(e); }
            finally { this.episodeCheckLoading = false; }
        },
        getSeasonEmbyCount(seasonNum) {
            const eps = this.embySeasonEpisodes[seasonNum];
            return eps ? eps.length : 0;
        },
        isEpisodeInEmby(seasonNum, epNum) {
            const eps = this.embySeasonEpisodes[seasonNum];
            return eps && eps.includes(epNum);
        },
        // ========== 媒体版本 ==========
        async loadMediaVersions() {
            if (!this.detailData || !this.globalSettings.emby_library_config) return;
            this.mediaVersionsLoading = true;
            try {
                const name = (this.detailData.title || this.detailData.original_title || '').trim();
                const year = this.detailData.year ? parseInt(this.detailData.year) : null;
                const data = await api.embyMediaVersions(name, year, this.tmdbId, this.mediaType);
                this.mediaVersions = data || null;
            } catch (e) { console.error(e); }
            finally { this.mediaVersionsLoading = false; }
        },
        formatVersionSize(bytes) {
            if (!bytes) return '';
            if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(0) + ' MB';
            return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
        },
        getMovieVersions() {
            if (!this.mediaVersions || this.mediaVersions.type !== 'movie') return [];
            return this.mediaVersions.versions || [];
        },
        getEpisodeVersions(seasonNum, epNum) {
            if (!this.mediaVersions || this.mediaVersions.type !== 'tv') return [];
            const key = 'S' + seasonNum + 'E' + epNum;
            const ep = (this.mediaVersions.episodes || {})[key];
            return ep ? (ep.versions || []) : [];
        },
        // ========== 推荐 & 类似 ==========
        async loadRecommendations() {
            this.recommendLoading = true;
            try {
                const res = await api.tmdbRecommend(this.tmdbId, this.mediaType, 1);
                this.recommendations = (res && res.results) || [];
                if (this.recommendations.length && this.libraryCheckEnabled) {
                    this.checkLibraryStatusBatch(this.recommendations);
                }
            } catch (e) { console.error(e); }
            finally { this.recommendLoading = false; }
        },
        async loadSimilar() {
            this.similarLoading = true;
            try {
                const res = await api.tmdbSimilar(this.tmdbId, this.mediaType, 1);
                this.similarMedia = (res && res.results) || [];
                if (this.similarMedia.length && this.libraryCheckEnabled) {
                    this.checkLibraryStatusBatch(this.similarMedia);
                }
            } catch (e) { console.error(e); }
            finally { this.similarLoading = false; }
        },
        goMediaDetail(media) {
            const type = media.type || 'movie';
            const id = media.tmdb_id;
            if (!id) return;
            window.__discoverDetailCache = { ...media };
            router.push('discover/detail/' + type + '/' + id);
            // 由于 key 不变需手动刷新
            this.$nextTick(() => {
                this.resetAndReload(type, id);
            });
        },
        async resetAndReload(type, id) {
            window.scrollTo(0, 0);
            this.mediaType = type;
            this.tmdbId = parseInt(id) || 0;
            this.loading = true;
            this.detailSeasons = [];
            this.seasonEpisodesInfo = {};
            this.expandedSeason = null;
            this.embySeasonEpisodes = {};
            this.mediaVersions = null;
            this.recommendations = [];
            this.similarMedia = [];
            this.libraryStatus = {};
            if (window.__discoverDetailCache) {
                this.detailData = window.__discoverDetailCache;
                this.source = window.__discoverDetailCache.source || 'tmdb';
                window.__discoverDetailCache = null;
            }
            await this.fetchDetail();
        },
        goPersonDetail(person) {
            if (!person || !person.id) return;
            router.push('discover/person/' + person.id);
        },
        goMorePage(category) {
            // discover/browse/{category}/{mediaType}/{tmdbId}
            router.push('discover/browse/' + category + '/' + this.mediaType + '/' + this.tmdbId);
        },
        // ========== 订阅检测（列表项） ==========
        isItemSubscribed(item) {
            if (!item || !item.tmdb_id) return false;
            return !!this.subscribedSet[item.tmdb_id + '-' + (item.type || item.media_type || 'movie')];
        },
        // ========== 入库检测 ==========
        getLibraryKey(media) {
            if (media.source !== 'douban' && media.tmdb_id) return 'tmdb-' + media.tmdb_id;
            const name = (media.title || media.original_title || '').trim();
            const year = media.year || '';
            return name + '-' + year;
        },
        isInLibrary(media) {
            const key = this.getLibraryKey(media);
            return this.libraryStatus[key];
        },
        async checkLibraryStatusBatch(items) {
            if (!this.libraryCheckEnabled || !items || !items.length) return;
            const toCheck = items.filter(m => {
                const key = this.getLibraryKey(m);
                return this.libraryStatus[key] === undefined;
            }).map(m => ({
                name: (m.title || m.original_title || '').trim(),
                year: m.year ? parseInt(m.year) : null,
                type: m.type || '',
                total_episodes: m.number_of_episodes || 0,
                tmdb_id: m.tmdb_id || null,
                source: m.source || 'tmdb'
            })).filter(m => m.name);
            if (toCheck.length === 0) return;
            try {
                const res = await api.request('/emby/library_check', {
                    method: 'POST',
                    body: JSON.stringify({ items: toCheck, douban_tmdb_fallback: this.globalSettings.douban_tmdb_fallback })
                });
                if (res.success && res.data) {
                    this.libraryStatus = { ...this.libraryStatus, ...res.data };
                }
            } catch (e) { console.error('入库检测:', e); }
        },
        // ========== 辅助 ==========
        getImgUrl(url) {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return 'https://image.tmdb.org/t/p/w500' + url;
        },
        getBackdropUrl(url) {
            if (!url) return '';
            if (url.startsWith('http')) return url.replace('/w780/', '/w1280/').replace('/w500/', '/w1280/');
            return 'https://image.tmdb.org/t/p/w1280' + url;
        },
        getRatingColor(score) {
            if (score >= 8) return 'green';
            if (score >= 6) return 'orange';
            return 'red';
        },
        getGenresText() {
            if (!this.detailData || !this.detailData.genres) return '';
            const g = this.detailData.genres;
            return Array.isArray(g) ? g.join('、') : '';
        },
        getRuntimeText() {
            if (!this.detailData) return '';
            const rt = this.detailData.runtime || (this.detailData.episode_run_time && this.detailData.episode_run_time[0]);
            return rt ? rt + ' 分钟' : '';
        },
        getExternalLinks() {
            const d = this.detailData;
            if (!d) return [];
            const links = [];
            if (d.tmdb_id) links.push({ name: 'TMDB', url: `https://www.themoviedb.org/${d.type === 'tv' ? 'tv' : 'movie'}/${d.tmdb_id}` });
            if (d.douban_id) links.push({ name: '豆瓣', url: `https://movie.douban.com/subject/${d.douban_id}` });
            if (d.imdb_id) links.push({ name: 'IMDb', url: `https://www.imdb.com/title/${d.imdb_id}` });
            return links;
        },
        getSeasonExistColor(seasonNum) {
            const total = this.getSeasonEpisodeCount(seasonNum);
            const have = this.getSeasonEmbyCount(seasonNum);
            if (total > 0 && have >= total) return 'success';
            if (have > 0) return 'warning';
            return 'error';
        },
        getSeasonExistText(seasonNum) {
            const total = this.getSeasonEpisodeCount(seasonNum);
            const have = this.getSeasonEmbyCount(seasonNum);
            if (total > 0 && have >= total) return '已入库';
            if (have > 0) return have + '/' + total;
            return '未入库';
        },
        getSeasonEpisodeCount(seasonNum) {
            const s = (this.detailSeasons || []).find(s => s.season_number === seasonNum);
            return s ? (s.episode_count || 0) : 0;
        },
        // ========== 操作按钮 ==========
        goBack() {
            // 使用 router.back() 以恢复进入详情前的完整 URL（含 tab + category），
            // 避免强制跳回 discover 首页的默认分类（如"正在热映"）
            router.back();
        },
        handleJumpEmby() {
            if (this.embyWebUrl) {
                window.open(this.embyWebUrl, '_blank');
            }
        },
        getTypeText(t) { return t === 'movie' ? '电影' : t === 'tv' ? '剧集' : t; },
        truncateText(text, maxLen = 200) {
            if (!text) return '';
            return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
        },
        // ========== 频道搜索弹窗 ==========
        async handleTgSearch() {
            if (!this.detailData) return;
            const name = (this.detailData.title || this.detailData.original_title || '').trim();
            if (!name) { window.showMessage && window.showMessage('无法获取名称', 'error'); return; }
            this.tgSearchDialogKeyword = name;
            this.tgSearchDialogResults = [];
            this.savedLinks = {};
            this.savingLinks = {};
            this.strmSavingLinks = {};
            this.strmSavedLinks = {};
            this.tgSearchDialogVisible = true;
            this.tgSearchDialogLoading = true;
            try {
                const res = await api.tgSearchSearch('all', name);
                if (res.success) {
                    this.tgSearchDialogResults = res.data || [];
                    if (this.tgSearchDialogResults.length === 0) {
                        window.showMessage && window.showMessage('未找到相关消息', 'warning');
                    } else {
                        this.resolveTelegraphInDialogResults();
                    }
                } else {
                    window.showMessage && window.showMessage(res.message || '搜索失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('搜索失败', 'error');
            } finally {
                this.tgSearchDialogLoading = false;
            }
        },
        getTgChannelName(channelId) {
            const ch = this.tgChannels.find(c => c.channel_id === channelId);
            return ch ? ch.name : channelId;
        },
        tgFormatDate(isoStr) {
            if (!isoStr) return '';
            try {
                const d = new Date(isoStr);
                return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            } catch { return isoStr; }
        },
        extract115Links(text) {
            if (!text) return [];
            const pattern = /https?:\/\/115(?:cdn)?\.com\/s\/([a-zA-Z0-9]+)\?password=([a-zA-Z0-9]+)/g;
            const links = [];
            const seen = new Set();
            let m;
            while ((m = pattern.exec(text)) !== null) {
                if (!seen.has(m[0])) {
                    seen.add(m[0]);
                    links.push({ url: m[0], share_code: m[1], password: m[2] });
                }
            }
            return links;
        },
        extractTelegraphLinks(text) {
            if (!text) return [];
            const pattern = /https?:\/\/(?:telegra\.ph|graph\.org)\/[^\s\)\uff09\]\u3011"']+/g;
            const links = [];
            const seen = new Set();
            let m;
            while ((m = pattern.exec(text)) !== null) {
                const url = m[0].replace(/[.,;，。；!?！？]+$/, '');
                if (!seen.has(url)) { seen.add(url); links.push(url); }
            }
            return links;
        },
        async resolveTelegraphInDialogResults() {
            if (!this.tgSearchDialogResults || this.tgSearchDialogResults.length === 0) return;
            for (const msg of this.tgSearchDialogResults) {
                const phLinks = this.extractTelegraphLinks(msg.text);
                if (phLinks.length === 0) continue;
                msg._telegraphCount = phLinks.length;
                msg._telegraphLoading = true;
                try {
                    let allShares = [];
                    for (const phUrl of phLinks) {
                        const res = await api.request('/tg_search/telegraph', { method: 'POST', body: JSON.stringify({ url: phUrl }) });
                        if (res.success && res.share_links && res.share_links.length > 0) { allShares.push(...res.share_links); }
                    }
                    const unique = [...new Set(allShares)];
                    if (unique.length > 0) { msg._telegraphShares = unique; msg.text = msg.text + '\n' + unique.join('\n'); }
                } catch (e) { console.error('Telegraph resolve error:', e); }
                finally { msg._telegraphLoading = false; }
            }
        },
        // ========== 一键转存/分享STRM 通用 ==========
        _getTransferFolders() { return (this.tgSearchConfig.transfer_folders || []); },
        _getTransferConfigName() { return this.tgSearchConfig.transfer_use_115_config || ''; },
        _pickFolderThenDo(callback) {
            const folders = this._getTransferFolders();
            if (!this._getTransferConfigName()) { window.showMessage && window.showMessage('请先在看板设置中选择转存 115 账号', 'error'); return; }
            if (folders.length === 0) { window.showMessage && window.showMessage('请先在看板设置中添加转存文件夹', 'error'); return; }
            if (folders.length === 1) { callback(folders[0].cid); return; }
            this.pickerFolderList = [...folders];
            this.folderPickerCallback = callback;
            this.folderPickerDialog = true;
        },
        pickTransferFolder(folder) {
            this.folderPickerDialog = false;
            if (this.folderPickerCallback) { this.folderPickerCallback(folder.cid); this.folderPickerCallback = null; }
        },
        _pickStrmFolderThenDo(callback) {
            const folders = (this.shareStrmConfig && this.shareStrmConfig.strm_folders) || [];
            if (folders.length <= 1) { callback(0); return; }
            this.strmPickerFolderList = [...folders];
            this.strmFolderPickerCallback = callback;
            this.strmFolderPickerDialog = true;
        },
        pickStrmFolder(folder, index) {
            this.strmFolderPickerDialog = false;
            if (this.strmFolderPickerCallback) { this.strmFolderPickerCallback(index); this.strmFolderPickerCallback = null; }
        },
        async doSave115Link(link) {
            this._pickFolderThenDo(async (targetCid) => {
                const key = link.url;
                this.savingLinks = { ...this.savingLinks, [key]: true };
                try {
                    const res = await api.request('/tg_search/transfer', { method: 'POST', body: JSON.stringify({ share_link: link.url, target_cid: targetCid }) });
                    if (res.success) { this.savedLinks = { ...this.savedLinks, [key]: 'success' }; window.showMessage && window.showMessage(res.message || '转存成功', 'success'); }
                    else { this.savedLinks = { ...this.savedLinks, [key]: 'error' }; window.showMessage && window.showMessage(res.message || '转存失败', 'error'); }
                } catch (e) { this.savedLinks = { ...this.savedLinks, [key]: 'error' }; window.showMessage && window.showMessage('转存失败', 'error'); }
                finally { this.savingLinks = { ...this.savingLinks, [key]: false }; }
            });
        },
        async doShareStrm115Link(link) {
            this._pickStrmFolderThenDo(async (pathIndex) => {
                const key = link.url;
                this.strmSavingLinks = { ...this.strmSavingLinks, [key]: true };
                try {
                    const res = await api.submitShareStrm(link.url, false, pathIndex);
                    if (res.success) { this.strmSavedLinks = { ...this.strmSavedLinks, [key]: 'success' }; window.showMessage && window.showMessage(res.message || '已提交分享STRM', 'success'); }
                    else { this.strmSavedLinks = { ...this.strmSavedLinks, [key]: 'error' }; window.showMessage && window.showMessage(res.message || '提交失败', 'error'); }
                } catch (e) { this.strmSavedLinks = { ...this.strmSavedLinks, [key]: 'error' }; window.showMessage && window.showMessage('提交失败', 'error'); }
                finally { this.strmSavingLinks = { ...this.strmSavingLinks, [key]: false }; }
            });
        },
        // ========== HDHive 弹窗 ==========
        async handleHdhiveSearch() {
            if (!this.detailData || !this.detailData.tmdb_id) {
                window.showMessage && window.showMessage('无 TMDB ID，无法搜索', 'error'); return;
            }
            if (!this.hdhiveSelectedAccount) {
                window.showMessage && window.showMessage('请先在工具箱 - HDHive 解析中选择账号', 'error'); return;
            }
            const tmdbId = this.detailData.tmdb_id;
            const mediaType = this.detailData.type || 'movie';
            this.hdhiveDetailItem = {
                id: tmdbId, media_type: mediaType,
                title: this.detailData.title || '', name: this.detailData.title || '',
                poster_path: this.detailData.poster_path || '', overview: this.detailData.overview || '',
                release_date: mediaType === 'movie' ? (this.detailData.year ? this.detailData.year + '-01-01' : '') : '',
                first_air_date: mediaType === 'tv' ? (this.detailData.year ? this.detailData.year + '-01-01' : '') : '',
            };
            this.hdhiveResources = [];
            this.savingResources = {};
            this.savedResources = {};
            this.strmSavingResources = {};
            this.strmSavedResources = {};
            this.hdhiveDetailDialog = true;
            this.hdhiveResourcesLoading = true;
            try {
                const res = await api.hdhiveGetResources(this.hdhiveSelectedAccount, tmdbId, mediaType);
                if (res.success && res.data) { this.hdhiveResources = res.data; }
                else { this.hdhiveResources = []; }
            } catch (e) { console.error('加载资源列表失败:', e); this.hdhiveResources = []; }
            finally { this.hdhiveResourcesLoading = false; }
        },
        hdhiveGetTitle(item) { return item.title || item.name || '未知'; },
        hdhiveGetPoster(item) { return item.poster_path ? 'https://image.tmdb.org/t/p/w300' + item.poster_path : ''; },
        hdhiveGetYear(item) { const d = item.release_date || item.first_air_date || ''; return d ? d.substring(0, 4) : ''; },
        hdhiveGetType(item) {
            if (item.media_type === 'movie') return '电影';
            if (item.media_type === 'tv') return '电视剧';
            return '';
        },
        async doSaveHdhiveResource(res) {
            this._pickFolderThenDo(async (targetCid) => {
                const slug = res.slug; if (!slug) return;
                this.savingResources = { ...this.savingResources, [slug]: true };
                try {
                    const result = await api.request('/tg_search/transfer/hdhive', { method: 'POST', body: JSON.stringify({ slug, target_cid: targetCid, account_name: this.hdhiveSelectedAccount }) });
                    if (result.success) { this.savedResources = { ...this.savedResources, [slug]: 'success' }; window.showMessage && window.showMessage(result.message || '转存成功', 'success'); }
                    else { this.savedResources = { ...this.savedResources, [slug]: 'error' }; window.showMessage && window.showMessage(result.message || '转存失败', 'error'); }
                } catch (e) { this.savedResources = { ...this.savedResources, [slug]: 'error' }; window.showMessage && window.showMessage('转存失败', 'error'); }
                finally { this.savingResources = { ...this.savingResources, [slug]: false }; }
            });
        },
        async doShareStrmHdhiveResource(res) {
            this._pickStrmFolderThenDo(async (pathIndex) => {
                const slug = res.slug; if (!slug) return;
                this.strmSavingResources = { ...this.strmSavingResources, [slug]: true };
                try {
                    const result = await api.request('/hdhive/resource/save', { method: 'POST', body: JSON.stringify({ slug, account_name: this.hdhiveSelectedAccount, path_index: pathIndex }) });
                    if (result.success) { this.strmSavedResources = { ...this.strmSavedResources, [slug]: 'success' }; window.showMessage && window.showMessage(result.message || '已提交分享STRM', 'success'); }
                    else { this.strmSavedResources = { ...this.strmSavedResources, [slug]: 'error' }; window.showMessage && window.showMessage(result.message || '提交失败', 'error'); }
                } catch (e) { this.strmSavedResources = { ...this.strmSavedResources, [slug]: 'error' }; window.showMessage && window.showMessage('提交失败', 'error'); }
                finally { this.strmSavingResources = { ...this.strmSavingResources, [slug]: false }; }
            });
        },
        // ========== 订阅弹窗 ==========
        async handleSubscribe() {
            if (!this.detailData || !this.detailData.tmdb_id) return;
            const media = this.detailData;
            const isTV = media.type === 'tv';
            const totalSeason = isTV ? (media.number_of_seasons || 0) : 0;
            this.subscribeForm = {
                name: media.title || media.original_title || '',
                original_title: media.original_title || media.title || '',
                year: media.year || '',
                type: media.type || 'movie',
                tmdb_id: media.tmdb_id || 0,
                poster_path: media.poster_path || '',
                backdrop_path: media.backdrop_path || '',
                overview: media.overview || '',
                total_season: totalSeason,
                total_episode: isTV ? this.getSeasonEpisodeCount(1) : 0,
                current_season: 1,
                start_episode: 1,
                resolution: '', effect: '', resource_type: '', release_group: '',
                frame_rate: '',
                search_source: 'tg_hdhive',
                mode: 'share_strm',
                reshare_enabled: false,
                transfer_all_matches: false,
                run_immediately: false
            };
            this.subscribeTransferFolderCid = '';
            this.selectedPresetIds = [];
            this.subscribeDialog = true;
            this.loadSubscribeFolders();
            if (isTV) { this.fetchEmbyStartEpisode(media.tmdb_id || 0, 1); }
            try {
                const subConfig = await api.getSubscribeConfig();
                this.subscribePresets = (subConfig && Array.isArray(subConfig.presets)) ? subConfig.presets : [];
                if (this.subscribePresets.length > 0) { this.selectedPresetIds = [this.subscribePresets[0].id]; }
            } catch (e) { console.error(e); }
        },
        async loadSubscribeFolders() {
            try {
                const [subConfig, strmConfig] = await Promise.all([api.getSubscribeConfig(), api.getShareStrmConfig()]);
                if (subConfig && subConfig.transfer_folders) {
                    this.subscribeTransferFolders = subConfig.transfer_folders;
                    if (this.subscribeTransferFolders.length > 0) {
                        const hasMatch = this.subscribeTransferFolders.some(f => f.cid === this.subscribeTransferFolderCid);
                        if (!hasMatch) { this.subscribeTransferFolderCid = this.subscribeTransferFolders[0].cid; }
                    }
                }
                if (strmConfig) {
                    const folders = strmConfig.strm_folders || [];
                    this.subscribeShareStrmFolders = folders.map(f => ({ title: f.name || f.path, value: f.path }));
                    if (this.subscribeShareStrmFolders.length === 0 && strmConfig.local_strm_path) {
                        this.subscribeShareStrmFolders = [{ title: strmConfig.local_strm_path, value: strmConfig.local_strm_path }];
                    }
                    if (this.subscribeShareStrmFolders.length > 0) {
                        const hasMatch = this.subscribeShareStrmFolders.some(f => f.value === this.subscribeForm.strm_folder_path);
                        if (!hasMatch) { this.subscribeForm.strm_folder_path = this.subscribeShareStrmFolders[0].value; }
                    }
                }
            } catch (e) { console.error('Failed to load subscribe folders:', e); }
        },
        async fetchEmbyStartEpisode(tmdbId, seasonNum) {
            if (!tmdbId || !seasonNum) return;
            try {
                const name = this.subscribeForm.name || '';
                const year = this.subscribeForm.year || '';
                const res = await api.request('/emby/season_episodes_check', { method: 'POST', body: JSON.stringify({ name, year, tmdb_id: tmdbId }) });
                if (res.success && res.data) {
                    const eps = res.data[String(seasonNum)] || [];
                    if (eps.length > 0) { this.subscribeForm.start_episode = Math.max(...eps) + 1; }
                }
            } catch (e) { /* 忽略 */ }
        },
        async saveSubscribe() {
            this.subscribeSaving = true;
            try {
                if (this.subscribeForm.mode === 'transfer' && this.subscribeTransferFolderCid) {
                    const folder = this.subscribeTransferFolders.find(f => f.cid === this.subscribeTransferFolderCid);
                    if (folder) { this.subscribeForm.transfer_folders = [{ ...folder }]; }
                }
                if (this.selectedPresetIds && this.selectedPresetIds.length > 0) { this.subscribeForm.preset_ids = [...this.selectedPresetIds]; }
                else { this.subscribeForm.preset_ids = []; }
                if (this.subscribeForm.type === 'tv' && this.subscribeForm.current_season === 0 && this.subscribeForm.total_season > 0) {
                    let successCount = 0; let failMsg = ''; const createdIds = [];
                    for (let s = 1; s <= this.subscribeForm.total_season; s++) {
                        const epCount = this.getSeasonEpisodeCount(s);
                        const form = { ...this.subscribeForm, current_season: s, total_episode: epCount, start_episode: 1 };
                        const res = await api.addSubscribe(form);
                        if (res.success) { successCount++; if (res.data && res.data.subscribe_id) createdIds.push(res.data.subscribe_id); } else { failMsg = failMsg || (res.message || '添加失败'); }
                    }
                    if (successCount > 0) {
                        window.showMessage && window.showMessage('已添加 ' + successCount + ' 季订阅', 'success'); this.subscribeDialog = false; this.loadSubscribedIds();
                        if (this.subscribeForm.run_immediately && createdIds.length > 0) {
                            for (const sid of createdIds) {
                                try { await api.runSubscribe(sid); } catch (e) { console.error('立即执行失败', e); }
                            }
                            window.showMessage && window.showMessage('已开始执行 ' + createdIds.length + ' 季订阅', 'success');
                        }
                    }
                    else { window.showMessage && window.showMessage(failMsg || '添加失败', 'error'); }
                } else {
                    const res = await api.addSubscribe(this.subscribeForm);
                    if (res.success) {
                        window.showMessage && window.showMessage('订阅添加成功', 'success');
                        this.subscribeDialog = false;
                        this.isSubscribed = true;
                        this.subscribedSet[this.tmdbId + '-' + this.mediaType] = true;
                        if (this.subscribeForm.run_immediately && res.data && res.data.subscribe_id) {
                            try {
                                const runRes = await api.runSubscribe(res.data.subscribe_id);
                                if (runRes.success) { window.showMessage && window.showMessage(runRes.message || '已开始执行', 'success'); }
                                else { window.showMessage && window.showMessage(runRes.message || '立即执行失败', 'warning'); }
                            } catch (e) { console.error('立即执行失败', e); }
                        }
                    } else { window.showMessage && window.showMessage(res.message || '添加失败', 'error'); }
                }
            } catch (e) { window.showMessage && window.showMessage('添加失败', 'error'); }
            finally { this.subscribeSaving = false; }
        },
        async loadSubscribedIds() {
            try {
                const list = await api.getSubscribedTmdbIds();
                const set = {};
                for (const item of (list || [])) { set[item.tmdb_id + '-' + item.type] = true; }
                this.subscribedSet = set;
                this.isSubscribed = !!this.subscribedSet[this.tmdbId + '-' + this.mediaType];
            } catch (e) {}
        },
    },
    template: `
    <div class="md-page-root">
        <!-- 加载态 -->
        <div v-if="loading && !detailData" class="d-flex justify-center align-center" style="min-height: 60vh;">
            <v-progress-circular indeterminate size="48" color="primary"></v-progress-circular>
        </div>

        <!-- 无数据 -->
        <div v-else-if="!detailData" class="d-flex flex-column justify-center align-center" style="min-height: 60vh;">
            <v-icon size="64" color="grey" class="mb-4">mdi-movie-off-outline</v-icon>
            <div class="text-h6" style="opacity: 0.5;">未找到媒体信息</div>
            <v-btn variant="tonal" class="mt-4" @click="goBack">返回看板</v-btn>
        </div>

        <!-- 正文 -->
        <template v-if="detailData">
            <!-- 背景图 -->
            <div class="md-backdrop-wrap" v-if="detailData.backdrop_path || detailData.poster_path">
                <img class="md-backdrop-img" :src="getBackdropUrl(detailData.backdrop_path || detailData.poster_path)" @error="$event.target.style.display='none'" />
                <div class="md-backdrop-gradient"></div>
            </div>

            <!-- 主体内容 -->
            <div class="md-content">
                <!-- Header: 海报 + 标题 + 操作按钮 -->
                <div class="md-header">
                    <div class="md-poster">
                        <v-img :src="getImgUrl(detailData.poster_path)" cover class="md-poster-img" :aspect-ratio="2/3">
                            <template #placeholder>
                                <div class="d-flex align-center justify-center" style="width:100%;height:100%;background:rgba(var(--v-theme-on-surface),0.05)">
                                    <v-icon size="48" color="grey">mdi-movie</v-icon>
                                </div>
                            </template>
                        </v-img>
                    </div>
                    <div class="md-title-block">
                        <!-- 入库状态 badge -->
                        <div v-if="libraryCheckEnabled && (isInLibrary(detailData) === true || embyItemId)" class="mb-2">
                            <span class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                        </div>
                        <div v-else-if="libraryCheckEnabled && isInLibrary(detailData) === false" class="mb-2">
                            <span class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                        </div>
                        <h1 class="md-title">
                            <span>{{ detailData.title }}</span>
                            <span v-if="detailData.year" class="md-title-year">（{{ detailData.year }}）</span>
                        </h1>
                        <div class="md-attributes">
                            <span v-if="getRuntimeText()">{{ getRuntimeText() }}</span>
                            <span v-if="getRuntimeText() && getGenresText()" class="mx-1">|</span>
                            <span v-if="getGenresText()">{{ getGenresText() }}</span>
                        </div>
                        <!-- 评分 -->
                        <div v-if="detailData.vote_average" class="md-rating-line mt-1">
                            <v-icon size="16" color="amber">mdi-star</v-icon>
                            <span class="ml-1 font-weight-bold">{{ detailData.vote_average.toFixed(1) }}</span>
                        </div>
                    </div>
                    <div class="md-actions">
                        <v-btn variant="tonal" color="teal" class="mb-2" @click="handleTgSearch" :disabled="loading">
                            <template #prepend><v-icon icon="mdi-magnify" /></template>
                            频道搜索
                        </v-btn>
                        <v-btn variant="tonal" color="deep-purple" class="ms-2 mb-2" @click="handleHdhiveSearch" :disabled="!detailData.tmdb_id || loading">
                            <template #prepend><v-icon icon="mdi-movie-search-outline" /></template>
                            影巢搜索
                        </v-btn>
                        <v-btn class="ms-2 mb-2" :color="isSubscribed ? 'error' : 'warning'" variant="tonal" @click="handleSubscribe" :disabled="!detailData.tmdb_id">
                            <template #prepend><v-icon :icon="isSubscribed ? 'mdi-heart' : 'mdi-heart-outline'" /></template>
                            {{ isSubscribed ? '已订阅' : '订阅' }}
                        </v-btn>
                        <v-btn v-if="embyItemId" class="ms-2 mb-2" variant="tonal" @click="handleJumpEmby">
                            <template #prepend><img src="assets/images/emby-icon.png" style="width:18px;height:18px;border-radius:3px;margin-right:2px;"></template>
                            EMBY
                        </v-btn>
                    </div>
                </div>

                <!-- Overview 区域: 左+右 -->
                <div class="md-overview">
                    <div class="md-overview-left">
                        <!-- Tagline -->
                        <div v-if="detailData.tagline" class="md-tagline">{{ detailData.tagline }}</div>

                        <!-- 简介 -->
                        <h2 v-if="detailData.overview">简介</h2>
                        <p v-if="detailData.overview" class="md-overview-text">{{ detailData.overview }}</p>

                        <!-- 导演 -->
                        <ul v-if="detailData.directors && detailData.directors.length" class="md-crew">
                            <li v-for="d in detailData.directors" :key="d.id">
                                <span>{{ d.job || '导演' }}</span>
                                <a class="md-crew-name md-crew-link" @click.prevent="goPersonDetail(d)">{{ d.name }}</a>
                            </li>
                        </ul>

                        <!-- 外部链接 -->
                        <div class="mt-4 mb-2" v-if="getExternalLinks().length">
                            <a v-for="link in getExternalLinks()" :key="link.name" :href="link.url" target="_blank" class="md-ext-link">
                                <v-icon size="14">mdi-link</v-icon>
                                <span class="ms-1">{{ link.name }}</span>
                            </a>
                        </div>

                        <!-- 季列表 (电视剧) -->
                        <h2 v-if="filteredSeasons.length > 0" class="mt-6">季</h2>
                        <div v-if="filteredSeasons.length > 0" class="md-seasons">
                            <div v-for="s in filteredSeasons" :key="s.season_number" class="md-season-panel">
                                <!-- 季标题行 -->
                                <div class="md-season-header" @click="toggleSeason(s.season_number)">
                                    <span class="font-weight-bold">第 {{ s.season_number }} 季</span>
                                    <v-chip size="small" class="ms-2">{{ s.episode_count }} 集</v-chip>
                                    <div class="md-season-status">
                                        <template v-if="libraryCheckEnabled && Object.keys(embySeasonEpisodes).length > 0">
                                            <v-chip size="small" :color="getSeasonExistColor(s.season_number)" variant="flat">
                                                {{ getSeasonExistText(s.season_number) }}
                                            </v-chip>
                                        </template>
                                        <v-progress-circular v-if="episodeCheckLoading" indeterminate size="14" width="2" color="primary" class="ms-2"></v-progress-circular>
                                    </div>
                                    <v-spacer></v-spacer>
                                    <v-icon size="20">{{ expandedSeason === s.season_number ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                                </div>
                                <!-- 集列表 -->
                                <div v-if="expandedSeason === s.season_number" class="md-season-body">
                                    <div v-if="!seasonEpisodesInfo[s.season_number]" class="text-center pa-4">
                                        <v-progress-circular indeterminate size="24" width="2" color="primary"></v-progress-circular>
                                        <div class="mt-2" style="font-size: 12px; opacity: 0.5;">加载集信息...</div>
                                    </div>
                                    <div v-else class="md-episode-list">
                                        <div v-for="ep in seasonEpisodesInfo[s.season_number]" :key="ep.episode_number" class="md-episode-item">
                                            <div class="md-episode-main">
                                                <div class="md-episode-info">
                                                    <div class="d-flex align-center flex-wrap ga-2">
                                                        <h3 class="md-episode-title">{{ ep.episode_number }} - {{ ep.name || ('第' + ep.episode_number + '集') }}</h3>
                                                        <span v-if="ep.air_date" class="md-episode-date">{{ ep.air_date }}</span>
                                                        <v-icon v-if="isEpisodeInEmby(s.season_number, ep.episode_number)" color="success" size="16" class="ms-1">mdi-check-circle</v-icon>
                                                    </div>
                                                    <p v-if="ep.overview" class="md-episode-overview">{{ ep.overview }}</p>
                                                    <!-- 集版本信息 -->
                                                    <div v-if="getEpisodeVersions(s.season_number, ep.episode_number).length > 0" class="md-episode-versions">
                                                        <div v-for="(v, vi) in getEpisodeVersions(s.season_number, ep.episode_number)" :key="vi" class="md-ep-version-line">
                                                            <template v-if="v.video && v.video.display_title">
                                                                <span>{{ v.video.display_title }}</span>
                                                                <span v-if="v.video.bitrate_display" class="ms-1">{{ v.video.bitrate_display }}</span>
                                                                <span v-if="v.size" class="ms-1">{{ formatVersionSize(v.size) }}</span>
                                                            </template>
                                                            <span v-else style="word-break: break-all;">{{ v.path }}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <v-img v-if="ep.still_path" :src="ep.still_path" cover class="md-episode-img rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧 Facts 面板 -->
                    <div class="md-overview-right" v-if="detailData.tmdb_id">
                        <div class="md-facts">
                            <div v-if="detailData.vote_average" class="md-facts-rating">
                                <v-rating :model-value="detailData.vote_average" density="compact" length="10" class="ma-2" readonly></v-rating>
                            </div>
                            <div v-if="detailData.tmdb_id" class="md-fact">
                                <span>TMDB ID</span>
                                <span class="md-fact-value">{{ detailData.tmdb_id }}</span>
                            </div>
                            <div v-if="detailData.original_title && detailData.original_title !== detailData.title" class="md-fact">
                                <span>原始标题</span>
                                <span class="md-fact-value">{{ detailData.original_title }}</span>
                            </div>
                            <div v-if="detailData.status" class="md-fact">
                                <span>状态</span>
                                <span class="md-fact-value">{{ detailData.status }}</span>
                            </div>
                            <div v-if="detailData.release_date || detailData.first_air_date" class="md-fact">
                                <span>上映日期</span>
                                <span class="md-fact-value">{{ detailData.release_date || detailData.first_air_date }}</span>
                            </div>
                            <div v-if="detailData.original_language" class="md-fact">
                                <span>原始语言</span>
                                <span class="md-fact-value">{{ detailData.original_language }}</span>
                            </div>
                            <div v-if="detailData.production_countries && detailData.production_countries.length" class="md-fact">
                                <span>出品国家</span>
                                <span class="md-fact-value">{{ detailData.production_countries.join('、') }}</span>
                            </div>
                            <div v-if="detailData.production_companies && detailData.production_companies.length" class="md-fact md-fact-last">
                                <span>制作公司</span>
                                <span class="md-fact-value text-end">
                                    <span v-for="c in detailData.production_companies" :key="c" style="display: block;">{{ c }}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 电影媒体信息 - 全宽 -->
                <div v-if="detailData.type === 'movie' && !mediaVersionsLoading && getMovieVersions().length > 0" class="mt-6">
                    <h2>媒体信息</h2>
                    <div v-for="(v, vi) in getMovieVersions()" :key="vi" class="mi-version-row">
                        <div class="mi-version-header">
                            <v-icon size="15" class="mr-1">mdi-file-video-outline</v-icon>
                            <span class="mi-version-path">{{ v.path || ('版本 ' + (vi+1)) }}</span>
                            <span v-if="v.size" class="mi-version-size">{{ formatVersionSize(v.size) }}</span>
                        </div>
                        <div class="mi-stream-scroll">
                            <!-- 视频卡片 -->
                            <div v-if="v.video && v.video.codec" class="mi-stream-card">
                                <h3 class="mi-stream-type"><v-icon size="16" class="mr-1">mdi-video-outline</v-icon>视频</h3>
                                <div class="mi-attr" v-if="v.video.display_title"><span class="mi-label">标题</span><span class="mi-val">{{ v.video.display_title }}</span></div>
                                <div class="mi-attr" v-if="v.video.codec"><span class="mi-label">编解码器</span><span class="mi-val">{{ v.video.codec }}</span></div>
                                <div class="mi-attr" v-if="v.video.dv_profile"><span class="mi-label">杜比配置</span><span class="mi-val">{{ v.video.dv_profile }}</span></div>
                                <div class="mi-attr" v-if="v.video.profile"><span class="mi-label">配置</span><span class="mi-val">{{ v.video.profile }}</span></div>
                                <div class="mi-attr" v-if="v.video.level"><span class="mi-label">等级</span><span class="mi-val">{{ v.video.level }}</span></div>
                                <div class="mi-attr" v-if="v.video.resolution"><span class="mi-label">分辨率</span><span class="mi-val">{{ v.video.resolution }}</span></div>
                                <div class="mi-attr" v-if="v.video.aspect_ratio"><span class="mi-label">宽高比</span><span class="mi-val">{{ v.video.aspect_ratio }}</span></div>
                                <div class="mi-attr"><span class="mi-label">隔行</span><span class="mi-val">{{ v.video.interlaced ? '是' : '否' }}</span></div>
                                <div class="mi-attr" v-if="v.video.framerate"><span class="mi-label">帧率</span><span class="mi-val">{{ v.video.framerate }}</span></div>
                                <div class="mi-attr" v-if="v.video.bitrate_display"><span class="mi-label">比特率</span><span class="mi-val">{{ v.video.bitrate_display }}</span></div>
                                <div class="mi-attr" v-if="v.video.video_range"><span class="mi-label">视频范围</span><span class="mi-val">{{ v.video.video_range }}</span></div>
                                <div class="mi-attr" v-if="v.video.color_primaries"><span class="mi-label">基色</span><span class="mi-val">{{ v.video.color_primaries }}</span></div>
                                <div class="mi-attr" v-if="v.video.color_space"><span class="mi-label">色域</span><span class="mi-val">{{ v.video.color_space }}</span></div>
                                <div class="mi-attr" v-if="v.video.color_transfer"><span class="mi-label">色彩转换</span><span class="mi-val">{{ v.video.color_transfer }}</span></div>
                                <div class="mi-attr" v-if="v.video.bit_depth"><span class="mi-label">位深度</span><span class="mi-val">{{ v.video.bit_depth }} bit</span></div>
                                <div class="mi-attr" v-if="v.video.pixel_format"><span class="mi-label">像素格式</span><span class="mi-val">{{ v.video.pixel_format }}</span></div>
                                <div class="mi-attr" v-if="v.video.ref_frames"><span class="mi-label">参考帧</span><span class="mi-val">{{ v.video.ref_frames }}</span></div>
                            </div>
                            <!-- 音频卡片 -->
                            <div v-for="(a, ai) in (v.audio || [])" :key="'a'+ai" class="mi-stream-card">
                                <h3 class="mi-stream-type"><v-icon size="16" class="mr-1">mdi-volume-high</v-icon>音频</h3>
                                <div class="mi-attr" v-if="a.display_title"><span class="mi-label">标题</span><span class="mi-val">{{ a.display_title }}</span></div>
                                <div class="mi-attr" v-if="a.title"><span class="mi-label">内嵌标题</span><span class="mi-val">{{ a.title }}</span></div>
                                <div class="mi-attr" v-if="a.language"><span class="mi-label">语言</span><span class="mi-val">{{ a.language }}</span></div>
                                <div class="mi-attr" v-if="a.codec"><span class="mi-label">编解码器</span><span class="mi-val">{{ a.codec }}</span></div>
                                <div class="mi-attr" v-if="a.profile"><span class="mi-label">配置</span><span class="mi-val">{{ a.profile }}</span></div>
                                <div class="mi-attr" v-if="a.layout"><span class="mi-label">布局</span><span class="mi-val">{{ a.layout }}</span></div>
                                <div class="mi-attr" v-if="a.channels"><span class="mi-label">频道</span><span class="mi-val">{{ a.channels }} ch</span></div>
                                <div class="mi-attr" v-if="a.bitrate_display"><span class="mi-label">比特率</span><span class="mi-val">{{ a.bitrate_display }}</span></div>
                                <div class="mi-attr" v-if="a.sample_rate"><span class="mi-label">采样率</span><span class="mi-val">{{ Number(a.sample_rate).toLocaleString() }} Hz</span></div>
                                <div class="mi-attr" v-if="a.bit_depth"><span class="mi-label">位深度</span><span class="mi-val">{{ a.bit_depth }} bit</span></div>
                                <div class="mi-attr"><span class="mi-label">默认</span><span class="mi-val">{{ a.is_default ? '是' : '否' }}</span></div>
                            </div>
                            <!-- 字幕卡片 -->
                            <div v-for="(sub, si) in (v.subtitles || [])" :key="'s'+si" class="mi-stream-card">
                                <h3 class="mi-stream-type"><v-icon size="16" class="mr-1">mdi-subtitles-outline</v-icon>字幕</h3>
                                <div class="mi-attr" v-if="sub.display_title"><span class="mi-label">标题</span><span class="mi-val">{{ sub.display_title }}</span></div>
                                <div class="mi-attr" v-if="sub.title"><span class="mi-label">内嵌标题</span><span class="mi-val">{{ sub.title }}</span></div>
                                <div class="mi-attr" v-if="sub.language"><span class="mi-label">语言</span><span class="mi-val">{{ sub.language }}</span></div>
                                <div class="mi-attr" v-if="sub.codec"><span class="mi-label">编解码器</span><span class="mi-val">{{ sub.codec }}</span></div>
                                <div class="mi-attr"><span class="mi-label">默认</span><span class="mi-val">{{ sub.is_default ? '是' : '否' }}</span></div>
                                <div class="mi-attr"><span class="mi-label">强制</span><span class="mi-val">{{ sub.is_forced ? '是' : '否' }}</span></div>
                                <div class="mi-attr"><span class="mi-label">外部</span><span class="mi-val">{{ sub.is_external ? '是' : '否' }}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="detailData.type === 'movie' && mediaVersionsLoading" class="mt-4 d-flex align-center" style="font-size: 13px; opacity: 0.5;">
                    <v-progress-circular indeterminate size="16" width="2" color="primary" class="mr-2"></v-progress-circular>
                    加载媒体信息...
                </div>

                <!-- 演员阵容 -->
                <div v-if="detailData.cast && detailData.cast.length" class="mt-6 mb-4">
                    <h2 class="mb-3">演员阵容</h2>
                    <div class="md-cast-scroll">
                        <div v-for="person in detailData.cast" :key="person.id" class="md-cast-card md-cast-clickable" @click="goPersonDetail(person)">
                            <v-img v-if="person.profile_path" :src="person.profile_path" cover class="md-cast-avatar" :aspect-ratio="2/3" />
                            <div v-else class="md-cast-avatar md-cast-avatar-empty">
                                <v-icon size="32" color="grey">mdi-account</v-icon>
                            </div>
                            <div class="md-cast-name">{{ person.name }}</div>
                            <div class="md-cast-role">{{ person.character }}</div>
                        </div>
                    </div>
                </div>

                <!-- 推荐 -->
                <div v-if="recommendations.length > 0" class="mt-6 mb-4">
                    <div class="d-flex align-center justify-space-between mb-3">
                        <h2>推荐</h2>
                        <a class="md-more-link" @click.prevent="goMorePage('recommend')">更多 <v-icon size="16">mdi-arrow-right-circle-outline</v-icon></a>
                    </div>
                    <div class="md-media-scroll">
                        <div v-for="item in recommendations" :key="item.tmdb_id" class="md-media-card" @click="goMediaDetail(item)">
                            <div style="position:relative;">
                                <v-img :src="getImgUrl(item.poster_path)" cover class="md-media-card-img" :aspect-ratio="2/3">
                                    <template #placeholder>
                                        <div class="d-flex align-center justify-center" style="width:100%;height:100%;background:rgba(var(--v-theme-on-surface),0.05)">
                                            <v-icon size="32" color="grey">mdi-movie</v-icon>
                                        </div>
                                    </template>
                                </v-img>
                                <div v-if="isItemSubscribed(item)" class="tmdb-card-subscribed-badge" title="已订阅"></div>
                            </div>
                            <div class="md-media-card-title">{{ item.title }}</div>
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <div class="md-media-card-year" v-if="item.year">{{ item.year }}</div>
                                <span v-if="libraryCheckEnabled && isInLibrary(item) === true" class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                                <span v-else-if="libraryCheckEnabled && isInLibrary(item) === false" class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 类似 -->
                <div v-if="similarMedia.length > 0" class="mt-6 mb-4">
                    <div class="d-flex align-center justify-space-between mb-3">
                        <h2>类似</h2>
                        <a class="md-more-link" @click.prevent="goMorePage('similar')">更多 <v-icon size="16">mdi-arrow-right-circle-outline</v-icon></a>
                    </div>
                    <div class="md-media-scroll">
                        <div v-for="item in similarMedia" :key="item.tmdb_id" class="md-media-card" @click="goMediaDetail(item)">
                            <div style="position:relative;">
                                <v-img :src="getImgUrl(item.poster_path)" cover class="md-media-card-img" :aspect-ratio="2/3">
                                    <template #placeholder>
                                        <div class="d-flex align-center justify-center" style="width:100%;height:100%;background:rgba(var(--v-theme-on-surface),0.05)">
                                            <v-icon size="32" color="grey">mdi-movie</v-icon>
                                        </div>
                                    </template>
                                </v-img>
                                <div v-if="isItemSubscribed(item)" class="tmdb-card-subscribed-badge" title="已订阅"></div>
                            </div>
                            <div class="md-media-card-title">{{ item.title }}</div>
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <div class="md-media-card-year" v-if="item.year">{{ item.year }}</div>
                                <span v-if="libraryCheckEnabled && isInLibrary(item) === true" class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                                <span v-else-if="libraryCheckEnabled && isInLibrary(item) === false" class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <!-- ===== 添加订阅弹窗 ===== -->
        <v-dialog v-model="subscribeDialog" max-width="650" scrollable class="sub-add-dialog">
            <v-card rounded="xl">
                <v-card-title class="sub-add-title">
                    <div style="display: flex; align-items: center; min-width: 0; flex: 1;">
                        <v-icon class="mr-2" color="primary" style="flex-shrink: 0;">mdi-heart-plus</v-icon>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">添加订阅</span>
                    </div>
                    <v-btn icon variant="text" size="small" @click="subscribeDialog = false" style="flex-shrink: 0;"><v-icon>mdi-close</v-icon></v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="sub-add-content">
                    <div class="d-flex mb-4">
                        <div class="rounded-lg overflow-hidden mr-3" style="width:72px;flex-shrink:0">
                            <img v-if="subscribeForm.poster_path" :src="getImgUrl(subscribeForm.poster_path)" style="width:100%;aspect-ratio:2/3;object-fit:cover;display:block" />
                            <div v-else style="width:100%;aspect-ratio:2/3;background:#2a2a2a;display:flex;align-items:center;justify-content:center"><v-icon size="32" color="grey">mdi-movie</v-icon></div>
                        </div>
                        <div style="min-width: 0;">
                            <div class="text-subtitle-1 font-weight-bold" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ subscribeForm.name }}</div>
                            <div class="text-caption text-grey mt-1">{{ subscribeForm.year }} · {{ getTypeText(subscribeForm.type) }}</div>
                            <div class="text-caption text-grey">TMDB ID: {{ subscribeForm.tmdb_id }}</div>
                        </div>
                    </div>
                    <v-select v-if="subscribePresets.length > 0" v-model="selectedPresetIds"
                        :items="subscribePresets.map(p => ({title: p.name, value: p.id}))"
                        item-title="title" item-value="value" label="预设配置（多选，按选择顺序匹配）"
                        variant="outlined" density="compact" rounded="lg" class="mb-3"
                        prepend-inner-icon="mdi-tune-variant" multiple chips closable-chips
                        hint="按选择顺序依次匹配，首个匹配的预设决定执行方式" persistent-hint></v-select>
                    <v-row dense>
                        <v-col cols="6" md="6">
                            <v-select v-model="subscribeForm.mode"
                                :items="[{title:'分享追更',value:'share_strm'},{title:'转存追更',value:'transfer'}]"
                                item-title="title" item-value="value" label="订阅模式"
                                variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col cols="6" md="6">
                            <v-select v-model="subscribeForm.resolution" :items="options.resolutions || []"
                                item-title="label" item-value="value" label="分辨率"
                                variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col cols="6" md="6">
                            <v-select v-model="subscribeForm.effect" :items="options.effects || []"
                                item-title="label" item-value="value" label="特效"
                                variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col cols="6" md="6">
                            <v-select v-model="subscribeForm.resource_type" :items="options.resource_types || []"
                                item-title="label" item-value="value" label="来源类型"
                                variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col cols="6" md="6">
                            <v-autocomplete v-model="subscribeForm.release_group" :items="options.release_groups || []"
                                item-title="label" item-value="value" label="制作组"
                                variant="outlined" density="compact" rounded="lg"
                                clearable auto-select-first></v-autocomplete>
                        </v-col>
                        <v-col cols="6" md="3">
                            <v-select
                                :model-value="subscribeForm.frame_rate ? 'custom' : ''"
                                :items="[{title:'不限',value:''},{title:'自定义',value:'custom'}]"
                                item-title="title" item-value="value" label="帧率"
                                @update:model-value="val => { subscribeForm.frame_rate = val === 'custom' ? (subscribeForm.frame_rate || '60fps') : '' }"
                                variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col v-if="subscribeForm.frame_rate" cols="6" md="3">
                            <v-text-field v-model="subscribeForm.frame_rate" label="自定义帧率"
                                variant="outlined" density="compact" rounded="lg" placeholder="如 60fps"></v-text-field>
                        </v-col>
                        <v-col v-if="subscribeForm.type === 'tv' && subscribeForm.total_season > 0" cols="6" md="6">
                            <v-select v-model="subscribeForm.current_season"
                                :items="[{title: '全部季', value: 0}].concat(Array.from({length: subscribeForm.total_season}, (_, i) => { const ep = getSeasonEpisodeCount(i+1); return {title: '第'+(i+1)+'季' + (ep ? ' ('+ep+'集)' : ''), value: i+1}; }))"
                                item-title="title" item-value="value" label="当前订阅季"
                                variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col v-if="subscribeForm.type === 'tv' && subscribeForm.current_season > 0" cols="6" md="3">
                            <v-text-field v-model.number="subscribeForm.total_episode" label="总集数" type="number"
                                variant="outlined" density="compact" rounded="lg" min="0"
                                hint="该季总集数" persistent-hint></v-text-field>
                        </v-col>
                        <v-col v-if="subscribeForm.type === 'tv' && subscribeForm.current_season > 0" cols="6" md="3">
                            <v-text-field v-model.number="subscribeForm.start_episode" label="开始集数" type="number"
                                variant="outlined" density="compact" rounded="lg" min="1"
                                hint="从第几集开始追" persistent-hint></v-text-field>
                        </v-col>
                        <v-col cols="6" md="6">
                            <v-select v-model="subscribeForm.search_source"
                                :items="[{title:'TG+影巢',value:'tg_hdhive'},{title:'影巢',value:'hdhive'},{title:'TG',value:'tg'}]"
                                item-title="title" item-value="value" label="搜索来源" variant="outlined" density="compact" rounded="lg"></v-select>
                        </v-col>
                        <v-col v-if="subscribeForm.mode === 'transfer'" cols="6" md="6">
                            <v-select v-model="subscribeTransferFolderCid"
                                :items="subscribeTransferFolders.map(f => ({title: f.alias || f.name || ('CID: ' + f.cid), value: f.cid}))"
                                item-title="title" item-value="value" label="转存文件夹" variant="outlined" density="compact" rounded="lg"
                                no-data-text="请先在订阅设置中添加转存文件夹"></v-select>
                        </v-col>
                        <v-col v-if="subscribeForm.mode === 'share_strm'" cols="6" md="6">
                            <v-select v-model="subscribeForm.strm_folder_path"
                                :items="subscribeShareStrmFolders"
                                item-title="title" item-value="value" label="STRM 输出路径" variant="outlined" density="compact" rounded="lg"
                                no-data-text="请先在 115 分享 STRM 配置中添加目录"></v-select>
                        </v-col>
                        <v-col cols="12">
                            <v-switch v-if="subscribeForm.mode === 'share_strm'" v-model="subscribeForm.reshare_enabled" label="转存再分享模式" color="primary" hide-details density="compact" class="mb-1"></v-switch>
                            <v-switch v-model="subscribeForm.transfer_all_matches" :label="subscribeForm.mode === 'share_strm' ? '多个分享全部生成分享 STRM（如果多个文件名字同时命中所选参数则全部生成分享 STRM）' : '多资源全部转存（如果多个文件名字同时命中所选参数则全部转存）'" color="primary" hide-details density="compact" class="mb-1"></v-switch>
                            <v-switch v-model="subscribeForm.run_immediately" label="添加后立即执行" color="success" hide-details density="compact"></v-switch>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions class="sub-add-actions">
                    <v-spacer></v-spacer>
                    <v-btn variant="tonal" rounded="pill" @click="subscribeDialog=false" size="small">取消</v-btn>
                    <v-btn color="primary" variant="elevated" rounded="pill" @click="saveSubscribe" :loading="subscribeSaving" class="px-6" size="small">确认订阅</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ===== HDHive 详情弹窗 ===== -->
        <v-dialog v-model="hdhiveDetailDialog" max-width="600px" scrollable>
            <v-card v-if="hdhiveDetailItem" style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-movie-outline</v-icon>
                    {{ hdhiveGetTitle(hdhiveDetailItem) }}
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="hdhiveDetailDialog = false"><v-icon size="20">mdi-close</v-icon></v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <div style="display: flex; gap: 16px;">
                        <img v-if="hdhiveGetPoster(hdhiveDetailItem)" :src="hdhiveGetPoster(hdhiveDetailItem)" style="width: 100px; border-radius: 12px; flex-shrink: 0; object-fit: cover;" />
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                                <v-chip v-if="hdhiveGetType(hdhiveDetailItem)" size="small" :color="hdhiveGetType(hdhiveDetailItem) === '电影' ? 'blue' : 'green'" variant="tonal">{{ hdhiveGetType(hdhiveDetailItem) }}</v-chip>
                                <v-chip v-if="hdhiveGetYear(hdhiveDetailItem)" size="small" variant="tonal"><v-icon start size="14">mdi-calendar</v-icon>{{ hdhiveGetYear(hdhiveDetailItem) }}</v-chip>
                                <v-chip v-if="hdhiveDetailItem.id" size="small" variant="outlined">TMDB: {{ hdhiveDetailItem.id }}</v-chip>
                            </div>
                            <div v-if="hdhiveDetailItem.overview" :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '13px', lineHeight: '1.6', maxHeight: '80px', overflow: 'hidden' }">{{ hdhiveDetailItem.overview }}</div>
                            <div v-else :style="{ opacity: 0.4, fontSize: '13px' }">暂无简介</div>
                        </div>
                    </div>
                    <v-divider style="margin: 16px 0;"></v-divider>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon size="20" color="primary">mdi-folder-network-outline</v-icon>
                        <span :style="{ fontSize: '15px', fontWeight: '600', color: 'rgb(var(--v-theme-on-background))' }">115 网盘资源</span>
                        <v-chip v-if="!hdhiveResourcesLoading" size="x-small" variant="tonal" color="primary">{{ hdhiveResources.length }}</v-chip>
                        <v-progress-circular v-if="hdhiveResourcesLoading" indeterminate size="16" width="2" color="primary"></v-progress-circular>
                    </div>
                    <div v-if="hdhiveResourcesLoading" style="text-align: center; padding: 20px;">
                        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
                        <div :style="{ marginTop: '8px', fontSize: '13px', opacity: 0.5, color: 'rgb(var(--v-theme-on-background))' }">加载资源列表...</div>
                    </div>
                    <div v-else-if="hdhiveResources.length === 0" style="text-align: center; padding: 20px; opacity: 0.4;">
                        <v-icon size="36" color="grey">mdi-package-variant</v-icon>
                        <div style="margin-top: 8px; font-size: 13px;">暂无 115 网盘资源</div>
                    </div>
                    <div v-else>
                        <div v-for="(res, idx) in hdhiveResources" :key="res.slug || idx"
                             style="padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: all 0.2s;"
                             :style="{ background: idx % 2 === 0 ? 'rgba(var(--v-theme-on-surface),0.02)' : 'rgba(var(--v-theme-on-surface),0.04)' }">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
                                        <v-chip v-if="res.is_official" size="x-small" variant="tonal" color="amber-darken-2" style="font-weight: 600;"><v-icon start size="10">mdi-check-decagram</v-icon>官组</v-chip>
                                        <v-chip size="x-small" :color="res.unlock_points === 0 ? 'success' : 'warning'" variant="flat" style="font-weight: 600;">{{ res.unlock_points === 0 ? '免费' : res.unlock_points + ' 积分' }}</v-chip>
                                        <v-chip v-if="res.share_size" size="x-small" variant="tonal"><v-icon start size="10">mdi-harddisk</v-icon>{{ res.share_size }}</v-chip>
                                        <v-chip v-for="vr in (res.video_resolution || [])" :key="vr" size="x-small" variant="outlined" color="info">{{ vr }}</v-chip>
                                        <v-chip v-if="res.unlocked_users_count" size="x-small" variant="tonal" color="grey"><v-icon start size="10">mdi-account-group</v-icon>{{ res.unlocked_users_count }} 人解锁</v-chip>
                                        <v-chip v-if="res.publisher" size="x-small" variant="tonal" color="cyan"><v-icon start size="10">mdi-account</v-icon>{{ res.publisher }}</v-chip>
                                    </div>
                                    <div v-if="res.remark" :style="{ fontSize: '13px', lineHeight: '1.5', color: 'rgb(var(--v-theme-on-background))', wordBreak: 'break-word' }">{{ res.remark }}</div>
                                    <div v-else :style="{ fontSize: '13px', opacity: 0.4 }">{{ res.title || '无备注' }}</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                                        <v-chip v-for="src in (res.source || [])" :key="src" size="x-small" variant="outlined" style="font-size: 10px;">{{ src }}</v-chip>
                                        <v-chip v-for="sl in (res.subtitle_language || [])" :key="sl" size="x-small" variant="outlined" color="purple" style="font-size: 10px;">{{ sl }}</v-chip>
                                        <v-chip v-for="st in (res.subtitle_type || [])" :key="st" size="x-small" variant="outlined" color="teal" style="font-size: 10px;">{{ st }}</v-chip>
                                    </div>
                                </div>
                                <div style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0;">
                                    <div class="one-click-transfer-btn" :style="{ opacity: savingResources[res.slug] ? 0.6 : 1, pointerEvents: savingResources[res.slug] || savedResources[res.slug] === 'success' ? 'none' : 'auto', background: savedResources[res.slug] === 'success' ? 'rgba(76,175,80,0.15)' : savedResources[res.slug] === 'error' ? 'rgba(244,67,54,0.15)' : '', color: savedResources[res.slug] === 'success' ? '#4CAF50' : savedResources[res.slug] === 'error' ? '#F44336' : '', borderColor: savedResources[res.slug] === 'success' ? 'rgba(76,175,80,0.4)' : savedResources[res.slug] === 'error' ? 'rgba(244,67,54,0.4)' : '' }" @click.stop="doSaveHdhiveResource(res)">
                                        <v-progress-circular v-if="savingResources[res.slug]" indeterminate size="14" width="2" style="margin-right: 6px;"></v-progress-circular>
                                        <img v-else src="assets/images/115-icon.ico" />
                                        {{ savedResources[res.slug] === 'success' ? '已转存' : '一键转存' }}
                                    </div>
                                    <div class="one-click-transfer-btn" :style="{ opacity: strmSavingResources[res.slug] ? 0.6 : 1, pointerEvents: strmSavingResources[res.slug] || strmSavedResources[res.slug] === 'success' ? 'none' : 'auto', background: strmSavedResources[res.slug] === 'success' ? 'rgba(76,175,80,0.15)' : strmSavedResources[res.slug] === 'error' ? 'rgba(244,67,54,0.15)' : '', color: strmSavedResources[res.slug] === 'success' ? '#4CAF50' : strmSavedResources[res.slug] === 'error' ? '#F44336' : '', borderColor: strmSavedResources[res.slug] === 'success' ? 'rgba(76,175,80,0.4)' : strmSavedResources[res.slug] === 'error' ? 'rgba(244,67,54,0.4)' : '' }" @click.stop="doShareStrmHdhiveResource(res)">
                                        <v-progress-circular v-if="strmSavingResources[res.slug]" indeterminate size="14" width="2" style="margin-right: 6px;"></v-progress-circular>
                                        <img v-else src="assets/images/115-icon.ico" />
                                        {{ strmSavedResources[res.slug] === 'success' ? '已提交' : '分享STRM' }}
                                    </div>
                                    <a :href="'https://hdhive.com/resource/115/' + res.slug" target="_blank" style="text-decoration: none;">
                                        <v-btn size="small" variant="tonal" color="primary" block style="border-radius: 8px;"><v-icon size="14">mdi-open-in-new</v-icon></v-btn>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- ===== 频道搜索弹窗 ===== -->
        <v-dialog v-model="tgSearchDialogVisible" max-width="600px" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="teal" size="22" class="mr-2">mdi-magnify</v-icon>
                    <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">频道搜索: {{ tgSearchDialogKeyword }}</span>
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="tgSearchDialogVisible = false"><v-icon size="20">mdi-close</v-icon></v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <div v-if="detailData" style="display: flex; gap: 16px; margin-bottom: 16px;">
                        <img v-if="detailData.poster_path" :src="getImgUrl(detailData.poster_path)" style="width: 80px; border-radius: 12px; flex-shrink: 0; object-fit: cover;" />
                        <div style="flex: 1; min-width: 0;">
                            <div :style="{ fontSize: '15px', fontWeight: '600', color: 'rgb(var(--v-theme-on-background))' }">{{ detailData.title || detailData.original_title }}</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                                <v-chip v-if="detailData.year" size="x-small" variant="tonal"><v-icon start size="10">mdi-calendar</v-icon>{{ detailData.year }}</v-chip>
                                <v-chip size="x-small" :color="detailData.type === 'movie' ? 'blue' : 'green'" variant="tonal">{{ getTypeText(detailData.type) }}</v-chip>
                            </div>
                        </div>
                    </div>
                    <v-divider style="margin-bottom: 12px;"></v-divider>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <v-icon size="20" color="teal">mdi-forum-outline</v-icon>
                        <span :style="{ fontSize: '15px', fontWeight: '600', color: 'rgb(var(--v-theme-on-background))' }">频道消息</span>
                        <v-chip v-if="!tgSearchDialogLoading" size="x-small" variant="tonal" color="teal">{{ tgSearchDialogResults.length }}</v-chip>
                        <v-progress-circular v-if="tgSearchDialogLoading" indeterminate size="16" width="2" color="teal"></v-progress-circular>
                    </div>
                    <div v-if="tgSearchDialogLoading" style="text-align: center; padding: 20px;">
                        <v-progress-circular indeterminate color="teal" size="32"></v-progress-circular>
                        <div :style="{ marginTop: '8px', fontSize: '13px', opacity: 0.5, color: 'rgb(var(--v-theme-on-background))' }">搜索频道消息...</div>
                    </div>
                    <div v-else-if="tgSearchDialogResults.length === 0" style="text-align: center; padding: 20px; opacity: 0.4;">
                        <v-icon size="36" color="grey">mdi-message-off-outline</v-icon>
                        <div style="margin-top: 8px; font-size: 13px;">未找到相关消息</div>
                    </div>
                    <div v-else>
                        <div v-for="(msg, idx) in tgSearchDialogResults" :key="msg.message_id || idx"
                             style="padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: all 0.2s;"
                             :style="{ background: idx % 2 === 0 ? 'rgba(var(--v-theme-on-surface),0.02)' : 'rgba(var(--v-theme-on-surface),0.04)' }">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
                                <v-chip size="x-small" color="teal" variant="tonal"><v-icon start size="10">mdi-forum-outline</v-icon>{{ getTgChannelName(msg.channel_id) }}</v-chip>
                                <v-chip size="x-small" variant="tonal"><v-icon start size="10">mdi-clock-outline</v-icon>{{ tgFormatDate(msg.date) }}</v-chip>
                                <v-chip v-if="msg.views" size="x-small" variant="tonal"><v-icon start size="10">mdi-eye-outline</v-icon>{{ msg.views }}</v-chip>
                                <v-chip v-if="extract115Links(msg.text).length > 0" size="x-small" color="success" variant="tonal">
                                    <img src="assets/images/115-icon.ico" style="width: 12px; height: 12px; margin-right: 4px;">
                                    {{ extract115Links(msg.text).length }} 个115链接
                                </v-chip>
                                <v-chip v-if="msg._telegraphLoading" size="x-small" color="teal" variant="tonal">
                                    <v-progress-circular indeterminate size="10" width="1" class="mr-1"></v-progress-circular>
                                    解析 Telegraph...
                                </v-chip>
                            </div>
                            <div :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }">{{ truncateText(msg.text, 200) }}</div>
                            <div v-if="extract115Links(msg.text).length > 0" style="margin-top: 8px;">
                                <div v-for="link in extract115Links(msg.text)" :key="link.url" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.06); background: rgba(var(--v-theme-on-surface),0.02);">
                                    <div style="flex: 1; min-width: 0;">
                                        <div :style="{ fontSize: '11px', color: 'rgb(var(--v-theme-on-background))', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ link.url }}</div>
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                                        <div class="one-click-transfer-btn" :style="{ opacity: savingLinks[link.url] ? 0.6 : 1, pointerEvents: savingLinks[link.url] || savedLinks[link.url] === 'success' ? 'none' : 'auto', background: savedLinks[link.url] === 'success' ? 'rgba(76,175,80,0.15)' : savedLinks[link.url] === 'error' ? 'rgba(244,67,54,0.15)' : '', color: savedLinks[link.url] === 'success' ? '#4CAF50' : savedLinks[link.url] === 'error' ? '#F44336' : '', borderColor: savedLinks[link.url] === 'success' ? 'rgba(76,175,80,0.4)' : savedLinks[link.url] === 'error' ? 'rgba(244,67,54,0.4)' : '' }" @click.stop="doSave115Link(link)">
                                            <v-progress-circular v-if="savingLinks[link.url]" indeterminate size="14" width="2" style="margin-right: 6px;"></v-progress-circular>
                                            <img v-else src="assets/images/115-icon.ico" />
                                            {{ savedLinks[link.url] === 'success' ? '已转存' : '一键转存' }}
                                        </div>
                                        <div class="one-click-transfer-btn" :style="{ opacity: strmSavingLinks[link.url] ? 0.6 : 1, pointerEvents: strmSavingLinks[link.url] || strmSavedLinks[link.url] === 'success' ? 'none' : 'auto', background: strmSavedLinks[link.url] === 'success' ? 'rgba(76,175,80,0.15)' : strmSavedLinks[link.url] === 'error' ? 'rgba(244,67,54,0.15)' : '', color: strmSavedLinks[link.url] === 'success' ? '#4CAF50' : strmSavedLinks[link.url] === 'error' ? '#F44336' : '', borderColor: strmSavedLinks[link.url] === 'success' ? 'rgba(76,175,80,0.4)' : strmSavedLinks[link.url] === 'error' ? 'rgba(244,67,54,0.4)' : '' }" @click.stop="doShareStrm115Link(link)">
                                            <v-progress-circular v-if="strmSavingLinks[link.url]" indeterminate size="14" width="2" style="margin-right: 6px;"></v-progress-circular>
                                            <img v-else src="assets/images/115-icon.ico" />
                                            {{ strmSavedLinks[link.url] === 'success' ? '已提交' : '分享STRM' }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- ===== 转存文件夹选择弹窗 ===== -->
        <v-dialog v-model="folderPickerDialog" max-width="400" persistent>
            <v-card style="border-radius: 16px;">
                <v-card-title style="padding: 16px 20px; font-size: 15px; font-weight: 600;">
                    <v-icon color="warning" size="20" class="mr-2">mdi-folder-open</v-icon>选择转存文件夹
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 12px 20px;">
                    <div v-for="folder in pickerFolderList" :key="folder.cid"
                         style="padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; cursor: pointer; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: background 0.2s;"
                         @click="pickTransferFolder(folder)"
                         @mouseenter="$event.target.style.background='rgba(var(--v-theme-primary),0.08)'"
                         @mouseleave="$event.target.style.background=''">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon size="18" color="warning">mdi-folder</v-icon>
                            <span style="font-size: 14px;">{{ folder.alias || folder.name || ('CID: ' + folder.cid) }}</span>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="tonal" size="small" @click="folderPickerDialog = false">取消</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- ===== STRM 文件夹选择弹窗 ===== -->
        <v-dialog v-model="strmFolderPickerDialog" max-width="400" persistent>
            <v-card style="border-radius: 16px;">
                <v-card-title style="padding: 16px 20px; font-size: 15px; font-weight: 600;">
                    <v-icon color="teal" size="20" class="mr-2">mdi-folder-open</v-icon>选择 STRM 输出路径
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 12px 20px;">
                    <div v-for="(folder, idx) in strmPickerFolderList" :key="idx"
                         style="padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; cursor: pointer; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: background 0.2s;"
                         @click="pickStrmFolder(folder, idx)"
                         @mouseenter="$event.target.style.background='rgba(var(--v-theme-primary),0.08)'"
                         @mouseleave="$event.target.style.background=''">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-icon size="18" color="teal">mdi-folder</v-icon>
                            <span style="font-size: 14px;">{{ folder.name || folder.path }}</span>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="tonal" size="small" @click="strmFolderPickerDialog = false">取消</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
    `
};
