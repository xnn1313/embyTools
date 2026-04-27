const MediaBrowsePage = {
    name: 'MediaBrowsePage',
    data() {
        return {
            loading: true,
            loadingMore: false,
            mediaList: [],
            page: 1,
            totalPages: 1,
            hasMore: true,
            tmdbId: 0,
            mediaType: 'movie',
            category: '', // 'recommend' or 'similar'
            title: '',
            // 入库检测
            libraryCheckEnabled: false,
            libraryStatus: {},
        }
    },
    async mounted() {
        this.parseRoute();
        await this.loadSettings();
        await this.loadPage();
        this.setupScrollObserver();
    },
    beforeUnmount() {
        if (this._scrollObserver) { this._scrollObserver.disconnect(); this._scrollObserver = null; }
    },
    methods: {
        parseRoute() {
            // discover/browse/{category}/{mediaType}/{tmdbId}
            const route = router.getCurrentRoute();
            const parts = route.split('/');
            if (parts.length >= 5) {
                this.category = parts[2]; // recommend / similar
                this.mediaType = parts[3]; // movie / tv
                this.tmdbId = parseInt(parts[4]) || 0;
            }
            this.title = this.category === 'recommend' ? '推荐' : '类似';
            // 尝试从 hash 参数读标题
            const hash = window.location.hash || '';
            const titleMatch = hash.match(/[?&]title=([^&]*)/);
            if (titleMatch) this.title = decodeURIComponent(titleMatch[1]);
        },
        async loadSettings() {
            try {
                const config = await api.getSubscribeConfig();
                if (config) {
                    this.libraryCheckEnabled = !!(config.tmdb_library_check && config.emby_library_config);
                }
            } catch (e) {}
        },
        async loadPage() {
            this.loading = true;
            try {
                const res = this.category === 'recommend'
                    ? await api.tmdbRecommend(this.tmdbId, this.mediaType, 1)
                    : await api.tmdbSimilar(this.tmdbId, this.mediaType, 1);
                this.mediaList = (res && res.results) || [];
                this.totalPages = (res && res.total_pages) || 1;
                this.page = 1;
                this.hasMore = this.page < this.totalPages;
                if (this.mediaList.length && this.libraryCheckEnabled) {
                    this.checkLibraryStatusBatch(this.mediaList);
                }
            } catch (e) { console.error(e); }
            finally { this.loading = false; }
        },
        async loadMore() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            try {
                const nextPage = this.page + 1;
                const res = this.category === 'recommend'
                    ? await api.tmdbRecommend(this.tmdbId, this.mediaType, nextPage)
                    : await api.tmdbSimilar(this.tmdbId, this.mediaType, nextPage);
                const more = (res && res.results) || [];
                if (more.length > 0) {
                    this.mediaList.push(...more);
                    this.page = nextPage;
                    this.hasMore = this.page < this.totalPages;
                    if (this.libraryCheckEnabled) {
                        this.checkLibraryStatusBatch(more);
                    }
                } else {
                    this.hasMore = false;
                }
            } catch (e) { console.error(e); }
            finally { this.loadingMore = false; }
        },
        setupScrollObserver() {
            this.$nextTick(() => {
                const sentinel = document.getElementById('browse-scroll-sentinel');
                if (!sentinel) return;
                this._scrollObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && this.hasMore && !this.loadingMore && !this.loading) {
                        this.loadMore();
                    }
                }, { rootMargin: '200px' });
                this._scrollObserver.observe(sentinel);
            });
        },
        goBack() {
            window.history.back();
        },
        goMediaDetail(media) {
            const type = media.type || 'movie';
            const id = media.tmdb_id;
            if (!id) return;
            window.__discoverDetailCache = { ...media };
            router.push('discover/detail/' + type + '/' + id);
        },
        getImgUrl(url) {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return 'https://image.tmdb.org/t/p/w500' + url;
        },
        getLibraryKey(media) {
            if (media.tmdb_id) return 'tmdb-' + media.tmdb_id;
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
                source: 'tmdb'
            })).filter(m => m.name);
            if (toCheck.length === 0) return;
            try {
                const res = await api.request('/emby/library_check', {
                    method: 'POST',
                    body: JSON.stringify({ items: toCheck })
                });
                if (res.success && res.data) {
                    this.libraryStatus = { ...this.libraryStatus, ...res.data };
                }
            } catch (e) {}
        },
    },
    template: `
    <div class="mb-page-root">
        <!-- 顶部栏 -->
        <div class="mb-header d-flex align-center mb-4" style="gap: 12px;">
            <h2 style="font-size: 1.3rem; font-weight: 700;">{{ title }}</h2>
        </div>

        <!-- 加载态 -->
        <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 40vh;">
            <v-progress-circular indeterminate size="48" color="primary"></v-progress-circular>
        </div>

        <!-- 网格列表 -->
        <div v-else class="mb-grid">
            <div v-for="item in mediaList" :key="item.tmdb_id" class="mb-grid-item" @click="goMediaDetail(item)">
                <v-img :src="getImgUrl(item.poster_path)" cover class="mb-grid-poster" :aspect-ratio="2/3">
                    <template #placeholder>
                        <div class="d-flex align-center justify-center" style="width:100%;height:100%;background:rgba(var(--v-theme-on-surface),0.05)">
                            <v-icon size="32" color="grey">mdi-movie</v-icon>
                        </div>
                    </template>
                </v-img>
                <div class="mb-grid-title">{{ item.title }}</div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <div class="mb-grid-year" v-if="item.year">{{ item.year }}</div>
                    <span v-if="libraryCheckEnabled && isInLibrary(item) === true" class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                    <span v-else-if="libraryCheckEnabled && isInLibrary(item) === false" class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                </div>
            </div>
        </div>

        <!-- 无限滚动哨兵 -->
        <div id="browse-scroll-sentinel" style="height: 1px;"></div>
        <div v-if="loadingMore" class="d-flex justify-center mt-4 mb-4">
            <v-progress-circular indeterminate color="primary" size="28" width="3"></v-progress-circular>
        </div>
        <div v-if="mediaList.length > 0 && !hasMore && !loading" class="text-center text-grey py-4 text-body-2">
            已加载全部内容
        </div>
        <div v-if="!loading && mediaList.length === 0" class="text-center text-grey py-8 text-body-1">
            暂无内容
        </div>
    </div>
    `
};
