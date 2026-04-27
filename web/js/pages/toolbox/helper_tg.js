// TG 助手页面组件
const HelperTgPage = {
    name: 'HelperTgPage',
    
    data() {
        return {
            configs: [],
            loading: false,
            saving: false,
            pendingDeletes: [],
            showApiHash: {},
            configStatus: {},
            checkingStatus: {},
            loggingOut: {},
            showPhone: {},
            // QR 扫码登录
            qrLoginDialog: false,
            qrLoginConfigId: '',
            qrLoginLoading: false,
            qrLoginUrl: '',
            qrLoginStatus: 'idle', // idle, waiting, success, expired, error, 2fa_required
            qrLoginPollInterval: null,
            qrLoginUser: null,
            qrLoginImage: '',  // 后端生成的 base64 QR 图片
            qrLogin2faPassword: '',
            qrLogin2faLoading: false,
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    async activated() {
        await this.loadConfigs();
    },
    
    beforeUnmount() {
        this.stopQrPoll();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const configs = await api.getTgApiConfigs();
                this.configs = configs || [];
                // 检查每个配置的登录状态
                for (const config of this.configs) {
                    if (config.id) {
                        this.checkConfigStatus(config.id);
                    }
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        async checkConfigStatus(configId) {
            this.checkingStatus[configId] = true;
            this.checkingStatus = { ...this.checkingStatus };
            try {
                const status = await api.getTgApiConfigStatus(configId);
                this.configStatus[configId] = status;
                this.configStatus = { ...this.configStatus };
            } catch (e) {
                console.error('检查状态失败:', e);
            } finally {
                this.checkingStatus[configId] = false;
                this.checkingStatus = { ...this.checkingStatus };
            }
        },
        
        addConfig() {
            this.configs.push({
                id: null,
                name: '',
                api_id: '',
                api_hash: ''
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
            // 校验
            for (let i = 0; i < this.configs.length; i++) {
                if (!this.configs[i].name || !this.configs[i].name.trim()) {
                    window.showMessage(`配置 ${i + 1} 的名称不能为空`, 'error');
                    return;
                }
                if (!this.configs[i].api_id) {
                    window.showMessage(`配置 "${this.configs[i].name}" 的 API ID 不能为空`, 'error');
                    return;
                }
                if (!this.configs[i].api_hash) {
                    window.showMessage(`配置 "${this.configs[i].name}" 的 API Hash 不能为空`, 'error');
                    return;
                }
            }
            this.saving = true;
            try {
                // 先删除待删除的配置
                for (const configId of this.pendingDeletes) {
                    await api.deleteTgApiConfig(configId);
                }
                this.pendingDeletes = [];
                
                // 保存/更新配置
                let saveErrors = [];
                for (const config of this.configs) {
                    if (config.id) {
                        const res = await api.updateTgApiConfig(config.id, config);
                        if (res && res.success === false) {
                            saveErrors.push(res.message || `配置 "${config.name}" 保存失败`);
                        }
                    } else {
                        const res = await api.addTgApiConfig(config);
                        if (res && res.success === false) {
                            saveErrors.push(res.message || `配置 "${config.name}" 添加失败`);
                        } else if (res && res.data) {
                            config.id = res.data.id;
                        }
                    }
                }
                
                if (saveErrors.length > 0) {
                    window.showMessage(saveErrors.join('；'), 'error');
                } else {
                    window.showMessage('TG API 配置保存成功', 'success');
                }
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        // ========== QR 扫码登录 ==========
        async startQrLogin(configId) {
            // 校验: 配置必须已保存且填写了 api_id 和 api_hash
            const config = this.configs.find(c => c.id === configId);
            if (!config) {
                window.showMessage('请先保存配置', 'error');
                return;
            }
            if (!config.api_id || !config.api_hash) {
                window.showMessage('请先填写 API ID 和 API Hash 并保存', 'error');
                return;
            }
            if (!config.id) {
                window.showMessage('请先点击“保存设置”保存配置后再扫码', 'error');
                return;
            }
            this.qrLoginConfigId = configId;
            this.qrLoginDialog = true;
            this.qrLoginLoading = true;
            this.qrLoginUrl = '';
            this.qrLoginStatus = 'idle';
            this.qrLoginUser = null;
            this.stopQrPoll();
            try {
                const res = await api.tgApiQrLoginStart(configId);
                if (res.success && res.url) {
                    this.qrLoginUrl = res.url;
                    this.qrLoginStatus = 'waiting';
                    // 前端生成 QR 码图片（与 115 Open 扫码相同方式）
                    this.qrLoginImage = this.generateQrDataUrl(res.url);
                    this.startQrPoll();
                } else {
                    window.showMessage(res.message || 'QR 登录启动失败', 'error');
                    this.qrLoginDialog = false;
                }
            } catch (e) {
                window.showMessage('QR 登录启动失败', 'error');
                this.qrLoginDialog = false;
            } finally {
                this.qrLoginLoading = false;
            }
        },

        generateQrDataUrl(url) {
            try {
                const qr = qrcode(0, 'M');
                qr.addData(url);
                qr.make();
                return qr.createDataURL(8, 2);
            } catch (e) {
                console.error('QRCode 生成失败:', e);
                return '';
            }
        },

        startQrPoll() {
            this.qrLoginPollInterval = setInterval(() => this.pollQrStatus(), 2000);
        },

        stopQrPoll() {
            if (this.qrLoginPollInterval) {
                clearInterval(this.qrLoginPollInterval);
                this.qrLoginPollInterval = null;
            }
        },

        async pollQrStatus() {
            if (!this.qrLoginConfigId) return;
            try {
                const res = await api.tgApiQrLoginStatus(this.qrLoginConfigId);
                if (res.status === 'success') {
                    this.stopQrPoll();
                    this.qrLoginStatus = 'success';
                    this.qrLoginUser = res.user;
                    window.showMessage('扫码登录成功！', 'success');
                    setTimeout(() => {
                        this.qrLoginDialog = false;
                        this.checkConfigStatus(this.qrLoginConfigId);
                    }, 1500);
                } else if (res.status === 'expired') {
                    this.stopQrPoll();
                    this.qrLoginStatus = 'expired';
                } else if (res.status === '2fa_required') {
                    this.stopQrPoll();
                    this.qrLoginStatus = '2fa_required';
                    this.qrLogin2faPassword = '';
                } else if (res.status === 'error') {
                    this.stopQrPoll();
                    this.qrLoginStatus = 'error';
                    window.showMessage(res.message || 'QR 登录失败', 'error');
                }
            } catch (e) {
                console.error('QR 状态轮询失败:', e);
            }
        },

        async refreshQrCode() {
            this.qrLoginLoading = true;
            this.qrLoginStatus = 'idle';
            this.stopQrPoll();
            try {
                const res = await api.tgApiQrLoginRecreate(this.qrLoginConfigId);
                if (res.success && res.url) {
                    this.qrLoginUrl = res.url;
                    this.qrLoginStatus = 'waiting';
                    this.qrLoginImage = this.generateQrDataUrl(res.url);
                    this.startQrPoll();
                } else {
                    window.showMessage(res.message || '刷新二维码失败', 'error');
                }
            } catch (e) {
                window.showMessage('刷新二维码失败', 'error');
            } finally {
                this.qrLoginLoading = false;
            }
        },

        async submitQr2fa() {
            if (!this.qrLogin2faPassword) {
                window.showMessage('请输入两步验证密码', 'warning');
                return;
            }
            this.qrLogin2faLoading = true;
            try {
                const res = await api.tgApiQrLoginSubmit2fa(this.qrLoginConfigId, this.qrLogin2faPassword);
                if (res.success) {
                    this.qrLoginStatus = 'success';
                    window.showMessage('登录成功！', 'success');
                    setTimeout(() => {
                        this.qrLoginDialog = false;
                        this.checkConfigStatus(this.qrLoginConfigId);
                    }, 1500);
                } else {
                    window.showMessage(res.message || '两步验证失败', 'error');
                }
            } catch (e) {
                window.showMessage('两步验证失败', 'error');
            } finally {
                this.qrLogin2faLoading = false;
            }
        },

        closeQrDialog() {
            this.stopQrPoll();
            this.qrLoginDialog = false;
        },

        async logoutConfig(configId) {
            this.loggingOut[configId] = true;
            this.loggingOut = { ...this.loggingOut };
            try {
                const res = await api.tgApiConfigLogout(configId);
                if (res.success) {
                    window.showMessage('已登出', 'success');
                    this.configStatus[configId] = { logged_in: false };
                    this.configStatus = { ...this.configStatus };
                } else {
                    window.showMessage(res.message || '登出失败', 'error');
                }
            } catch (e) {
                window.showMessage('登出失败', 'error');
            } finally {
                this.loggingOut[configId] = false;
                this.loggingOut = { ...this.loggingOut };
            }
        },
        
        getStatusText(configId) {
            const status = this.configStatus[configId];
            if (!status) return '未检测';
            if (status.logged_in) {
                const user = status.user || {};
                const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
                const username = user.username ? `@${user.username}` : '';
                return `已登录: ${name || username || user.phone || '未知'}`;
            }
            return '未登录';
        },
        
        getStatusColor(configId) {
            const status = this.configStatus[configId];
            if (!status) return 'grey';
            return status.logged_in ? 'success' : 'warning';
        },
        
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="font-size: 28px; font-weight: 450; margin: 0;">
                            TG 助手
                        </h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,172,255,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
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

            <!-- 使用提示 -->
            <div style="padding: 12px 16px; background: rgba(33,150,243,0.1); border: 1px solid rgba(33,150,243,0.2); border-radius: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <v-icon color="info" size="20">mdi-information-outline</v-icon>
                    <span style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.75); line-height: 1.5;">配置保存后，可通过下方 <strong>扫码登录</strong> 按钮扫码，或到 TG Bot 发送 <code style="background: rgba(var(--v-theme-on-surface),0.1); padding: 2px 6px; border-radius: 4px; font-size: 12px;">/tg_login</code> 进行登录</span>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <v-row v-else>
                <v-col v-for="(config, index) in configs" :key="index" cols="12" lg="4">
                    <div class="glass-card" style="padding: 24px; position: relative; border-radius: 16px;">
                        <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 4px; align-items: center;">
                            <v-btn icon size="small" variant="text" style="opacity: 0.7;" @click="removeConfig(index)">
                                <v-icon color="error">mdi-minus-circle-outline</v-icon>
                            </v-btn>
                        </div>
                        
                        <h3 style="margin-bottom: 16px; padding-right: 40px;">
                            <v-icon color="primary">mdi-send</v-icon>
                            配置 {{ index + 1 }}
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">({{ config.id }})</span>
                        </h3>
                        
                        <v-text-field v-model="config.name" label="名称" placeholder="如: 我的TG号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>
                        
                        <v-text-field v-model="config.api_id" label="API ID" placeholder="纯数字" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>
                        
                        <v-text-field v-model="config.api_hash" label="API Hash" placeholder="32位字母数字" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showApiHash[index] ? 'text' : 'password'" :append-inner-icon="showApiHash[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showApiHash[index] = !showApiHash[index]; showApiHash = {...showApiHash}"></v-text-field>
                        
                        <!-- 登录状态 -->
                        <div v-if="config.id" style="padding: 16px; background: rgba(0,0,0,0.15); border-radius: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <v-chip :color="getStatusColor(config.id)" size="small" variant="elevated">
                                        <v-icon start size="14">{{ configStatus[config.id]?.logged_in ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
                                        {{ configStatus[config.id]?.logged_in ? '已登录' : '未登录' }}
                                    </v-chip>
                                    <v-btn icon size="x-small" variant="text" @click="checkConfigStatus(config.id)" :loading="checkingStatus[config.id]">
                                        <v-icon size="18">mdi-refresh</v-icon>
                                    </v-btn>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <v-btn v-if="!configStatus[config.id]?.logged_in" color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="startQrLogin(config.id)">
                                        <v-icon start size="16">mdi-qrcode-scan</v-icon>
                                        扫码登录
                                    </v-btn>
                                    <v-btn v-if="configStatus[config.id]?.logged_in" color="warning" variant="tonal" size="small" style="border-radius: 8px;" @click="logoutConfig(config.id)" :loading="loggingOut[config.id]">
                                        登出
                                    </v-btn>
                                </div>
                            </div>
                            <div v-if="configStatus[config.id]?.logged_in && configStatus[config.id]?.user" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                                <v-chip v-if="configStatus[config.id].user.phone" size="small" variant="outlined" color="success" style="cursor: pointer;" @click="showPhone[config.id] = !showPhone[config.id]; showPhone = {...showPhone}">
                                    <v-icon start size="14">{{ showPhone[config.id] ? 'mdi-phone' : 'mdi-phone-lock' }}</v-icon>
                                    {{ showPhone[config.id] ? configStatus[config.id].user.phone : configStatus[config.id].user.phone.slice(0, 4) + '****' + configStatus[config.id].user.phone.slice(-2) }}
                                </v-chip>
                                <v-chip v-if="configStatus[config.id].user.username" size="small" variant="outlined" color="primary">
                                    @{{ configStatus[config.id].user.username }}
                                </v-chip>
                            </div>
                        </div>
                        
                        <div v-else style="padding: 12px; background: rgba(0,0,0,0.1); border-radius: 12px; text-align: center;">
                            <span style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 13px;">保存后可查看登录状态</span>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <!-- QR 扫码登录弹窗 -->
            <v-dialog v-model="qrLoginDialog" max-width="400" persistent>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; background: rgba(33,150,243,0.1);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <v-icon color="primary">mdi-qrcode-scan</v-icon>
                            <span>TG 扫码登录</span>
                        </div>
                    </v-card-title>
                    <v-card-text style="padding: 24px; text-align: center;">
                        <div v-if="qrLoginLoading && !qrLoginUrl" style="padding: 40px;">
                            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
                            <p style="margin-top: 16px; color: rgba(var(--v-theme-on-surface),0.6);">正在生成二维码...</p>
                        </div>
                        <div v-else-if="qrLoginUrl">
                            <div style="background: white; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 16px;">
                                <img v-if="qrLoginImage" :src="qrLoginImage" style="width: 220px; height: 220px; image-rendering: pixelated;" alt="QR Code" />
                            </div>
                            <div v-if="qrLoginStatus === 'waiting'" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: rgba(var(--v-theme-on-surface),0.7);">
                                <v-progress-circular indeterminate size="16" width="2" color="primary"></v-progress-circular>
                                <span style="font-size: 14px;">请使用 Telegram 客户端扫描二维码</span>
                            </div>
                            <div v-else-if="qrLoginStatus === 'success'" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: rgb(var(--v-theme-success));">
                                <v-icon color="success" size="20">mdi-check-circle</v-icon>
                                <span style="font-size: 14px;">登录成功！</span>
                            </div>
                            <div v-else-if="qrLoginStatus === 'expired'" style="text-align: center;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: rgb(var(--v-theme-warning)); margin-bottom: 12px;">
                                    <v-icon color="warning" size="20">mdi-clock-alert</v-icon>
                                    <span style="font-size: 14px;">二维码已过期</span>
                                </div>
                                <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="refreshQrCode" :loading="qrLoginLoading">
                                    <v-icon start size="16">mdi-refresh</v-icon>
                                    刷新二维码
                                </v-btn>
                            </div>
                            <div v-else-if="qrLoginStatus === '2fa_required'" style="text-align: center;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: rgb(var(--v-theme-info)); margin-bottom: 12px;">
                                    <v-icon color="info" size="20">mdi-lock</v-icon>
                                    <span style="font-size: 14px;">扫码成功，请输入两步验证密码</span>
                                </div>
                                <v-text-field v-model="qrLogin2faPassword" label="两步验证密码" type="password" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" @keyup.enter="submitQr2fa"></v-text-field>
                                <v-btn color="primary" variant="tonal" size="small" style="border-radius: 8px;" @click="submitQr2fa" :loading="qrLogin2faLoading">
                                    <v-icon start size="16">mdi-login</v-icon>
                                    确认登录
                                </v-btn>
                            </div>
                            <div v-else-if="qrLoginStatus === 'error'" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: rgb(var(--v-theme-error));">
                                <v-icon color="error" size="20">mdi-alert-circle</v-icon>
                                <span style="font-size: 14px;">登录失败</span>
                            </div>
                        </div>
                        <div style="margin-top: 16px; padding: 12px; background: rgba(33,150,243,0.08); border-radius: 10px;">
                            <p style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.55); margin: 0; line-height: 1.6;">打开 Telegram 客户端 → 设置 → 设备 → 扫描二维码</p>
                        </div>
                    </v-card-text>
                    <v-card-actions style="padding: 16px;">
                        <v-spacer></v-spacer>
                        <v-btn variant="tonal" rounded="pill" @click="closeQrDialog" size="small">关闭</v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>

            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-send-circle-outline</v-icon>
                <h3 style="margin-top: 12px; font-size: 16px;">暂无 TG API 配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"按钮创建新的 Telegram API 配置</p>
            </div>
        </div>
    `
};
