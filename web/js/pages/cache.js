// 缓存管理页面组件
const CachePage = {
    name: 'CachePage',
    
    data() {
        return {
            caches: [],
            loading: false,
            clearing: false,
            now: Date.now() / 1000,
            filterMode: 'all' // 'all', 'emby', 'fast_transfer'
        }
    },
    
    async mounted() {
        await this.loadCaches();
        // 每 5 秒从服务器刷新
        this.fetchTimer = setInterval(() => this.loadCaches(), 5000);
        // 每秒更新剩余时间显示
        this.countdownTimer = setInterval(() => {
            this.now = Date.now() / 1000;
        }, 1000);
    },
    
    beforeUnmount() {
        if (this.fetchTimer) clearInterval(this.fetchTimer);
        if (this.countdownTimer) clearInterval(this.countdownTimer);
    },
    
    computed: {
        sortedCaches() {
            // 按创建时间倒序排列（最新的在上面）
            return [...this.caches].sort((a, b) => b.create_time - a.create_time);
        },
        
        filteredCaches() {
            if (this.filterMode === 'all') {
                return this.sortedCaches;
            } else if (this.filterMode === 'emby') {
                return this.sortedCaches.filter(cache => !cache.is_fast_transfer);
            } else if (this.filterMode === 'fast_transfer') {
                return this.sortedCaches.filter(cache => cache.is_fast_transfer);
            }
            return this.sortedCaches;
        },
        
        embyCount() {
            return this.caches.filter(cache => !cache.is_fast_transfer).length;
        },
        
        fastTransferCount() {
            return this.caches.filter(cache => cache.is_fast_transfer).length;
        }
    },
    
    methods: {
        async loadCaches() {
            try {
                const res = await api.request('/cache');
                this.caches = res.data || [];
            } catch (error) {
                console.error('加载缓存失败:', error);
            }
        },
        
        getRemaining(cache) {
            const remaining = Math.max(0, Math.floor(cache.expire_time - this.now));
            return remaining;
        },
        
        async deleteCache(cacheKey) {
            try {
                await api.request(`/cache/${encodeURIComponent(cacheKey)}`, { method: 'DELETE' });
                window.showMessage('缓存删除成功', 'success');
                await this.loadCaches();
            } catch (error) {
                console.error('删除缓存失败:', error);
                window.showMessage('删除缓存失败', 'error');
            }
        },
        
        async clearAll() {
            this.clearing = true;
            try {
                const res = await api.request('/cache/clear', { method: 'POST' });
                window.showMessage(res.message || '缓存已清空', 'success');
                await this.loadCaches();
            } catch (error) {
                console.error('清空缓存失败:', error);
                window.showMessage('清空缓存失败', 'error');
            } finally {
                this.clearing = false;
            }
        },
        
        formatTime(timestamp) {
            const date = new Date(timestamp * 1000);
            return date.toLocaleString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
        },
        
        getSourceTypeLabel(sourceType) {
            switch (sourceType) {
                case '115':
                    return '115直链';
                case '123':
                    return '123直链';
                case 'quark':
                    return '夸克直链';
                case 'cloud189':
                    return '天翼直链';
                case 'http_fallback':
                    return '获取直链';
                default:
                    return '获取直链';
            }
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '28px', fontWeight: '450', margin: '0' }">
                            缓存管理
                        </h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="color: rgba(var(--v-theme-on-surface),0.6); font-size: 14px;">共 {{ filteredCaches.length }} 条</span>
                        <v-btn color="error" @click="clearAll" size="small" style="border-radius: 8px;" :loading="clearing" :disabled="caches.length === 0">
                            <v-icon left size="18">mdi-delete-sweep</v-icon>
                            <span class="d-none d-sm-inline">清空缓存</span>
                            <span class="d-inline d-sm-none">清空</span>
                        </v-btn>
                    </div>
                </div>
            </div>
            
            <!-- 筛选按钮组 - 响应式布局 -->
            <div style="margin-bottom: 16px;">
                <!-- PC端：横向按钮组 -->
                <v-btn-toggle v-model="filterMode" mandatory color="primary" class="d-none d-sm-flex" style="border-radius: 8px;">
                    <v-btn value="all" size="small" style="border-radius: 8px 0 0 8px;">
                        <v-icon left size="18">mdi-all-inclusive</v-icon>
                        全部 ({{ caches.length }})
                    </v-btn>
                    <v-btn value="emby" size="small">
                        <v-icon left size="18">mdi-filmstrip</v-icon>
                        常规缓存 ({{ embyCount }})
                    </v-btn>
                    <v-btn value="fast_transfer" size="small" style="border-radius: 0 8px 8px 0;">
                        <v-icon left size="18">mdi-flash-triangle</v-icon>
                        秒传播放 ({{ fastTransferCount }})
                    </v-btn>
                </v-btn-toggle>
                
                <!-- 移动端：紧凑按钮组 -->
                <v-btn-toggle v-model="filterMode" mandatory color="primary" class="d-flex d-sm-none" style="border-radius: 8px; width: 100%;">
                    <v-btn value="all" size="x-small" style="border-radius: 8px 0 0 8px; flex: 1; font-size: 11px; padding: 0 8px;">
                        <v-icon size="14">mdi-all-inclusive</v-icon>
                        <span style="margin-left: 4px;">全部</span>
                        <span style="margin-left: 2px; opacity: 0.7;">({{ caches.length }})</span>
                    </v-btn>
                    <v-btn value="emby" size="x-small" style="flex: 1; font-size: 11px; padding: 0 8px;">
                        <v-icon size="14">mdi-filmstrip</v-icon>
                        <span style="margin-left: 4px;">常规</span>
                        <span style="margin-left: 2px; opacity: 0.7;">({{ embyCount }})</span>
                    </v-btn>
                    <v-btn value="fast_transfer" size="x-small" style="border-radius: 0 8px 8px 0; flex: 1; font-size: 11px; padding: 0 8px;">
                        <v-icon size="14">mdi-flash-triangle</v-icon>
                        <span style="margin-left: 4px;">秒传</span>
                        <span style="margin-left: 2px; opacity: 0.7;">({{ fastTransferCount }})</span>
                    </v-btn>
                </v-btn-toggle>
            </div>

            <!-- 缓存列表 -->
            <div v-if="filteredCaches.length > 0">
                <div v-for="(cache, index) in filteredCaches" :key="cache.key" class="glass-card cache-item" style="padding: 12px 16px; margin-bottom: 8px; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <div style="flex: 1; min-width: 0; line-height: 1.4;">
                            <!-- 第一行：状态和时间 -->
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <v-chip size="x-small" :color="getRemaining(cache) > 60 ? 'success' : 'warning'" style="height: 20px; font-size: 11px;">
                                    剩余 {{ getRemaining(cache) }}s
                                </v-chip>
                                <v-chip v-if="cache.is_fast_transfer" size="x-small" color="purple" style="height: 20px; font-size: 11px;">
                                    <v-icon left size="12">mdi-flash-triangle</v-icon>
                                    秒传播放
                                </v-chip>
                                <v-chip v-else size="x-small" color="primary" style="height: 20px; font-size: 11px;">
                                    <v-icon left size="12">mdi-filmstrip</v-icon>
                                    常规缓存
                                </v-chip>
                                <span style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 11px;">
                                    {{ formatTime(cache.create_time) }}
                                </span>
                            </div>
                            
                            <!-- Emby源文件标签 -->
                            <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 11px;">Emby源文件:</div>
                            <!-- Emby源文件内容 -->
                            <div style="color: white; font-size: 12px; word-break: break-all; padding-left: 8px;">{{ cache.source_file }}</div>
                            
                            <!-- 直链标签 -->
                            <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 11px;">{{ getSourceTypeLabel(cache.source_type) }}:</div>
                            <!-- 直链内容 -->
                            <div style="color: #56CA00; font-size: 12px; word-break: break-all; font-family: monospace; padding-left: 8px;">{{ cache.redirect_url }}</div>
                            
                            <!-- Emby 用户、Host 和 UA -->
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px;">
                                <div v-if="cache.emby_user_name" style="display: flex; align-items: center; gap: 4px;">
                                    <span style="color: rgba(var(--v-theme-on-surface),0.5);">Emby用户:</span>
                                    <span style="color: #AB47BC; font-weight: 500;">{{ cache.emby_user_name }}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="color: rgba(var(--v-theme-on-surface),0.5);">Host:</span>
                                    <span style="color: rgba(var(--v-theme-on-surface),0.8);">{{ cache.host }}</span>
                                </div>
                                <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 4px;">
                                    <span style="color: rgba(var(--v-theme-on-surface),0.5);">UA:</span>
                                    <span style="color: rgba(var(--v-theme-on-surface),0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ cache.user_agent }}</span>
                                </div>
                            </div>
                        </div>
                        
                        <v-btn icon size="x-small" variant="text" @click="deleteCache(cache.key)" style="margin-top: -4px;">
                            <v-icon color="error" size="18">mdi-delete</v-icon>
                        </v-btn>
                    </div>
                </div>
            </div>
            
            <!-- 空状态 -->
            <div v-else class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px;">
                <v-icon size="48" color="grey">mdi-cached</v-icon>
                <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginTop: '12px', fontSize: '16px' }">暂无缓存</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">
                    {{ filterMode === 'all' ? '播放视频后会自动缓存直链' : filterMode === 'emby' ? '暂无常规缓存' : '暂无秒传播放缓存' }}
                </p>
            </div>
        </div>
    `
};
