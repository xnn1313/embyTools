// 扫码获取 Cookie 页面组件
const QRCodePage = {
    name: 'QRCodePage',
    
    data() {
        return {
            loading: false,
            polling: false,
            configs115: [],
            // 二维码数据
            qrcode: {
                image: '',
                uid: '',
                time: '',
                sign: '',
                status: 'idle', // idle, waiting, scanned, success, expired, canceled
                statusMsg: ''
            },
            // 客户端类型
            clientType: 'alipaymini',
            clientTypes: [
                { title: '支付宝小程序', value: 'alipaymini' },
                { title: '微信小程序', value: 'wechatmini' },
                { title: '115生活_Android', value: 'android' },
                { title: '115_Android', value: '115android' },
                { title: '115生活_iOS', value: 'ios' },
                { title: '115_iOS', value: '115ios' },
                { title: '115 iPad', value: '115ipad' },
                { title: 'TV', value: 'tv' },
                { title: '网页', value: 'web' }
            ],
            // 保存配置
            saveDialog: false,
            saveMode: 'update', // update 或 create
            selectedConfigId: '',
            newConfigName: '',
            obtainedCookie: '',
            saving: false,
            pollInterval: null,
            showCookieText: false
        }
    },
    
    async mounted() {
        await this.loadConfigs();
        
        // 监听页面可见性变化
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                // 页面隐藏时停止轮询
                this.stopPolling();
            } else {
                // 页面重新可见时，如果二维码还在等待状态，恢复轮询
                if (this.qrcode.uid && (this.qrcode.status === 'waiting' || this.qrcode.status === 'scanned')) {
                    this.startPolling();
                }
            }
        };
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // 监听路由变化（用户切换到其他页面）
        this.handleRouteChange = () => {
            this.stopPolling();
        };
        window.addEventListener('route-change', this.handleRouteChange);
    },
    
    beforeUnmount() {
        this.stopPolling();
        // 清理事件监听
        if (this.handleVisibilityChange) {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        }
        if (this.handleRouteChange) {
            window.removeEventListener('route-change', this.handleRouteChange);
        }
    },
    
    methods: {
        async loadConfigs() {
            try {
                const res = await api.get115Configs();
                this.configs115 = res || [];
            } catch (error) {
                console.error('加载 115 配置失败:', error);
            }
        },
        
        async fetchApi(url, options = {}) {
            const token = localStorage.getItem('auth_token');
            const headers = {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            };
            const response = await fetch(url, {
                ...options,
                headers
            });
            return await response.json();
        },
        
        async getQRCode() {
            this.loading = true;
            this.stopPolling();
            this.qrcode.status = 'idle';
            this.qrcode.statusMsg = '';
            
            try {
                const res = await this.fetchApi(`/api/115/qrcode?client_type=${this.clientType}`);
                if (res.success && res.data) {
                    this.qrcode.image = res.data.qrcode;
                    this.qrcode.uid = res.data.uid;
                    this.qrcode.time = res.data.time;
                    this.qrcode.sign = res.data.sign;
                    this.qrcode.status = 'waiting';
                    this.qrcode.statusMsg = '请使用 115 客户端扫描二维码';
                    
                    // 开始轮询状态
                    this.startPolling();
                } else {
                    window.showMessage(res.message || '获取二维码失败', 'error');
                }
            } catch (error) {
                window.showMessage('获取二维码失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        startPolling() {
            this.polling = true;
            this.pollInterval = setInterval(() => this.checkStatus(), 2000);
        },
        
        stopPolling() {
            this.polling = false;
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        },
        
        async checkStatus() {
            if (!this.qrcode.uid) return;
            
            try {
                const params = new URLSearchParams({
                    uid: this.qrcode.uid,
                    time: this.qrcode.time,
                    sign: this.qrcode.sign,
                    client_type: this.clientType
                });
                const res = await this.fetchApi(`/api/115/qrcode/status?${params}`);
                
                if (res.success && res.data) {
                    const status = res.data.status;
                    this.qrcode.status = status;
                    this.qrcode.statusMsg = res.data.msg;
                    
                    if (status === 'success') {
                        this.stopPolling();
                        this.obtainedCookie = res.data.cookie;
                        window.showMessage('扫码成功！', 'success');
                        // 打开保存对话框
                        this.openSaveDialog();
                    } else if (status === 'expired' || status === 'canceled') {
                        this.stopPolling();
                        window.showMessage(res.data.msg, 'warning');
                    }
                }
            } catch (error) {
                console.error('检查状态失败:', error);
            }
        },
        
        openSaveDialog() {
            this.saveDialog = true;
            this.saveMode = this.configs115.length > 0 ? 'update' : 'create';
            this.selectedConfigId = '';
            this.newConfigName = '';
            this.showCookieText = false;
        },
        
        async saveCookie() {
            if (this.saveMode === 'update' && !this.selectedConfigId) {
                window.showMessage('请选择要更新的配置', 'error');
                return;
            }
            if (this.saveMode === 'create' && !this.newConfigName.trim()) {
                window.showMessage('请输入配置名称', 'error');
                return;
            }
            // 新建时检查名称是否重复
            if (this.saveMode === 'create') {
                const name = this.newConfigName.trim();
                const exists = this.configs115.some(c => (c.name || '').trim() === name);
                if (exists) {
                    window.showMessage(`配置名称「${name}」已存在，请使用其他名称`, 'error');
                    return;
                }
            }
            
            this.saving = true;
            try {
                const payload = {
                    cookie: this.obtainedCookie
                };
                
                if (this.saveMode === 'update') {
                    payload.config_id = this.selectedConfigId;
                } else {
                    payload.config_name = this.newConfigName.trim();
                }
                
                const res = await this.fetchApi('/api/115/qrcode/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.success) {
                    window.showMessage(res.message, 'success');
                    this.saveDialog = false;
                    this.resetQRCode();
                    await this.loadConfigs();
                } else {
                    window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (error) {
                window.showMessage('保存失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        resetQRCode() {
            this.qrcode = {
                image: '',
                uid: '',
                time: '',
                sign: '',
                status: 'idle',
                statusMsg: ''
            };
            this.obtainedCookie = '';
        },
        
        copyCookie() {
            if (!this.obtainedCookie) return;
            
            // 方法1: 尝试现代 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(this.obtainedCookie).then(() => {
                    window.showMessage('Cookie 已复制到剪贴板', 'success');
                }).catch(() => {
                    this.fallbackCopy();
                });
                return;
            }
            
            // 方法2: 降级到传统方法
            this.fallbackCopy();
        },
        
        fallbackCopy() {
            const textarea = document.createElement('textarea');
            textarea.value = this.obtainedCookie;
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            
            try {
                textarea.focus();
                textarea.select();
                textarea.setSelectionRange(0, textarea.value.length);
                
                const successful = document.execCommand('copy');
                if (successful) {
                    window.showMessage('Cookie 已复制到剪贴板', 'success');
                } else {
                    this.showCookieDialog();
                }
            } catch (err) {
                this.showCookieDialog();
            } finally {
                document.body.removeChild(textarea);
            }
        },
        
        showCookieDialog() {
            // 显示 Cookie 内容让用户手动复制
            this.showCookieText = true;
        },
        
        getStatusColor() {
            const colors = {
                'idle': 'grey',
                'waiting': 'info',
                'scanned': 'warning',
                'success': 'success',
                'expired': 'error',
                'canceled': 'error'
            };
            return colors[this.qrcode.status] || 'grey';
        },
        
        getStatusIcon() {
            const icons = {
                'idle': 'mdi-qrcode',
                'waiting': 'mdi-qrcode-scan',
                'scanned': 'mdi-cellphone-check',
                'success': 'mdi-check-circle',
                'expired': 'mdi-clock-alert',
                'canceled': 'mdi-close-circle'
            };
            return icons[this.qrcode.status] || 'mdi-qrcode';
        }
    },
    
    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">扫码获取 Cookie</h2>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(86,202,0,0.8)); margin-top: 8px; border-radius: 2px; width: 220px;"></div>
                    </div>
                </div>
            </div>

            <div class="glass-card" style="padding: 24px; border-radius: 16px;">
                <v-row>
                    <!-- 左侧：客户端选择和获取按钮 -->
                    <v-col cols="12" md="5">
                        <h3 style="color: white; margin-bottom: 16px;"><v-icon color="primary">mdi-cellphone-link</v-icon> 选择客户端类型</h3>
                        
                        <v-select
                            v-model="clientType"
                            :items="clientTypes"
                            item-title="title"
                            item-value="value"
                            label="客户端类型"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            style="margin-bottom: 16px;"
                        ></v-select>
                        
                        <v-btn
                            color="primary"
                            variant="elevated"
                            size="large"
                            block
                            :loading="loading"
                            @click="getQRCode"
                            style="border-radius: 10px; margin-bottom: 16px;"
                        >
                            <v-icon left>mdi-qrcode</v-icon>
                            获取二维码
                        </v-btn>
                        
                        <!-- 状态显示 -->
                        <div v-if="qrcode.status !== 'idle'" style="padding: 16px; background: rgba(var(--v-theme-on-surface),0.05); border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <v-icon :color="getStatusColor()" size="28">{{ getStatusIcon() }}</v-icon>
                                <div>
                                    <div style="font-size: 14px; color: rgba(var(--v-theme-on-surface),0.9);">{{ qrcode.statusMsg }}</div>
                                    <div v-if="polling" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-top: 4px;">
                                        <v-progress-circular indeterminate size="12" width="2" color="primary" style="margin-right: 6px;"></v-progress-circular>
                                        正在检测扫码状态...
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 使用说明 -->
                        <div style="margin-top: 20px; padding: 16px; background: rgba(61,111,213,0.1); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.8); font-size: 13px; line-height: 1.8;">
                                <v-icon size="18" color="info">mdi-information</v-icon>
                                <strong>使用说明：</strong><br>
                                1. 选择客户端类型（推荐115生活安卓或115生活IOS）<br>
                                2. 点击获取二维码<br>
                                3. 使用 115 客户端扫描二维码<br>
                                4. 扫码成功后选择保存到哪个配置或新建配置
                            </div>
                        </div>
                    </v-col>
                    
                    <!-- 右侧：二维码显示 -->
                    <v-col cols="12" md="7">
                        <div style="display: flex; justify-content: center; align-items: center; min-height: 350px;">
                            <div v-if="!qrcode.image" style="text-align: center; color: rgba(var(--v-theme-on-surface),0.4);">
                                <v-icon size="120" color="grey-darken-1">mdi-qrcode</v-icon>
                                <p style="margin-top: 16px;" class="d-none d-md-block">点击左侧按钮获取二维码</p>
                                <p style="margin-top: 16px;" class="d-md-none">点击上方按钮获取二维码</p>
                            </div>
                            <div v-else style="text-align: center;">
                                <div style="background: white; padding: 16px; border-radius: 16px; display: inline-block;">
                                    <img :src="qrcode.image" alt="115 登录二维码" style="width: 256px; height: 256px;">
                                </div>
                                <p style="margin-top: 12px; color: rgba(var(--v-theme-on-surface),0.7); font-size: 14px;">
                                    使用 115 客户端扫描上方二维码
                                </p>
                            </div>
                        </div>
                    </v-col>
                </v-row>
            </div>

            <!-- 保存 Cookie 对话框 -->
            <v-dialog v-model="saveDialog" max-width="450" persistent>
                <v-card style="background: rgb(var(--v-theme-surface)); border-radius: 16px;">
                    <v-card-title style="padding: 20px; background: rgba(86,202,0,0.1);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <v-icon color="success">mdi-check-circle</v-icon>
                            <span>扫码成功</span>
                        </div>
                    </v-card-title>
                    
                    <v-card-text style="padding: 24px;">
                        <p style="margin-bottom: 20px; color: rgba(var(--v-theme-on-surface),0.8);">
                            已成功获取 Cookie，请选择保存方式：
                        </p>
                        
                        <v-btn
                            color="info"
                            variant="outlined"
                            size="small"
                            @click="copyCookie"
                            style="border-radius: 8px; margin-bottom: 16px;"
                        >
                            <v-icon left size="18">mdi-content-copy</v-icon>
                            复制 Cookie
                        </v-btn>
                        
                        <!-- 显示 Cookie 文本框供手动复制 -->
                        <v-textarea
                            v-if="showCookieText"
                            v-model="obtainedCookie"
                            label="Cookie 内容（请手动复制）"
                            variant="outlined"
                            density="comfortable"
                            rows="3"
                            readonly
                            style="margin-bottom: 16px;"
                            @click="$event.target.select()"
                        ></v-textarea>
                        
                        <v-radio-group v-model="saveMode" hide-details style="margin-bottom: 16px;">
                            <v-radio label="更新现有配置" value="update" :disabled="configs115.length === 0"></v-radio>
                            <v-radio label="创建新配置" value="create"></v-radio>
                        </v-radio-group>
                        
                        <v-select
                            v-if="saveMode === 'update'"
                            v-model="selectedConfigId"
                            :items="configs115"
                            :item-title="item => item.name"
                            item-value="id"
                            label="选择配置"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                        ></v-select>
                        
                        <v-text-field
                            v-if="saveMode === 'create'"
                            v-model="newConfigName"
                            label="配置名称"
                            placeholder="输入新配置的名称"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                        ></v-text-field>
                    </v-card-text>
                    
                    <v-card-actions style="padding: 16px; background: rgba(0,0,0,0.05);">
                        <v-btn variant="text" @click="saveDialog = false; resetQRCode();">取消</v-btn>
                        <v-spacer></v-spacer>
                        <v-btn color="success" variant="elevated" :loading="saving" @click="saveCookie" style="border-radius: 8px;">
                            <v-icon left>mdi-content-save</v-icon>
                            保存
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </div>
    `
};
