// 天翼助手页面组件
const HelperCloud189Page = {
    name: 'HelperCloud189Page',
    
    data() {
        return {
            configs: [],
            loading: false,
            saving: false,
            verifying: {},
            relogging: {},
            pendingDeletes: [],
            showUsername: {},
            showPassword: {},
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const configs = await api.getCloud189Configs();
                this.configs = configs.map(c => ({
                    ...c,
                    cache_ttl: c.cache_ttl || 600
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
                username: '',
                password: '',
                cache_ttl: 600,
                logged_in: false
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
                    await api.deleteCloud189Config(configId);
                }
                this.pendingDeletes = [];
                
                for (const config of this.configs) {
                    const saveData = { ...config };
                    const isNew = !config.id;
                    if (config.id) {
                        await api.updateCloud189Config(config.id, saveData);
                    } else {
                        const res = await api.addCloud189Config(saveData);
                        if (res.data) {
                            config.id = res.data.id;
                        }
                    }
                    // 新配置保存后自动登录获取 cookies
                    if (isNew && config.id && config.username && config.password && config.password !== '******') {
                        try {
                            const verifyRes = await api.cloud189Verify(config.username, config.password, config.id);
                            if (verifyRes.success) {
                                config.logged_in = true;
                                window.showMessage(`配置「${config.name || config.username}」登录成功 | 昵称: ${verifyRes.data?.nickname || '未知'}`, 'success');
                            }
                        } catch (e) {
                            window.showMessage(`配置「${config.name || config.username}」自动登录失败: ${e.message || ''}`, 'warning');
                        }
                    }
                }
                window.showMessage('天翼配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        async verifyAccount(config, index) {
            if (!config.id) {
                window.showMessage('请先保存配置后再验证', 'warning');
                return;
            }
            this.verifying[index] = true;
            this.verifying = { ...this.verifying };
            try {
                const res = await api.cloud189Verify(
                    config.username,
                    config.password,
                    config.id
                );
                if (res.success) {
                    config.logged_in = true;
                    window.showMessage(`登录成功 | 昵称: ${res.data?.nickname || '未知'}`, 'success');
                } else {
                    window.showMessage(res.message || '登录失败', 'error');
                }
            } catch (error) {
                window.showMessage('验证失败: ' + (error.message || ''), 'error');
            } finally {
                this.verifying[index] = false;
                this.verifying = { ...this.verifying };
            }
        },
        
        async reLogin(config, index) {
            if (!config.id) {
                window.showMessage('请先保存配置', 'warning');
                return;
            }
            this.relogging[index] = true;
            this.relogging = { ...this.relogging };
            try {
                const res = await api.cloud189Verify(
                    config.username,
                    config.password,
                    config.id
                );
                if (res.success) {
                    config.logged_in = true;
                    window.showMessage(`重新登录成功 | 昵称: ${res.data?.nickname || '未知'}`, 'success');
                } else {
                    window.showMessage(res.message || '重新登录失败', 'error');
                }
            } catch (error) {
                window.showMessage('重新登录失败: ' + (error.message || ''), 'error');
            } finally {
                this.relogging[index] = false;
                this.relogging = { ...this.relogging };
            }
        }
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            天翼助手
                        </h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">
                            管理天翼云盘配置，用于 Emby 助手路径替换模式
                        </div>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(0,150,136,0.8), rgba(0,188,212,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
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
                            <v-icon color="teal">mdi-cloud-outline</v-icon>
                            配置 {{ index + 1 }}
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">({{ config.id }})</span>
                        </h3>
                        
                        <v-text-field v-model="config.name" label="名称" placeholder="如: 天翼一号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>

                        <v-text-field v-model="config.username" label="账号" placeholder="手机号或邮箱" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showUsername[index] ? 'text' : 'password'" :append-inner-icon="showUsername[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showUsername[index] = !showUsername[index]"></v-text-field>

                        <v-text-field v-model="config.password" label="密码" placeholder="天翼云盘密码" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showPassword[index] ? 'text' : 'password'" :append-inner-icon="showPassword[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showPassword[index] = !showPassword[index]"></v-text-field>

                        <v-text-field v-model.number="config.cache_ttl" label="缓存时间 (秒)" type="number" placeholder="600" variant="outlined" density="comfortable" hide-details style="margin-bottom: 16px;">
                            <template #prepend-inner>
                                <v-icon size="18" color="grey">mdi-timer-outline</v-icon>
                            </template>
                        </v-text-field>
                        
                        <!-- 登录状态与操作 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                <v-icon size="16" :color="config.logged_in ? 'success' : 'grey'">
                                    {{ config.logged_in ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                                </v-icon>
                                <span style="font-size: 13px; color: rgba(var(--v-theme-on-surface),0.8);">
                                    {{ config.logged_in ? '已登录' : (config.id ? '未登录' : '新配置，保存后自动登录') }}
                                </span>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <v-btn
                                    color="teal" size="small" variant="elevated" style="border-radius: 8px;"
                                    :loading="verifying[index]" :disabled="!config.username || !config.password"
                                    @click="verifyAccount(config, index)"
                                >
                                    <v-icon left size="16">mdi-check-decagram</v-icon>
                                    验证账号
                                </v-btn>
                                <v-btn
                                    v-if="config.id"
                                    color="orange" size="small" variant="elevated" style="border-radius: 8px;"
                                    :loading="relogging[index]"
                                    @click="reLogin(config, index)"
                                >
                                    <v-icon left size="16">mdi-refresh</v-icon>
                                    重新登录
                                </v-btn>
                            </div>
                            <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.4); margin-top: 8px;">
                                新配置保存时自动登录获取凭证。若凭证过期可点重新登录。需关闭设备锁。
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-cloud-off-outline</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"按钮创建新的天翼云盘账号配置</p>
            </div>
        </div>
    `
};
