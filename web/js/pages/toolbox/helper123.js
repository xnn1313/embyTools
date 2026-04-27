// 123 助手页面组件
const Helper123Page = {
    name: 'Helper123Page',
    
    data() {
        return {
            configs: [],
            loading: false,
            saving: false,
            resettingToken: {},
            pendingDeletes: [],
            showPassword: {},  // 控制每个配置的密码显示状态
            showPassport: {}   // 控制每个配置的账号显示状态
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                this.configs = await api.get123Configs();
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
                passport: '',
                password: '',
                token: '',
                cache_ttl: 600,
                rapid_upload_enabled: false,
                token_check_enabled: false,
                token_check_cron: '0 * * * *'
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
            // 名称重复校验
            const names = this.configs.map(c => (c.name || '').trim()).filter(n => n);
            const seen = new Set();
            for (const n of names) {
                if (seen.has(n)) {
                    window.showMessage(`配置名称「${n}」重复，请修改后再保存`, 'error');
                    return;
                }
                seen.add(n);
            }
            // 客户端 cron 表达式预校验
            for (let i = 0; i < this.configs.length; i++) {
                const config = this.configs[i];
                const label = config.name || `配置${i + 1}`;
                if (config.token_check_enabled && config.token_check_cron) {
                    const r = validateCronExpression(config.token_check_cron);
                    if (!r.valid) { window.showMessage(`${label} Token检测定时表达式错误: ${r.error}`, 'error'); return; }
                }
            }
            this.saving = true;
            try {
                // 先删除待删除的配置
                for (const configId of this.pendingDeletes) {
                    await api.delete123Config(configId);
                }
                this.pendingDeletes = [];
                
                // 保存/更新配置
                for (const config of this.configs) {
                    // 如果是新配置且有账号密码但没有 token，先获取 token
                    if (!config.id && config.passport && config.password && !config.token) {
                        try {
                            const loginRes = await api.login123(config.passport, config.password);
                            if (loginRes.success && loginRes.data && loginRes.data.token) {
                                config.token = loginRes.data.token;
                            }
                        } catch (e) {
                            console.error('获取 token 失败:', e);
                        }
                    }
                    
                    if (config.id) {
                        await api.update123Config(config.id, config);
                    } else {
                        const res = await api.add123Config(config);
                        if (res.data) {
                            config.id = res.data.id;
                        }
                    }
                }
                window.showMessage('123 配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        async resetToken(config, index) {
            if (!config.id) {
                window.showMessage('请先保存配置', 'warning');
                return;
            }
            if (!config.passport || !config.password) {
                window.showMessage('请先填写账号和密码', 'warning');
                return;
            }
            
            this.resettingToken[index] = true;
            try {
                const res = await api.reset123Token(config.id);
                if (res.success) {
                    window.showMessage('Token 重置成功', 'success');
                    // 重新加载配置以获取新 token
                    await this.loadConfigs();
                } else {
                    window.showMessage(res.message || 'Token 重置失败', 'error');
                }
            } catch (error) {
                console.error('重置 Token 失败:', error);
                window.showMessage('重置 Token 失败', 'error');
            } finally {
                this.resettingToken[index] = false;
            }
        },
        
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            123 助手
                        </h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">
                        </div>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
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
                            <v-icon color="info">mdi-cloud-outline</v-icon>
                            配置 {{ index + 1 }}
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">({{ config.id }})</span>
                        </h3>
                        
                        <v-text-field v-model="config.name" label="名称" placeholder="如: 123一号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>
                        
                        <v-text-field v-model="config.passport" label="账号" placeholder="手机号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showPassport[index] ? 'text' : 'password'" :append-inner-icon="showPassport[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showPassport[index] = !showPassport[index]"></v-text-field>
                        
                        <v-text-field v-model="config.password" label="密码" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showPassword[index] ? 'text' : 'password'" :append-inner-icon="showPassword[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showPassword[index] = !showPassword[index]"></v-text-field>
                        
                        <v-text-field v-model.number="config.cache_ttl" label="缓存时间 (秒)" type="number" placeholder="600" variant="outlined" density="comfortable" hide-details style="margin-bottom: 16px;"></v-text-field>
                        
                        <!-- 秒传配置 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 16px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 12px; font-weight: 500;">
                                <v-icon size="18" color="cyan">mdi-flash-triangle</v-icon>
                                秒传配置
                                <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); font-weight: normal; margin-left: 8px;">播放时用另一个账号获取下载</span>
                            </div>
                            
                            <div style="display: flex; align-items: center;">
                                <v-switch v-model="config.rapid_upload_enabled" color="cyan" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用秒传</span>
                            </div>
                        </div>
                        
                        <!-- Token 状态 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 16px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 12px; font-weight: 500;">
                                <v-icon size="18" color="success">mdi-key</v-icon>
                                Token 状态
                            </div>
                            
                            <div v-if="config.token" style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; margin-bottom: 12px; word-break: break-all;">
                                <v-icon size="14" color="success">mdi-check-circle</v-icon>
                                已获取 Token
                                <span style="color: rgba(var(--v-theme-on-surface),0.4); margin-left: 8px;">{{ config.token.substring(0, 50) }}...</span>
                            </div>
                            <div v-else style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-bottom: 12px;">
                                <v-icon size="14" color="warning">mdi-alert-circle</v-icon>
                                未获取 Token，保存配置时将自动获取
                            </div>
                            
                            <v-btn 
                                color="warning" 
                                size="small" 
                                variant="elevated"
                                style="border-radius: 8px;"
                                :loading="resettingToken[index]"
                                :disabled="!config.id || !config.passport || !config.password"
                                @click="resetToken(config, index)"
                            >
                                <v-icon left size="16">mdi-refresh</v-icon>
                                重置登录
                            </v-btn>
                            <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">
                                Token 过期时点击重置登录重新获取
                            </div>
                        </div>
                        
                        <!-- Token 定时检测 -->
                        <div v-if="config.token" style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;" :style="{ marginBottom: config.token_check_enabled ? '12px' : '0' }">
                                <v-icon size="18" color="info">mdi-shield-check</v-icon>
                                Token 定时检测
                                <v-switch v-model="config.token_check_enabled" color="info" hide-details density="compact" style="display: inline-flex; margin-left: 12px; vertical-align: middle;"></v-switch>
                            </div>
                            
                            <template v-if="config.token_check_enabled">
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 12px;">定时检测 Token 是否有效，失败时通过 TG Bot 通知，成功时仅输出到系统日志</div>
                                <v-text-field v-model="config.token_check_cron" label="检测定时表达式" placeholder="0 * * * *" hint="格式: 分 时 日 月 周 (5位)，如 0 * * * * 每小时整点检测" persistent-hint variant="outlined" density="compact"></v-text-field>
                            </template>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-cloud-off-outline</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"按钮创建新的 123 云盘账号配置</p>
            </div>
        </div>
    `
};
