// CloudDrive2 助手页面组件
const HelperCD2Page = {
    name: 'HelperCD2Page',

    data() {
        return {
            config: {
                address: 'http://172.17.0.1:19798',
                username: '',
                password: '',
            },
            loading: false,
            saving: false,
            testing: false,
            showUsername: false,
            showPassword: false,
        }
    },

    async mounted() {
        await this.loadConfig();
    },

    methods: {
        async loadConfig() {
            this.loading = true;
            try {
                const res = await api.request('/cd2/config');
                if (res.success && res.data) {
                    this.config = { ...this.config, ...res.data };
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载 CD2 配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },

        async saveConfig() {
            if (!this.config.address) {
                window.showMessage && window.showMessage('请填写 CD2 地址', 'warning');
                return;
            }
            this.saving = true;
            try {
                const res = await api.request('/cd2/config', {
                    method: 'PUT',
                    body: JSON.stringify(this.config)
                });
                if (res.success) {
                    window.showMessage && window.showMessage('CD2 配置保存成功', 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '保存失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('保存失败: ' + (e.message || ''), 'error');
            } finally {
                this.saving = false;
            }
        },

        async testConnection() {
            if (!this.config.address || !this.config.username || !this.config.password) {
                window.showMessage && window.showMessage('请先填写完整的地址、用户名和密码', 'warning');
                return;
            }
            this.testing = true;
            try {
                const res = await api.request('/cd2/test', {
                    method: 'POST',
                    body: JSON.stringify(this.config)
                });
                if (res.success) {
                    window.showMessage && window.showMessage('连接成功', 'success');
                } else {
                    window.showMessage && window.showMessage(res.message || '连接失败', 'error');
                }
            } catch (e) {
                window.showMessage && window.showMessage('连接测试失败: ' + (e.message || ''), 'error');
            } finally {
                this.testing = false;
            }
        },
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            CloudDrive2 助手
                        </h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">
                            配置 CloudDrive2 连接信息，用于文件整理时通过 CD2 API 进行批量操作
                        </div>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(61,111,213,0.8), rgba(0,188,212,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <v-btn color="info" @click="testConnection" size="small" style="border-radius: 8px;" :loading="testing">
                            <v-icon left size="18">mdi-connection</v-icon>
                            测试连接
                        </v-btn>
                        <v-btn color="primary" @click="saveConfig" size="small" style="border-radius: 8px;" :loading="saving">
                            <v-icon left size="18">mdi-content-save</v-icon>
                            保存设置
                        </v-btn>
                    </div>
                </div>
            </div>

            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else class="glass-card" style="padding: 24px; border-radius: 16px; max-width: 600px;">
                <h3 style="color: white; margin-bottom: 16px;">
                    <v-icon color="cyan">mdi-cloud-cog-outline</v-icon>
                    连接配置
                </h3>

                <v-text-field
                    v-model="config.address"
                    label="CD2 地址"
                    placeholder="http://172.17.0.1:19798"
                    hint="CloudDrive2 服务地址（含端口），修改后保存即实时生效"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                    style="margin-bottom: 12px;"
                ></v-text-field>

                <v-text-field
                    v-model="config.username"
                    label="用户名"
                    placeholder="CloudDrive2 登录用户名"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    style="margin-bottom: 12px;"
                    :type="showUsername ? 'text' : 'password'"
                    :append-inner-icon="showUsername ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showUsername = !showUsername"
                ></v-text-field>

                <v-text-field
                    v-model="config.password"
                    label="密码"
                    placeholder="CloudDrive2 登录密码"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    style="margin-bottom: 16px;"
                    :type="showPassword ? 'text' : 'password'"
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPassword = !showPassword"
                ></v-text-field>
            </div>
        </div>
    `
};
