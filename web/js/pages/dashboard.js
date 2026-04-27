// NanShare 仪表盘页面组件 - 实时系统监控
const DashboardPage = {
    name: 'DashboardPage',
    
    data() {
        return {
            systemStats: {
                cpu: { percent: 0, display: '0%', project_percent: 0, project_display: '0%' },
                memory: { percent: 0, display: '0MB / 0MB', project_display: '0MB' },
                disk: { percent: 0, display: '0 GB / 0 GB', free_display: '0 GB' },
                network: { upload: '0 B/s', download: '0 B/s' },
                uptime: { display: '0分钟' }
            },
            recentCache: [],
            embyConfigs: [],
            configs115: [],
            configs123: [],
            mediaStats: { movie_count: 0, tv_count: 0, episode_count: 0, user_count: 0 },
            recentAdded: [],
            posterCache: {},
            refreshInterval: null,
            loading: true
        }
    },
    
    async mounted() {
        await this.loadData();
        // 每 3 秒刷新系统状态和缓存
        this.refreshInterval = setInterval(() => {
            this.loadSystemStats();
            this.loadRecentCache();
            this.loadRecentAdded();
        }, 3000);
    },
    
    beforeUnmount() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    },
    
    methods: {
        // 根据使用率返回颜色值
        getBarColor(percent) {
            if (percent < 60) return '#56CA00';
            if (percent < 80) return '#FFB400';
            return '#FF4C51';
        },
        
        // 根据使用率返回 Vuetify 颜色名
        getStatusColor(percent) {
            if (percent < 60) return 'success';
            if (percent < 80) return 'warning';
            return 'error';
        },
        
        async loadData() {
            this.loading = true;
            await Promise.all([
                this.loadSystemStats(),
                this.loadRecentCache(),
                this.loadConfigs(),
                this.loadMediaStats(),
                this.loadRecentAdded()
            ]);
            this.loading = false;
        },
        
        async loadSystemStats() {
            try {
                const stats = await api.getSystemStats();
                if (stats) {
                    this.systemStats = stats;
                }
            } catch (error) {
                console.error('加载系统状态失败:', error);
            }
        },
        
        async loadRecentCache() {
            try {
                const cache = await api.getCache();
                if (cache) {
                    this.recentCache = cache.slice(0, 5);
                }
            } catch (error) {
                console.error('加载缓存失败:', error);
            }
        },
        
        async loadMediaStats() {
            try {
                const stats = await api.getMediaStats();
                if (stats) {
                    this.mediaStats = stats;
                }
            } catch (error) {
                console.error('加载媒体统计失败:', error);
            }
        },

        async loadRecentAdded() {
            try {
                const data = await api.getRecentAdded();
                if (!data) return;
                this.recentAdded = data;
                // 用已有的 TMDB detail API 获取海报（带缓存，不重复请求）
                for (const item of data) {
                    if (!item.tmdbid) continue;
                    const cacheKey = item.tmdbid + '-' + item.media_type;
                    if (this.posterCache[cacheKey]) {
                        item.poster = this.posterCache[cacheKey];
                        continue;
                    }
                    try {
                        const res = await api.request('/tmdb/detail/' + item.tmdbid + '?type=' + item.media_type);
                        const poster = res && res.data && res.data.poster_path;
                        if (poster) {
                            const url = poster.startsWith('http') ? poster : ('https://image.tmdb.org/t/p/w92' + poster);
                            this.posterCache[cacheKey] = url;
                            item.poster = url;
                        }
                    } catch (e) {}
                }
                // 触发响应式更新
                this.recentAdded = [...this.recentAdded];
            } catch (error) {
                console.error('加载最近入库失败:', error);
            }
        },

        getImgUrl(url) {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            return 'https://image.tmdb.org/t/p/w92' + url;
        },

        getTypeText(type) {
            if (!type) return '未知';
            if (type === 'movie' || type.includes('电影')) return '电影';
            if (type === 'tv' || type.includes('电视')) return '电视剧';
            return type;
        },

        getTypeColor(type) {
            if (!type) return 'grey';
            if (type === 'movie' || type.includes('电影')) return 'primary';
            return 'success';
        },
        
        formatNumber(num) {
            if (num === null || num === undefined) return '0';
            return num.toLocaleString('en-US');
        },
        
        async loadConfigs() {
            try {
                const [embyRes, res115, res123] = await Promise.all([
                    api.getEmbyConfigs(),
                    api.get115Configs(),
                    api.get123Configs()
                ]);
                this.embyConfigs = embyRes || [];
                this.configs115 = res115 || [];
                this.configs123 = res123 || [];
            } catch (error) {
                console.error('加载配置失败:', error);
            }
        },
        
        // SVG 环形图参数
        getRingOffset(percent) {
            const radius = 32;
            const circumference = 2 * Math.PI * radius;
            return circumference * (1 - Math.min(percent, 100) / 100);
        },
        
        getRingCircumference() {
            return 2 * Math.PI * 32;
        },
        
        formatTime(timestamp) {
            if (!timestamp) return '';
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
    },
    
    template: `
        <div class="dashboard">
            <!-- 系统监控标题 -->
            <div style="margin-bottom: 12px;">
                <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '18px', fontWeight: '450', margin: '0', display: 'flex', alignItems: 'center' }">
                    <v-icon color="primary" size="20" class="me-2">mdi-monitor-dashboard</v-icon>
                    系统监控
                </h3>
            </div>

            <!-- 系统监控卡片网格 -->
            <div class="dash-monitor-grid">
                <!-- CPU 卡片 -->
                <div class="dash-monitor-item dash-monitor-ring-card">
                    <div class="dash-ring-glow" :style="{ background: 'radial-gradient(circle at 50% 0%, ' + getBarColor(systemStats.cpu?.percent || 0) + '12, transparent 70%)' }"></div>
                    <div class="dash-monitor-header">
                        <div class="dash-monitor-icon" style="background: rgba(255,180,0,0.12);">
                            <v-icon size="18" color="warning">mdi-chip</v-icon>
                        </div>
                        <span class="dash-monitor-title">CPU</span>
                    </div>
                    <div class="dash-ring-container">
                        <svg class="dash-ring-svg" viewBox="0 0 80 80">
                            <circle class="dash-ring-bg" cx="40" cy="40" r="32" />
                            <circle class="dash-ring-fill" cx="40" cy="40" r="32"
                                :stroke="getBarColor(systemStats.cpu?.percent || 0)"
                                :stroke-dasharray="getRingCircumference()"
                                :stroke-dashoffset="getRingOffset(systemStats.cpu?.percent || 0)"
                                :style="{ filter: 'drop-shadow(0 0 4px ' + getBarColor(systemStats.cpu?.percent || 0) + '80)' }" />
                        </svg>
                        <div class="dash-ring-text">
                            <span class="dash-ring-percent" :style="{ color: getBarColor(systemStats.cpu?.percent || 0) }">{{ Math.round(systemStats.cpu?.percent || 0) }}</span>
                            <span class="dash-ring-unit">%</span>
                        </div>
                    </div>
                    <div class="dash-monitor-detail">
                        <v-icon size="12" style="opacity: 0.5;" class="me-1">mdi-application-cog-outline</v-icon>
                        <span class="dash-detail-label">项目占用</span>
                        <span class="dash-detail-value">{{ systemStats.cpu?.project_display || '0%' }}</span>
                    </div>
                </div>

                <!-- 内存卡片 -->
                <div class="dash-monitor-item dash-monitor-ring-card">
                    <div class="dash-ring-glow" :style="{ background: 'radial-gradient(circle at 50% 0%, ' + getBarColor(systemStats.memory?.percent || 0) + '12, transparent 70%)' }"></div>
                    <div class="dash-monitor-header">
                        <div class="dash-monitor-icon" style="background: rgba(156,39,176,0.12);">
                            <v-icon size="18" color="purple">mdi-memory</v-icon>
                        </div>
                        <span class="dash-monitor-title">内存</span>
                    </div>
                    <div class="dash-ring-container">
                        <svg class="dash-ring-svg" viewBox="0 0 80 80">
                            <circle class="dash-ring-bg" cx="40" cy="40" r="32" />
                            <circle class="dash-ring-fill" cx="40" cy="40" r="32"
                                :stroke="getBarColor(systemStats.memory?.percent || 0)"
                                :stroke-dasharray="getRingCircumference()"
                                :stroke-dashoffset="getRingOffset(systemStats.memory?.percent || 0)"
                                :style="{ filter: 'drop-shadow(0 0 4px ' + getBarColor(systemStats.memory?.percent || 0) + '80)' }" />
                        </svg>
                        <div class="dash-ring-text">
                            <span class="dash-ring-percent" :style="{ color: getBarColor(systemStats.memory?.percent || 0) }">{{ Math.round(systemStats.memory?.percent || 0) }}</span>
                            <span class="dash-ring-unit">%</span>
                        </div>
                    </div>
                    <div class="dash-monitor-detail">
                        <v-icon size="12" style="opacity: 0.5;" class="me-1">mdi-application-cog-outline</v-icon>
                        <span class="dash-detail-label">项目占用</span>
                        <span class="dash-detail-value">{{ systemStats.memory?.project_display || '0MB' }}</span>
                    </div>
                    <div class="dash-monitor-detail" style="margin-top: 2px;">
                        <v-icon size="12" style="opacity: 0.5;" class="me-1">mdi-chart-bar</v-icon>
                        <span class="dash-detail-label">总量</span>
                        <span class="dash-detail-value">{{ systemStats.memory?.display || '0MB / 0MB' }}</span>
                    </div>
                </div>

                <!-- 硬盘卡片 -->
                <div class="dash-monitor-item dash-monitor-ring-card">
                    <div class="dash-ring-glow" :style="{ background: 'radial-gradient(circle at 50% 0%, ' + getBarColor(systemStats.disk?.percent || 0) + '12, transparent 70%)' }"></div>
                    <div class="dash-monitor-header">
                        <div class="dash-monitor-icon" style="background: rgba(255,76,81,0.12);">
                            <v-icon size="18" color="error">mdi-harddisk</v-icon>
                        </div>
                        <span class="dash-monitor-title">硬盘</span>
                    </div>
                    <div class="dash-ring-container">
                        <svg class="dash-ring-svg" viewBox="0 0 80 80">
                            <circle class="dash-ring-bg" cx="40" cy="40" r="32" />
                            <circle class="dash-ring-fill" cx="40" cy="40" r="32"
                                :stroke="getBarColor(systemStats.disk?.percent || 0)"
                                :stroke-dasharray="getRingCircumference()"
                                :stroke-dashoffset="getRingOffset(systemStats.disk?.percent || 0)"
                                :style="{ filter: 'drop-shadow(0 0 4px ' + getBarColor(systemStats.disk?.percent || 0) + '80)' }" />
                        </svg>
                        <div class="dash-ring-text">
                            <span class="dash-ring-percent" :style="{ color: getBarColor(systemStats.disk?.percent || 0) }">{{ Math.round(systemStats.disk?.percent || 0) }}</span>
                            <span class="dash-ring-unit">%</span>
                        </div>
                    </div>
                    <div class="dash-monitor-detail">
                        <v-icon size="12" style="opacity: 0.5;" class="me-1">mdi-folder-open-outline</v-icon>
                        <span class="dash-detail-label">剩余</span>
                        <span class="dash-detail-value">{{ systemStats.disk?.free_display || '0 GB' }}</span>
                    </div>
                    <div class="dash-monitor-detail" style="margin-top: 2px;">
                        <v-icon size="12" style="opacity: 0.5;" class="me-1">mdi-chart-bar</v-icon>
                        <span class="dash-detail-label">总量</span>
                        <span class="dash-detail-value">{{ systemStats.disk?.display || '0 GB / 0 GB' }}</span>
                    </div>
                </div>

                <!-- 网络 + 运行时间卡片 -->
                <div class="dash-monitor-item">
                    <div class="dash-ring-glow" style="background: radial-gradient(circle at 50% 0%, rgba(86,202,0,0.08), transparent 70%);"></div>
                    <div class="dash-monitor-header">
                        <div class="dash-monitor-icon" style="background: rgba(86,202,0,0.12);">
                            <v-icon size="18" color="success">mdi-swap-vertical</v-icon>
                        </div>
                        <span class="dash-monitor-title">网络</span>
                    </div>
                    <div class="dash-net-enhanced">
                        <div class="dash-net-stat">
                            <div class="dash-net-arrow" style="background: rgba(86,202,0,0.12);">
                                <v-icon size="14" color="success">mdi-arrow-up</v-icon>
                            </div>
                            <div>
                                <div class="dash-net-label">上传</div>
                                <div class="dash-net-speed">{{ systemStats.network?.upload || '0 B/s' }}</div>
                            </div>
                        </div>
                        <div class="dash-net-stat">
                            <div class="dash-net-arrow" style="background: rgba(61,111,213,0.12);">
                                <v-icon size="14" color="info">mdi-arrow-down</v-icon>
                            </div>
                            <div>
                                <div class="dash-net-label">下载</div>
                                <div class="dash-net-speed">{{ systemStats.network?.download || '0 B/s' }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="dash-monitor-detail" style="margin-top: 8px;">
                        <v-icon size="12" style="opacity: 0.5;" class="me-1">mdi-clock-outline</v-icon>
                        <span class="dash-detail-label">已运行</span>
                        <span class="dash-detail-value">{{ systemStats.uptime?.display || '0分钟' }}</span>
                    </div>
                </div>
            </div>

            <!-- 最近缓存记录 -->
            <div style="margin-bottom: 12px; margin-top: 20px;">
                <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '18px', fontWeight: '450', margin: '0', display: 'flex', alignItems: 'center' }">
                    <v-icon color="primary" size="20" class="me-2">mdi-cached</v-icon>
                    最近缓存记录
                </h3>
            </div>

            <v-card class="glass-card main-card card-hover-no-margin mb-6" color="config-card" style="padding: 16px;">
                <div v-if="recentCache.length === 0" style="text-align: center; padding: 24px; color: rgba(var(--v-theme-on-surface),0.5);">
                    <v-icon size="40" color="grey">mdi-cached</v-icon>
                    <p style="margin-top: 8px; font-size: 13px;">暂无缓存记录</p>
                </div>
                <div v-else>
                    <div v-for="(item, index) in recentCache" :key="index" class="dash-cache-item" :style="{ borderBottom: index < recentCache.length - 1 ? '1px solid rgba(var(--v-theme-on-surface),0.06)' : 'none' }">
                        <div class="dash-cache-dot" :style="{ background: item.remaining > 60 ? '#56CA00' : '#FFB400', boxShadow: item.remaining > 60 ? '0 0 6px rgba(86,202,0,0.5)' : '0 0 6px rgba(255,180,0,0.5)' }"></div>
                        <div style="flex: 1; min-width: 0;">
                            <div class="dash-cache-name">{{ item.source_file }}</div>
                            <div class="dash-cache-meta">
                                {{ formatTime(item.create_time) }}
                                <span style="margin: 0 6px; opacity: 0.3;">|</span>
                                剩余 {{ item.remaining }}s
                            </div>
                        </div>
                    </div>
                </div>
            </v-card>

            <!-- 媒体统计 + 最近入库 并排 -->
            <div class="dash-stats-row">
                <!-- 媒体统计 -->
                <div class="dash-stats-col dash-stats-col-stats">
                    <div style="margin-bottom: 10px;">
                        <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '18px', fontWeight: '450', margin: '0', display: 'flex', alignItems: 'center' }">
                            <v-icon color="primary" size="20" class="me-2">mdi-chart-box-outline</v-icon>
                            媒体统计
                        </h3>
                    </div>
                    <v-card class="glass-card main-card card-hover-no-margin" color="config-card" style="padding: 12px 16px;">
                        <div class="dash-media-stats-row">
                            <div class="dash-media-stat-item">
                                <div class="dash-media-stat-avatar" style="background: linear-gradient(135deg, rgba(104,117,245,0.18), rgba(104,117,245,0.06));">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#6875F5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="2" width="20" height="20" rx="3"/>
                                        <polygon points="10,8 16,12 10,16" fill="#6875F5" stroke="none"/>
                                    </svg>
                                </div>
                                <div class="dash-media-stat-text">
                                    <span class="dash-media-stat-label">电影</span>
                                    <span class="dash-media-stat-value">{{ formatNumber(mediaStats.movie_count) }}</span>
                                </div>
                            </div>
                            <div class="dash-media-stat-item">
                                <div class="dash-media-stat-avatar" style="background: linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.06));">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                                        <path d="M7 2v4M17 2v4"/>
                                        <line x1="2" y1="10" x2="22" y2="10"/>
                                    </svg>
                                </div>
                                <div class="dash-media-stat-text">
                                    <span class="dash-media-stat-label">电视剧</span>
                                    <span class="dash-media-stat-value">{{ formatNumber(mediaStats.tv_count) }}</span>
                                </div>
                            </div>
                            <div class="dash-media-stat-item">
                                <div class="dash-media-stat-avatar" style="background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,191,36,0.06));">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FBBF24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6"/>
                                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                        <line x1="12" y1="11" x2="12" y2="16"/>
                                        <line x1="9" y1="13.5" x2="15" y2="13.5"/>
                                    </svg>
                                </div>
                                <div class="dash-media-stat-text">
                                    <span class="dash-media-stat-label">剧集</span>
                                    <span class="dash-media-stat-value">{{ formatNumber(mediaStats.episode_count) }}</span>
                                </div>
                            </div>
                            <div class="dash-media-stat-item">
                                <div class="dash-media-stat-avatar" style="background: linear-gradient(135deg, rgba(96,165,250,0.18), rgba(96,165,250,0.06));">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#60A5FA" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="10" cy="8" r="4"/>
                                        <path d="M4 21v-1a6 6 0 0112 0v1"/>
                                        <circle cx="19" cy="7.5" r="2.5" opacity="0.5"/>
                                        <path d="M22 21v-1a4 4 0 00-4-4" opacity="0.5"/>
                                    </svg>
                                </div>
                                <div class="dash-media-stat-text">
                                    <span class="dash-media-stat-label">用户</span>
                                    <span class="dash-media-stat-value">{{ formatNumber(mediaStats.user_count) }}</span>
                                </div>
                            </div>
                        </div>
                    </v-card>
                </div>

                <!-- 最近入库 -->
                <div class="dash-stats-col dash-stats-col-recent">
                    <div style="margin-bottom: 10px;">
                        <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '18px', fontWeight: '450', margin: '0', display: 'flex', alignItems: 'center' }">
                            <v-icon color="primary" size="20" class="me-2">mdi-movie-open-play</v-icon>
                            最近入库
                        </h3>
                    </div>
                    <v-card class="glass-card main-card card-hover-no-margin" color="config-card" style="padding: 6px 14px;">
                        <div v-if="recentAdded.length === 0" style="text-align: center; padding: 18px 0; color: rgba(var(--v-theme-on-surface),0.5); font-size: 13px;">
                            <v-icon size="28" color="grey" class="mb-1">mdi-movie-open-play-outline</v-icon>
                            <div>暂无入库记录</div>
                        </div>
                        <div v-else>
                            <div v-for="(item, idx) in recentAdded" :key="idx" class="dash-recent-item" :style="{ borderBottom: idx < recentAdded.length - 1 ? '1px solid rgba(var(--v-theme-on-surface),0.06)' : 'none' }">
                                <span class="dash-recent-index">{{ idx + 1 }}</span>
                                <v-img v-if="item.poster" :src="item.poster" class="dash-recent-poster rounded" cover :aspect-ratio="2/3" />
                                <div v-else class="dash-recent-poster-empty rounded">
                                    <v-icon size="18" color="grey">mdi-movie-outline</v-icon>
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div class="dash-recent-title">
                                        <span class="text-truncate" style="flex:1;min-width:0;">{{ item.title }}</span>
                                        <v-chip size="x-small" :color="getTypeColor(item.type)" variant="tonal" class="ms-2" style="flex-shrink:0;">{{ getTypeText(item.type) }}</v-chip>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </v-card>
                </div>
            </div>

            <!-- Emby 和 115 配置卡片 -->
            <v-row>
                <!-- Emby 服务器 -->
                <v-col cols="12" sm="6" md="4">
                    <div class="glass-card config-card media-card" style="display: flex; flex-direction: column; cursor: pointer; padding: 10px 14px;" @click="$root.selectMenu({id: 'helper_emby'})">
                        <div class="neon-border neon-purple"></div>
                        <div class="card-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                            <div class="plugin-icon" style="background: rgba(139,92,246,0.2); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 8px;">
                                <img src="assets/images/emby-icon.png" style="width: 28px; height: 28px; border-radius: 4px; object-fit: contain; display: block;">
                            </div>
                            <h3 class="plugin-name" style="margin: 0; padding: 0; line-height: 1; font-size: 14px;">Emby服务器</h3>
                        </div>
                        <div class="config-list" style="overflow: hidden;">
                            <div v-if="embyConfigs.length === 0" style="padding: 2px 0; color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px;">
                                暂无配置
                            </div>
                            <div v-for="cfg in embyConfigs.slice(0,2)" :key="cfg.id" class="config-item" style="padding: 2px 0;">
                                <div class="config-dot active"></div>
                                <span class="config-name" style="font-size: 12px;">{{ cfg.name }}</span>
                            </div>
                        </div>
                        <div class="card-glow purple-glow"></div>
                    </div>
                </v-col>
                
                <!-- 115 助手 -->
                <v-col cols="12" sm="6" md="4">
                    <div class="glass-card config-card cloud-card" style="display: flex; flex-direction: column; cursor: pointer; padding: 10px 14px;" @click="$root.selectMenu({id: 'helper115'})">
                        <div class="neon-border neon-blue"></div>
                        <div class="card-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                            <div class="plugin-icon" style="background: rgba(59,130,246,0.2); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 8px;">
                                <img src="assets/images/115-icon.ico" style="width: 28px; height: 28px; border-radius: 4px; object-fit: contain; display: block;">
                            </div>
                            <h3 class="plugin-name" style="margin: 0; padding: 0; line-height: 1; font-size: 14px;">115助手</h3>
                        </div>
                        <div class="config-list" style="overflow: hidden;">
                            <div v-if="configs115.length === 0" style="padding: 2px 0; color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px;">
                                暂无配置
                            </div>
                            <div v-for="cfg in configs115.slice(0,2)" :key="cfg.id" class="config-item" style="padding: 2px 0;">
                                <div class="config-dot active"></div>
                                <span class="config-name" style="font-size: 12px;">{{ cfg.name }}</span>
                            </div>
                        </div>
                        <div class="card-glow blue-glow"></div>
                    </div>
                </v-col>
                
                <!-- 123 助手 -->
                <v-col cols="12" sm="6" md="4">
                    <div class="glass-card config-card cloud-card" style="display: flex; flex-direction: column; cursor: pointer; padding: 10px 14px;" @click="$root.selectMenu({id: 'helper123'})">
                        <div class="neon-border neon-cyan"></div>
                        <div class="card-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                            <div class="plugin-icon" style="background: rgba(0,188,212,0.2); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 8px;">
                                <img src="assets/images/123pan.png" style="width: 28px; height: 28px; border-radius: 4px; object-fit: contain; display: block;">
                            </div>
                            <h3 class="plugin-name" style="margin: 0; padding: 0; line-height: 1; font-size: 14px;">123助手</h3>
                        </div>
                        <div class="config-list" style="overflow: hidden;">
                            <div v-if="configs123.length === 0" style="padding: 2px 0; color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px;">
                                暂无配置
                            </div>
                            <div v-for="cfg in configs123.slice(0,2)" :key="cfg.id" class="config-item" style="padding: 2px 0;">
                                <div class="config-dot active"></div>
                                <span class="config-name" style="font-size: 12px;">{{ cfg.name }}</span>
                            </div>
                        </div>
                        <div class="card-glow cyan-glow"></div>
                    </div>
                </v-col>
            </v-row>
        </div>
    `
};
