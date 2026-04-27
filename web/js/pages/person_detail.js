const PersonDetailPage = {
    name: 'PersonDetailPage',
    data() {
        return {
            loading: true,
            personId: 0,
            person: null,
            credits: [],
            creditsLoading: false,
            sortBy: 'popularity',
            sortOrder: 'desc',
            // 入库检测
            libraryCheckEnabled: false,
            libraryStatus: {},
            // 订阅状态
            subscribedSet: {},
        }
    },
    computed: {
        sortedCredits() {
            if (!this.credits || !this.credits.length) return [];
            const list = [...this.credits];
            const field = this.sortBy;
            const desc = this.sortOrder === 'desc';
            list.sort((a, b) => {
                let va, vb;
                if (field === 'year') {
                    va = a.release_date || a.year || '';
                    vb = b.release_date || b.year || '';
                    return desc ? vb.localeCompare(va) : va.localeCompare(vb);
                }
                va = (a[field] || 0);
                vb = (b[field] || 0);
                return desc ? vb - va : va - vb;
            });
            return list;
        },
        sortLabel() {
            const labels = { popularity: '热度', vote_average: '评分', year: '年份' };
            return (labels[this.sortBy] || '热度') + (this.sortOrder === 'desc' ? ' ↓' : ' ↑');
        },
    },
    async mounted() {
        this.parseRoute();
        await this.loadSettings();
        await this.fetchPerson();
    },
    methods: {
        parseRoute() {
            const route = router.getCurrentRoute();
            const parts = route.split('/');
            // discover/person/12345
            if (parts.length >= 3) {
                this.personId = parseInt(parts[2]) || 0;
            }
        },
        async fetchPerson() {
            if (!this.personId) { this.loading = false; return; }
            this.loading = true;
            try {
                this.person = await api.tmdbPerson(this.personId);
            } catch (e) { console.error('fetchPerson:', e); }
            finally {
                this.loading = false;
                if (this.personId) this.fetchCredits();
            }
        },
        async loadSettings() {
            try {
                const config = await api.getSubscribeConfig();
                if (config) {
                    this.libraryCheckEnabled = !!(config.tmdb_library_check && config.emby_library_config);
                }
            } catch (e) { console.error(e); }
            try {
                const list = await api.getSubscribedTmdbIds();
                const set = {};
                for (const item of (list || [])) { set[item.tmdb_id + '-' + item.type] = true; }
                this.subscribedSet = set;
            } catch (e) {}
        },
        isItemSubscribed(item) {
            if (!item || !item.tmdb_id) return false;
            return !!this.subscribedSet[item.tmdb_id + '-' + (item.type || item.media_type || 'movie')];
        },
        async fetchCredits() {
            this.creditsLoading = true;
            try {
                this.credits = await api.tmdbPersonCredits(this.personId) || [];
                if (this.credits.length && this.libraryCheckEnabled) {
                    this.checkLibraryStatusBatch(this.credits);
                }
            } catch (e) { console.error(e); }
            finally { this.creditsLoading = false; }
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
            } catch (e) { console.error('入库检测:', e); }
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
        getAlsoKnownAs() {
            if (!this.person || !this.person.also_known_as || !this.person.also_known_as.length) return '';
            return '别名：' + this.person.also_known_as.join('、');
        },
    },
    template: `
    <div class="pd-page-root">
        <!-- 加载态 -->
        <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 60vh;">
            <v-progress-circular indeterminate size="48" color="primary"></v-progress-circular>
        </div>

        <!-- 无数据 -->
        <div v-else-if="!person" class="d-flex flex-column justify-center align-center" style="min-height: 60vh;">
            <v-icon size="64" color="grey" class="mb-4">mdi-account-off-outline</v-icon>
            <div class="text-h6" style="opacity: 0.5;">未找到演员信息</div>
            <v-btn variant="tonal" class="mt-4" @click="goBack">返回</v-btn>
        </div>

        <!-- 正文 -->
        <template v-if="person">
            <!-- 头部：头像 + 名字 + 基本信息 -->
            <div class="pd-header">
                <v-avatar size="160" class="pd-avatar">
                    <v-img v-if="person.profile_path" :src="person.profile_path" cover />
                    <v-icon v-else size="80" color="grey">mdi-account</v-icon>
                </v-avatar>
                <div class="pd-info">
                    <h1 class="pd-name">{{ person.name }}</h1>
                    <div class="pd-meta">
                        <span v-if="person.birthday">{{ person.birthday }}</span>
                        <span v-if="person.birthday && person.place_of_birth"> | </span>
                        <span v-if="person.place_of_birth">{{ person.place_of_birth }}</span>
                    </div>
                    <div v-if="person.deathday" class="pd-meta">
                        <span>逝世：{{ person.deathday }}</span>
                    </div>
                    <div v-if="person.known_for_department" class="pd-meta">
                        <span>领域：{{ person.known_for_department }}</span>
                    </div>
                    <div v-if="getAlsoKnownAs()" class="pd-meta pd-aliases">{{ getAlsoKnownAs() }}</div>
                </div>
            </div>

            <!-- 个人简介 -->
            <div v-if="person.biography" class="pd-biography">
                <h2 class="mb-2">个人简介</h2>
                <p>{{ person.biography }}</p>
            </div>

            <!-- 参演作品 -->
            <div class="pd-credits mt-6">
                <div class="d-flex align-center justify-space-between mb-3 flex-wrap" style="gap: 8px;">
                    <h2>参演作品 <span v-if="credits.length" style="font-size: 0.75em; opacity: 0.5; font-weight: 400;">({{ credits.length }})</span></h2>
                    <div v-if="credits.length > 1" class="d-flex align-center" style="gap: 6px;">
                        <v-btn-toggle v-model="sortBy" mandatory density="compact" rounded="pill" color="primary" variant="outlined" style="height: 32px;">
                            <v-btn value="popularity" size="x-small" style="text-transform: none; font-size: 12px;">热度</v-btn>
                            <v-btn value="vote_average" size="x-small" style="text-transform: none; font-size: 12px;">评分</v-btn>
                            <v-btn value="year" size="x-small" style="text-transform: none; font-size: 12px;">年份</v-btn>
                        </v-btn-toggle>
                        <v-btn icon variant="text" size="x-small" @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'" :title="sortOrder === 'desc' ? '降序' : '升序'">
                            <v-icon size="18">{{ sortOrder === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon>
                        </v-btn>
                    </div>
                </div>
                <div v-if="creditsLoading" class="d-flex align-center" style="font-size: 13px; opacity: 0.5;">
                    <v-progress-circular indeterminate size="16" width="2" color="primary" class="mr-2"></v-progress-circular>
                    加载中...
                </div>
                <div v-else-if="credits.length > 0" class="pd-credits-grid">
                    <div v-for="item in sortedCredits" :key="(item.type||'m')+'-'+item.tmdb_id" class="pd-credit-card" @click="goMediaDetail(item)">
                        <div style="position:relative;">
                            <v-img :src="getImgUrl(item.poster_path)" cover class="pd-credit-card-img" :aspect-ratio="2/3">
                                <template #placeholder>
                                    <div class="d-flex align-center justify-center" style="width:100%;height:100%;background:rgba(var(--v-theme-on-surface),0.05)">
                                        <v-icon size="32" color="grey">mdi-movie</v-icon>
                                    </div>
                                </template>
                            </v-img>
                            <div v-if="isItemSubscribed(item)" class="tmdb-card-subscribed-badge" title="已订阅"></div>
                        </div>
                        <div class="pd-credit-card-title">{{ item.title }}</div>
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <div class="pd-credit-card-sub" v-if="item.character">{{ item.character }}</div>
                            <div class="pd-credit-card-sub" v-else-if="item.year">{{ item.year }}</div>
                            <span v-if="libraryCheckEnabled && isInLibrary(item) === true" class="emby-library-badge has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">已入库</span>
                            <span v-else-if="libraryCheckEnabled && isInLibrary(item) === false" class="emby-library-badge not-has"><img src="assets/images/emby-icon.png" class="emby-badge-icon">未入库</span>
                        </div>
                    </div>
                </div>
                <div v-else class="text-body-2" style="opacity: 0.5;">暂无作品信息</div>
            </div>
        </template>
    </div>
    `
};
