// 设置页面组件
const SettingsPage = {
    name: 'SettingsPage',
    
    data() {
        return {
            loading: false,
            saving: false,
            savingGlobal: false,
            testing: false,
            changingPassword: false,
            showPasswordDialog: false,
            globalSettings: {
                proxy: '',
                tg_socks5_proxy: '',
                custom_tmdb_api_key: ''
            },
            config: {
                enabled: false,
                bot_token: '',
                chat_id: ''
            },
            passwordForm: {
                new_username: '',
                new_password: '',
                confirm_password: ''
            },
        }
    },
    
    async mounted() {
        await this.loadConfig();
    },
    
    methods: {
        async loadConfig() {
            this.loading = true;
            try {
                const [globalRes, telegramConfig] = await Promise.all([
                    api.request('/global_settings'),
                    api.getTelegramConfig()
                ]);
                if (globalRes && globalRes.data) {
                    this.globalSettings = { ...this.globalSettings, ...globalRes.data };
                }
                if (telegramConfig) {
                    this.config = { ...this.config, ...telegramConfig };
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async saveGlobalSettings() {
            this.savingGlobal = true;
            try {
                const result = await api.request('/global_settings', {
                    method: 'PUT',
                    body: JSON.stringify(this.globalSettings)
                });
                if (result.success) {
                    window.showMessage('全局设置保存成功', 'success');
                } else {
                    window.showMessage(result.message || '保存失败', 'error');
                }
            } catch (error) {
                console.error('保存全局设置失败:', error);
                window.showMessage('保存全局设置失败', 'error');
            } finally {
                this.savingGlobal = false;
            }
        },
        
        async saveConfig() {
            this.saving = true;
            try {
                await api.updateTelegramConfig(this.config);
                window.showMessage('通知设置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        
        async testNotification() {
            this.testing = true;
            try {
                const result = await api.testTelegram();
                if (result.success) {
                    window.showMessage('测试通知发送成功', 'success');
                } else {
                    window.showMessage(result.message || '测试通知发送失败', 'error');
                }
            } catch (error) {
                console.error('测试通知失败:', error);
                window.showMessage('测试通知发送失败', 'error');
            } finally {
                this.testing = false;
            }
        },
        
        openPasswordDialog() {
            this.passwordForm = {
                new_username: '',
                new_password: '',
                confirm_password: ''
            };
            this.showPasswordDialog = true;
        },
        
        async changePassword() {
            // 至少要修改用户名或密码中的一个
            if (!this.passwordForm.new_username && !this.passwordForm.new_password) {
                window.showMessage('请至少输入新用户名或新密码', 'error');
                return;
            }
            
            // 如果输入了新密码，需要确认密码
            if (this.passwordForm.new_password) {
                if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
                    window.showMessage('两次输入的新密码不一致', 'error');
                    return;
                }
            }
            
            this.changingPassword = true;
            try {
                const result = await api.request('/auth/change_password', {
                    method: 'POST',
                    body: JSON.stringify({
                        new_username: this.passwordForm.new_username || null,
                        new_password: this.passwordForm.new_password || null
                    })
                });
                if (result.success) {
                    window.showMessage('账号信息修改成功，请重新登录', 'success');
                    this.showPasswordDialog = false;
                    // 清除登录信息，跳转到登录页
                    setTimeout(() => {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('username');
                        window.location.href = '/login.html';
                    }, 1500);
                } else {
                    window.showMessage(result.message || '修改失败', 'error');
                }
            } catch (error) {
                console.error('修改密码失败:', error);
                window.showMessage('修改失败', 'error');
            } finally {
                this.changingPassword = false;
            }
        },
        
        logout() {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('username');
            window.location.href = '/login.html';
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <h2 :style="{ color: 'rgb(var(--v-theme-on-background))', fontSize: '28px', fontWeight: '450', margin: '0' }">
                    系统设置
                </h2>
                <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,255,241,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else>
                <!-- 全局设置 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                        <v-icon color="warning">mdi-earth</v-icon>
                        全局设置
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <v-text-field
                                v-model="globalSettings.proxy"
                                label="HTTP 代理地址（可选）"
                                placeholder="http://127.0.0.1:7890 或 http://账号:密码@127.0.0.1:7890"
                                variant="outlined"
                                density="comfortable"
                                hint="用于 Telegram Bot 通知、HDHive 解析/Token 获取、TMDB 访问等（不含 TG 频道搜索/监控）"
                                persistent-hint
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12">
                            <v-text-field
                                v-model="globalSettings.tg_socks5_proxy"
                                label="TG API SOCKS5 代理（可选）"
                                placeholder="socks5://127.0.0.1:1080 或 socks5://账号:密码@127.0.0.1:1080"
                                variant="outlined"
                                density="comfortable"
                                hint="仅用于 TG 频道搜索和频道监控（Telethon 客户端），填写后 Telethon 将优先使用此代理而非上方 HTTP 代理"
                                persistent-hint
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12">
                            <v-btn color="primary" @click="saveGlobalSettings" size="small" style="border-radius: 8px;" :loading="savingGlobal">
                                <v-icon left size="18">mdi-content-save</v-icon>
                                保存设置
                            </v-btn>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 16px; padding: 12px; background: rgba(255,180,0,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="warning">mdi-information</v-icon>
                            <b>HTTP 代理</b>：用于 Telegram Bot 通知、HDHive 解析/Token 获取、TMDB 等通用网络请求。格式：http://IP:端口<br>
                            <b>TG API SOCKS5 代理</b>：仅用于 Telethon 客户端（TG 频道搜索 + TG 频道监控）。格式：socks5://IP:端口<br>
                            <b>Telethon 代理优先级</b>：SOCKS5 代理 > TG API 配置代理 > HTTP 代理（仅影响频道搜索/监控，不影响其他功能）
                        </div>
                    </div>
                </div>

                <!-- 自定义 TMDB API Key -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                        <v-icon color="success">mdi-movie-search</v-icon>
                        TMDB API Key
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <v-text-field
                                v-model="globalSettings.custom_tmdb_api_key"
                                label="自定义 TMDB API Key（可选）"
                                placeholder="留空则使用默认 API Key"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12">
                            <v-btn color="primary" @click="saveGlobalSettings" size="small" style="border-radius: 8px;" :loading="savingGlobal">
                                <v-icon left size="18">mdi-content-save</v-icon>
                                保存设置
                            </v-btn>
                        </v-col>
                    </v-row>
                </div>

                <!-- 通知设置 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px; margin-bottom: 16px;">
                    <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                        <v-icon color="info">mdi-bell</v-icon>
                        Telegram 通知
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; align-items: center;">
                                <v-switch
                                    v-model="config.enabled"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用 Telegram 通知</span>
                            </div>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.bot_token"
                                label="Bot Token"
                                placeholder="从 @BotFather 获取"
                                variant="outlined"
                                density="comfortable"
                                hide-details
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="config.chat_id"
                                label="用户 ID"
                                placeholder="从 @userinfobot 获取，多个用英文逗号分隔"
                                hint="支持多个用户 ID，用英文逗号分隔，如：123456,789012"
                                persistent-hint
                                variant="outlined"
                                density="comfortable"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12">
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <v-btn color="primary" @click="saveConfig" size="small" style="border-radius: 8px;" :loading="saving">
                                    <v-icon left size="18">mdi-content-save</v-icon>
                                    保存设置
                                </v-btn>
                                <v-btn color="secondary" @click="testNotification" size="small" style="border-radius: 8px;" :loading="testing">
                                    <v-icon left size="18">mdi-send</v-icon>
                                    通知测试
                                </v-btn>
                            </div>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="info">mdi-information</v-icon>
                            Telegram Bot 用于接收分享链接并自动生成 STRM 文件，HDHivie 解析，以及执行清理命令等
                        </div>
                    </div>
                </div>

                <!-- 账号密码管理 -->
                <div class="glass-card" style="padding: 24px; border-radius: 16px;">
                    <h3 :style="{ color: 'rgb(var(--v-theme-on-background))', marginBottom: '16px' }">
                        <v-icon color="primary">mdi-account-lock</v-icon>
                        账号密码管理
                    </h3>
                    
                    <v-row>
                        <v-col cols="12">
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <v-btn color="primary" @click="openPasswordDialog" size="small" style="border-radius: 8px;">
                                    <v-icon left size="18">mdi-key-change</v-icon>
                                    修改账号密码
                                </v-btn>
                                <v-btn color="error" @click="logout" size="small" style="border-radius: 8px;">
                                    <v-icon left size="18">mdi-logout</v-icon>
                                    退出登录
                                </v-btn>
                            </div>
                        </v-col>
                    </v-row>
                    
                    <div style="margin-top: 16px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">
                            <v-icon size="16" color="info">mdi-information</v-icon>
                            修改账号密码后需要重新登录，修改后的账号密码会立即生效并保存到配置文件
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 修改密码对话框 -->
            <v-dialog v-model="showPasswordDialog" max-width="420" transition="dialog-transition">
                <v-card style="border-radius: 16px; overflow: hidden;">
                    <v-card-title style="background: linear-gradient(135deg, #3D6FD5 0%, #00FFF1 100%); color: white; padding: 20px 24px;">
                        <v-icon left color="white" size="24">mdi-key-change</v-icon>
                        <span style="font-size: 18px; font-weight: 500;">修改账号信息</span>
                    </v-card-title>
                    <v-card-text style="padding: 24px;">
                        <div style="margin-bottom: 20px; padding: 12px 16px; background: rgba(61,111,213,0.1); border-radius: 10px; border-left: 3px solid #3D6FD5;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px;">
                                <v-icon size="16" color="info" style="margin-right: 6px;">mdi-information</v-icon>
                                用户名和密码可以二选一修改，留空则保持不变
                            </div>
                        </div>
                        <v-text-field
                            v-model="passwordForm.new_username"
                            label="新用户名"
                            placeholder="留空则不修改"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            autocomplete="off"
                            style="margin-bottom: 16px;"
                            prepend-inner-icon="mdi-account"
                        ></v-text-field>
                        <v-text-field
                            v-model="passwordForm.new_password"
                            label="新密码"
                            placeholder="留空则不修改"
                            type="password"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            autocomplete="new-password"
                            style="margin-bottom: 16px;"
                            prepend-inner-icon="mdi-lock"
                        ></v-text-field>
                        <v-text-field
                            v-model="passwordForm.confirm_password"
                            label="确认新密码"
                            placeholder="再次输入新密码"
                            type="password"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            autocomplete="new-password"
                            prepend-inner-icon="mdi-lock-check"
                            :disabled="!passwordForm.new_password"
                        ></v-text-field>
                    </v-card-text>
                    <v-card-actions style="padding: 16px 24px 24px; gap: 12px;">
                        <v-spacer></v-spacer>
                        <v-btn 
                            variant="outlined" 
                            @click="showPasswordDialog = false" 
                            :disabled="changingPassword"
                            style="border-radius: 10px; min-width: 80px;"
                        >
                            取消
                        </v-btn>
                        <v-btn 
                            color="primary" 
                            @click="changePassword" 
                            :loading="changingPassword"
                            style="border-radius: 10px; min-width: 100px;"
                        >
                            <v-icon left size="18">mdi-check</v-icon>
                            确认修改
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
