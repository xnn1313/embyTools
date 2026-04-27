// HDHive 助手页面组件 - 多账号管理
const HDHiveHelperPage = {
    name: 'HDHiveHelperPage',
    
    data() {
        return {
            configs: [],
            loading: false,
            saving: false,
            pendingDeletes: [],
            refreshingToken: {},
            showPassword: {},
            showUsername: {},
            showApiKey: {},
            accountsInfo: {},
            infoLoading: false,
            refreshingInfo: {},
            lastRefreshTime: {},
            // 签到相关
            checkinConfigs: {},  // 按 HDHive 账号名称索引的签到配置 { accountName: {id, enabled, cron, checkin_normal, checkin_gambling} }
            checkinLoading: {}
        }
    },
    
    async mounted() {
        await this.loadConfigs();
        await this.loadCachedInfo();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const [res, checkinConfigs] = await Promise.all([
                    api.getHdhiveAccounts(),
                    api.getHdhiveCheckinConfigs()
                ]);
                this.configs = res || [];
                // 按 use_hdhive_account 名称建立签到配置索引
                const checkinMap = {};
                for (const cc of (checkinConfigs || [])) {
                    checkinMap[cc.use_hdhive_account] = cc;
                }
                this.checkinConfigs = checkinMap;
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async loadCachedInfo() {
            try {
                const res = await api.getHdhiveAccountsInfoCache();
                if (res.success && res.data) {
                    const infoMap = {};
                    const timeMap = {};
                    for (const [accountId, cached] of Object.entries(res.data)) {
                        if (cached) {
                            const { last_refresh_time, ...info } = cached;
                            infoMap[accountId] = info;
                            if (last_refresh_time) timeMap[accountId] = last_refresh_time;
                        }
                    }
                    this.accountsInfo = infoMap;
                    this.lastRefreshTime = timeMap;
                }
            } catch (e) {
                console.error('加载缓存信息失败:', e);
            }
        },
        
        async refreshAccountsInfo() {
            this.infoLoading = true;
            try {
                const res = await api.getHdhiveAccountsInfo();
                if (res.success && res.data) {
                    const map = {};
                    const now = new Date().toLocaleString('zh-CN', { hour12: false });
                    for (const item of res.data) {
                        if (item.id) {
                            map[item.id] = item;
                            this.lastRefreshTime[item.id] = now;
                        }
                    }
                    this.accountsInfo = map;
                }
            } catch (e) {
                console.error('刷新账号信息失败:', e);
            } finally {
                this.infoLoading = false;
            }
        },
        
        async refreshAccountInfo(config, index) {
            if (!config.id) {
                window.showMessage('请先保存配置', 'warning');
                return;
            }
            this.refreshingInfo[index] = true;
            this.$forceUpdate();
            try {
                const res = await api.getHdhiveAccountInfo(config.id);
                if (res.success && res.data) {
                    const now = new Date().toLocaleString('zh-CN', { hour12: false });
                    this.accountsInfo = { ...this.accountsInfo, [config.id]: res.data };
                    this.lastRefreshTime = { ...this.lastRefreshTime, [config.id]: now };
                    // 持久化到后端
                    api.saveHdhiveAccountInfoCache(config.id, { ...res.data, last_refresh_time: now }).catch(() => {});
                } else {
                    window.showMessage(res.message || '刷新失败', 'error');
                }
            } catch (e) {
                console.error('刷新账号信息失败:', e);
                window.showMessage('刷新账号信息失败', 'error');
            } finally {
                this.refreshingInfo[index] = false;
                this.$forceUpdate();
            }
        },
        
        getAccountInfo(configId) {
            return this.accountsInfo[configId] || null;
        },
        
        addConfig() {
            this.configs.push({
                id: null,
                name: '',
                username: '',
                password: '',
                token: '',
                api_key: '',
                auto_refresh_token: false,
                refresh_cron: '30 1 * * *'
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
            // 客户端校验
            for (let i = 0; i < this.configs.length; i++) {
                const config = this.configs[i];
                if (!config.name) {
                    window.showMessage('配置 ' + (i + 1) + ' 名称不能为空', 'error');
                    return;
                }
                if (config.auto_refresh_token && config.refresh_cron) {
                    const r = validateCronExpression(config.refresh_cron);
                    if (!r.valid) {
                        window.showMessage(config.name + ' Token 刷新定时表达式错误: ' + r.error, 'error');
                        return;
                    }
                }
            }
            this.saving = true;
            try {
                // 先删除待删除的配置
                for (const configId of this.pendingDeletes) {
                    await api.deleteHdhiveAccount(configId);
                }
                this.pendingDeletes = [];
                
                // 保存/更新配置
                const needRefreshIds = [];
                for (const config of this.configs) {
                    if (config.id) {
                        await api.updateHdhiveAccount(config.id, config);
                    } else {
                        // 新配置：如果有账号密码但没 token，记录下来后面自动获取
                        const shouldAutoRefresh = config.username && config.password && !config.token;
                        const res = await api.addHdhiveAccount(config);
                        if (res.data) {
                            config.id = res.data.id;
                            if (shouldAutoRefresh) {
                                needRefreshIds.push(config.id);
                            }
                        }
                    }
                }
                // 对需要自动获取 token 的新配置执行刷新
                for (const accountId of needRefreshIds) {
                    try {
                        const refreshRes = await api.refreshHdhiveAccountToken(accountId);
                        if (refreshRes.success) {
                            window.showMessage(refreshRes.message || 'Token 自动获取成功', 'success');
                        } else {
                            window.showMessage(refreshRes.message || 'Token 自动获取失败', 'warning');
                        }
                    } catch (e) {
                        console.error('自动获取 Token 失败:', e);
                    }
                }
                // 同步保存签到配置
                await this.saveCheckinConfigs();
                window.showMessage('HDHive 账号配置保存成功', 'success');
                await this.loadConfigs();
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        // ========== 签到相关方法 ==========
        getCheckinConfig(accountName) {
            if (!this.checkinConfigs[accountName]) {
                this.checkinConfigs[accountName] = { id: null, use_hdhive_account: accountName, enabled: false, cron: '1 0 * * *', checkin_normal: true, checkin_gambling: false };
            }
            return this.checkinConfigs[accountName];
        },
        
        async saveCheckinConfigs() {
            const list = Object.values(this.checkinConfigs).filter(c => c.use_hdhive_account);
            for (const c of list) {
                if (c.enabled && c.cron) {
                    const r = validateCronExpression(c.cron);
                    if (!r.valid) {
                        window.showMessage(c.use_hdhive_account + ' 签到定时表达式错误: ' + r.error, 'error');
                        return false;
                    }
                }
                if (c.checkin_normal && c.checkin_gambling) {
                    window.showMessage(c.use_hdhive_account + ' 不能同时开启普通签到和赌狗签到', 'error');
                    return false;
                }
            }
            try {
                await api.batchSaveHdhiveCheckinConfigs(list);
                const freshConfigs = await api.getHdhiveCheckinConfigs();
                const checkinMap = {};
                for (const cc of (freshConfigs || [])) {
                    checkinMap[cc.use_hdhive_account] = cc;
                }
                this.checkinConfigs = checkinMap;
                return true;
            } catch (error) {
                console.error('保存签到配置失败:', error);
                window.showMessage('保存签到配置失败', 'error');
                return false;
            }
        },
        
        async manualCheckin(config, index) {
            if (!config.name) {
                window.showMessage('请先填写配置名称', 'error');
                return;
            }
            const cc = this.getCheckinConfig(config.name);
            this.checkinLoading[index] = true;
            this.$forceUpdate();
            try {
                const res = await api.hdhiveCheckin(config.name, cc.checkin_gambling);
                window.showMessage(res.message || (res.success ? '签到成功' : '签到失败'), res.success ? 'success' : 'error');
            } catch (error) {
                window.showMessage('签到失败: ' + error.message, 'error');
            } finally {
                this.checkinLoading[index] = false;
                this.$forceUpdate();
            }
        },
        
        async refreshToken(config, index) {
            if (!config.id) {
                window.showMessage('请先保存配置', 'warning');
                return;
            }
            if (!config.username || !config.password) {
                window.showMessage('请先填写账号和密码', 'warning');
                return;
            }
            this.refreshingToken[index] = true;
            this.$forceUpdate();
            try {
                const res = await api.refreshHdhiveAccountToken(config.id);
                if (res.success) {
                    window.showMessage(res.message || 'Token 获取成功', 'success');
                    await this.loadConfigs();
                } else {
                    window.showMessage(res.message || 'Token 获取失败', 'error');
                }
            } catch (error) {
                window.showMessage('获取 Token 失败', 'error');
            } finally {
                this.refreshingToken[index] = false;
                this.$forceUpdate();
            }
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">HDHive 助手</h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">管理 HDHive 多账号配置、Token 获取与定时刷新</div>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(255,180,0,0.8), rgba(255,82,82,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <v-btn color="success" @click="addConfig" size="small" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-plus</v-icon>添加配置
                        </v-btn>
                        <v-btn color="primary" @click="saveConfigs" size="small" style="border-radius: 8px;" :loading="saving">
                            <v-icon left size="18">mdi-content-save</v-icon>保存设置
                        </v-btn>
                    </div>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <v-row v-else-if="configs.length > 0">
                <v-col v-for="(config, index) in configs" :key="index" cols="12" lg="4">
                    <div class="glass-card" style="padding: 24px; position: relative; border-radius: 16px;">
                        <!-- 右上角按钮组 -->
                        <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 4px;">
                            <v-btn size="small" variant="tonal" color="info" style="border-radius: 8px;" :loading="refreshingInfo[index]" :disabled="!config.id" @click="refreshAccountInfo(config, index)">
                                <v-icon left size="16">mdi-sync</v-icon>刷新信息
                            </v-btn>
                            <v-btn size="small" variant="tonal" color="warning" style="border-radius: 8px;" :loading="refreshingToken[index]" :disabled="!config.id || !config.username || !config.password" @click="refreshToken(config, index)">
                                <v-icon left size="16">mdi-refresh</v-icon>获取 Token
                            </v-btn>
                            <v-btn icon size="small" variant="text" style="opacity: 0.7;" @click="removeConfig(index)">
                                <v-icon color="error">mdi-minus-circle-outline</v-icon>
                            </v-btn>
                        </div>
                        
                        <h3 style="color: white; margin-bottom: 16px; padding-right: 80px;">
                            <v-icon color="warning">mdi-bee</v-icon>
                            配置 {{ index + 1 }}
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">({{ config.id }})</span>
                        </h3>
                        
                        <!-- 用户状态信息 -->
                        <div v-if="config.id && getAccountInfo(config.id)" style="padding: 12px 14px; background: rgba(0,0,0,0.2); border-radius: 10px; margin-bottom: 12px;">
                            <template v-if="getAccountInfo(config.id).error">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <v-icon size="14" color="error">mdi-alert-circle</v-icon>
                                    <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">{{ getAccountInfo(config.id).error }}</span>
                                </div>
                            </template>
                            <template v-else>
                                <!-- 第一行：用户类型 + 昵称 -->
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                                    <v-chip v-if="getAccountInfo(config.id).is_forever_vip" size="x-small" color="amber" variant="flat" style="font-weight: 600;">
                                        <v-icon start size="12">mdi-crown</v-icon>永久VIP
                                    </v-chip>
                                    <v-chip v-else-if="getAccountInfo(config.id).is_vip" size="x-small" color="orange" variant="flat" style="font-weight: 600;">
                                        <v-icon start size="12">mdi-star</v-icon>VIP
                                    </v-chip>
                                    <v-chip v-else-if="getAccountInfo(config.id).is_premium" size="x-small" color="blue" variant="flat" style="font-weight: 600;">Premium</v-chip>
                                    <v-chip v-else-if="getAccountInfo(config.id).has_api_key" size="x-small" color="grey" variant="flat">普通用户</v-chip>
                                    <span v-if="getAccountInfo(config.id).nickname" style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.8); font-weight: 500;">{{ getAccountInfo(config.id).nickname }}</span>
                                </div>
                                <!-- 第二行：详细数据 -->
                                <div v-if="getAccountInfo(config.id).is_premium" style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55);">
                                    <span v-if="getAccountInfo(config.id).points != null">
                                        <v-icon size="12" color="amber" style="margin-right: 2px;">mdi-star-four-points</v-icon>{{ getAccountInfo(config.id).points }} 积分
                                    </span>
                                    <span v-if="getAccountInfo(config.id).signin_days_total">
                                        <v-icon size="12" color="green" style="margin-right: 2px;">mdi-calendar-check</v-icon>签到 {{ getAccountInfo(config.id).signin_days_total }} 天
                                    </span>
                                    <span v-if="getAccountInfo(config.id).share_num">
                                        <v-icon size="12" color="blue" style="margin-right: 2px;">mdi-share-variant</v-icon>分享 {{ getAccountInfo(config.id).share_num }}
                                    </span>
                                    <template v-if="getAccountInfo(config.id).weekly_quota">
                                        <v-chip size="x-small" :color="getAccountInfo(config.id).weekly_quota.remaining > 0 || getAccountInfo(config.id).weekly_quota.unlimited ? 'success' : 'error'" variant="tonal" style="font-size: 11px;">
                                            周配额 {{ getAccountInfo(config.id).weekly_quota.unlimited ? '无限' : (getAccountInfo(config.id).weekly_quota.remaining + '/' + getAccountInfo(config.id).weekly_quota.limit) }}
                                        </v-chip>
                                    </template>
                                </div>
                                <div v-if="!getAccountInfo(config.id).is_premium && getAccountInfo(config.id).has_api_key" style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.35); margin-top: 2px;">
                                    积分/签到等详细信息需 Premium
                                </div>
                            </template>
                            <div v-if="!getAccountInfo(config.id).has_api_key && !getAccountInfo(config.id).error" style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                                <v-icon size="14" color="warning">mdi-key-alert</v-icon>
                                <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4);">未配置 API Key</span>
                            </div>
                            <div v-if="lastRefreshTime[config.id]" style="font-size: 10px; color: rgba(var(--v-theme-on-surface),0.25); margin-top: 6px; text-align: right;">
                                上次刷新: {{ lastRefreshTime[config.id] }}
                            </div>
                        </div>
                        
                        <v-text-field v-model="config.name" label="配置名称" placeholder="如: HDHive主号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>
                        
                        <v-text-field v-model="config.username" label="HDHive 账号" placeholder="输入 HDHive 账号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showUsername[index] ? 'text' : 'password'" :append-inner-icon="showUsername[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showUsername[index] = !showUsername[index]; $forceUpdate()"></v-text-field>
                        
                        <v-text-field v-model="config.password" label="HDHive 密码" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showPassword[index] ? 'text' : 'password'" :append-inner-icon="showPassword[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showPassword[index] = !showPassword[index]; $forceUpdate()"></v-text-field>
                        
                        <v-text-field v-model="config.api_key" label="API Key" placeholder="输入 HDHive Open API Key" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showApiKey[index] ? 'text' : 'password'" :append-inner-icon="showApiKey[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showApiKey[index] = !showApiKey[index]; $forceUpdate()"></v-text-field>
                        
                        <!-- Token 状态 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 8px; font-weight: 500;">
                                <v-icon size="18" color="success">mdi-key</v-icon> Token
                            </div>
                            <div v-if="config.token" style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; word-break: break-all;">
                                <v-icon size="14" color="success">mdi-check-circle</v-icon>
                                已获取
                                <span style="color: rgba(var(--v-theme-on-surface),0.4); margin-left: 8px;">{{ config.token.substring(0, 60) }}...</span>
                            </div>
                            <div v-else style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px;">
                                <v-icon size="14" color="warning">mdi-alert-circle</v-icon>
                                未获取 Token，请点击右上角刷新按钮获取
                            </div>
                        </div>
                        
                        <!-- 定时刷新 Token -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <v-switch v-model="config.auto_refresh_token" color="success" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px; font-size: 14px;">定时刷新 Token</span>
                            </div>
                            <v-text-field v-if="config.auto_refresh_token" v-model="config.refresh_cron" label="刷新时间 (Cron)" placeholder="30 1 * * *" variant="outlined" density="compact" hide-details></v-text-field>
                            <div v-if="config.auto_refresh_token" style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 6px;">
                                需要配置账号密码才能自动刷新 Token
                            </div>
                        </div>
                        
                        <!-- 每日签到 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;" :style="{ marginBottom: config.name ? '12px' : '0' }">
                                <v-icon size="18" color="success">mdi-calendar-check</v-icon>
                                每日签到
                                <v-switch v-if="config.name" v-model="getCheckinConfig(config.name).enabled" color="success" hide-details density="compact" style="display: inline-flex; margin-left: 12px; vertical-align: middle;"></v-switch>
                            </div>
                            <div v-if="!config.name" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">
                                请先填写配置名称后再设置签到
                            </div>
                            <template v-if="config.name && getCheckinConfig(config.name).enabled">
                                <!-- 签到模式 -->
                                <div style="margin-bottom: 12px;">
                                    <div style="display: flex; align-items: center;">
                                        <v-switch v-model="getCheckinConfig(config.name).checkin_normal" color="primary" hide-details density="compact" style="flex: none;" @update:model-value="val => { if (val) getCheckinConfig(config.name).checkin_gambling = false; else if (!getCheckinConfig(config.name).checkin_gambling) getCheckinConfig(config.name).checkin_normal = true; }"></v-switch>
                                        <v-icon size="18" :color="getCheckinConfig(config.name).checkin_normal ? 'primary' : 'grey'" style="margin-left: 8px;">mdi-shield-check</v-icon>
                                        <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 4px; font-size: 13px;">普通签到</span>
                                    </div>
                                    <div style="display: flex; align-items: center; margin-top: 4px;">
                                        <v-switch v-model="getCheckinConfig(config.name).checkin_gambling" color="error" hide-details density="compact" style="flex: none;" @update:model-value="val => { if (val) getCheckinConfig(config.name).checkin_normal = false; else if (!getCheckinConfig(config.name).checkin_normal) getCheckinConfig(config.name).checkin_gambling = true; }"></v-switch>
                                        <v-icon size="18" :color="getCheckinConfig(config.name).checkin_gambling ? 'error' : 'grey'" style="margin-left: 8px;">mdi-dice-multiple</v-icon>
                                        <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 4px; font-size: 13px;">赌狗签到</span>
                                    </div>
                                </div>
                                <v-text-field v-model="getCheckinConfig(config.name).cron" label="签到定时表达式" placeholder="1 0 * * *" hint="格式: 分 时 日 月 周 (5位)" persistent-hint variant="outlined" density="compact" style="margin-bottom: 12px;"></v-text-field>
                            </template>
                            <v-btn v-if="config.name" color="success" variant="tonal" size="small" style="border-radius: 8px; margin-top: 4px;" @click="manualCheckin(config, index)" :loading="checkinLoading[index]" :disabled="!config.name">
                                <v-icon left size="18">mdi-check-circle</v-icon>立即签到
                            </v-btn>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-bee</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无 HDHive 账号</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"按钮创建新的 HDHive 账号配置</p>
            </div>
        </div>
    `
};
