// 清理助手页面组件
const CleanerPage = {
    name: 'CleanerPage',
    
    data() {
        return {
            loading: false,
            saving: false,
            configs115: [],
            config: {
                use_115_config: '',
                clear_receive_enabled: false,
                clear_recyclebin_enabled: false,
                cron_expression: '*/5 * * * *',
                password: ''
            }
        }
    },
    
    computed: {
        selectedConfigIsOpen() {
            if (!this.config.use_115_config) return false;
            const cfg = this.configs115.find(c => c.name === this.config.use_115_config);
            return cfg && cfg.open_token && cfg.open_token.access_token;
        }
    },
    
    async mounted() {
        await this.loadData();
    },
    
    methods: {
        async loadData() {
            this.loading = true;
            try {
                const [configRes, configs115Res] = await Promise.all([
                    api.getCleanerConfig(),
                    api.get115Configs()
                ]);
                
                if (configRes) {
                    this.config = { ...this.config, ...configRes };
                }
                this.configs115 = configs115Res || [];
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveConfig() {
            // 验证
            if ((this.config.clear_receive_enabled || this.config.clear_recyclebin_enabled) && !this.config.cron_expression) {
                window.showMessage('启用定时任务时必须填写定时表达式', 'error');
                return;
            }
            
            if (this.config.cron_expression) {
                const r = validateCronExpression(this.config.cron_expression);
                if (!r.valid) { window.showMessage(`定时表达式错误: ${r.error}`, 'error'); return; }
            }
            
            if (this.config.clear_recyclebin_enabled && !this.selectedConfigIsOpen && !this.config.password) {
                window.showMessage('Cookie 模式清空回收站需要填写 115 安全码', 'error');
                return;
            }
            
            this.saving = true;
            try {
                await api.updateCleanerConfig(this.config);
                window.showMessage('配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            清理助手
                        </h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <v-btn color="primary" @click="saveConfig" size="small" style="border-radius: 8px;" :loading="saving">
                        <v-icon left size="18">mdi-content-save</v-icon>
                        保存设置
                    </v-btn>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else class="glass-card" style="padding: 24px; border-radius: 16px;">
                <h3 style="color: white; margin-bottom: 16px;">
                    <v-icon color="warning">mdi-broom</v-icon>
                    定时清理配置
                </h3>
                
                <v-row>
                    <v-col cols="12" md="6">
                        <v-select
                            v-model="config.use_115_config"
                            label="使用 115 配置"
                            :items="configs115"
                            item-value="name"
                            variant="outlined"
                            density="comfortable"
                            placeholder="选择用于清理的 115 配置"
                            hide-details
                        >
                            <template v-slot:item="{ item, props }">
                                <v-list-item v-bind="props" :title="undefined">
                                    <span>{{ item.raw.name }}</span>
                                    <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 8px;">Open</v-chip>
                                </v-list-item>
                            </template>
                            <template v-slot:selection="{ item }">
                                <span>{{ item.raw.name }}</span>
                                <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 8px;">Open</v-chip>
                            </template>
                        </v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field
                            v-model="config.cron_expression"
                            label="定时表达式"
                            placeholder="*/5 * * * *"
                            hint="格式: 分 时 日 月 周 (5位)，如 */5 * * * * 每5分钟"
                            persistent-hint
                            variant="outlined"
                            density="comfortable"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6" v-if="!selectedConfigIsOpen">
                        <v-text-field
                            v-model="config.password"
                            label="115 安全码"
                            placeholder="Cookie 模式清空回收站需要安全码"
                            type="password"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <v-switch
                                v-model="config.clear_receive_enabled"
                                color="primary"
                                hide-details
                                density="compact"
                                style="flex: none;"
                            ></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">定时清空最近接收</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <v-switch
                                v-model="config.clear_recyclebin_enabled"
                                color="primary"
                                hide-details
                                density="compact"
                                style="flex: none;"
                            ></v-switch>
                            <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">定时清空回收站</span>
                        </div>
                    </v-col>
                </v-row>
                
                <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                    <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        也可以通过 Telegram Bot 发送 /clear_receive 或 /clear_recyclebin 命令手动清理
                    </div>
                    <div v-if="selectedConfigIsOpen" style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; margin-top: 4px;">
                        <v-icon size="16" color="info">mdi-information</v-icon>
                        Open API 模式无需安全码即可清空回收站
                    </div>
                </div>
            </div>
        </div>
    `
};
