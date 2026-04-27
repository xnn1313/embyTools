// Emby 缺集补全页面组件
const EmbyGapFillerPage = {
    name: 'EmbyGapFillerPage',

    props: {
        selectedItems: { type: Array, default: () => [] }
    },

    data() {
        return {
            loading: false,
            config: {
                search_source: 'tg_hdhive',
                results_per_source_tg: 1,
                results_per_source_hdhive: 1,
                use_115_config: '',
                scan_mode: 3,
                recognize_threads: 3,
                transfer_mode: 'share_strm',
                transfer_folder_cid: '0',
                share_strm_path: '',
                multi_version: false,
            },
            config115Names: [],
            strmPaths: [],
            running: false,
            progress: '',
            error: null,
            logLines: [],
            pollTimer: null,
            // 115 文件夹浏览器
            cloudFolderDialog: false,
            cloudFolderLoading: false,
            cloudFolders: [],
            cloudCurrentCid: '0',
            cloudFolderPath: [{ cid: '0', name: '根目录' }],
            searchSources: [
                { value: 'tg_hdhive', title: 'TG + 影巢' },
                { value: 'hdhive', title: '仅影巢' },
                { value: 'tg', title: '仅 TG' },
            ],
            scanModes: [
                { value: 3, title: '葵花宝典' },
                { value: 0, title: '最快' },
                { value: 1, title: '大包模式' },
            ],
            transferModes: [
                { value: 'share_strm', title: '生成分享 STRM' },
                { value: 'transfer', title: '网盘转存' },
            ],
        }
    },

    computed: {
        selectedCount() {
            return this.selectedItems.length;
        },
        totalMissing() {
            let count = 0;
            for (const item of this.selectedItems) {
                for (const s of (item.seasons || [])) {
                    count += (s.missing_episodes || []).length;
                }
            }
            return count;
        },
        canStart() {
            return this.selectedCount > 0 && !this.running && this.config.use_115_config;
        }
    },

    async mounted() {
        await this.loadConfig();
        await this.checkStatus();
    },

    watch: {
        logLines: {
            handler() {
                this.$nextTick(() => {
                    const el = this.$refs.logContainer;
                    if (el) el.scrollTop = el.scrollHeight;
                });
            },
            deep: true
        }
    },

    beforeUnmount() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    },

    methods: {
        async loadConfig() {
            this.loading = true;
            try {
                const res = await api.request('/emby/gap_filler/config');
                if (res.success && res.data) {
                    const saved = res.data.config || {};
                    Object.keys(this.config).forEach(k => {
                        if (saved[k] !== undefined) this.config[k] = saved[k];
                    });
                    this.config115Names = res.data.config_115_names || [];
                    this.strmPaths = res.data.strm_paths || [];
                    // 默认选第一个 115 配置
                    if (!this.config.use_115_config && this.config115Names.length > 0) {
                        this.config.use_115_config = this.config115Names[0];
                    }
                    // 默认选第一个 STRM 路径
                    if (!this.config.share_strm_path && this.strmPaths.length > 0) {
                        this.config.share_strm_path = this.strmPaths[0];
                    }
                }
            } catch (e) {
                console.error('加载补全配置失败', e);
            } finally {
                this.loading = false;
            }
        },

        async saveConfig() {
            try {
                await api.request('/emby/gap_filler/config', {
                    method: 'POST',
                    body: JSON.stringify(this.config)
                });
            } catch (e) { /* ignore */ }
        },

        async startFiller() {
            if (!this.canStart) return;
            await this.saveConfig();

            // 构建选中项（包含原始 missing_episodes）
            const items = this.selectedItems.map(item => ({
                name: item.name,
                year: item.year || '',
                tmdb_id: item.tmdb_id || '',
                seasons: (item.seasons || []).map(s => ({
                    season: s.season,
                    missing_episodes: s.missing_episodes || []
                }))
            }));

            try {
                const res = await api.request('/emby/gap_filler/start', {
                    method: 'POST',
                    body: JSON.stringify({
                        selected_items: items,
                        config: this.config
                    })
                });
                if (res.success) {
                    window.showMessage && window.showMessage('补全任务已启动', 'success');
                    this.running = true;
                    this.error = null;
                    this.startPolling();
                } else {
                    window.showMessage && window.showMessage(res.message || '启动失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('启动失败', 'error');
            }
        },

        async stopFiller() {
            try {
                const res = await api.request('/emby/gap_filler/stop', { method: 'POST' });
                if (res.success) {
                    window.showMessage && window.showMessage('已发送停止信号', 'info');
                }
            } catch (e) { /* ignore */ }
        },

        startPolling() {
            if (this.pollTimer) clearInterval(this.pollTimer);
            this.pollTimer = setInterval(async () => {
                await this.checkStatus();
            }, 2000);
        },

        async checkStatus() {
            try {
                const res = await api.request('/emby/gap_filler/status');
                if (res.success && res.data) {
                    const st = res.data;
                    this.running = st.running;
                    this.progress = st.progress || '';
                    this.error = st.error;
                    this.logLines = st.log || [];
                    if (!st.running && this.pollTimer) {
                        clearInterval(this.pollTimer);
                        this.pollTimer = null;
                        if (st.error) {
                            window.showMessage && window.showMessage(`补全异常: ${st.error}`, 'error');
                        } else if (this.logLines.length > 0) {
                            window.showMessage && window.showMessage('补全完成', 'success');
                        }
                    }
                    if (st.running && !this.pollTimer) {
                        this.startPolling();
                    }
                }
            } catch (e) { /* ignore */ }
        },

        // 115 文件夹浏览器
        async openFolder115Browser() {
            this.cloudFolderDialog = true;
            this.cloudCurrentCid = '0';
            this.cloudFolderPath = [{ cid: '0', name: '根目录' }];
            await this.loadCloudFolders('0');
        },

        async loadCloudFolders(cid) {
            this.cloudFolderLoading = true;
            try {
                const res = await api.request(`/115/folders?config_name=${encodeURIComponent(this.config.use_115_config)}&cid=${cid}`);
                if (res.success) {
                    this.cloudFolders = res.data.folders || [];
                    this.cloudCurrentCid = cid;
                    if (res.data.path && res.data.path.length > 0) {
                        this.cloudFolderPath = res.data.path;
                    }
                } else {
                    window.showMessage && window.showMessage(res.message || '加载文件夹失败', 'error');
                    this.cloudFolders = [];
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载文件夹失败', 'error');
                this.cloudFolders = [];
            } finally {
                this.cloudFolderLoading = false;
            }
        },

        async enterCloudFolder(folder) {
            await this.loadCloudFolders(folder.cid);
        },

        async goBackCloud() {
            if (this.cloudFolderPath.length > 1) {
                const parent = this.cloudFolderPath[this.cloudFolderPath.length - 2];
                await this.loadCloudFolders(parent.cid);
            }
        },

        goToCloudPath(idx) {
            this.loadCloudFolders(this.cloudFolderPath[idx].cid);
        },

        selectCloudFolder() {
            const currentName = this.cloudFolderPath.length > 0 ? this.cloudFolderPath[this.cloudFolderPath.length - 1].name : '根目录';
            this.config.transfer_folder_cid = this.cloudCurrentCid;
            this.config.transfer_folder_name = currentName;
            this.cloudFolderDialog = false;
            window.showMessage && window.showMessage(`已选择: ${currentName}`, 'success');
        },
    },

    template: `
        <div>
            <!-- 选中项摘要 -->
            <div class="glass-card" style="padding: 16px 20px; border-radius: 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <v-icon color="primary" size="22">mdi-playlist-check</v-icon>
                    <span style="font-size: 16px; font-weight: 500;">待补全剧集</span>
                </div>
                <div v-if="selectedCount === 0" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.5); padding: 8px 0;">
                    <v-icon size="16" style="margin-right: 4px;">mdi-information-outline</v-icon>
                    请先在「缺集检测」标签页中扫描并选择要补全的剧集
                </div>
                <div v-else>
                    <div style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.7); margin-bottom: 8px;">
                        已选择 <b>{{ selectedCount }}</b> 个剧集，共缺少 <b>{{ totalMissing }}</b> 集
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <v-chip v-for="(item, idx) in selectedItems" :key="idx" size="small" variant="tonal" color="primary">
                            {{ item.name }}
                            <span style="opacity: 0.6; margin-left: 4px;">
                                ({{ item.seasons.map(s => 'S' + String(s.season).padStart(2,'0') + ':' + s.missing_count + '集').join(', ') }})
                            </span>
                        </v-chip>
                    </div>
                </div>
            </div>

            <!-- 设置面板 -->
            <div class="glass-card" style="padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <v-icon color="primary" size="22">mdi-cog-outline</v-icon>
                    <span style="font-size: 16px; font-weight: 500;">补全设置</span>
                </div>

                <v-row dense>
                    <!-- 搜索来源 -->
                    <v-col cols="12" sm="6" md="4">
                        <v-select v-model="config.search_source" :items="searchSources"
                            item-title="title" item-value="value"
                            label="搜索来源" variant="outlined" density="compact" hide-details
                            :disabled="running"></v-select>
                    </v-col>
                    <!-- TG 搜索结果数 -->
                    <v-col cols="6" sm="3" md="2" v-if="config.search_source !== 'hdhive'">
                        <v-text-field v-model.number="config.results_per_source_tg" type="number"
                            label="TG 结果数" variant="outlined" density="compact" hide-details
                            min="1" max="10" :disabled="running"></v-text-field>
                    </v-col>
                    <!-- 影巢搜索结果数 -->
                    <v-col cols="6" sm="3" md="2" v-if="config.search_source !== 'tg'">
                        <v-text-field v-model.number="config.results_per_source_hdhive" type="number"
                            label="影巢结果数" variant="outlined" density="compact" hide-details
                            min="1" max="10" :disabled="running"></v-text-field>
                    </v-col>
                    <!-- 115 账号 -->
                    <v-col cols="12" sm="6" md="4">
                        <v-select v-model="config.use_115_config" :items="config115Names"
                            label="115 账号" variant="outlined" density="compact" hide-details
                            :disabled="running"
                            :rules="[v => !!v || '必选']"></v-select>
                    </v-col>
                    <!-- 扫描模式 -->
                    <v-col cols="6" sm="4" md="3">
                        <v-select v-model="config.scan_mode" :items="scanModes"
                            item-title="title" item-value="value"
                            label="扫描模式" variant="outlined" density="compact" hide-details
                            :disabled="running"></v-select>
                    </v-col>
                    <!-- 识别线程数 -->
                    <v-col cols="6" sm="4" md="2">
                        <v-text-field v-model.number="config.recognize_threads" type="number"
                            label="识别线程" variant="outlined" density="compact" hide-details
                            min="1" max="10" :disabled="running"></v-text-field>
                    </v-col>
                    <!-- 转存模式 -->
                    <v-col cols="12" sm="6" md="4">
                        <v-select v-model="config.transfer_mode" :items="transferModes"
                            item-title="title" item-value="value"
                            label="转存模式" variant="outlined" density="compact" hide-details
                            :disabled="running"></v-select>
                    </v-col>
                    <!-- 网盘转存目标文件夹 -->
                    <v-col cols="12" sm="6" md="4" v-if="config.transfer_mode === 'transfer'">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <v-text-field :model-value="config.transfer_folder_name || ('CID: ' + config.transfer_folder_cid)"
                                label="转存目标文件夹" variant="outlined" density="compact" hide-details readonly
                                :disabled="running"></v-text-field>
                            <v-btn icon variant="tonal" size="small" color="primary" @click="openFolder115Browser"
                                :disabled="running || !config.use_115_config">
                                <v-icon size="18">mdi-folder-search</v-icon>
                            </v-btn>
                        </div>
                    </v-col>
                    <!-- STRM 路径选择 -->
                    <v-col cols="12" sm="6" md="4" v-if="config.transfer_mode === 'share_strm'">
                        <v-select v-model="config.share_strm_path" :items="strmPaths"
                            label="STRM 输出路径" variant="outlined" density="compact" hide-details
                            :disabled="running"
                            no-data-text="请先在 115 分享 STRM 中配置路径"></v-select>
                    </v-col>
                    <!-- 多版本开关 -->
                    <v-col cols="12" sm="6" md="3">
                        <v-switch v-model="config.multi_version" label="多版本全部处理"
                            density="compact" hide-details color="primary"
                            :disabled="running"></v-switch>
                    </v-col>
                </v-row>

                <!-- 操作按钮 -->
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap;">
                    <v-btn v-if="!running" color="primary" variant="elevated" @click="startFiller"
                        :disabled="!canStart" style="border-radius: 10px; min-width: 140px;">
                        <v-icon left size="18">mdi-play</v-icon>
                        开始补全
                    </v-btn>
                    <v-btn v-else color="error" variant="elevated" @click="stopFiller"
                        style="border-radius: 10px; min-width: 140px;">
                        <v-icon left size="18">mdi-stop</v-icon>
                        停止
                    </v-btn>
                    <v-btn variant="outlined" @click="saveConfig" :disabled="running"
                        style="border-radius: 10px;">
                        <v-icon left size="18">mdi-content-save</v-icon>
                        保存设置
                    </v-btn>
                    <span v-if="progress" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.6);">
                        <v-progress-circular indeterminate size="14" width="2" color="primary" style="margin-right: 4px;"></v-progress-circular>
                        {{ progress }}
                    </span>
                </div>

                <div v-if="!config.use_115_config" style="margin-top: 8px; font-size: 12px; color: #FF9800;">
                    <v-icon size="14" color="warning" style="margin-right: 2px;">mdi-alert</v-icon>
                    请先选择 115 账号
                </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="error" class="glass-card" style="padding: 14px 20px; border-radius: 16px; margin-bottom: 16px; background: rgba(255,76,81,0.08); border: 1px solid rgba(255,76,81,0.3);">
                <v-icon size="18" color="error" style="margin-right: 6px;">mdi-alert-circle</v-icon>
                <span style="font-size: 13px; color: #FF4C51;">{{ error }}</span>
            </div>

            <!-- 日志面板 -->
            <div class="glass-card" style="padding: 20px; border-radius: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <v-icon color="info" size="22">mdi-text-box-outline</v-icon>
                        <span style="font-size: 16px; font-weight: 500;">执行日志</span>
                        <v-chip v-if="logLines.length > 0" size="x-small" variant="tonal" color="info">{{ logLines.length }}</v-chip>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <v-btn v-if="logLines.length > 0" icon variant="text" size="small" @click="logLines = []" title="清空日志" :disabled="running">
                            <v-icon size="20">mdi-delete-outline</v-icon>
                        </v-btn>
                        <v-btn icon variant="text" size="small" @click="checkStatus" title="刷新">
                            <v-icon size="20">mdi-refresh</v-icon>
                        </v-btn>
                    </div>
                </div>

                <div v-if="logLines.length === 0" style="text-align: center; padding: 30px; color: rgba(var(--v-theme-on-surface),0.4);">
                    <v-icon size="40" color="grey-darken-1">mdi-text-box-remove-outline</v-icon>
                    <p style="margin-top: 8px; font-size: 13px;">暂无日志</p>
                </div>
                <div v-else ref="logContainer" style="max-height: 400px; overflow-y: auto; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 10px; padding: 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.6;">
                    <div v-for="(line, idx) in logLines" :key="idx"
                        :style="{
                            color: line.includes('成功') || line.includes('完成') ? '#4CAF50' :
                                   line.includes('失败') || line.includes('异常') || line.includes('错误') ? '#FF5252' :
                                   line.includes('=====') ? 'rgba(var(--v-theme-primary),1)' :
                                   'rgba(var(--v-theme-on-surface),0.7)',
                            fontWeight: line.includes('=====') ? '600' : '400',
                            padding: '1px 0'
                        }">{{ line }}</div>
                </div>
            </div>

            <!-- 115 文件夹浏览弹窗 -->
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
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05); border-top: 1px solid rgba(var(--v-theme-on-surface),0.1);">
                        <v-btn variant="tonal" @click="goBackCloud" :disabled="cloudFolderPath.length <= 1" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-arrow-left</v-icon>返回上级
                        </v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" variant="elevated" @click="selectCloudFolder" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-check</v-icon>选择此目录
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
