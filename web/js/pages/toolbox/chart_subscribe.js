// 榜单订阅页面组件
const ChartSubscribePage = {
    name: 'ChartSubscribePage',
    
    data() {
        return {
            loading: false,
            saving: false,
            running: false,
            config: {
                enabled: false,
                cron_expression: '0 20 * * *',
                charts: [],
                count_per_chart: 20,
                preset_id: '',
                preset_ids: [],
                min_vote: 0,
                media_type_filter: 'all',
            },
            availableCharts: [],
            presets: [],
            statusTimer: null,
        }
    },
    
    computed: {
        tmdbCharts() {
            return this.availableCharts.filter(c => c.source === 'tmdb');
        },
        doubanCharts() {
            return this.availableCharts.filter(c => c.source === 'douban');
        },
        selectedCount() {
            return this.config.charts.length;
        },
        mediaTypeOptions() {
            return [
                { title: '全部', value: 'all' },
                { title: '仅电影', value: 'movie' },
                { title: '仅剧集', value: 'tv' },
            ];
        }
    },
    
    async mounted() {
        await this.loadData();
    },
    
    beforeUnmount() {
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
        }
    },
    
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [configRes, chartsRes, presetsRes] = await Promise.all([
                    api.getChartSubscribeConfig(),
                    api.getAvailableCharts(),
                    api.getSubscribePresets(),
                ]);
                if (configRes) {
                    this.config = { ...this.config, ...configRes };
                    // 兼容旧配置：如果 preset_ids 为空但有 preset_id，则迁移
                    if ((!this.config.preset_ids || this.config.preset_ids.length === 0) && this.config.preset_id) {
                        this.config.preset_ids = [this.config.preset_id];
                    }
                }
                if (chartsRes) this.availableCharts = chartsRes;
                if (presetsRes) this.presets = presetsRes;
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveConfig() {
            if (!this.config.preset_ids || this.config.preset_ids.length === 0) {
                window.showMessage('请先选择订阅预设配置', 'error');
                return;
            }
            if (this.config.cron_expression) {
                const r = validateCronExpression(this.config.cron_expression);
                if (!r.valid) {
                    window.showMessage(`定时表达式错误: ${r.error}`, 'error');
                    return;
                }
            }
            this.saving = true;
            try {
                const res = await api.updateChartSubscribeConfig(this.config);
                if (res.success) {
                    window.showMessage('配置保存成功', 'success');
                } else {
                    window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        async runNow() {
            if (this.running) return;
            if (!this.config.preset_ids || this.config.preset_ids.length === 0) {
                window.showMessage('请先选择订阅预设配置', 'error');
                return;
            }
            if (!this.config.charts || this.config.charts.length === 0) {
                window.showMessage('请先选择至少一个榜单', 'error');
                return;
            }
            // 先保存配置
            this.saving = true;
            try {
                const saveRes = await api.updateChartSubscribeConfig(this.config);
                if (!saveRes.success) {
                    window.showMessage(saveRes.message || '保存配置失败', 'error');
                    this.saving = false;
                    return;
                }
            } catch (e) {
                window.showMessage('保存配置失败', 'error');
                this.saving = false;
                return;
            }
            this.saving = false;
            
            this.running = true;
            try {
                const res = await api.runChartSubscribe();
                if (res.success) {
                    window.showMessage('榜单订阅任务已开始执行，请查看系统日志', 'success');
                    this.startStatusPolling();
                } else {
                    window.showMessage(res.message || '执行失败', 'error');
                    this.running = false;
                }
            } catch (error) {
                console.error('执行失败:', error);
                window.showMessage('执行失败', 'error');
                this.running = false;
            }
        },
        
        startStatusPolling() {
            if (this.statusTimer) clearInterval(this.statusTimer);
            this.statusTimer = setInterval(async () => {
                try {
                    const status = await api.getChartSubscribeStatus();
                    if (!status.running) {
                        this.running = false;
                        clearInterval(this.statusTimer);
                        this.statusTimer = null;
                        window.showMessage('榜单订阅任务执行完成', 'success');
                    }
                } catch (e) {
                    // ignore
                }
            }, 3000);
        },
        
        toggleChart(key) {
            const idx = this.config.charts.indexOf(key);
            if (idx >= 0) {
                this.config.charts.splice(idx, 1);
            } else {
                this.config.charts.push(key);
            }
        },
        
        isChartSelected(key) {
            return this.config.charts.includes(key);
        },
        
        selectAllTmdb() {
            const keys = this.tmdbCharts.map(c => c.key);
            const allSelected = keys.every(k => this.config.charts.includes(k));
            if (allSelected) {
                this.config.charts = this.config.charts.filter(k => !keys.includes(k));
            } else {
                for (const k of keys) {
                    if (!this.config.charts.includes(k)) this.config.charts.push(k);
                }
            }
        },
        
        selectAllDouban() {
            const keys = this.doubanCharts.map(c => c.key);
            const allSelected = keys.every(k => this.config.charts.includes(k));
            if (allSelected) {
                this.config.charts = this.config.charts.filter(k => !keys.includes(k));
            } else {
                for (const k of keys) {
                    if (!this.config.charts.includes(k)) this.config.charts.push(k);
                }
            }
        },
        
        getTypeIcon(type_hint) {
            if (type_hint === 'movie') return 'mdi-movie';
            if (type_hint === 'tv') return 'mdi-television-classic';
            return 'mdi-fire';
        },
        
        getTypeColor(type_hint) {
            if (type_hint === 'movie') return 'blue';
            if (type_hint === 'tv') return 'green';
            return 'orange';
        },
        
        getPresetName(presetId) {
            const p = this.presets.find(p => p.id === presetId);
            return p ? p.name : '未选择';
        },
    },
    
    template: `
        <div>
                    <v-card flat :loading="loading">
                        <v-card-text>
                            <!-- 基础设置 -->
                            <div class="text-subtitle-1 font-weight-medium mb-3" style="display: flex; align-items: center; gap: 8px;">
                                <v-icon size="20" color="primary">mdi-cog</v-icon>
                                基础设置
                            </div>
                            
                            <v-row dense>
                                <v-col cols="12" sm="6" md="3">
                                    <v-switch v-model="config.enabled" label="启用定时执行" color="primary" hide-details density="compact"></v-switch>
                                </v-col>
                            </v-row>
                            
                            <v-row dense class="mt-2">
                                <v-col cols="12" sm="6" md="4">
                                    <v-text-field v-model="config.cron_expression" label="定时表达式" variant="outlined" density="compact" hide-details
                                        hint="默认每天20点: 0 20 * * *" persistent-hint prepend-inner-icon="mdi-clock-outline"></v-text-field>
                                </v-col>
                                <v-col cols="12" sm="6" md="4">
                                    <v-text-field v-model.number="config.count_per_chart" label="每个榜单获取条数" variant="outlined" density="compact" hide-details
                                        type="number" min="1" max="100" prepend-inner-icon="mdi-counter"></v-text-field>
                                </v-col>
                                <v-col cols="12" sm="6" md="4">
                                    <v-text-field v-model.number="config.min_vote" label="最低评分 (0=不限)" variant="outlined" density="compact" hide-details
                                        type="number" min="0" max="10" step="0.5" prepend-inner-icon="mdi-star-outline"></v-text-field>
                                </v-col>
                            </v-row>
                            
                            <v-row dense class="mt-2">
                                <v-col cols="12" sm="6" md="4">
                                    <v-select v-model="config.media_type_filter" :items="mediaTypeOptions" item-title="title" item-value="value"
                                        label="媒体类型" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-filter-outline"></v-select>
                                </v-col>
                                <v-col cols="12" sm="6" md="4">
                                    <v-select v-model="config.preset_ids"
                                        :items="presets.map(p=>({title:p.name,value:p.id}))"
                                        item-title="title" item-value="value"
                                        label="订阅预设配置（多选，按选择顺序匹配）" variant="outlined" density="compact"
                                        multiple chips closable-chips
                                        :rules="[v => (v && v.length > 0) || '必须选择订阅预设']"
                                        :error="!config.preset_ids || config.preset_ids.length === 0"
                                        :error-messages="(!config.preset_ids || config.preset_ids.length === 0) ? '必须选择订阅预设' : ''"
                                        prepend-inner-icon="mdi-playlist-check"></v-select>
                                </v-col>
                            </v-row>
                            
                            <v-divider class="my-5"></v-divider>
                            
                            <!-- 榜单选择 -->
                            <div class="text-subtitle-1 font-weight-medium mb-3" style="display: flex; align-items: center; gap: 8px;">
                                <v-icon size="20" color="primary">mdi-format-list-numbered</v-icon>
                                选择榜单
                                <v-chip size="small" variant="tonal" color="primary" class="ml-2">已选 {{ selectedCount }} 个</v-chip>
                            </div>
                            
                            <!-- TMDB -->
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <span class="text-subtitle-2 font-weight-medium">TMDB</span>
                                <v-btn variant="text" size="x-small" color="primary" @click="selectAllTmdb" style="text-transform: none;">
                                    {{ tmdbCharts.every(c => isChartSelected(c.key)) ? '取消全选' : '全选' }}
                                </v-btn>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
                                <v-chip v-for="chart in tmdbCharts" :key="chart.key"
                                    class="discover-category-chip"
                                    :variant="isChartSelected(chart.key) ? 'flat' : 'outlined'"
                                    :color="isChartSelected(chart.key) ? 'primary' : undefined"
                                    @click="toggleChart(chart.key)"
                                    style="cursor: pointer;">
                                    <v-icon start class="discover-chip-icon">{{ getTypeIcon(chart.type_hint) }}</v-icon>
                                    {{ chart.label.replace('TMDB ', '') }}
                                </v-chip>
                            </div>
                            
                            <!-- 豆瓣 -->
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <span class="text-subtitle-2 font-weight-medium">豆瓣</span>
                                <v-btn variant="text" size="x-small" color="primary" @click="selectAllDouban" style="text-transform: none;">
                                    {{ doubanCharts.every(c => isChartSelected(c.key)) ? '取消全选' : '全选' }}
                                </v-btn>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
                                <v-chip v-for="chart in doubanCharts" :key="chart.key"
                                    class="discover-category-chip"
                                    :variant="isChartSelected(chart.key) ? 'flat' : 'outlined'"
                                    :color="isChartSelected(chart.key) ? 'success' : undefined"
                                    @click="toggleChart(chart.key)"
                                    style="cursor: pointer;">
                                    <v-icon start class="discover-chip-icon">{{ getTypeIcon(chart.type_hint) }}</v-icon>
                                    {{ chart.label.replace('豆瓣', '') }}
                                </v-chip>
                            </div>
                            
                            <v-divider class="my-4"></v-divider>
                            
                            <!-- 无预设警告 -->
                            <v-alert v-if="presets.length === 0" type="warning" variant="tonal" density="compact" class="mb-4">
                                <div style="font-size: 13px;">
                                    当前没有任何订阅预设配置。请先前往
                                    <a href="#/subscribe" style="color: inherit; font-weight: bold; text-decoration: underline; cursor: pointer;">订阅设置</a>
                                    中添加预设后再使用榜单订阅功能。
                                </div>
                            </v-alert>
                            <v-alert v-else-if="!config.preset_ids || config.preset_ids.length === 0" type="warning" variant="tonal" density="compact" class="mb-4">
                                <div style="font-size: 13px;">
                                    请选择订阅预设配置（可多选），榜单订阅的所有条目将按预设顺序匹配执行。
                                </div>
                            </v-alert>
                            
                            <!-- 操作按钮 -->
                            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                <v-btn color="primary" variant="flat" @click="saveConfig" :loading="saving" :disabled="running"
                                    prepend-icon="mdi-content-save" style="border-radius: 10px;">
                                    保存配置
                                </v-btn>
                                <v-btn color="success" variant="tonal" @click="runNow" :loading="running" :disabled="saving"
                                    prepend-icon="mdi-play" style="border-radius: 10px;">
                                    {{ running ? '执行中...' : '立即执行' }}
                                </v-btn>
                            </div>
                        </v-card-text>
                    </v-card>
        </div>
    `
};
