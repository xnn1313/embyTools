const DiscoverPage = {
    name: 'DiscoverPage',
    data() {
        return {
            loading: false,
            // 当前激活的Tab: tmdb / douban / settings
            activeTab: 'tmdb',
            // 当前选中的分类 key
            selectedCategory: 'discover_movies',
            // TMDB 分类
            tmdbCategories: [
                { key: 'discover_movies', title: '电影', icon: 'mdi-movie', sortable: true },
                { key: 'discover_tvs', title: '电视剧', icon: 'mdi-television-classic', sortable: true },
                { key: 'trending', title: '流行趋势', icon: 'mdi-fire', sortable: false },
                { key: 'now_playing', title: '正在热映', icon: 'mdi-filmstrip', sortable: false },
                { key: 'upcoming', title: '即将上映', icon: 'mdi-calendar-clock', sortable: false },
                { key: 'popular_movies', title: '热门电影', icon: 'mdi-movie-star', sortable: false },
                { key: 'top_rated_movies', title: '高分电影', icon: 'mdi-star-shooting', sortable: false },
                { key: 'popular_tvs', title: '热门剧集', icon: 'mdi-television-play', sortable: false },
                { key: 'top_rated_tvs', title: '高分剧集', icon: 'mdi-star-check', sortable: false },
                { key: 'on_the_air', title: '正在播出', icon: 'mdi-broadcast', sortable: false },
            ],
            // 豆瓣分类
            doubanCategories: [
                { key: 'douban_showing', title: '正在热映', icon: 'mdi-fire-circle' },
                { key: 'douban_movie_hot', title: '热门电影', icon: 'mdi-movie-open-star' },
                { key: 'douban_movie_soon', title: '即将上映', icon: 'mdi-calendar-clock' },
                { key: 'douban_tv_hot', title: '热门电视剧', icon: 'mdi-television-play' },
                { key: 'douban_tv_animation', title: '热门动漫', icon: 'mdi-robot-happy' },
                { key: 'douban_movies', title: '最新电影', icon: 'mdi-new-box' },
                { key: 'douban_tvs', title: '最新电视剧', icon: 'mdi-television-shimmer' },
                { key: 'douban_movie_top250', title: '电影TOP250', icon: 'mdi-podium-gold' },
                { key: 'douban_movie_scifi', title: '经典科幻', icon: 'mdi-rocket-launch' },
                { key: 'douban_movie_comedy', title: '经典喜剧', icon: 'mdi-emoticon-happy' },
                { key: 'douban_movie_action', title: '经典动作', icon: 'mdi-sword-cross' },
                { key: 'douban_movie_love', title: '经典爱情', icon: 'mdi-heart' },
                { key: 'douban_tv_domestic', title: '国产剧', icon: 'mdi-flag' },
                { key: 'douban_tv_american', title: '美剧', icon: 'mdi-flag-variant' },
                { key: 'douban_tv_japanese', title: '日剧', icon: 'mdi-flower-tulip' },
                { key: 'douban_tv_korean', title: '韩剧', icon: 'mdi-music-note' },
                { key: 'douban_tv_variety_show', title: '综艺', icon: 'mdi-party-popper' },
                { key: 'douban_show_hot', title: '热门综艺', icon: 'mdi-microphone-variant' },
                { key: 'douban_tv_weekly_chinese', title: '国产剧集榜', icon: 'mdi-trophy' },
                { key: 'douban_tv_weekly_global', title: '全球剧集榜', icon: 'mdi-earth' },
            ],
            // 排序
            sortBy: 'popularity.desc',
            sortOptions: [
                { key: 'popularity.desc', title: '热度降序', icon: 'mdi-sort-descending' },
                { key: 'popularity.asc', title: '热度升序', icon: 'mdi-sort-ascending' },
                { key: 'vote_average.desc', title: '评分降序', icon: 'mdi-star-minus' },
                { key: 'vote_average.asc', title: '评分升序', icon: 'mdi-star-plus' },
                { key: 'primary_release_date.desc', title: '最新上映', icon: 'mdi-calendar-arrow-left' },
                { key: 'revenue.desc', title: '票房最高', icon: 'mdi-cash-multiple' },
                { key: 'vote_count.desc', title: '评分人数', icon: 'mdi-account-group' },
                { key: 'first_air_date.desc', title: '最新首播', icon: 'mdi-calendar-star' },
            ],
            // 豆瓣 TMDB 关联
            tmdbLookupLoading: false,
            tmdbLookupResult: null,
            // 全局设置
            globalSettings: {
                emby_library_config: '',
                tmdb_library_check: false,
                douban_tmdb_fallback: false,
            },
            embyConfigOptions: [],
            // globalSettingsSaving removed, replaced by discoverSettingsSaving
            mediaList: [],
            page: 1,
            loadingMore: false,
            hasMore: true,
            // 搜索
            searchQuery: '',
            searchLoading: false,
            isSearchMode: false,
            // 详情弹窗
            detailDialog: false,
            detailData: null,
            detailLoading: false,
            detailSeasons: [],
            // 添加订阅弹窗
            subscribeDialog: false,
            subscribeForm: {
                name: '', year: '', type: 'movie', tmdb_id: 0,
                poster_path: '', backdrop_path: '', overview: '',
                total_season: 0, total_episode: 0, current_season: 1, start_episode: 1,
                resolution: '', effect: '', resource_type: '', release_group: '',
                frame_rate: '',
                mode: 'share_strm',
                reshare_enabled: false,
                run_immediately: false
            },
            subscribeSaving: false,
            subscribeTransferFolderCid: '',
            subscribeTransferFolders: [],
            subscribeShareStrmFolders: [],
            subscribePresets: [],
            selectedPresetIds: [],
            options: { resolutions: [], effects: [], resource_types: [], release_groups: [], speed_modes: [], configs_115: [] },
            // 骨架屏
            skeletonCount: 18,
            // 已订阅标记（红心）
            subscribedSet: {},  // { 'tmdb_id-type': true }
            // Emby 入库状态
            libraryStatus: {},  // { 'name-year': true/false }
            libraryCheckEnabled: false,
            libraryChecking: false,
            // 剧集季/集详情（详情弹窗用）
            seasonEpisodesInfo: {},   // { season_number: [{ episode_number, name, air_date, ... }] }
            embySeasonEpisodes: {},   // { season_number: [episode_numbers] } 已入库集
            episodeCheckLoading: false,
            expandedSeason: null,     // 当前展开的季
            // Emby 视频版本信息
            mediaVersions: null,      // { type, versions, episodes }
            mediaVersionsLoading: false,
            // HDHive 搜索（账号和积分限制统一使用工具箱-HDHive 解析的配置）
            hdhiveSelectedAccount: '',
            hdhiveDetailDialog: false,
            hdhiveDetailItem: null,
            hdhiveResources: [],
            hdhiveResourcesLoading: false,
            hdhiveSearchLoading: false,
            // 一键转存
            tgSearchConfig: {},
            transferConfigs115: [],
            savingResources: {},
            savedResources: {},
            // 转存文件夹浏览
            transferFolderDialog: false,
            transferFolderLoading: false,
            transferFolders115: [],
            transferCurrentCid: '0',
            transferFolderPath: [{ name: '根目录', cid: '0' }],
            transferCreateFolderMode: false,
            transferCreateFolderName: '',
            transferCreateFolderLoading: false,
            // 多文件夹选择弹窗
            folderPickerDialog: false,
            folderPickerCallback: null,
            pickerFolderList: [],
            // 看板设置保存
            discoverSettingsSaving: false,
            // ===== 频道搜索（原资源搜索整合） =====
            tgChannels: [],
            tgChannelDialog: false,
            tgChannelForm: { name: '', channel_id: '' },
            tgEditingChannelIndex: -1,
            tgSelectedChannel: 'all',
            tgSearchKeyword: '',
            tgChannelSearchLoading: false,
            tgSearchResults: [],
            tgSearchCount: 0,
            tgMsgDetailDialog: false,
            tgDetailMessage: null,
            tgChannelExportDialog: false,
            tgChannelExportJson: '',
            tgChannelImportDialog: false,
            tgChannelImportJson: '',
            tgChannelImporting: false,
            tgPickerDialog: false,
            tgPickerLoading: false,
            tgMyChannels: [],
            tgPickerSearch: '',
            tgPickerSelected: [],
            tgPickerAliases: {},
            tgApiConfigs: [],
            selectedTgConfig: '',
            savingLinks: {},
            savedLinks: {},
            tgSettingsSaving: false,
            // 分享STRM
            shareStrmConfig: {},
            strmSavingLinks: {},
            strmSavedLinks: {},
            strmSavingResources: {},
            strmSavedResources: {},
            strmFolderPickerDialog: false,
            strmFolderPickerCallback: null,
            strmPickerFolderList: [],
            // 频道搜索弹窗（从详情页触发）
            tgSearchDialogVisible: false,
            tgSearchDialogLoading: false,
            tgSearchDialogResults: [],
            tgSearchDialogKeyword: '',
            tgSearchDialogCount: 0,
            tgSearchDialogItem: null,
        }
    },
    computed: {
        currentCategories() {
            return this.activeTab === 'tmdb' ? this.tmdbCategories : this.doubanCategories;
        },
        allCategories() {
            return [...this.tmdbCategories, ...this.doubanCategories];
        },
        isSortable() {
            const cat = this.allCategories.find(c => c.key === this.selectedCategory);
            return cat && cat.sortable;
        },
        filteredTgMyChannels() {
            const blocked = ['-1003092300229', '-1003714442743'];
            let list = this.tgMyChannels.filter(c => !blocked.includes(String(c.id)));
            if (!this.tgPickerSearch) return list;
            const kw = this.tgPickerSearch.toLowerCase();
            return list.filter(c => (c.name || '').toLowerCase().includes(kw) || String(c.id).includes(kw) || (c.username || '').toLowerCase().includes(kw));
        }
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
        // 从 URL 子路径恢复 tab 状态
        const hash = window.location.hash.replace(/^#\/?/, '');
        const parts = hash.split('/');
        let initTab = 'tmdb';
        if (parts[0] === 'discover' && parts[1]) {
            const validTabs = ['tmdb', 'douban', 'tg_search', 'settings'];
            if (validTabs.includes(parts[1])) {
                initTab = parts[1];
            }
        }
        this.activeTab = initTab;
        // 从 URL 第三段恢复 category（若有且合法），否则使用默认分类
        let initCategory = null;
        if (initTab !== 'tg_search' && initTab !== 'settings') {
            const cats = initTab === 'douban' ? this.doubanCategories : this.tmdbCategories;
            const urlCategory = parts[2] || '';
            initCategory = cats.some(c => c.key === urlCategory) ? urlCategory : cats[0].key;
        }
        
        // 尝试从缓存恢复（仅当 tab + category 与 URL 匹配时生效）
        // 适用场景：从详情页 / 演员页 / 更多页返回时，保留已加载的分页与滚动位置
        const cached = window.__discoverPageState;
        let restored = false;
        if (cached
            && cached.activeTab === initTab
            && cached.selectedCategory === initCategory
            && Array.isArray(cached.mediaList)
            && cached.mediaList.length > 0) {
            this.selectedCategory = cached.selectedCategory;
            this.mediaList = cached.mediaList;
            this.page = cached.page || 1;
            this.hasMore = cached.hasMore !== false;
            this.sortBy = cached.sortBy || this.sortBy;
            this.isSearchMode = !!cached.isSearchMode;
            this.searchQuery = cached.searchQuery || '';
            if (cached.subscribedSet) this.subscribedSet = cached.subscribedSet;
            if (cached.libraryStatus) this.libraryStatus = cached.libraryStatus;
            restored = true;
        }
        // 单次使用即清除，避免污染后续刷新 / 从侧栏进入的场景
        window.__discoverPageState = null;
        
        const initLoad = restored
            ? Promise.resolve()
            : (initCategory ? this.selectCategory(initCategory) : Promise.resolve());
        await Promise.all([initLoad, this.loadOptions(), this.loadLibraryConfig(), this.loadSubscribedIds(), this.loadHdhiveConfig(), this.loadTransferConfig().then(() => this.loadTgChannelData()), this.loadShareStrmConfig()]);
        
        // 恢复场景：重建滚动观察器并滚回原位置
        if (restored) {
            // 优先使用 router 在 push/back 前同步保存的 scrollY；
            // 兜底使用 __discoverPageState.scrollY（历史兼容）
            const routerY = (typeof router !== 'undefined' && router.consumeSavedScroll)
                ? router.consumeSavedScroll(router.getCurrentRoute())
                : 0;
            const targetY = routerY || cached.scrollY || 0;
            this.$nextTick(() => {
                window.scrollTo({ top: targetY, behavior: 'instant' });
                // 再次 nextTick 确保 DOM 完成布局后再绑定 observer
                this.$nextTick(() => {
                    window.scrollTo({ top: targetY, behavior: 'instant' });
                    this.setupScrollObserver();
                });
            });
        }
        
        // 处理从详情页返回的 action
        this.$nextTick(() => {
            if (window.__discoverAction) {
                const act = window.__discoverAction;
                window.__discoverAction = null;
                if (act.action === 'tg_search' && act.keyword) {
                    this.detailData = { title: act.keyword };
                    this.openTgSearchFromDetail();
                } else if (act.action === 'hdhive_search' && act.tmdb_id) {
                    this.detailData = {
                        tmdb_id: act.tmdb_id,
                        title: act.title || '',
                        original_title: act.original_title || '',
                        year: act.year || '',
                        type: act.type || 'movie',
                    };
                    this.openHdhiveFromDetail();
                } else if (act.action === 'subscribe' && act.media) {
                    this.detailData = act.media;
                    this.detailSeasons = act.seasons || [];
                    this.openSubscribeFromDetail();
                }
            }
        });
    },
    beforeUnmount() {
        if (this._scrollObserver) {
            this._scrollObserver.disconnect();
            this._scrollObserver = null;
        }
        // 缓存当前浏览状态，供从详情/演员/更多页返回时恢复
        // （分类、分页、已加载的列表、滚动位置、搜索态）
        try {
            window.__discoverPageState = {
                activeTab: this.activeTab,
                selectedCategory: this.selectedCategory,
                mediaList: this.mediaList,
                page: this.page,
                hasMore: this.hasMore,
                loadingMore: false,
                sortBy: this.sortBy,
                isSearchMode: this.isSearchMode,
                searchQuery: this.searchQuery,
                subscribedSet: this.subscribedSet,
                libraryStatus: this.libraryStatus,
                scrollY: window.scrollY || window.pageYOffset || 0,
                savedAt: Date.now(),
            };
        } catch (e) { /* 忽略缓存失败 */ }
    },
    methods: {
        async loadOptions() {
            try { this.options = await api.getSubscribeOptions(); } catch (e) { console.error(e); }
        },
        async fetchCategoryData(key, page = 1) {
            switch (key) {
                // TMDB
                case 'trending': return await api.tmdbTrending({ page });
                case 'now_playing': return await api.tmdbNowPlaying(page);
                case 'upcoming': return await api.tmdbUpcoming(page);
                case 'popular_movies': return await api.tmdbPopularMovies(page);
                case 'top_rated_movies': return await api.tmdbTopRatedMovies(page);
                case 'discover_movies': return await api.tmdbDiscoverMovies({ sort_by: this.sortBy, page });
                case 'popular_tvs': return await api.tmdbPopularTvs(page);
                case 'top_rated_tvs': return await api.tmdbTopRatedTvs(page);
                case 'discover_tvs': return await api.tmdbDiscoverTvs({ sort_by: this.sortBy, page });
                case 'on_the_air': return await api.tmdbOnTheAir(page);
                // 豆瓣
                case 'douban_showing': return await api.doubanShowing(page);
                case 'douban_movie_hot': return await api.doubanMovieHot(page);
                case 'douban_movie_soon': return await api.doubanMovieSoon(page);
                case 'douban_tv_hot': return await api.doubanTvHot(page);
                case 'douban_tv_animation': return await api.doubanTvAnimation(page);
                case 'douban_movies': return await api.doubanMovies(page);
                case 'douban_tvs': return await api.doubanTvs(page);
                case 'douban_movie_top250': return await api.doubanMovieTop250(page);
                case 'douban_movie_scifi': return await api.doubanMovieScifi(page);
                case 'douban_movie_comedy': return await api.doubanMovieComedy(page);
                case 'douban_movie_action': return await api.doubanMovieAction(page);
                case 'douban_movie_love': return await api.doubanMovieLove(page);
                case 'douban_tv_domestic': return await api.doubanTvDomestic(page);
                case 'douban_tv_american': return await api.doubanTvAmerican(page);
                case 'douban_tv_japanese': return await api.doubanTvJapanese(page);
                case 'douban_tv_korean': return await api.doubanTvKorean(page);
                case 'douban_tv_variety_show': return await api.doubanTvVarietyShow(page);
                case 'douban_show_hot': return await api.doubanShowHot(page);
                case 'douban_tv_weekly_chinese': return await api.doubanTvWeeklyChinese(page);
                case 'douban_tv_weekly_global': return await api.doubanTvWeeklyGlobal(page);
                default: return [];
            }
        },
        switchTab(tab) {
            if (this.activeTab === tab) return;
            this.activeTab = tab;
            // 同步 tab 到 URL
            const base = 'discover';
            if (tab === 'tmdb') {
                router.push(base);
            } else {
                router.push(base + '/' + tab);
            }
            this.isSearchMode = false;
            this.searchQuery = '';
            this.mediaList = [];
            this.libraryStatus = {};
            if (this._scrollObserver) { this._scrollObserver.disconnect(); this._scrollObserver = null; }
            if (tab === 'tg_search' || tab === 'settings') return;
            const cats = tab === 'tmdb' ? this.tmdbCategories : this.doubanCategories;
            this.selectCategory(cats[0].key);
        },
        async selectCategory(categoryKey) {
            if (this.selectedCategory === categoryKey && this.mediaList.length > 0 && !this.isSearchMode) return;
            this.selectedCategory = categoryKey;
            // 静默同步 category 到 URL（不触发组件重建、不新增历史），
            // 以便从详情页返回时能恢复到此分类
            if (this.activeTab === 'tmdb' || this.activeTab === 'douban') {
                router.replace(`discover/${this.activeTab}/${categoryKey}`);
            }
            this.isSearchMode = false;
            this.searchQuery = '';
            this.page = 1;
            this.hasMore = true;
            this.mediaList = [];
            this.libraryStatus = {};
            this.loading = true;
            if (this._scrollObserver) { this._scrollObserver.disconnect(); this._scrollObserver = null; }
            try {
                const results = await this.fetchCategoryData(categoryKey, 1);
                this.mediaList = results || [];
                if (this.mediaList.length < 10) this.hasMore = false;
                this.checkLibraryStatus();
                this.loadSubscribedIds();
            } catch (e) { console.error(e); }
            finally { this.loading = false; }
            this.$nextTick(() => { this.setupScrollObserver(); });
        },
        async changeSort(sortKey) {
            if (this.sortBy === sortKey) return;
            this.sortBy = sortKey;
            this.mediaList = [];
            await this.selectCategory(this.selectedCategory);
        },
        setupScrollObserver() {
            if (this._scrollObserver) { this._scrollObserver.disconnect(); this._scrollObserver = null; }
            const sentinel = this.$el.querySelector('#tmdb-scroll-sentinel');
            if (sentinel) {
                this._scrollObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && !this.loadingMore && this.hasMore && !this.loading && !this.searchLoading) {
                        this.loadMore();
                    }
                }, { rootMargin: '200px' });
                this._scrollObserver.observe(sentinel);
            }
        },
        async loadMore() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            try {
                this.page++;
                let more;
                if (this.isSearchMode) {
                    if (this.activeTab === 'douban') {
                        more = await api.doubanSearch(this.searchQuery, this.page);
                    } else {
                        more = await api.tmdbSearch(this.searchQuery, 'multi', this.page);
                    }
                } else {
                    more = await this.fetchCategoryData(this.selectedCategory, this.page);
                }
                if (more && more.length > 0) {
                    this.mediaList.push(...more);
                    this.checkLibraryStatus(more);
                } else {
                    this.hasMore = false;
                }
            } catch (e) { console.error(e); }
            finally { this.loadingMore = false; }
        },
        async doSearch() {
            if (!this.searchQuery.trim()) {
                this.clearSearch();
                return;
            }
            this.isSearchMode = true;
            this.searchLoading = true;
            this.page = 1;
            this.hasMore = true;
            this.libraryStatus = {};
            this.mediaList = [];
            try {
                if (this.activeTab === 'douban') {
                    this.mediaList = await api.doubanSearch(this.searchQuery, 1);
                } else {
                    this.mediaList = await api.tmdbSearch(this.searchQuery, 'multi', 1);
                    // 纯数字为 TMDB ID 精确匹配，无需分页
                    if (/^\d+$/.test(this.searchQuery.trim())) this.hasMore = false;
                }
                this.checkLibraryStatus();
                this.loadSubscribedIds();
            } catch (e) { console.error(e); }
            finally { this.searchLoading = false; }
            this.$nextTick(() => { this.setupScrollObserver(); });
        },
        clearSearch() {
            this.searchQuery = '';
            this.isSearchMode = false;
            this.selectCategory(this.selectedCategory);
        },
        async openDetail(media) {
            if (media.source === 'douban' && !media.tmdb_id) {
                // 豆瓣来源: 先做 TMDB 匹配再导航
                const mediaYear = media.year ? parseInt(media.year) : 0;
                let matched = null;
                const candidateNames = [...new Set(
                    [media.original_title, media.title]
                        .map(n => (n || '').trim())
                        .filter(n => n)
                )];
                const yearMatch = (item) => {
                    if (!mediaYear) return true;
                    const iy = parseInt(item.year);
                    return iy && Math.abs(iy - mediaYear) <= 1;
                };
                const trySearch = async (name, type) => {
                    const results = await api.tmdbSearch(name, type, 1);
                    if (results && results.length > 0) {
                        return results.find(r => yearMatch(r)) || null;
                    }
                    return null;
                };
                for (const name of candidateNames) {
                    if (matched) break;
                    if (media.type === 'movie') {
                        matched = await trySearch(name, 'movie');
                        if (!matched) matched = await trySearch(name, 'tv');
                    } else if (media.type === 'tv') {
                        matched = await trySearch(name, 'tv');
                        if (!matched) matched = await trySearch(name, 'movie');
                    } else {
                        const results = await api.tmdbSearch(name, 'multi', 1);
                        if (results && results.length > 0) {
                            matched = results.find(r => yearMatch(r)) || results[0];
                        }
                    }
                }
                if (matched && matched.tmdb_id) {
                    window.__discoverDetailCache = {
                        ...media,
                        tmdb_id: matched.tmdb_id,
                        type: matched.type || media.type,
                        source: 'douban',
                        douban_id: media.douban_id,
                    };
                    router.push('discover/detail/' + (matched.type || media.type) + '/' + matched.tmdb_id);
                } else {
                    window.showMessage && window.showMessage('未找到 TMDB 匹配，无法查看详情', 'warning');
                }
            } else if (media.tmdb_id) {
                // TMDB 来源: 直接导航到详情页
                window.__discoverDetailCache = { ...media };
                router.push('discover/detail/' + (media.type || 'movie') + '/' + media.tmdb_id);
            }
        },
        getSeasonEpisodeCount(seasonNum) {
            if (!this.detailSeasons || !this.detailSeasons.length) return 0;
            const s = this.detailSeasons.find(s => s.season_number === seasonNum);
            return s ? (s.episode_count || 0) : 0;
        },
        async openSubscribe(media) {
            const isTV = media.type === 'tv';
            const totalSeason = (isTV && this.detailData) ? (this.detailData.number_of_seasons || 0) : 0;
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
            // 自动获取 Emby 已入库最大集数作为开始集数
            if (isTV) {
                this.fetchEmbyStartEpisode(media.tmdb_id || 0, 1);
            }
            try {
                const subConfig = await api.getSubscribeConfig();
                this.subscribePresets = (subConfig && Array.isArray(subConfig.presets)) ? subConfig.presets : [];
                if (this.subscribePresets.length > 0) {
                    this.selectedPresetIds = [this.subscribePresets[0].id];
                }
            } catch (e) { console.error(e); }
        },
        openSubscribeFromDetail() {
            if (this.detailData) {
                this.openSubscribe(this.detailData);
                this.detailDialog = false;
            }
        },
        async loadSubscribeFolders() {
            try {
                const [subConfig, strmConfig] = await Promise.all([
                    api.getSubscribeConfig(),
                    api.getShareStrmConfig()
                ]);
                if (subConfig && subConfig.transfer_folders) {
                    this.subscribeTransferFolders = subConfig.transfer_folders;
                    if (this.subscribeTransferFolders.length > 0) {
                        const hasMatch = this.subscribeTransferFolders.some(f => f.cid === this.subscribeTransferFolderCid);
                        if (!hasMatch) {
                            this.subscribeTransferFolderCid = this.subscribeTransferFolders[0].cid;
                        }
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
                        if (!hasMatch) {
                            this.subscribeForm.strm_folder_path = this.subscribeShareStrmFolders[0].value;
                        }
                    }
                }
            } catch (e) { console.error('Failed to load subscribe folders:', e); }
        },
        async fetchEmbyStartEpisode(tmdbId, seasonNum) {
            // 从 Emby 获取已入库集数，取最大集数+1作为开始集数
            if (!tmdbId || !seasonNum) return;
            try {
                const name = this.subscribeForm.name || '';
                const year = this.subscribeForm.year || '';
                const res = await api.request('/emby/season_episodes_check', {
                    method: 'POST',
                    body: JSON.stringify({ name, year, tmdb_id: tmdbId })
                });
                if (res.success && res.data) {
                    const eps = res.data[String(seasonNum)] || [];
                    if (eps.length > 0) {
                        const maxEp = Math.max(...eps);
                        this.subscribeForm.start_episode = maxEp + 1;
                    }
                }
            } catch (e) { /* 忽略 Emby 查询失败 */ }
        },
        async saveSubscribe() {
            this.subscribeSaving = true;
            try {
                if (this.subscribeForm.mode === 'transfer' && this.subscribeTransferFolderCid) {
                    const folder = this.subscribeTransferFolders.find(f => f.cid === this.subscribeTransferFolderCid);
                    if (folder) {
                        this.subscribeForm.transfer_folders = [{ ...folder }];
                    }
                }
                // 存储多预设ID（按选择顺序）
                if (this.selectedPresetIds && this.selectedPresetIds.length > 0) {
                    this.subscribeForm.preset_ids = [...this.selectedPresetIds];
                } else {
                    this.subscribeForm.preset_ids = [];
                }
                // 全部季：逐季创建订阅
                if (this.subscribeForm.type === 'tv' && this.subscribeForm.current_season === 0 && this.subscribeForm.total_season > 0) {
                    let successCount = 0;
                    let failMsg = '';
                    const createdIds = [];
                    for (let s = 1; s <= this.subscribeForm.total_season; s++) {
                        const epCount = this.getSeasonEpisodeCount(s);
                        const form = { ...this.subscribeForm, current_season: s, total_episode: epCount, start_episode: 1 };
                        const res = await api.addSubscribe(form);
                        if (res.success) { successCount++; if (res.data && res.data.subscribe_id) createdIds.push(res.data.subscribe_id); }
                        else { failMsg = failMsg || (res.message || '添加失败'); }
                    }
                    if (successCount > 0) {
                        window.showMessage && window.showMessage(`已添加 ${successCount} 季订阅`, 'success');
                        this.subscribeDialog = false;
                        this.loadSubscribedIds();
                        if (this.subscribeForm.run_immediately && createdIds.length > 0) {
                            for (const sid of createdIds) {
                                try { await api.runSubscribe(sid); } catch (e) { console.error('立即执行失败', e); }
                            }
                            window.showMessage && window.showMessage('已开始执行 ' + createdIds.length + ' 季订阅', 'success');
                        }
                    } else {
                        window.showMessage && window.showMessage(failMsg || '添加失败', 'error');
                    }
                } else {
                    const res = await api.addSubscribe(this.subscribeForm);
                    if (res.success) {
                        window.showMessage && window.showMessage('订阅添加成功', 'success');
                        this.subscribeDialog = false;
                        this.loadSubscribedIds();
                        if (this.subscribeForm.run_immediately && res.data && res.data.subscribe_id) {
                            try {
                                const runRes = await api.runSubscribe(res.data.subscribe_id);
                                if (runRes.success) {
                                    window.showMessage && window.showMessage(runRes.message || '已开始执行', 'success');
                                } else {
                                    window.showMessage && window.showMessage(runRes.message || '立即执行失败', 'warning');
                                }
                            } catch (e) { console.error('立即执行失败', e); }
                        }
                    } else {
                        window.showMessage && window.showMessage(res.message || '添加失败', 'error');
                    }
                }
            } catch (e) { window.showMessage && window.showMessage('添加失败', 'error'); }
            finally { this.subscribeSaving = false; }
        },
        getTypeText(t) { return t === 'movie' ? '电影' : t === 'tv' ? '剧集' : t; },
        getTypeColor(t) { return t === 'movie' ? 'blue' : 'green'; },
        getRatingColor(score) {
            if (score >= 8) return '#4caf50';
            if (score >= 6) return '#ff9800';
            return '#f44336';
        },
        // ========== 已订阅标记（红心） ==========
        async loadSubscribedIds() {
            try {
                const list = await api.getSubscribedTmdbIds();
                const set = {};
                for (const item of list) {
                    set[item.tmdb_id + '-' + item.type] = true;
                }
                this.subscribedSet = set;
            } catch (e) { console.error('加载订阅列表失败:', e); }
        },
        isSubscribed(media) {
            if (!media.tmdb_id) return false;
            return !!this.subscribedSet[media.tmdb_id + '-' + media.type];
        },
        // ========== Emby 入库状态 & 全局设置 ==========
        async loadLibraryConfig() {
            try {
                const [config, embyConfigs, ftConfigs] = await Promise.all([
                    api.getSubscribeConfig(),
                    api.getEmbyConfigs().catch(() => []),
                    api.request('/fast_transfer/configs').then(r => r.data || []).catch(() => [])
                ]);
                this.libraryCheckEnabled = !!(config && config.tmdb_library_check && config.emby_library_config);
                this.globalSettings.emby_library_config = (config && config.emby_library_config) || '';
                this.globalSettings.tmdb_library_check = !!(config && config.tmdb_library_check);
                this.globalSettings.douban_tmdb_fallback = !!(config && config.douban_tmdb_fallback);
                this.embyConfigOptions = [
                    ...embyConfigs.map(c => ({ title: (c.name || c.id) + ' (Emby)', value: c.id })),
                    ...ftConfigs.map(c => ({ title: (c.name || c.id) + ' (秒传)', value: c.id }))
                ];
            } catch (e) { this.libraryCheckEnabled = false; }
        },
        // saveGlobalSettings 已合并到 saveDiscoverSettings
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
        async checkLibraryStatus(items) {
            if (!this.libraryCheckEnabled) return;
            const list = items || this.mediaList;
            if (!list || list.length === 0) return;
            // 过滤未检测的
            const toCheck = list.filter(m => {
                const key = this.getLibraryKey(m);
                return this.libraryStatus[key] === undefined;
            }).map(m => ({
                name: (m.title || m.original_title || '').trim(),
                year: m.year ? parseInt(m.year) : null,
                type: m.type || '',
                total_episodes: m.number_of_episodes || 0,
                tmdb_id: m.tmdb_id || null,
                source: m.source || ''
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
            } catch (e) { console.error('入库检测失败:', e); }
        },
        async refreshLibraryStatus() {
            if (!this.libraryCheckEnabled) {
                window.showMessage && window.showMessage('未开启看板入库检测，请在看板全局设置中开启', 'warning');
                return;
            }
            this.libraryChecking = true;
            this.libraryStatus = {};
            try {
                await this.checkLibraryStatus(this.mediaList);
            } finally { this.libraryChecking = false; }
        },
        getImgUrl(url) {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            if (url.startsWith('/api/')) return url;
            return 'https://image.tmdb.org/t/p/w500' + url;
        },
        // ========== 剧集季/集详情 ==========
        async loadSeasonEpisodes(seasonNum) {
            if (!this.detailData || !this.detailData.tmdb_id) return;
            if (this.seasonEpisodesInfo[seasonNum]) return;
            try {
                const episodes = await api.tmdbEpisodes(this.detailData.tmdb_id, seasonNum);
                this.seasonEpisodesInfo = { ...this.seasonEpisodesInfo, [seasonNum]: episodes || [] };
            } catch (e) { console.error('加载集列表失败:', e); }
        },
        async loadEmbyEpisodeStatus() {
            if (!this.detailData || this.detailData.type !== 'tv') return;
            if (!this.libraryCheckEnabled) return;
            if (Object.keys(this.embySeasonEpisodes).length > 0) return;
            this.episodeCheckLoading = true;
            try {
                const name = (this.detailData.title || this.detailData.original_title || '').trim();
                const year = this.detailData.year ? parseInt(this.detailData.year) : null;
                const tmdbId = this.detailData.tmdb_id || null;
                const data = await api.embySeasonEpisodesCheck(name, year, tmdbId);
                this.embySeasonEpisodes = data || {};
            } catch (e) { console.error('Emby 季集检测失败:', e); }
            finally { this.episodeCheckLoading = false; }
        },
        async toggleSeason(seasonNum) {
            if (this.expandedSeason === seasonNum) {
                this.expandedSeason = null;
                return;
            }
            this.expandedSeason = seasonNum;
            await this.loadSeasonEpisodes(seasonNum);
            if (Object.keys(this.embySeasonEpisodes).length === 0) {
                this.loadEmbyEpisodeStatus();
            }
        },
        isEpisodeInEmby(seasonNum, epNum) {
            const eps = this.embySeasonEpisodes[String(seasonNum)] || this.embySeasonEpisodes[seasonNum] || [];
            return eps.includes(epNum);
        },
        getSeasonEmbyCount(seasonNum) {
            const eps = this.embySeasonEpisodes[String(seasonNum)] || this.embySeasonEpisodes[seasonNum] || [];
            return eps.length;
        },
        // ========== Emby 视频版本信息 ==========
        async loadMediaVersions() {
            if (!this.detailData || !this.libraryCheckEnabled) return;
            this.mediaVersionsLoading = true;
            try {
                const name = (this.detailData.title || this.detailData.original_title || '').trim();
                const year = this.detailData.year ? parseInt(this.detailData.year) : null;
                const tmdbId = this.detailData.tmdb_id || null;
                const type = this.detailData.type || 'movie';
                const data = await api.embyMediaVersions(name, year, tmdbId, type);
                this.mediaVersions = data || null;
            } catch (e) { console.error('Emby 视频版本查询失败:', e); }
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
        // ========== HDHive 搜索（账号和积分限制统一使用工具箱-HDHive 解析的配置） ==========
        async loadHdhiveConfig() {
            try {
                const configRes = await api.request('/hdhive/config');
                if (configRes.success && configRes.data) {
                    this.hdhiveSelectedAccount = configRes.data.use_hdhive_account || '';
                }
            } catch (e) { console.error('加载 HDHive 配置失败:', e); }
        },
        async loadTransferConfig() {
            try {
                const [tgSearchRes, optionsRes] = await Promise.all([
                    api.request('/tg_search/config'),
                    api.getSubscribeOptions().catch(() => ({}))
                ]);
                this.tgSearchConfig = tgSearchRes.data || {};
                const configs115 = (optionsRes.configs_115 || []).filter(c => !c.has_open_token);
                this.transferConfigs115 = configs115;
            } catch (e) { console.error('加载转存配置失败:', e); }
        },
        async loadShareStrmConfig() {
            try {
                this.shareStrmConfig = await api.getShareStrmConfig();
            } catch (e) { console.error('加载分享STRM配置失败:', e); }
        },
        _pickStrmFolderThenDo(callback) {
            const folders = (this.shareStrmConfig && this.shareStrmConfig.strm_folders) || [];
            if (folders.length <= 1) {
                callback(0);
                return;
            }
            this.strmPickerFolderList = [...folders];
            this.strmFolderPickerCallback = callback;
            this.strmFolderPickerDialog = true;
        },
        pickStrmFolder(folder, index) {
            this.strmFolderPickerDialog = false;
            if (this.strmFolderPickerCallback) {
                this.strmFolderPickerCallback(index);
                this.strmFolderPickerCallback = null;
            }
        },
        async doShareStrm115Link(link) {
            this._pickStrmFolderThenDo(async (pathIndex) => {
                const key = link.url;
                this.strmSavingLinks = { ...this.strmSavingLinks, [key]: true };
                try {
                    const res = await api.submitShareStrm(link.url, false, pathIndex);
                    if (res.success) {
                        this.strmSavedLinks = { ...this.strmSavedLinks, [key]: 'success' };
                        window.showMessage && window.showMessage(res.message || '已提交分享STRM', 'success');
                    } else {
                        this.strmSavedLinks = { ...this.strmSavedLinks, [key]: 'error' };
                        window.showMessage && window.showMessage(res.message || '提交失败', 'error');
                    }
                } catch (e) {
                    this.strmSavedLinks = { ...this.strmSavedLinks, [key]: 'error' };
                    window.showMessage && window.showMessage('提交失败: ' + (e.message || '未知错误'), 'error');
                } finally {
                    this.strmSavingLinks = { ...this.strmSavingLinks, [key]: false };
                }
            });
        },
        async doShareStrmHdhiveResource(res) {
            this._pickStrmFolderThenDo(async (pathIndex) => {
                const slug = res.slug;
                if (!slug) return;
                this.strmSavingResources = { ...this.strmSavingResources, [slug]: true };
                try {
                    const result = await api.request('/hdhive/resource/save', {
                        method: 'POST',
                        body: JSON.stringify({ slug, account_name: this.hdhiveSelectedAccount, path_index: pathIndex })
                    });
                    if (result.success) {
                        this.strmSavedResources = { ...this.strmSavedResources, [slug]: 'success' };
                        window.showMessage && window.showMessage(result.message || '已提交分享STRM', 'success');
                    } else {
                        this.strmSavedResources = { ...this.strmSavedResources, [slug]: 'error' };
                        window.showMessage && window.showMessage(result.message || '提交失败', 'error');
                    }
                } catch (e) {
                    this.strmSavedResources = { ...this.strmSavedResources, [slug]: 'error' };
                    window.showMessage && window.showMessage('提交失败: ' + (e.message || '未知错误'), 'error');
                } finally {
                    this.strmSavingResources = { ...this.strmSavingResources, [slug]: false };
                }
            });
        },
        async openHdhiveFromDetail() {
            if (!this.detailData || !this.detailData.tmdb_id) {
                window.showMessage && window.showMessage('无 TMDB ID，无法搜索', 'error');
                return;
            }
            if (!this.hdhiveSelectedAccount) {
                window.showMessage && window.showMessage('请先在工具箱 - HDHive 解析中选择账号', 'error');
                return;
            }
            const tmdbId = this.detailData.tmdb_id;
            const mediaType = this.detailData.type || 'movie';
            this.hdhiveSearchLoading = true;
            this.hdhiveDetailItem = null;
            this.hdhiveResources = [];
            this.savedResources = {};
            try {
                // 直接用 detailData 构造 item，跳过搜索步骤
                const item = {
                    id: tmdbId,
                    media_type: mediaType,
                    title: this.detailData.title || '',
                    name: this.detailData.title || '',
                    poster_path: this.detailData.poster_path || '',
                    overview: this.detailData.overview || '',
                    release_date: mediaType === 'movie' ? (this.detailData.year ? this.detailData.year + '-01-01' : '') : '',
                    first_air_date: mediaType === 'tv' ? (this.detailData.year ? this.detailData.year + '-01-01' : '') : '',
                };
                this.hdhiveDetailItem = item;
                this.hdhiveDetailDialog = true;
                await this.loadHdhiveResources(item);
            } catch (e) {
                window.showMessage && window.showMessage('HDHive 资源加载失败', 'error');
            } finally {
                this.hdhiveSearchLoading = false;
            }
        },
        async openTgSearchFromDetail() {
            if (!this.detailData) return;
            const name = (this.detailData.title || this.detailData.original_title || '').trim();
            if (!name) {
                window.showMessage && window.showMessage('无法获取名称', 'error');
                return;
            }
            this.tgSearchDialogItem = { ...this.detailData };
            this.tgSearchDialogKeyword = name;
            this.tgSearchDialogResults = [];
            this.tgSearchDialogCount = 0;
            this.tgSearchDialogVisible = true;
            this.tgSearchDialogLoading = true;
            this.savedLinks = {};
            this.savingLinks = {};
            try {
                const res = await api.tgSearchSearch('all', name);
                if (res.success) {
                    this.tgSearchDialogResults = res.data || [];
                    this.tgSearchDialogCount = res.count || 0;
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
                        const res = await api.request('/tg_search/telegraph', {
                            method: 'POST',
                            body: JSON.stringify({ url: phUrl })
                        });
                        if (res.success && res.share_links && res.share_links.length > 0) {
                            allShares.push(...res.share_links);
                        }
                    }
                    const unique = [...new Set(allShares)];
                    if (unique.length > 0) {
                        msg._telegraphShares = unique;
                        msg.text = msg.text + '\n' + unique.join('\n');
                    }
                } catch (e) {
                    console.error('Telegraph resolve error:', e);
                } finally {
                    msg._telegraphLoading = false;
                }
            }
        },
        async loadHdhiveResources(item) {
            if (!item) return;
            const tmdbId = item.id;
            if (!tmdbId) return;
            let mediaType = item.media_type;
            if (!mediaType) {
                mediaType = item.first_air_date !== undefined ? 'tv' : 'movie';
            }
            if (mediaType !== 'movie' && mediaType !== 'tv') return;
            this.hdhiveResourcesLoading = true;
            try {
                const res = await api.hdhiveGetResources(this.hdhiveSelectedAccount, tmdbId, mediaType);
                if (res.success && res.data) {
                    this.hdhiveResources = res.data;
                } else {
                    this.hdhiveResources = [];
                }
            } catch (e) {
                console.error('加载资源列表失败:', e);
                this.hdhiveResources = [];
            } finally {
                this.hdhiveResourcesLoading = false;
            }
        },
        hdhiveGetPoster(item) {
            if (item.poster_path) return 'https://image.tmdb.org/t/p/w300' + item.poster_path;
            return '';
        },
        hdhiveGetTitle(item) {
            return item.title || item.name || '未知';
        },
        hdhiveGetYear(item) {
            const d = item.release_date || item.first_air_date || '';
            return d ? d.substring(0, 4) : '';
        },
        hdhiveGetType(item) {
            if (item.media_type === 'movie') return '电影';
            if (item.media_type === 'tv') return '电视剧';
            if (item.first_air_date !== undefined) return '电视剧';
            if (item.release_date !== undefined) return '电影';
            return '';
        },
        hdhiveGetSeason(res) {
            if (res.season_number != null) return 'S' + String(res.season_number).padStart(2, '0');
            if (res.season != null && res.season !== '') return 'S' + String(res.season).padStart(2, '0');
            const text = res.remark || res.title || '';
            const m = text.match(/\b(S\d{2})\b/i);
            return m ? m[1].toUpperCase() : '';
        },
        // ========== 一键转存 ==========
        _getTransferFolders() {
            return (this.tgSearchConfig.transfer_folders || []);
        },
        _getTransferConfigName() {
            return this.tgSearchConfig.transfer_use_115_config || '';
        },
        _pickFolderThenDo(callback) {
            const folders = this._getTransferFolders();
            if (!this._getTransferConfigName()) {
                window.showMessage && window.showMessage('请先在看板设置中选择转存 115 账号', 'error');
                return;
            }
            if (folders.length === 0) {
                window.showMessage && window.showMessage('请先在看板设置中添加转存文件夹', 'error');
                return;
            }
            if (folders.length === 1) {
                callback(folders[0].cid);
                return;
            }
            this.pickerFolderList = [...folders];
            this.folderPickerCallback = callback;
            this.folderPickerDialog = true;
        },
        pickTransferFolder(folder) {
            this.folderPickerDialog = false;
            if (this.folderPickerCallback) {
                this.folderPickerCallback(folder.cid);
                this.folderPickerCallback = null;
            }
        },
        async doSaveHdhiveResource(res) {
            this._pickFolderThenDo(async (targetCid) => {
                const slug = res.slug;
                if (!slug) return;
                this.savingResources = { ...this.savingResources, [slug]: true };
                try {
                    const result = await api.request('/tg_search/transfer/hdhive', {
                        method: 'POST',
                        body: JSON.stringify({ slug, target_cid: targetCid, account_name: this.hdhiveSelectedAccount })
                    });
                    if (result.success) {
                        this.savedResources = { ...this.savedResources, [slug]: 'success' };
                        window.showMessage && window.showMessage(result.message || '转存成功', 'success');
                    } else {
                        this.savedResources = { ...this.savedResources, [slug]: 'error' };
                        window.showMessage && window.showMessage(result.message || '转存失败', 'error');
                    }
                } catch (e) {
                    this.savedResources = { ...this.savedResources, [slug]: 'error' };
                    window.showMessage && window.showMessage('转存失败: ' + (e.message || '未知错误'), 'error');
                } finally {
                    this.savingResources = { ...this.savingResources, [slug]: false };
                }
            });
        },
        // ========== 转存文件夹浏览 ==========
        async openTransferFolderBrowser() {
            const configName = this.tgSearchConfig.transfer_use_115_config;
            if (!configName) {
                window.showMessage && window.showMessage('请先选择转存 115 配置', 'error');
                return;
            }
            this.transferFolderDialog = true;
            this.transferCurrentCid = '0';
            this.transferFolderPath = [{ name: '根目录', cid: '0' }];
            this.transferCreateFolderMode = false;
            await this.loadTransferFolders('0');
        },
        async loadTransferFolders(cid) {
            this.transferFolderLoading = true;
            try {
                const configName = this.tgSearchConfig.transfer_use_115_config;
                const res = await api.request(`/115/folders?config_name=${encodeURIComponent(configName)}&cid=${cid}`);
                if (res.success) {
                    this.transferFolders115 = res.data.folders || [];
                    this.transferCurrentCid = cid;
                    if (res.data.path) {
                        this.transferFolderPath = res.data.path;
                    }
                } else {
                    window.showMessage && window.showMessage(res.message || '加载失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载文件夹失败', 'error');
            } finally {
                this.transferFolderLoading = false;
            }
        },
        navigateTransferFolder(folder) {
            this.loadTransferFolders(folder.cid);
        },
        navigateTransferPath(item) {
            this.loadTransferFolders(item.cid);
        },
        selectTransferFolder() {
            const last = this.transferFolderPath[this.transferFolderPath.length - 1];
            const folders = this.tgSearchConfig.transfer_folders || [];
            if (folders.some(f => f.cid === last.cid)) {
                window.showMessage && window.showMessage('该文件夹已添加', 'warning');
                return;
            }
            folders.push({ name: last.name, cid: last.cid });
            this.tgSearchConfig = { ...this.tgSearchConfig, transfer_folders: folders };
            this.transferFolderDialog = false;
            window.showMessage && window.showMessage(`已添加: ${last.name}`, 'success');
        },
        removeTransferFolder(index) {
            const folders = [...(this.tgSearchConfig.transfer_folders || [])];
            folders.splice(index, 1);
            this.tgSearchConfig = { ...this.tgSearchConfig, transfer_folders: folders };
        },
        async createTransferFolder() {
            const name = (this.transferCreateFolderName || '').trim();
            if (!name) return;
            this.transferCreateFolderLoading = true;
            try {
                const configName = this.tgSearchConfig.transfer_use_115_config;
                const res = await api.request('/115/folders/create', {
                    method: 'POST',
                    body: JSON.stringify({ config_name: configName, parent_cid: this.transferCurrentCid, folder_name: name })
                });
                if (res.success) {
                    window.showMessage && window.showMessage('文件夹创建成功', 'success');
                    this.transferCreateFolderMode = false;
                    this.transferCreateFolderName = '';
                    await this.loadTransferFolders(this.transferCurrentCid);
                } else {
                    window.showMessage && window.showMessage(res.message || '创建失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('创建失败', 'error');
            } finally {
                this.transferCreateFolderLoading = false;
            }
        },
        // ========== 频道搜索（原资源搜索整合） ==========
        async loadTgChannelData() {
            try {
                const [channels, tgConfigs] = await Promise.all([
                    api.getTgSearchChannels(),
                    api.getTgApiConfigs(),
                ]);
                this.tgChannels = channels || [];
                this.tgApiConfigs = tgConfigs || [];
                this.selectedTgConfig = this.tgSearchConfig.use_tg_config || '';
                // 同步频道列表到 tgSearchConfig，避免保存设置时覆盖
                this.tgSearchConfig = { ...this.tgSearchConfig, channels: this.tgChannels };
            } catch (e) {
                console.error('加载频道数据失败:', e);
            }
        },
        // ===== 频道管理 =====
        openAddChannel() {
            this.tgEditingChannelIndex = -1;
            this.tgChannelForm = { name: '', channel_id: '' };
            this.tgChannelDialog = true;
        },
        openEditChannel(index) {
            this.tgEditingChannelIndex = index;
            this.tgChannelForm = { ...this.tgChannels[index] };
            this.tgChannelDialog = true;
        },
        async saveChannel() {
            if (!this.tgChannelForm.name || !this.tgChannelForm.channel_id) {
                window.showMessage && window.showMessage('请填写别名和频道ID', 'error');
                return;
            }
            try {
                let res;
                if (this.tgEditingChannelIndex >= 0) {
                    res = await api.updateTgSearchChannel(this.tgEditingChannelIndex, this.tgChannelForm);
                } else {
                    res = await api.addTgSearchChannel(this.tgChannelForm);
                }
                if (res.success) {
                    this.tgChannelDialog = false;
                    await this.loadTgChannelData();
                    window.showMessage && window.showMessage(res.message, 'success');
                } else {
                    window.showMessage && window.showMessage(res.message, 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('保存失败', 'error');
            }
        },
        async deleteChannel(index) {
            try {
                const res = await api.deleteTgSearchChannel(index);
                if (res.success) {
                    if (this.tgSelectedChannel === this.tgChannels[index]?.channel_id) {
                        this.tgSelectedChannel = '';
                    }
                    await this.loadTgChannelData();
                    window.showMessage && window.showMessage(res.message, 'success');
                }
            } catch (e) {
                window.showMessage && window.showMessage('删除失败', 'error');
            }
        },
        // ===== 频道导出/导入 =====
        openChannelExport() {
            this.tgChannelExportJson = JSON.stringify(
                this.tgChannels.map(ch => ({ name: ch.name, channel_id: ch.channel_id })),
                null, 2
            );
            this.tgChannelExportDialog = true;
        },
        copyChannelExport() {
            const text = this.tgChannelExportJson;
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    window.showMessage && window.showMessage('频道配置已复制到剪贴板', 'success');
                }).catch(() => { this.fallbackCopyText(text); });
            } else {
                this.fallbackCopyText(text);
            }
        },
        fallbackCopyText(text) {
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
                document.execCommand('copy');
                window.showMessage && window.showMessage('频道配置已复制到剪贴板', 'success');
            } catch (e) {
                window.showMessage && window.showMessage('复制失败，请手动选择复制', 'error');
            }
            document.body.removeChild(textArea);
        },
        openChannelImport() {
            this.tgChannelImportJson = '';
            this.tgChannelImportDialog = true;
        },
        async doChannelImport() {
            if (!this.tgChannelImportJson.trim()) {
                window.showMessage && window.showMessage('请粘贴 JSON 内容', 'error');
                return;
            }
            let channels;
            try {
                channels = JSON.parse(this.tgChannelImportJson.trim());
            } catch (e) {
                window.showMessage && window.showMessage('JSON 格式错误，请检查内容', 'error');
                return;
            }
            if (!Array.isArray(channels)) {
                window.showMessage && window.showMessage('JSON 内容必须是数组格式 [...]', 'error');
                return;
            }
            const valid = channels.filter(ch => ch && ch.channel_id);
            if (valid.length === 0) {
                window.showMessage && window.showMessage('未找到有效的频道数据（需包含 channel_id 字段）', 'error');
                return;
            }
            this.tgChannelImporting = true;
            try {
                const res = await api.request('/tg_search/channels/import', {
                    method: 'POST',
                    body: JSON.stringify({ channels: valid })
                });
                if (res.success) {
                    this.tgChannelImportDialog = false;
                    await this.loadTgChannelData();
                    window.showMessage && window.showMessage(res.message, 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '导入失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('导入失败: ' + e.message, 'error');
            } finally {
                this.tgChannelImporting = false;
            }
        },
        // ===== 频道选择器 =====
        async openChannelPicker() {
            this.tgPickerDialog = true;
            this.tgPickerSelected = [];
            this.tgPickerAliases = {};
            this.tgPickerSearch = '';
            await this.loadTgMyChannels();
        },
        async loadTgMyChannels() {
            this.tgPickerLoading = true;
            try {
                const res = await api.getTgMyChannels();
                if (res.success) {
                    this.tgMyChannels = res.data || [];
                    if (this.tgMyChannels.length === 0) {
                        window.showMessage && window.showMessage('未获取到频道/群组，请确认已登录 TG', 'warning');
                    }
                } else {
                    window.showMessage && window.showMessage(res.message || '获取频道列表失败', 'error');
                    this.tgMyChannels = [];
                }
            } catch (e) {
                window.showMessage && window.showMessage('获取频道列表失败', 'error');
                this.tgMyChannels = [];
            } finally {
                this.tgPickerLoading = false;
            }
        },
        isTgChannelAdded(ch) {
            return this.tgChannels.some(c => String(c.channel_id) === String(ch.id));
        },
        toggleTgPickerSelect(ch) {
            const id = String(ch.id);
            const idx = this.tgPickerSelected.indexOf(id);
            if (idx >= 0) {
                this.tgPickerSelected.splice(idx, 1);
                delete this.tgPickerAliases[id];
            } else {
                this.tgPickerSelected.push(id);
                this.tgPickerAliases[id] = ch.name || '';
            }
        },
        isTgPickerSelected(ch) {
            return this.tgPickerSelected.includes(String(ch.id));
        },
        getPickerTypeIcon(type) {
            if (type === 'channel') return 'mdi-bullhorn-outline';
            if (type === 'supergroup') return 'mdi-account-group-outline';
            return 'mdi-forum-outline';
        },
        getPickerTypeLabel(type) {
            if (type === 'channel') return '频道';
            if (type === 'supergroup') return '超级群组';
            if (type === 'group') return '群组';
            return '未知';
        },
        async savePickerChannels() {
            if (this.tgPickerSelected.length === 0) {
                window.showMessage && window.showMessage('请至少选择一个频道', 'warning');
                return;
            }
            let added = 0;
            for (const id of this.tgPickerSelected) {
                const alias = (this.tgPickerAliases[id] || '').trim();
                const ch = this.tgMyChannels.find(c => String(c.id) === id);
                const name = alias || (ch ? ch.name : id);
                try {
                    const res = await api.addTgSearchChannel({ name, channel_id: id });
                    if (res.success) added++;
                } catch (e) { /* ignore */ }
            }
            this.tgPickerDialog = false;
            await this.loadTgChannelData();
            window.showMessage && window.showMessage(`已添加 ${added} 个频道`, 'success');
        },
        // ===== 频道搜索 =====
        async doTgChannelSearch() {
            if (!this.tgSearchKeyword.trim()) {
                window.showMessage && window.showMessage('请输入搜索关键词', 'error');
                return;
            }
            this.tgChannelSearchLoading = true;
            this.tgSearchResults = [];
            try {
                const res = await api.tgSearchSearch(this.tgSelectedChannel, this.tgSearchKeyword.trim());
                if (res.success) {
                    this.tgSearchResults = res.data || [];
                    this.tgSearchCount = res.count || 0;
                    if (this.tgSearchResults.length === 0) {
                        window.showMessage && window.showMessage('未找到相关消息', 'warning');
                    } else {
                        this.resolveTelegraphInResults();
                    }
                } else {
                    window.showMessage && window.showMessage(res.message, 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('搜索失败', 'error');
            } finally {
                this.tgChannelSearchLoading = false;
            }
        },
        openTgMsgDetail(msg) {
            this.tgDetailMessage = msg;
            this.tgMsgDetailDialog = true;
        },
        tgFormatDate(isoStr) {
            if (!isoStr) return '';
            try {
                const d = new Date(isoStr);
                return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            } catch { return isoStr; }
        },
        truncateText(text, maxLen = 120) {
            if (!text) return '';
            return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
        },
        getTgChannelName(channelId) {
            const ch = this.tgChannels.find(c => c.channel_id === channelId);
            return ch ? ch.name : channelId;
        },
        // ===== 115 链接检测与一键转存 =====
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
                if (!seen.has(url)) {
                    seen.add(url);
                    links.push(url);
                }
            }
            return links;
        },
        async resolveTelegraphInResults() {
            if (!this.tgSearchResults || this.tgSearchResults.length === 0) return;
            for (const msg of this.tgSearchResults) {
                const phLinks = this.extractTelegraphLinks(msg.text);
                if (phLinks.length === 0) continue;
                msg._telegraphCount = phLinks.length;
                msg._telegraphLoading = true;
                try {
                    let allShares = [];
                    for (const phUrl of phLinks) {
                        const res = await api.request('/tg_search/telegraph', {
                            method: 'POST',
                            body: JSON.stringify({ url: phUrl })
                        });
                        if (res.success && res.share_links && res.share_links.length > 0) {
                            allShares.push(...res.share_links);
                        }
                    }
                    const unique = [...new Set(allShares)];
                    if (unique.length > 0) {
                        msg._telegraphShares = unique;
                        msg.text = msg.text + '\n' + unique.join('\n');
                    }
                } catch (e) {
                    console.error('Telegraph resolve error:', e);
                } finally {
                    msg._telegraphLoading = false;
                }
            }
        },
        // HTML 转义，防止 XSS 攻击
        _escapeHtml(str) {
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        },
        formatMessageWithSaveButtons(text) {
            if (!text) return '（无文本内容）';
            // 先转义所有 HTML 特殊字符，防止 XSS
            let result = this._escapeHtml(text);
            const pattern115 = /(https?:\/\/115(?:cdn)?\.com\/s\/[a-zA-Z0-9]+\?password=[a-zA-Z0-9]+)/g;
            result = result.replace(pattern115, (match) => {
                return `<a href="${this._escapeHtml(match)}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: underline;">${this._escapeHtml(match)}</a>`;
            });
            const patternPh = /(https?:\/\/(?:telegra\.ph|graph\.org)\/[^\s<]+)/g;
            result = result.replace(patternPh, (match) => {
                return `<a href="${this._escapeHtml(match)}" target="_blank" rel="noopener noreferrer" style="color: #00897B; text-decoration: underline;">📎 ${this._escapeHtml(match)}</a>`;
            });
            return result;
        },
        async doSave115Link(link) {
            this._pickFolderThenDo(async (targetCid) => {
                const key = link.url;
                this.savingLinks = { ...this.savingLinks, [key]: true };
                try {
                    const res = await api.request('/tg_search/transfer', {
                        method: 'POST',
                        body: JSON.stringify({ share_link: link.url, target_cid: targetCid })
                    });
                    if (res.success) {
                        this.savedLinks = { ...this.savedLinks, [key]: 'success' };
                        window.showMessage && window.showMessage(res.message || '转存成功', 'success');
                    } else {
                        this.savedLinks = { ...this.savedLinks, [key]: 'error' };
                        window.showMessage && window.showMessage(res.message || '转存失败', 'error');
                    }
                } catch (e) {
                    this.savedLinks = { ...this.savedLinks, [key]: 'error' };
                    window.showMessage && window.showMessage('转存失败: ' + (e.message || '未知错误'), 'error');
                } finally {
                    this.savingLinks = { ...this.savingLinks, [key]: false };
                }
            });
        },
        // ========== 看板设置保存 ==========
        async saveDiscoverSettings() {
            this.discoverSettingsSaving = true;
            let ok = true;
            try {
                // 保存看板全局设置（Emby 入库检测）
                const config = await api.getSubscribeConfig() || {};
                config.emby_library_config = this.globalSettings.emby_library_config;
                config.tmdb_library_check = this.globalSettings.tmdb_library_check;
                config.douban_tmdb_fallback = this.globalSettings.douban_tmdb_fallback;
                await api.updateSubscribeConfig(config);
                this.libraryCheckEnabled = !!(config.tmdb_library_check && config.emby_library_config);
                // 保存一键转存设置 + TG API 配置（保存到 tg_search config）
                // 排除 channels 字段，频道列表由频道管理API独立维护，避免覆盖
                const { channels: _excludeChannels, ...tgSearchWithoutChannels } = this.tgSearchConfig;
                const tgSearch = { ...tgSearchWithoutChannels, use_tg_config: this.selectedTgConfig };
                const res3 = await api.request('/tg_search/config', {
                    method: 'PUT',
                    body: JSON.stringify(tgSearch)
                });
                if (res3.success) {
                    this.tgSearchConfig = { ...tgSearch, channels: this.tgChannels };
                } else {
                    ok = false;
                }
                window.showMessage && window.showMessage(ok ? '设置已保存' : '部分设置保存失败', ok ? 'success' : 'warning');
            } catch (e) {
                console.error(e);
                window.showMessage && window.showMessage('保存失败: ' + e.message, 'error');
            } finally { this.discoverSettingsSaving = false; }
        },
    },
    template: `
    <v-container fluid class="tmdb-discover pa-2 pa-md-4">
        <!-- 顶部标题 + Tab菜单 + 搜索 -->
        <div class="tmdb-header mb-4">
            <div class="d-flex align-center flex-wrap ga-3">
                <div class="d-flex align-center">
                    <v-icon size="28" color="primary" class="mr-2">mdi-movie-open-star</v-icon>
                    <span class="text-h6 font-weight-bold">看板</span>
                </div>
                <!-- Tab切换按钮 -->
                <div class="discover-tab-bar">
                    <v-btn size="small" :variant="activeTab === 'tmdb' ? 'elevated' : 'tonal'" :color="activeTab === 'tmdb' ? 'primary' : ''" rounded="pill" @click="switchTab('tmdb')" class="me-1">
                        <v-icon size="16" class="mr-1">mdi-movie-filter</v-icon>TMDB
                    </v-btn>
                    <v-btn size="small" :variant="activeTab === 'douban' ? 'elevated' : 'tonal'" :color="activeTab === 'douban' ? 'success' : ''" rounded="pill" @click="switchTab('douban')" class="me-1">
                        <v-icon size="16" class="mr-1">mdi-alpha-d-circle</v-icon>豆瓣
                    </v-btn>
                    <v-btn size="small" :variant="activeTab === 'tg_search' ? 'elevated' : 'tonal'" :color="activeTab === 'tg_search' ? 'deep-purple' : ''" rounded="pill" @click="switchTab('tg_search')" class="me-1">
                        <v-icon size="16" class="mr-1">mdi-magnify</v-icon>频道搜索
                    </v-btn>
                    <v-btn size="small" :variant="activeTab === 'settings' ? 'elevated' : 'tonal'" :color="activeTab === 'settings' ? 'warning' : ''" rounded="pill" @click="switchTab('settings')">
                        <v-icon size="16" class="mr-1">mdi-cog-outline</v-icon>设置
                    </v-btn>
                </div>
                <v-spacer></v-spacer>
                <v-text-field
                    v-if="activeTab === 'tmdb' || activeTab === 'douban'"
                    v-model="searchQuery"
                    density="compact"
                    variant="solo-filled"
                    flat
                    hide-details
                    :placeholder="activeTab === 'tmdb' ? 'TMDB 搜索电影 / 剧集 / TMDBID...' : '豆瓣搜索电影 / 剧集...'"
                    prepend-inner-icon="mdi-magnify"
                    style="max-width: 300px; min-width: 200px;"
                    rounded="pill"
                    @keyup.enter="doSearch"
                    clearable
                    @click:clear="clearSearch"
                ></v-text-field>
                <v-btn v-if="activeTab === 'tmdb' || activeTab === 'douban'" icon variant="text" size="small" @click="refreshLibraryStatus" :loading="libraryChecking" title="刷新入库状态">
                    <img src="assets/images/emby-icon.png" style="width: 22px; height: 22px; border-radius: 4px; opacity: 0.8;">
                </v-btn>
            </div>
        </div>

        <!-- ==================== TMDB / 豆瓣 Tab 内容 ==================== -->
        <template v-if="activeTab === 'tmdb' || activeTab === 'douban'">
            <!-- 分类筛选 chips -->
            <div v-if="!isSearchMode" class="d-flex flex-wrap ga-2 mb-3 discover-chips-wrap">
                <v-chip v-for="cat in currentCategories" :key="cat.key"
                    class="discover-category-chip"
                    :color="selectedCategory === cat.key ? 'primary' : ''"
                    :variant="selectedCategory === cat.key ? 'elevated' : 'tonal'"
                    rounded="pill" style="cursor: pointer;"
                    @click="selectCategory(cat.key)">
                    <v-icon start class="discover-chip-icon">{{ cat.icon }}</v-icon>
                    {{ cat.title }}
                </v-chip>
            </div>

            <!-- 排序选项 (仅可排序分类显示) -->
            <div v-if="!isSearchMode && isSortable" class="d-flex flex-wrap ga-2 mb-3 discover-chips-wrap">
                <v-chip v-for="opt in sortOptions" :key="opt.key"
                    class="discover-sort-chip"
                    :color="sortBy === opt.key ? 'warning' : ''"
                    :variant="sortBy === opt.key ? 'elevated' : 'outlined'"
                    rounded="pill" style="cursor: pointer;"
                    @click="changeSort(opt.key)">
                    <v-icon start class="discover-sort-icon">{{ opt.icon }}</v-icon>
                    {{ opt.title }}
                </v-chip>
            </div>

            <!-- 搜索模式标题 -->
            <div v-if="isSearchMode" class="d-flex align-center mb-4 ga-2">
                <v-btn icon variant="text" size="small" @click="clearSearch">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <span class="text-subtitle-1 font-weight-bold">
                    {{ activeTab === 'douban' ? '豆瓣' : 'TMDB' }}搜索: {{ searchQuery }}
                </span>
            </div>

            <!-- 骨架屏 -->
            <div v-if="loading || searchLoading" class="tmdb-grid">
                <div v-for="i in skeletonCount" :key="'sk-'+i" class="tmdb-card-wrapper">
                    <div class="tmdb-skeleton">
                        <div class="tmdb-skeleton-img"></div>
                        <div class="tmdb-skeleton-text">
                            <div class="tmdb-skeleton-line" style="width:70%"></div>
                            <div class="tmdb-skeleton-line short" style="width:40%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-if="!loading && !searchLoading && mediaList.length === 0" class="text-center py-16">
                <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-movie-search-outline</v-icon>
                <div class="text-body-1 text-grey">暂无数据</div>
            </div>

            <!-- 网格卡片 -->
            <div v-if="!loading && !searchLoading && mediaList.length > 0" class="tmdb-grid">
                <div v-for="media in mediaList" :key="(media.tmdb_id || media.douban_id || media.title) + '_' + media.type" class="tmdb-card-wrapper">
                    <div class="tmdb-card" @click="openDetail(media)">
                        <div class="tmdb-card-poster">
                            <img v-if="media.poster_path" :src="getImgUrl(media.poster_path)" :alt="media.title" class="tmdb-card-img" loading="lazy" @error="$event.target.style.display='none'" />
                            <div v-if="!media.poster_path" class="tmdb-card-placeholder"><v-icon size="48" color="grey-darken-1">mdi-movie-outline</v-icon></div>
                            <div class="tmdb-card-badge-type" :class="media.type === 'movie' ? 'badge-movie' : 'badge-tv'">{{ getTypeText(media.type) }}</div>
                            <div v-if="isSubscribed(media)" class="tmdb-card-subscribed-badge" title="已订阅"></div>
                        </div>
                        <div class="tmdb-card-info">
                            <div class="tmdb-card-title">{{ media.title || media.original_title }}</div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <div class="tmdb-card-year">{{ media.year }}</div>
                                <span v-if="libraryCheckEnabled && isInLibrary(media) === true" class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                                <span v-else-if="libraryCheckEnabled && (isInLibrary(media) === false || isInLibrary(media) === 'partial')" class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 无限滚动 -->
            <div id="tmdb-scroll-sentinel" style="height: 1px;"></div>
            <div v-if="loadingMore" class="d-flex justify-center mt-4 mb-4">
                <v-progress-circular indeterminate color="primary" size="28" width="3"></v-progress-circular>
            </div>
            <div v-if="mediaList.length > 0 && !hasMore" class="text-center text-grey py-4 text-body-2">
                已加载全部内容
            </div>
        </template>

        <!-- ==================== 频道搜索 Tab ==================== -->
        <template v-if="activeTab === 'tg_search'">
            <div class="glass-card" style="padding: 24px; border-radius: 16px;">
                <v-row dense>
                    <v-col cols="12" sm="4">
                        <v-select
                            v-model="tgSelectedChannel"
                            :items="[{ title: '全部频道', value: 'all' }, ...tgChannels.map(c => ({ title: c.name, value: c.channel_id }))]"
                            label="选择频道"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            prepend-inner-icon="mdi-forum-outline"
                            no-data-text="请先在设置中添加频道"
                            style="border-radius: 12px;"
                        ></v-select>
                    </v-col>
                    <v-col cols="12" sm="8">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-text-field
                                v-model="tgSearchKeyword"
                                label="搜索关键词"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                                prepend-inner-icon="mdi-magnify"
                                @keyup.enter="doTgChannelSearch"
                                clearable
                                style="border-radius: 12px; flex: 1;"
                            ></v-text-field>
                            <v-btn color="primary" variant="elevated" @click="doTgChannelSearch" :loading="tgChannelSearchLoading" style="border-radius: 8px; height: 48px; min-width: 72px;">
                                <v-icon left size="18">mdi-magnify</v-icon>
                                搜索
                            </v-btn>
                        </div>
                    </v-col>
                </v-row>
            </div>

            <!-- 搜索结果 -->
            <div v-if="tgChannelSearchLoading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <div style="margin-top: 12px; font-size: 13px; opacity: 0.5;">搜索中...</div>
            </div>

            <div v-else-if="tgSearchResults.length > 0" style="margin-top: 16px;">
                <div style="margin-bottom: 12px; font-size: 13px; opacity: 0.6;">
                    共找到 {{ tgSearchCount }} 条结果
                </div>
                <div v-for="(msg, idx) in tgSearchResults" :key="idx"
                     @click="openTgMsgDetail(msg)"
                     style="padding: 16px; border-radius: 12px; margin-bottom: 8px; cursor: pointer; border: 1px solid rgba(var(--v-theme-on-surface),0.08); transition: all 0.2s;"
                     :style="{ background: idx % 2 === 0 ? 'rgba(var(--v-theme-on-surface),0.02)' : 'rgba(var(--v-theme-on-surface),0.04)' }"
                     onmouseover="this.style.borderColor='rgba(61,111,213,0.3)'" onmouseout="this.style.borderColor='rgba(var(--v-theme-on-surface),0.08)'">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                        <v-chip size="x-small" color="primary" variant="tonal">
                            <v-icon start size="10">mdi-forum-outline</v-icon>
                            {{ getTgChannelName(msg.channel_id) }}
                        </v-chip>
                        <v-chip size="x-small" variant="tonal">
                            <v-icon start size="10">mdi-clock-outline</v-icon>
                            {{ tgFormatDate(msg.date) }}
                        </v-chip>
                        <v-chip v-if="msg.views" size="x-small" variant="tonal">
                            <v-icon start size="10">mdi-eye-outline</v-icon>
                            {{ msg.views }}
                        </v-chip>
                        <v-chip v-if="extract115Links(msg.text).length > 0" size="x-small" color="success" variant="tonal">
                            <img src="assets/images/115-icon.ico" style="width: 12px; height: 12px; margin-right: 4px;">
                            {{ extract115Links(msg.text).length }} 个115链接
                        </v-chip>
                        <v-chip v-if="msg._telegraphLoading" size="x-small" color="teal" variant="tonal">
                            <v-progress-circular indeterminate size="10" width="1" class="mr-1"></v-progress-circular>
                            解析 Telegraph...
                        </v-chip>
                    </div>
                    <div :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }">
                        {{ truncateText(msg.text) }}
                    </div>
                </div>
            </div>
        </template>

        <!-- ==================== 设置 Tab ==================== -->
        <template v-if="activeTab === 'settings'">
            <div style="max-width: 600px;">
                <!-- 顶部保存按钮 -->
                <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
                    <v-btn color="primary" variant="elevated" rounded="pill" @click="saveDiscoverSettings" :loading="discoverSettingsSaving" class="px-6" size="small">
                        <v-icon left size="18">mdi-content-save</v-icon>
                        保存设置
                    </v-btn>
                </div>
                <!-- Emby 入库状态检测 -->
                <v-card class="glass-card main-card mb-4" color="config-card" rounded="xl">
                    <v-card-title class="d-flex align-center pa-4">
                        <img src="assets/images/emby-icon.png" style="width: 22px; height: 22px; border-radius: 3px; margin-right: 8px; opacity: 0.9;">
                        Emby 入库状态检测
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-4">
                        <v-select
                            v-model="globalSettings.emby_library_config"
                            :items="embyConfigOptions"
                            label="Emby 配置"
                            variant="outlined"
                            density="comfortable"
                            rounded="lg"
                            clearable
                            hide-details
                            class="mb-3"
                        ></v-select>
                        <v-switch v-model="globalSettings.tmdb_library_check" label="看板入库状态检测" color="primary" hide-details density="comfortable" class="mb-2"></v-switch>
                        <v-switch v-model="globalSettings.douban_tmdb_fallback" label="豆瓣看板 TMDB ID 回退匹配" color="orange" hide-details density="comfortable" class="mb-2"></v-switch>
                        <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.45); margin-bottom: 12px; padding-left: 4px; line-height: 1.6;">
                            TMDB 看板已按 TMDB ID 精确匹配；豆瓣因年份与 TMDB 有差异会导致出现年份和 Emby 库不一样导致显示未入库，开启此选项后豆瓣看板中匹配失败的会从 TMDB 搜索使用 TMDB ID 搜索，但这会加大 API 使用频率
                        </div>
                        <div class="emby-status-legend">
                            <span class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                            <span class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                        </div>
                    </v-card-text>
                </v-card>


                <!-- 一键转存设置 -->
                <v-card class="glass-card main-card mb-4" color="config-card" rounded="xl">
                    <v-card-title class="d-flex align-center pa-4">
                        <img src="assets/images/115-icon.ico" style="width: 22px; height: 22px; margin-right: 8px;">
                        一键转存
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-4">
                        <v-select
                            v-model="tgSearchConfig.transfer_use_115_config"
                            :items="transferConfigs115.map(c => ({ title: c.name, value: c.name }))"
                            label="转存 115 账号"
                            variant="outlined"
                            density="comfortable"
                            rounded="lg"
                            hide-details
                            clearable
                            prepend-inner-icon="mdi-cloud-outline"
                            no-data-text="请先在 115 助手中添加 Cookie 配置"
                            placeholder="选择用于转存的 115 账号"
                        ></v-select>

                        <v-divider class="my-3"></v-divider>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="font-size: 14px; font-weight: 500;">转存文件夹 ({{ (tgSearchConfig.transfer_folders || []).length }})</div>
                            <v-btn color="success" variant="tonal" size="small" @click="openTransferFolderBrowser" :disabled="!tgSearchConfig.transfer_use_115_config" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-plus</v-icon>浏览 115 文件夹
                            </v-btn>
                        </div>
                        <div v-if="(tgSearchConfig.transfer_folders || []).length > 0" style="display: flex; flex-direction: column; gap: 6px;">
                            <div v-for="(f, i) in tgSearchConfig.transfer_folders" :key="i"
                                style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <v-icon color="warning" size="18">mdi-folder</v-icon>
                                    <div>
                                        <div style="font-size: 13px;">{{ f.name || 'CID: ' + f.cid }}</div>
                                        <div style="font-size: 11px; opacity: 0.4;">CID: {{ f.cid }}</div>
                                    </div>
                                </div>
                                <v-btn icon size="x-small" variant="text" color="error" @click="removeTransferFolder(i)"><v-icon size="16">mdi-delete</v-icon></v-btn>
                            </div>
                        </div>
                        <div v-else style="padding: 16px; text-align: center; color: rgba(var(--v-theme-on-surface),0.35); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 8px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1);">
                            <v-icon size="24" color="grey">mdi-folder-plus-outline</v-icon>
                            <p style="margin-top: 4px; font-size: 12px;">点击上方按钮浏览 115 网盘添加转存目标文件夹</p>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.5;">配置多个文件夹时，一键转存会弹窗让你选择目标文件夹</div>
                    </v-card-text>
                </v-card>

                <!-- 频道搜索设置 -->
                <v-card class="glass-card main-card mb-4" color="config-card" rounded="xl">
                    <v-card-title class="d-flex align-center pa-4">
                        <v-icon class="mr-2" color="deep-purple" size="22">mdi-forum-outline</v-icon>
                        频道搜索
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-4">
                        <v-select
                            v-model="selectedTgConfig"
                            :items="tgApiConfigs.map(c => ({ title: c.name || c.phone, value: c.name || c.phone }))"
                            label="TG API 配置"
                            variant="outlined"
                            density="comfortable"
                            rounded="lg"
                            hide-details
                            prepend-inner-icon="mdi-send-outline"
                            no-data-text="请先在工具箱 > TG 助手中添加 TG API 配置"
                            clearable
                            placeholder="选择用于频道搜索的 TG 账号"
                        ></v-select>
                        <div style="margin-top: 8px; font-size: 12px; opacity: 0.5;">在工具箱 > TG 助手中管理多个 TG API 配置，此处选择用于频道搜索的账号</div>
                    </v-card-text>
                </v-card>

                <!-- 频道管理 -->
                <v-card class="glass-card main-card mb-4" color="config-card" rounded="xl">
                    <v-card-title class="d-flex align-center pa-4" style="flex-wrap: wrap; gap: 8px;">
                        <v-icon class="mr-2" color="primary" size="22">mdi-forum-outline</v-icon>
                        频道管理
                        <v-spacer></v-spacer>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <v-btn color="primary" size="small" variant="tonal" @click="openChannelPicker" :disabled="!selectedTgConfig" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-format-list-checks</v-icon> 从 TG 选择
                            </v-btn>
                            <v-btn color="primary" size="small" variant="outlined" @click="openAddChannel" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-plus</v-icon> 手动添加
                            </v-btn>
                            <v-btn color="success" size="small" variant="tonal" @click="openChannelExport" :disabled="tgChannels.length === 0" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-export</v-icon> 导出
                            </v-btn>
                            <v-btn color="warning" size="small" variant="tonal" @click="openChannelImport" style="border-radius: 8px;">
                                <v-icon left size="16">mdi-import</v-icon> 导入
                            </v-btn>
                        </div>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-4">
                        <div v-if="tgChannels.length === 0" style="text-align: center; padding: 24px; opacity: 0.5;">
                            <v-icon size="40" color="grey">mdi-forum-remove-outline</v-icon>
                            <p style="margin-top: 8px;">暂无频道，请添加</p>
                        </div>
                        <div v-else>
                            <div v-for="(ch, idx) in tgChannels" :key="idx"
                                 style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; margin-bottom: 6px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);"
                                 :style="{ background: idx % 2 === 0 ? 'rgba(var(--v-theme-on-surface),0.02)' : 'rgba(var(--v-theme-on-surface),0.04)' }">
                                <div style="flex: 1; min-width: 0;">
                                    <div :style="{ fontWeight: 500, fontSize: '14px', color: 'rgb(var(--v-theme-on-background))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">{{ ch.name }}</div>
                                    <div style="font-size: 12px; opacity: 0.5; word-break: break-all; margin-top: 2px;">{{ ch.channel_id }}</div>
                                </div>
                                <div style="display: flex; gap: 2px; flex-shrink: 0;">
                                    <v-btn icon variant="text" size="small" @click="openEditChannel(idx)">
                                        <v-icon size="18">mdi-pencil</v-icon>
                                    </v-btn>
                                    <v-btn icon variant="text" size="small" color="error" @click="deleteChannel(idx)">
                                        <v-icon size="18">mdi-delete</v-icon>
                                    </v-btn>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- 底部保存按钮已移至顶部 -->
            </div>
        </template>

        <!-- 详情弹窗 -->
        <v-dialog v-model="detailDialog" max-width="800" scrollable>
            <v-card v-if="detailData" class="tmdb-detail-card" rounded="xl">
                <div class="tmdb-detail-backdrop">
                    <img
                        v-if="detailData.backdrop_path || detailData.poster_path"
                        :src="getImgUrl(detailData.backdrop_path || detailData.poster_path)"
                        class="tmdb-detail-backdrop-img"
                        @error="$event.target.style.display='none'"
                    />
                    <div class="tmdb-detail-backdrop-gradient"></div>
                    <div class="tmdb-detail-backdrop-info">
                        <div class="text-h5 font-weight-bold text-white text-shadow">{{ detailData.title }}</div>
                        <div class="text-body-2 text-white" style="opacity:0.85">
                            {{ detailData.original_title }}
                            <span v-if="detailData.year"> · {{ detailData.year }}</span>
                            <v-chip v-if="detailData.vote_average" size="x-small" class="ml-2"
                                :color="getRatingColor(detailData.vote_average)" variant="elevated">
                                <v-icon size="10" class="mr-1">mdi-star</v-icon>
                                {{ detailData.vote_average.toFixed(1) }}
                            </v-chip>
                        </div>
                    </div>
                    <v-btn icon variant="text" size="small" class="tmdb-detail-close" @click="detailDialog=false">
                        <v-icon color="white">mdi-close</v-icon>
                    </v-btn>
                </div>
                <v-card-text class="pt-4">
                    <v-progress-linear v-if="detailLoading" indeterminate color="primary" class="mb-4"></v-progress-linear>
                    <div v-if="detailData.source === 'douban'" class="mb-3">
                        <v-chip size="small" color="green" variant="tonal" class="mr-2">
                            <v-icon size="14" class="mr-1">mdi-alpha-d-circle</v-icon>豆瓣
                        </v-chip>
                        <v-chip v-if="detailData.douban_id" size="small" color="green-darken-1" variant="tonal" class="mr-2">
                            <v-icon size="14" class="mr-1">mdi-identifier</v-icon>豆瓣ID: {{ detailData.douban_id }}
                        </v-chip>
                        <v-chip v-if="detailData.tmdb_id" size="small" color="blue" variant="tonal">
                            <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>已关联 TMDB #{{ detailData.tmdb_id }}
                        </v-chip>
                        <v-chip v-else-if="!detailLoading" size="small" color="warning" variant="tonal">
                            <v-icon size="14" class="mr-1">mdi-alert</v-icon>未找到 TMDB 匹配，无法订阅
                        </v-chip>
                    </div>
                    <div v-else-if="detailData.tmdb_id" class="mb-3">
                        <v-chip size="small" color="blue" variant="tonal" class="mr-2">
                            <v-icon size="14" class="mr-1">mdi-movie-filter</v-icon>TMDB
                        </v-chip>
                        <v-chip size="small" color="blue-darken-1" variant="tonal">
                            <v-icon size="14" class="mr-1">mdi-identifier</v-icon>TMDB ID: {{ detailData.tmdb_id }}
                        </v-chip>
                    </div>
                    <div class="d-flex flex-wrap ga-1 mb-3" v-if="detailData.genres && detailData.genres.length">
                        <v-chip v-for="g in detailData.genres" :key="g" size="small" variant="tonal" color="primary">{{ g }}</v-chip>
                    </div>
                    <div class="text-body-2 mb-3" v-if="detailData.overview" style="line-height:1.6;opacity:0.85">{{ detailData.overview }}</div>
                    <div v-if="detailData.type === 'tv' && detailData.number_of_seasons" class="text-body-2 mb-2">
                        <v-icon size="16" class="mr-1">mdi-television</v-icon>
                        共 {{ detailData.number_of_seasons }} 季 / {{ detailData.number_of_episodes || '?' }} 集
                    </div>
                    <div v-if="detailData.type === 'movie' && detailData.runtime" class="text-body-2 mb-2">
                        <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
                        片长: {{ detailData.runtime }} 分钟
                    </div>
                    <!-- 电影视频版本信息 -->
                    <div v-if="detailData.type === 'movie' && !mediaVersionsLoading && getMovieVersions().length > 0" class="mb-3">
                        <div class="d-flex align-center mb-1">
                            <v-icon size="16" class="mr-1" color="primary">mdi-filmstrip</v-icon>
                            <span class="text-subtitle-2 font-weight-bold">视频版本</span>
                        </div>
                        <div v-for="(v, vi) in getMovieVersions()" :key="vi" style="padding: 8px 10px; margin-bottom: 6px; background: rgba(var(--v-theme-on-surface),0.04); border-radius: 8px; font-size: 12px; line-height: 1.5;">
                            <template v-if="v.video && v.video.display_title">
                                <div style="font-weight: 600; color: rgba(var(--v-theme-on-surface),0.9); margin-bottom: 4px;">
                                    {{ v.video.display_title }}
                                    <span v-if="v.size" style="font-weight: 400; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 6px;">{{ formatVersionSize(v.size) }}</span>
                                </div>
                                <div class="media-version-grid">
                                    <template v-if="v.video.codec"><span class="mv-label">编解码器</span><span class="mv-val">{{ v.video.codec }}</span></template>
                                    <template v-if="v.video.resolution"><span class="mv-label">分辨率</span><span class="mv-val">{{ v.video.resolution }}</span></template>
                                    <template v-if="v.video.video_range"><span class="mv-label">视频范围</span><span class="mv-val">{{ v.video.video_range }}</span></template>
                                    <template v-if="v.video.dv_profile"><span class="mv-label">DV配置</span><span class="mv-val">{{ v.video.dv_profile }}</span></template>
                                    <template v-if="v.video.profile"><span class="mv-label">配置</span><span class="mv-val">{{ v.video.profile }}</span></template>
                                    <template v-if="v.video.level"><span class="mv-label">等级</span><span class="mv-val">{{ v.video.level }}</span></template>
                                    <template v-if="v.video.bitrate_display"><span class="mv-label">比特率</span><span class="mv-val">{{ v.video.bitrate_display }}</span></template>
                                    <template v-if="v.video.framerate"><span class="mv-label">帧率</span><span class="mv-val">{{ v.video.framerate }}</span></template>
                                    <template v-if="v.video.bit_depth"><span class="mv-label">位深度</span><span class="mv-val">{{ v.video.bit_depth }} bit</span></template>
                                    <template v-if="v.video.aspect_ratio"><span class="mv-label">宽高比</span><span class="mv-val">{{ v.video.aspect_ratio }}</span></template>
                                    <template v-if="v.video.color_primaries"><span class="mv-label">基色</span><span class="mv-val">{{ v.video.color_primaries }}</span></template>
                                    <template v-if="v.video.color_space"><span class="mv-label">色域</span><span class="mv-val">{{ v.video.color_space }}</span></template>
                                    <template v-if="v.video.color_transfer"><span class="mv-label">色彩转换</span><span class="mv-val">{{ v.video.color_transfer }}</span></template>
                                    <template v-if="v.video.pixel_format"><span class="mv-label">像素格式</span><span class="mv-val">{{ v.video.pixel_format }}</span></template>
                                </div>
                            </template>
                            <div v-else style="color: rgba(var(--v-theme-on-surface),0.6); word-break: break-all;">{{ v.path }}</div>
                        </div>
                    </div>
                    <div v-if="detailData.type === 'movie' && mediaVersionsLoading" class="mb-3 d-flex align-center" style="font-size: 12px; opacity: 0.5;">
                        <v-progress-circular indeterminate size="14" width="2" color="primary" class="mr-2"></v-progress-circular>
                        加载视频版本...
                    </div>
                    <div v-if="detailSeasons.length > 0" class="mt-3">
                        <div class="d-flex align-center mb-2">
                            <div class="text-subtitle-2 font-weight-bold">季列表</div>
                            <v-progress-circular v-if="episodeCheckLoading" indeterminate size="14" width="2" color="primary" class="ms-2"></v-progress-circular>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <div v-for="s in detailSeasons" :key="s.season_number" style="border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); overflow: hidden;">
                                <!-- 季标题行（可点击展开） -->
                                <div @click="toggleSeason(s.season_number)" style="display: flex; align-items: center; padding: 10px 12px; cursor: pointer; gap: 8px; transition: background 0.15s;"
                                     :style="{ background: expandedSeason === s.season_number ? 'rgba(var(--v-theme-primary),0.06)' : 'rgba(var(--v-theme-on-surface),0.02)' }">
                                    <v-icon size="18" :style="{ transform: expandedSeason === s.season_number ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }">mdi-chevron-right</v-icon>
                                    <span style="font-weight: 600; font-size: 14px;">{{ s.name || ('第' + s.season_number + '季') }}</span>
                                    <v-chip size="x-small" variant="tonal">{{ s.episode_count }}集</v-chip>
                                    <!-- 季入库状态 -->
                                    <template v-if="libraryCheckEnabled && Object.keys(embySeasonEpisodes).length > 0">
                                        <v-chip v-if="getSeasonEmbyCount(s.season_number) >= s.episode_count && s.episode_count > 0" size="x-small" color="success" variant="tonal">
                                            <v-icon start size="10">mdi-check-circle</v-icon>已入库
                                        </v-chip>
                                        <v-chip v-else-if="getSeasonEmbyCount(s.season_number) > 0" size="x-small" color="warning" variant="tonal">
                                            <v-icon start size="10">mdi-alert-circle</v-icon>{{ getSeasonEmbyCount(s.season_number) }}/{{ s.episode_count }}
                                        </v-chip>
                                        <v-chip v-else size="x-small" color="error" variant="tonal">
                                            <v-icon start size="10">mdi-close-circle</v-icon>未入库
                                        </v-chip>
                                    </template>
                                    <v-spacer></v-spacer>
                                    <v-icon size="16" style="opacity: 0.4;">{{ expandedSeason === s.season_number ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                                </div>
                                <!-- 集列表（展开时显示） -->
                                <div v-if="expandedSeason === s.season_number" style="border-top: 1px solid rgba(var(--v-theme-on-surface),0.06);">
                                    <div v-if="!seasonEpisodesInfo[s.season_number]" style="text-align: center; padding: 16px;">
                                        <v-progress-circular indeterminate size="20" width="2" color="primary"></v-progress-circular>
                                        <div style="margin-top: 4px; font-size: 12px; opacity: 0.5;">加载集信息...</div>
                                    </div>
                                    <div v-else class="season-episode-list">
                                        <div v-for="ep in seasonEpisodesInfo[s.season_number]" :key="ep.episode_number" class="season-episode-item" style="flex-wrap: wrap;">
                                            <div class="season-ep-num" :class="isEpisodeInEmby(s.season_number, ep.episode_number) ? 'ep-exists' : 'ep-missing'">
                                                {{ ep.episode_number }}
                                            </div>
                                            <div class="season-ep-info">
                                                <div class="season-ep-name">{{ ep.name || ('第' + ep.episode_number + '集') }}</div>
                                                <div class="season-ep-date" v-if="ep.air_date">{{ ep.air_date }}</div>
                                            </div>
                                            <div class="season-ep-status-icon">
                                                <v-icon v-if="libraryCheckEnabled && isEpisodeInEmby(s.season_number, ep.episode_number)" color="success" size="18">mdi-check-circle</v-icon>
                                                <v-icon v-else-if="libraryCheckEnabled && Object.keys(embySeasonEpisodes).length > 0" color="grey" size="18" style="opacity: 0.3;">mdi-circle-outline</v-icon>
                                            </div>
                                            <div v-if="getEpisodeVersions(s.season_number, ep.episode_number).length > 0" style="width: 100%; padding: 2px 0 2px 36px;">
                                                <div v-for="(v, vi) in getEpisodeVersions(s.season_number, ep.episode_number)" :key="vi" style="font-size: 11px; line-height: 1.5; color: rgba(var(--v-theme-on-surface),0.5);">
                                                    <template v-if="v.video && v.video.display_title">
                                                        <span style="color: rgba(var(--v-theme-on-surface),0.7);">{{ v.video.display_title }}</span>
                                                        <span v-if="v.video.bitrate_display" style="margin-left: 4px;">{{ v.video.bitrate_display }}</span>
                                                        <span v-if="v.size" style="margin-left: 4px;">{{ formatVersionSize(v.size) }}</span>
                                                    </template>
                                                    <span v-else style="word-break: break-all;">{{ v.path }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions class="detail-actions-grid px-4 pb-4">
                    <v-btn class="detail-btn-subscribe" color="primary" variant="elevated" rounded="pill" @click="openSubscribeFromDetail"
                        :disabled="!detailData.tmdb_id || detailLoading">
                        <v-icon size="18" class="mr-1">mdi-plus</v-icon>{{ !detailData.tmdb_id ? '无TMDB' : '添加订阅' }}
                    </v-btn>
                    <v-btn class="detail-btn-hdhive" color="deep-purple" variant="elevated" rounded="pill" @click="openHdhiveFromDetail"
                        :disabled="!detailData.tmdb_id || detailLoading" :loading="hdhiveSearchLoading">
                        <v-icon size="18" class="mr-1">mdi-movie-search-outline</v-icon>HDHive
                    </v-btn>
                    <v-btn class="detail-btn-channel" color="teal" variant="elevated" rounded="pill" @click="openTgSearchFromDetail"
                        :disabled="detailLoading || (!detailData.title && !detailData.original_title)">
                        <v-icon size="18" class="mr-1">mdi-magnify</v-icon>频道搜索
                    </v-btn>
                    <v-btn class="detail-btn-close" variant="tonal" rounded="pill" @click="detailDialog=false">关闭</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 添加订阅弹窗 -->
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
                            <img v-if="subscribeForm.poster_path" :src="getImgUrl(subscribeForm.poster_path)"
                                style="width:100%;aspect-ratio:2/3;object-fit:cover;display:block" />
                            <div v-else style="width:100%;aspect-ratio:2/3;background:#2a2a2a;display:flex;align-items:center;justify-content:center">
                                <v-icon size="32" color="grey">mdi-movie</v-icon>
                            </div>
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
                                variant="outlined" density="compact" rounded="lg"
                                placeholder="如 60fps"></v-text-field>
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

        <!-- HDHive 详情弹窗 -->
        <v-dialog v-model="hdhiveDetailDialog" max-width="600px" scrollable>
            <v-card v-if="hdhiveDetailItem" style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-movie-outline</v-icon>
                    {{ hdhiveGetTitle(hdhiveDetailItem) }}
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="hdhiveDetailDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <div style="display: flex; gap: 16px;">
                        <img v-if="hdhiveGetPoster(hdhiveDetailItem)" :src="hdhiveGetPoster(hdhiveDetailItem)" style="width: 100px; border-radius: 12px; flex-shrink: 0; object-fit: cover;" />
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                                <v-chip v-if="hdhiveGetType(hdhiveDetailItem)" size="small" :color="hdhiveGetType(hdhiveDetailItem) === '电影' ? 'blue' : 'green'" variant="tonal">
                                    {{ hdhiveGetType(hdhiveDetailItem) }}
                                </v-chip>
                                <v-chip v-if="hdhiveGetYear(hdhiveDetailItem)" size="small" variant="tonal">
                                    <v-icon start size="14">mdi-calendar</v-icon>
                                    {{ hdhiveGetYear(hdhiveDetailItem) }}
                                </v-chip>
                                <v-chip v-if="hdhiveDetailItem.vote_average" size="small" color="amber" variant="tonal">
                                    <v-icon start size="14">mdi-star</v-icon>
                                    {{ hdhiveDetailItem.vote_average.toFixed(1) }}
                                </v-chip>
                                <v-chip v-if="hdhiveDetailItem.id" size="small" variant="outlined">
                                    TMDB: {{ hdhiveDetailItem.id }}
                                </v-chip>
                            </div>
                            <div v-if="hdhiveDetailItem.original_title || hdhiveDetailItem.original_name" :style="{ fontSize: '13px', opacity: 0.6, marginBottom: '8px', color: 'rgb(var(--v-theme-on-background))' }">
                                {{ hdhiveDetailItem.original_title || hdhiveDetailItem.original_name }}
                            </div>
                            <div v-if="hdhiveDetailItem.overview" :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '13px', lineHeight: '1.6', maxHeight: '80px', overflow: 'hidden' }">
                                {{ hdhiveDetailItem.overview }}
                            </div>
                            <div v-else :style="{ opacity: 0.4, fontSize: '13px' }">暂无简介</div>
                        </div>
                    </div>

                    <!-- 115 资源列表 -->
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
                                        <v-chip v-if="res.is_official" size="x-small" variant="tonal" color="amber-darken-2" style="font-weight: 600;">
                                            <v-icon start size="10">mdi-check-decagram</v-icon>
                                            官组
                                        </v-chip>
                                        <v-chip size="x-small" :color="res.unlock_points === 0 ? 'success' : 'warning'" variant="flat" style="font-weight: 600;">
                                            {{ res.unlock_points === 0 ? '免费' : res.unlock_points + ' 积分' }}
                                        </v-chip>
                                        <v-chip v-if="res.share_size" size="x-small" variant="tonal">
                                            <v-icon start size="10">mdi-harddisk</v-icon>
                                            {{ res.share_size }}
                                        </v-chip>
                                        <v-chip v-for="vr in (res.video_resolution || [])" :key="vr" size="x-small" variant="outlined" color="info">
                                            {{ vr }}
                                        </v-chip>
                                        <v-chip v-if="res.unlocked_users_count" size="x-small" variant="tonal" color="grey">
                                            <v-icon start size="10">mdi-account-group</v-icon>
                                            {{ res.unlocked_users_count }} 人解锁
                                        </v-chip>
                                        <v-chip v-if="res.publisher" size="x-small" variant="tonal" color="cyan">
                                            <v-icon start size="10">mdi-account</v-icon>
                                            {{ res.publisher }}
                                        </v-chip>
                                    </div>
                                    <div v-if="res.remark" :style="{ fontSize: '13px', lineHeight: '1.5', color: 'rgb(var(--v-theme-on-background))', wordBreak: 'break-word' }">
                                        {{ res.remark }}
                                    </div>
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
                                        <v-btn size="small" variant="tonal" color="primary" block style="border-radius: 8px;">
                                            <v-icon size="14">mdi-open-in-new</v-icon>
                                        </v-btn>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- 频道搜索弹窗（从详情页触发） -->
        <v-dialog v-model="tgSearchDialogVisible" max-width="600px" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="teal" size="22" class="mr-2">mdi-magnify</v-icon>
                    <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">频道搜索: {{ tgSearchDialogKeyword }}</span>
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="tgSearchDialogVisible = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px; max-height: 70vh; overflow-y: auto;">
                    <!-- 媒体信息 -->
                    <div v-if="tgSearchDialogItem" style="display: flex; gap: 16px; margin-bottom: 16px;">
                        <img v-if="tgSearchDialogItem.poster_path" :src="getImgUrl(tgSearchDialogItem.poster_path)" style="width: 80px; border-radius: 12px; flex-shrink: 0; object-fit: cover;" />
                        <div style="flex: 1; min-width: 0;">
                            <div :style="{ fontSize: '15px', fontWeight: '600', color: 'rgb(var(--v-theme-on-background))' }">{{ tgSearchDialogItem.title || tgSearchDialogItem.original_title }}</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                                <v-chip v-if="tgSearchDialogItem.year" size="x-small" variant="tonal"><v-icon start size="10">mdi-calendar</v-icon>{{ tgSearchDialogItem.year }}</v-chip>
                                <v-chip size="x-small" :color="tgSearchDialogItem.type === 'movie' ? 'blue' : 'green'" variant="tonal">{{ getTypeText(tgSearchDialogItem.type) }}</v-chip>
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
                                <v-chip size="x-small" color="teal" variant="tonal">
                                    <v-icon start size="10">mdi-forum-outline</v-icon>
                                    {{ getTgChannelName(msg.channel_id) }}
                                </v-chip>
                                <v-chip size="x-small" variant="tonal">
                                    <v-icon start size="10">mdi-clock-outline</v-icon>
                                    {{ tgFormatDate(msg.date) }}
                                </v-chip>
                                <v-chip v-if="msg.views" size="x-small" variant="tonal">
                                    <v-icon start size="10">mdi-eye-outline</v-icon>
                                    {{ msg.views }}
                                </v-chip>
                                <v-chip v-if="extract115Links(msg.text).length > 0" size="x-small" color="success" variant="tonal">
                                    <img src="assets/images/115-icon.ico" style="width: 12px; height: 12px; margin-right: 4px;">
                                    {{ extract115Links(msg.text).length }} 个115链接
                                </v-chip>
                                <v-chip v-if="msg._telegraphLoading" size="x-small" color="teal" variant="tonal">
                                    <v-progress-circular indeterminate size="10" width="1" class="mr-1"></v-progress-circular>
                                    解析 Telegraph...
                                </v-chip>
                            </div>
                            <div :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }">
                                {{ truncateText(msg.text, 200) }}
                            </div>
                            <!-- 115 链接一键转存 -->
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

        <!-- 转存文件夹浏览弹窗 -->
        <v-dialog v-model="transferFolderDialog" max-width="550" scrollable>
            <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                <v-card-title style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <v-icon color="warning" size="22">mdi-folder-open</v-icon>
                        <span>浏览 115 文件夹</span>
                    </div>
                    <v-btn icon variant="text" size="small" @click="transferFolderDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <div style="padding: 12px 20px 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                    <v-chip v-for="(p, pi) in transferFolderPath" :key="pi" size="small" :color="pi === transferFolderPath.length - 1 ? 'primary' : 'default'" :variant="pi === transferFolderPath.length - 1 ? 'elevated' : 'tonal'" @click="navigateTransferPath(p)" style="cursor: pointer;">
                        {{ p.name }}
                    </v-chip>
                </div>
                <v-card-text style="padding: 12px 20px; min-height: 200px; max-height: 400px; overflow-y: auto;">
                    <v-progress-linear v-if="transferFolderLoading" indeterminate color="primary" class="mb-3"></v-progress-linear>
                    <div v-if="transferCreateFolderMode" style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <v-text-field v-model="transferCreateFolderName" label="新文件夹名称" variant="outlined" density="compact" hide-details autofocus @keydown.enter="createTransferFolder" style="flex: 1;"></v-text-field>
                        <v-btn color="primary" variant="elevated" size="small" @click="createTransferFolder" :loading="transferCreateFolderLoading" style="border-radius: 8px;">创建</v-btn>
                        <v-btn variant="tonal" size="small" @click="transferCreateFolderMode = false" style="border-radius: 8px;">取消</v-btn>
                    </div>
                    <div v-if="!transferFolderLoading && transferFolders115.length > 0">
                        <div v-for="folder in transferFolders115" :key="folder.cid" @click="navigateTransferFolder(folder)"
                            style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s; border: 1px solid transparent;"
                            onmouseover="this.style.background='rgba(61,111,213,0.1)'" onmouseout="this.style.background=''">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <v-icon color="warning" size="20">mdi-folder</v-icon>
                                <span style="font-size: 14px;">{{ folder.name }}</span>
                            </div>
                            <v-icon size="16" color="grey">mdi-chevron-right</v-icon>
                        </div>
                    </div>
                    <div v-else-if="!transferFolderLoading" style="text-align: center; padding: 30px; opacity: 0.4;">
                        <v-icon size="40" color="grey">mdi-folder-open-outline</v-icon>
                        <p style="margin-top: 8px; font-size: 13px;">该目录下没有子文件夹</p>
                    </div>
                </v-card-text>
                <v-card-actions style="padding: 12px 20px; border-top: 1px solid rgba(var(--v-theme-on-surface),0.08); gap: 8px;">
                    <v-btn variant="tonal" size="small" @click="transferCreateFolderMode = true" v-if="!transferCreateFolderMode" style="border-radius: 8px;">
                        <v-icon left size="16">mdi-folder-plus</v-icon>新建文件夹
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" variant="elevated" size="small" @click="selectTransferFolder" style="border-radius: 8px;">
                        <v-icon left size="16">mdi-check</v-icon>选择当前目录
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 多文件夹选择弹窗 -->
        <v-dialog v-model="folderPickerDialog" max-width="400">
            <v-card style="border-radius: 16px;">
                <v-card-title style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <v-icon color="warning" size="22">mdi-folder-multiple</v-icon>
                        <span>选择转存目标</span>
                    </div>
                    <v-btn icon variant="text" size="small" @click="folderPickerDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 12px 20px;">
                    <div v-for="f in pickerFolderList" :key="f.cid" @click="pickTransferFolder(f)"
                        style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; cursor: pointer; transition: background 0.2s; border: 1px solid rgba(var(--v-theme-on-surface),0.08); margin-bottom: 8px;"
                        onmouseover="this.style.background='rgba(61,111,213,0.1)';this.style.borderColor='rgba(61,111,213,0.3)'" onmouseout="this.style.background='';this.style.borderColor='rgba(var(--v-theme-on-surface),0.08)'">
                        <v-icon color="warning" size="22">mdi-folder</v-icon>
                        <div>
                            <div style="font-size: 14px; font-weight: 500;">{{ f.name || 'CID: ' + f.cid }}</div>
                            <div style="font-size: 11px; opacity: 0.4;">CID: {{ f.cid }}</div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>

        <!-- STRM 多文件夹选择弹窗 -->
        <v-dialog v-model="strmFolderPickerDialog" max-width="400">
            <v-card style="border-radius: 16px;">
                <v-card-title style="padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <v-icon color="primary" size="22">mdi-folder-multiple</v-icon>
                        <span>选择 STRM 目录</span>
                    </div>
                    <v-btn icon variant="text" size="small" @click="strmFolderPickerDialog = false"><v-icon>mdi-close</v-icon></v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 12px 20px;">
                    <div v-for="(f, idx) in strmPickerFolderList" :key="idx" @click="pickStrmFolder(f, idx)"
                        style="display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 10px; cursor: pointer; transition: background 0.2s; border: 1px solid rgba(var(--v-theme-on-surface),0.08); margin-bottom: 8px;"
                        onmouseover="this.style.background='rgba(61,111,213,0.1)';this.style.borderColor='rgba(61,111,213,0.3)'" onmouseout="this.style.background='';this.style.borderColor='rgba(var(--v-theme-on-surface),0.08)'">
                        <v-icon color="primary" size="22">mdi-folder</v-icon>
                        <div>
                            <div style="font-size: 14px; font-weight: 500;">{{ f.name || f.path }}</div>
                            <div style="font-size: 11px; opacity: 0.4;">{{ f.path }}</div>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
        <!-- ==================== 频道搜索相关弹窗 ==================== -->
        <!-- 频道编辑弹窗 -->
        <v-dialog v-model="tgChannelDialog" max-width="420px">
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-forum-outline</v-icon>
                    {{ tgEditingChannelIndex >= 0 ? '编辑频道' : '添加频道' }}
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="tgChannelDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 16px 20px;">
                    <v-text-field v-model="tgChannelForm.name" label="频道别名" variant="outlined" density="comfortable" hide-details class="mb-3"></v-text-field>
                    <v-text-field v-model="tgChannelForm.channel_id" label="频道 ID（如 -1002167886055）" variant="outlined" density="comfortable" hide-details></v-text-field>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; gap: 8px; justify-content: flex-end;">
                    <v-btn variant="tonal" size="small" @click="tgChannelDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="primary" variant="elevated" size="small" @click="saveChannel" style="border-radius: 8px;">
                        <v-icon left size="16">mdi-check</v-icon> 保存
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 频道导出弹窗 -->
        <v-dialog v-model="tgChannelExportDialog" max-width="560px" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="success" size="22" class="mr-2">mdi-export</v-icon>
                    导出频道配置
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="tgChannelExportDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px;">
                    <p style="margin-bottom: 12px; font-size: 13px; opacity: 0.7;">
                        以下是当前所有频道的 JSON 配置，复制后可分享给其他用户导入。
                    </p>
                    <v-textarea
                        v-model="tgChannelExportJson"
                        readonly
                        variant="outlined"
                        density="compact"
                        rows="12"
                        style="font-family: monospace; font-size: 13px;"
                        hide-details
                    ></v-textarea>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; gap: 8px; justify-content: flex-end;">
                    <v-btn variant="tonal" size="small" @click="tgChannelExportDialog = false" style="border-radius: 8px;">关闭</v-btn>
                    <v-btn color="success" variant="elevated" size="small" @click="copyChannelExport" style="border-radius: 8px;">
                        <v-icon left size="16">mdi-content-copy</v-icon> 一键复制
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 频道导入弹窗 -->
        <v-dialog v-model="tgChannelImportDialog" max-width="560px" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="warning" size="22" class="mr-2">mdi-import</v-icon>
                    导入频道配置
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="tgChannelImportDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px;">
                    <p style="margin-bottom: 8px; font-size: 13px; opacity: 0.7;">
                        粘贴从其他用户处获得的频道 JSON 配置。导入不会删除已有频道，仅叠加新增；如果频道 ID 已存在，则更新别名。
                    </p>
                    <p style="margin-bottom: 12px; font-size: 12px; opacity: 0.5;">
                        格式示例：[{"name": "频道别名", "channel_id": "-1002167886055"}, ...]
                    </p>
                    <v-textarea
                        v-model="tgChannelImportJson"
                        variant="outlined"
                        density="compact"
                        rows="10"
                        placeholder='粘贴 JSON 内容...'
                        style="font-family: monospace; font-size: 13px;"
                        hide-details
                    ></v-textarea>
                </v-card-text>
                <v-card-actions style="padding: 8px 20px 16px; gap: 8px; justify-content: flex-end;">
                    <v-btn variant="tonal" size="small" @click="tgChannelImportDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="warning" variant="elevated" size="small" @click="doChannelImport" :loading="tgChannelImporting" style="border-radius: 8px;">
                        <v-icon left size="16">mdi-import</v-icon> 确认导入
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 频道选择器弹窗 -->
        <v-dialog v-model="tgPickerDialog" max-width="640px" scrollable>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-format-list-checks</v-icon>
                    选择频道/群组
                    <v-spacer></v-spacer>
                    <v-chip v-if="tgPickerSelected.length" size="small" color="primary" variant="tonal" style="margin-right: 8px;">
                        已选 {{ tgPickerSelected.length }}
                    </v-chip>
                    <v-btn icon variant="text" size="x-small" @click="tgPickerDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <div style="padding: 12px 20px 8px;">
                    <v-text-field
                        v-model="tgPickerSearch"
                        label="搜索频道名称/ID"
                        variant="outlined"
                        density="compact"
                        hide-details
                        prepend-inner-icon="mdi-magnify"
                        clearable
                    ></v-text-field>
                </div>
                <v-card-text style="padding: 0 20px; max-height: 50vh; overflow-y: auto;">
                    <div v-if="tgPickerLoading" style="text-align: center; padding: 40px;">
                        <v-progress-circular indeterminate color="primary"></v-progress-circular>
                        <div style="margin-top: 12px; font-size: 13px; opacity: 0.6;">正在获取频道列表...</div>
                    </div>
                    <div v-else-if="filteredTgMyChannels.length === 0" style="text-align: center; padding: 40px; opacity: 0.5;">
                        <v-icon size="40" color="grey">mdi-forum-remove-outline</v-icon>
                        <p style="margin-top: 8px;">{{ tgPickerSearch ? '没有匹配的频道' : '未获取到频道/群组' }}</p>
                    </div>
                    <div v-else>
                        <div v-for="ch in filteredTgMyChannels" :key="ch.id"
                             @click="!isTgChannelAdded(ch) && toggleTgPickerSelect(ch)"
                             :style="{
                                padding: '12px',
                                borderRadius: '10px',
                                marginBottom: '6px',
                                cursor: isTgChannelAdded(ch) ? 'default' : 'pointer',
                                opacity: isTgChannelAdded(ch) ? 0.5 : 1,
                                border: isTgPickerSelected(ch) ? '2px solid rgb(var(--v-theme-primary))' : '1px solid rgba(var(--v-theme-on-surface),0.08)',
                                background: isTgPickerSelected(ch) ? 'rgba(var(--v-theme-primary), 0.08)' : 'rgba(var(--v-theme-on-surface),0.02)',
                                transition: 'all 0.15s'
                             }">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <v-icon size="18" :color="isTgPickerSelected(ch) ? 'primary' : (isTgChannelAdded(ch) ? 'success' : 'grey')" style="flex-shrink: 0;">{{ isTgPickerSelected(ch) || isTgChannelAdded(ch) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <v-icon size="16" :color="isTgPickerSelected(ch) ? 'primary' : 'grey'">{{ getPickerTypeIcon(ch.type) }}</v-icon>
                                        <span :style="{ fontSize: '14px', fontWeight: '500', color: 'rgb(var(--v-theme-on-background))' }">{{ ch.name }}</span>
                                        <v-chip v-if="isTgChannelAdded(ch)" size="x-small" color="success" variant="tonal">已添加</v-chip>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                                        <v-chip size="x-small" variant="outlined" :color="ch.type === 'channel' ? 'blue' : 'teal'">{{ getPickerTypeLabel(ch.type) }}</v-chip>
                                        <span style="font-size: 11px; opacity: 0.5;">ID: {{ ch.id }}</span>
                                        <span v-if="ch.username" style="font-size: 11px; opacity: 0.5;">@{{ ch.username }}</span>
                                        <span v-if="ch.members_count" style="font-size: 11px; opacity: 0.5;">{{ ch.members_count }} 成员</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 别名输入 -->
                            <div v-if="isTgPickerSelected(ch)" style="margin-top: 8px; padding-left: 26px;" @click.stop>
                                <v-text-field
                                    v-model="tgPickerAliases[String(ch.id)]"
                                    label="别名（留空则使用原名）"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    style="max-width: 300px;"
                                ></v-text-field>
                            </div>
                        </div>
                    </div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions style="padding: 12px 20px; gap: 8px; justify-content: flex-end;">
                    <v-btn variant="tonal" size="small" @click="tgPickerDialog = false" style="border-radius: 8px;">取消</v-btn>
                    <v-btn color="primary" variant="elevated" size="small" @click="savePickerChannels" :disabled="tgPickerSelected.length === 0" style="border-radius: 8px;">
                        <v-icon left size="16">mdi-check</v-icon> 添加选中 ({{ tgPickerSelected.length }})
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- TG 消息详情弹窗 -->
        <v-dialog v-model="tgMsgDetailDialog" max-width="600px" scrollable>
            <v-card v-if="tgDetailMessage" style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-message-text</v-icon>
                    消息详情
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" size="x-small" @click="tgMsgDetailDialog = false">
                        <v-icon size="20">mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                        <v-chip size="small" color="primary" variant="tonal">
                            <v-icon start size="14">mdi-clock-outline</v-icon>
                            {{ tgFormatDate(tgDetailMessage.date) }}
                        </v-chip>
                        <v-chip v-if="tgDetailMessage.sender" size="small" variant="tonal">
                            <v-icon start size="14">mdi-account</v-icon>
                            {{ tgDetailMessage.sender.name }}
                        </v-chip>
                        <v-chip v-if="tgDetailMessage.views" size="small" variant="tonal">
                            <v-icon start size="14">mdi-eye-outline</v-icon>
                            {{ tgDetailMessage.views }}
                        </v-chip>
                    </div>
                    <div :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }" v-html="formatMessageWithSaveButtons(tgDetailMessage.text)"></div>
                    <!-- 115 链接一键转存按钮 -->
                    <div v-if="extract115Links(tgDetailMessage.text).length > 0" style="margin-top: 16px;">
                        <v-divider style="margin-bottom: 12px;"></v-divider>
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                            <img src="assets/images/115-icon.ico" style="width: 18px; height: 18px;" />
                            <span :style="{ fontSize: '14px', fontWeight: '600', color: 'rgb(var(--v-theme-on-background))' }">115 链接转存</span>
                        </div>
                        <div v-for="link in extract115Links(tgDetailMessage.text)" :key="link.url" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(var(--v-theme-on-surface),0.08); background: rgba(var(--v-theme-on-surface),0.02);">
                            <div style="flex: 1; min-width: 0;">
                                <div :style="{ fontSize: '12px', color: 'rgb(var(--v-theme-on-background))', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
                                    {{ link.url }}
                                </div>
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
                </v-card-text>
            </v-card>
        </v-dialog>
    </v-container>
    `
};
