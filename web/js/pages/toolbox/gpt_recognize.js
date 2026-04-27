// OpenAI 辅助识别配置页面
const GptRecognizePage = {
    name: 'GptRecognizePage',
    data() {
        return {
            loading: false,
            saving: false,
            testing: false,
            testReply: '',
            testSuccess: null,
            showApiKey: false,
            config: {
                enabled: false,
                proxy: false,
                api_url: '',
                api_key: '',
                model: '',
                customize_prompt: ''
            },
            defaultPrompt: ''
        }
    },
    mounted() {
        this.loadConfig();
    },
    methods: {
        async loadConfig() {
            this.loading = true;
            try {
                const result = await api.request('/nameparser/gpt/config');
                if (result.success && result.data) {
                    const { compatible, ...configData } = result.data;
                    this.config = { ...this.config, ...configData };
                }
                const promptResult = await api.request('/nameparser/gpt/default_prompt');
                if (promptResult.success) {
                    this.defaultPrompt = promptResult.data || '';
                    if (!this.config.customize_prompt) {
                        this.config.customize_prompt = this.defaultPrompt;
                    }
                }
            } catch (e) {
                window.showMessage && window.showMessage('加载配置失败', 'error');
            } finally {
                this.loading = false;
            }
        },
        async saveConfig() {
            this.saving = true;
            try {
                const payload = { ...this.config };
                delete payload.api_key_masked;
                delete payload.compatible;
                const result = await api.request('/nameparser/gpt/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                window.showMessage && window.showMessage(result.message || '已保存', 'success');
            } catch (e) {
                window.showMessage && window.showMessage('保存失败: ' + (e.message || ''), 'error');
            } finally {
                this.saving = false;
            }
        },
        async testConnection() {
            this.testing = true;
            this.testReply = '';
            this.testSuccess = null;
            try {
                const result = await api.request('/nameparser/gpt/ping');
                this.testSuccess = result.success;
                this.testReply = result.message || (result.success ? '连接成功' : '连接失败');
                if (!result.success) {
                    window.showMessage && window.showMessage(this.testReply, 'error');
                }
            } catch (e) {
                this.testSuccess = false;
                this.testReply = '请求失败: ' + (e.message || '');
                window.showMessage && window.showMessage(this.testReply, 'error');
            } finally {
                this.testing = false;
            }
        },
        resetPrompt() {
            this.config.customize_prompt = this.defaultPrompt;
        }
    },
    template: `
        <div>
            <v-card style="border-radius: 16px; overflow: hidden;">
                <v-card-title class="d-flex align-center" style="padding: 16px 20px; font-size: 17px; font-weight: 600;">
                    <v-icon color="primary" size="22" class="mr-2">mdi-robot-outline</v-icon>
                    OpenAI 辅助识别
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="padding: 16px 20px;">
                    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4"></v-progress-linear>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center;">
                        <v-switch v-model="config.enabled" color="primary" hide-details density="compact">
                            <template v-slot:label>
                                <span>启用 OpenAI 辅助识别</span>
                            </template>
                        </v-switch>
                        <v-switch v-model="config.proxy" color="warning" hide-details density="compact">
                            <template v-slot:label>
                                <span>使用代理</span>
                            </template>
                        </v-switch>
                    </div>
                    <v-row>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="config.api_url"
                                label="API URL"
                                placeholder="https://api.openai.com"
                                hide-details
                                variant="outlined"
                                density="compact"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="config.api_key"
                                label="API Key"
                                placeholder="sk-xxx"
                                variant="outlined"
                                density="compact"
                                hide-details
                                :type="showApiKey ? 'text' : 'password'"
                                :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                                @click:append-inner="showApiKey = !showApiKey"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="config.model"
                                label="模型"
                                placeholder="gpt-3.5-turbo"
                                variant="outlined"
                                density="compact"
                                hide-details
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col cols="12">
                            <v-textarea
                                v-model="config.customize_prompt"
                                label="辅助识别提示词"
                                variant="outlined"
                                density="compact"
                                rows="4"
                                no-resize
                                hint="修改后保存即刻生效，滚动查看完整内容"
                                persistent-hint
                                style="font-family: monospace; font-size: 12px;"
                            ></v-textarea>
                            <v-btn variant="text" size="small" color="warning" class="mt-1" @click="resetPrompt">
                                <v-icon start size="16">mdi-restore</v-icon>
                                恢复默认提示词
                            </v-btn>
                        </v-col>
                    </v-row>
                    <!-- 测试连接结果 -->
                    <v-expand-transition>
                        <v-alert
                            v-if="testSuccess !== null"
                            :type="testSuccess ? 'success' : 'error'"
                            variant="tonal"
                            density="compact"
                            closable
                            class="mt-3"
                            style="font-size: 13px;"
                            @click:close="testSuccess = null; testReply = ''"
                        >
                            <div v-if="testSuccess">
                                <strong>连接成功</strong> — OpenAI 回复：{{ testReply }}
                            </div>
                            <div v-else>
                                <strong>连接失败</strong> — {{ testReply }}
                            </div>
                        </v-alert>
                    </v-expand-transition>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions style="padding: 12px 20px; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                    <v-btn variant="elevated" color="deep-purple-accent-3" @click="testConnection" :loading="testing" :disabled="!config.api_key || !config.api_url" style="border-radius: 10px;">
                        <v-icon start size="18">mdi-connection</v-icon>
                        测试连接
                    </v-btn>
                    <v-btn color="primary" variant="elevated" @click="saveConfig" :loading="saving" style="border-radius: 10px;">
                        <v-icon start size="18">mdi-content-save</v-icon>
                        保存配置
                    </v-btn>
                </v-card-actions>
            </v-card>
        </div>
    `
};
