// 夸克助手页面组件
const HelperQuarkPage = {
    name: 'HelperQuarkPage',
    
    data() {
        return {
            configs: [],
            loading: false,
            saving: false,
            verifying: {},
            pendingDeletes: [],
            playbackModeItems: [
                { title: '原画', value: 'original' },
                { title: '转码', value: 'streaming' },
            ],
            resolutionItems: [
                { title: '4K (2160p)', value: '4k' },
                { title: '2K (1440p)', value: '2k' },
                { title: '超清 (1080p)', value: 'super' },
                { title: '高清 (720p)', value: 'high' },
                { title: '标清 (480p)', value: 'normal' },
                { title: '流畅 (360p)', value: 'low' },
            ],
            // TV 扫码相关
            qrDialog: false,
            qrDialogIndex: -1,
            qrLoading: false,
            qrData: '',
            qrQueryToken: '',
            qrDeviceId: '',
            qrPolling: false,
            qrPollTimer: null
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    beforeUnmount() {
        this.stopQrPolling();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const configs = await api.getQuarkConfigs();
                this.configs = configs.map(c => ({
                    ...c,
                    playback_mode: c.playback_mode || 'original',
                    preferred_resolution: c.preferred_resolution || 'super'
                }));
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        addConfig() {
            this.configs.push({
                id: null,
                name: '',
                refresh_token: '',
                access_token: '',
                device_id: '',
                cache_ttl: 600,
                playback_mode: 'original',
                preferred_resolution: '4k'
            });
        },
        
        removeConfig(index) {
            const config = this.configs[index];
            if (config.id) {
                this.pendingDeletes.push(config.id);
            }
            this.configs.splice(index, 1);
        },
        
        async saveConfigs() {
            const names = this.configs.map(c => (c.name || '').trim()).filter(n => n);
            const seen = new Set();
            for (const n of names) {
                if (seen.has(n)) {
                    window.showMessage(`配置名称「${n}」重复，请修改后再保存`, 'error');
                    return;
                }
                seen.add(n);
            }
            this.saving = true;
            try {
                for (const configId of this.pendingDeletes) {
                    await api.deleteQuarkConfig(configId);
                }
                this.pendingDeletes = [];
                
                for (const config of this.configs) {
                    const saveData = { ...config };
                    if (config.id) {
                        await api.updateQuarkConfig(config.id, saveData);
                    } else {
                        const res = await api.addQuarkConfig(saveData);
                        if (res.data) {
                            config.id = res.data.id;
                        }
                    }
                }
                window.showMessage('夸克配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        async verifyTvToken(config, index) {
            if (!config.refresh_token) {
                window.showMessage('请先通过扫码登录获取 Token', 'warning');
                return;
            }
            this.verifying[index] = true;
            this.verifying = { ...this.verifying };
            try {
                const res = await api.quarkTvVerify(
                    config.refresh_token, config.device_id || '',
                    config.access_token || ''
                );
                if (res.success) {
                    const d = res.data || {};
                    if (d.access_token) config.access_token = d.access_token;
                    if (d.refresh_token) config.refresh_token = d.refresh_token;
                    window.showMessage(`TV Token 有效 | 昵称: ${d.nickname || '未知'}`, 'success');
                } else {
                    window.showMessage(res.message || 'Token 无效', 'error');
                }
            } catch (error) {
                window.showMessage('验证失败', 'error');
            } finally {
                this.verifying[index] = false;
                this.verifying = { ...this.verifying };
            }
        },
        
        // TV 扫码流程
        async startTvLogin(index) {
            this.qrDialogIndex = index;
            this.qrDialog = true;
            this.qrLoading = true;
            this.qrData = '';
            try {
                const res = await api.quarkTvGetQrcode();
                if (res.success) {
                    this.qrData = res.data.qr_data;
                    this.qrQueryToken = res.data.query_token;
                    this.qrDeviceId = res.data.device_id;
                    this.startQrPolling(index);
                } else {
                    window.showMessage(res.message || '获取二维码失败', 'error');
                    this.qrDialog = false;
                }
            } catch (error) {
                window.showMessage('获取二维码失败', 'error');
                this.qrDialog = false;
            } finally {
                this.qrLoading = false;
            }
        },
        
        startQrPolling(index) {
            this.qrPolling = true;
            let attempts = 0;
            const maxAttempts = 60;
            
            this.qrPollTimer = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    this.stopQrPolling();
                    window.showMessage('扫码超时，请重试', 'warning');
                    this.qrDialog = false;
                    return;
                }
                try {
                    const res = await api.quarkTvPoll(this.qrQueryToken, this.qrDeviceId);
                    if (res.success && res.data) {
                        this.stopQrPolling();
                        const config = this.configs[index];
                        config.refresh_token = res.data.refresh_token;
                        config.access_token = res.data.access_token;
                        config.device_id = res.data.device_id;
                        this.qrDialog = false;
                        window.showMessage('TV 扫码登录成功！', 'success');
                    }
                } catch (error) {
                    // 忽略轮询错误
                }
            }, 3000);
        },
        
        stopQrPolling() {
            this.qrPolling = false;
            if (this.qrPollTimer) {
                clearInterval(this.qrPollTimer);
                this.qrPollTimer = null;
            }
        },
        
        closeQrDialog() {
            this.stopQrPolling();
            this.qrDialog = false;
        }
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            夸克助手
                        </h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">
                            管理夸克网盘配置，用于 Emby 助手路径替换模式
                        </div>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(139,92,246,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <v-btn color="success" @click="addConfig" size="small" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-plus</v-icon>
                            添加配置
                        </v-btn>
                        <v-btn color="primary" @click="saveConfigs" size="small" style="border-radius: 8px;" :loading="saving">
                            <v-icon left size="18">mdi-content-save</v-icon>
                            保存设置
                        </v-btn>
                    </div>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <v-row v-else>
                <v-col v-for="(config, index) in configs" :key="index" cols="12" lg="4">
                    <div class="glass-card" style="padding: 24px; position: relative; border-radius: 16px;">
                        <v-btn icon size="small" variant="text" style="position: absolute; top: 16px; right: 16px; opacity: 0.7;" @click="removeConfig(index)">
                            <v-icon color="error">mdi-minus-circle-outline</v-icon>
                        </v-btn>
                        
                        <h3 style="color: white; margin-bottom: 16px; padding-right: 40px;">
                            <v-icon color="deep-purple-accent-2">mdi-cloud-outline</v-icon>
                            配置 {{ index + 1 }}
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">({{ config.id }})</span>
                        </h3>
                        
                        <v-text-field v-model="config.name" label="名称" placeholder="如: 夸克一号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>

                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px;">
                            <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.65);">登录方式</span>
                            <v-chip size="x-small" color="deep-purple-accent-2" variant="outlined">仅支持 TV 扫码</v-chip>
                        </div>

                        <div style="padding: 12px; background: rgba(0,0,0,0.15); border-radius: 10px; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <v-icon size="16" :color="config.refresh_token ? 'success' : 'grey'">
                                    {{ config.refresh_token ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                                </v-icon>
                                <span style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.8);">
                                    {{ config.refresh_token ? 'TV Token 已获取' : '未登录，请扫码' }}
                                </span>
                            </div>
                            <v-btn 
                                :color="config.refresh_token ? 'grey' : 'deep-purple-accent-2'" 
                                size="small" variant="elevated" style="border-radius: 8px;"
                                @click="startTvLogin(index)"
                            >
                                <v-icon left size="16">mdi-qrcode-scan</v-icon>
                                {{ config.refresh_token ? '重新扫码' : '扫码登录' }}
                            </v-btn>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.65);">播放策略</span>
                            <v-chip size="x-small" color="blue-grey" variant="outlined">后端默认：原画</v-chip>
                        </div>

                        <v-select
                            v-model="config.playback_mode"
                            :items="playbackModeItems"
                            item-title="title"
                            item-value="value"
                            label="播放方式"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            style="margin-bottom: 12px;"
                        ></v-select>

                        <v-select
                            v-model="config.preferred_resolution"
                            :items="resolutionItems"
                            item-title="title"
                            item-value="value"
                            label="优先分辨率"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            :disabled="config.playback_mode !== 'streaming'"
                            style="margin-bottom: 6px;"
                        ></v-select>

                        <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.45); margin-bottom: 12px;">
                            {{ config.playback_mode === 'streaming' ? '转码模式会按此分辨率优先选择，可自动回退到其他可用档位' : '原画模式下固定取源文件直链，优先分辨率不会生效' }}
                        </div>
                        
                        <v-text-field v-model.number="config.cache_ttl" label="缓存时间 (秒)" type="number" placeholder="600" variant="outlined" density="comfortable" hide-details style="margin-bottom: 16px;">
                            <template #prepend-inner>
                                <v-icon size="18" color="grey">mdi-timer-outline</v-icon>
                            </template>
                        </v-text-field>
                        
                        <!-- 验证区 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 12px; font-weight: 500;">
                                <v-icon size="18" color="deep-purple-accent-2">mdi-shield-check</v-icon>
                                验证
                            </div>
                            <v-btn
                                color="deep-purple-accent-2" size="small" variant="elevated" style="border-radius: 8px;"
                                :loading="verifying[index]" :disabled="!config.refresh_token"
                                @click="verifyTvToken(config, index)"
                            >
                                <v-icon left size="16">mdi-check-decagram</v-icon>
                                验证 TV Token
                            </v-btn>
                            <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">
                                TV 模式支持纯 302 直链，可按配置选择原画或转码。
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-cloud-off-outline</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"按钮创建新的夸克网盘账号配置</p>
            </div>
            
            <!-- TV 扫码弹窗 -->
            <v-dialog v-model="qrDialog" max-width="420" persistent>
                <v-card style="border-radius: 16px; background: rgb(var(--v-theme-surface));">
                    <v-card-title style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;">
                        <span>
                            <v-icon color="deep-purple-accent-2" style="margin-right: 6px;">mdi-qrcode-scan</v-icon>
                            夸克 TV 扫码登录
                        </span>
                        <v-btn icon size="small" variant="text" @click="closeQrDialog">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </v-card-title>
                    <v-card-text style="text-align: center; padding: 0 20px 20px;">
                        <div v-if="qrLoading" style="padding: 40px;">
                            <v-progress-circular indeterminate color="deep-purple-accent-2"></v-progress-circular>
                            <p style="margin-top: 12px; color: rgba(var(--v-theme-on-surface),0.6);">正在获取二维码...</p>
                        </div>
                        <div v-else-if="qrData">
                            <img :src="'data:image/jpeg;base64,' + qrData" style="width: 260px; height: 260px; border-radius: 12px; border: 2px solid rgba(var(--v-theme-on-surface),0.1);" />
                            <p style="margin-top: 12px; color: rgba(var(--v-theme-on-surface),0.7); font-size: 14px;">
                                打开<strong>夸克 APP</strong>扫描二维码
                            </p>
                            <div v-if="qrPolling" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
                                <v-progress-circular indeterminate size="16" width="2" color="deep-purple-accent-2"></v-progress-circular>
                                <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">等待扫码确认...</span>
                            </div>
                        </div>
                        <div v-else style="padding: 40px; color: rgba(var(--v-theme-on-surface),0.5);">
                            获取二维码失败
                        </div>
                    </v-card-text>
                </v-card>
            </v-dialog>
        </div>
    `
};
