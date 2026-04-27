// 115 助手页面组件
const Helper115Page = {
    name: 'Helper115Page',
    
    data() {
        return {
            configs: [],
            loading: false,
            saving: false,
            deletingDir: {},
            pendingDeletes: [],
            testingCookie: {},  // 控制每个配置的测试 Cookie 加载状态
            testingToken: {},  // 控制每个配置的测试 Open Token 加载状态
            showCookie: {},  // 控制每个配置的 cookie 显示状态
            showToken: {},  // 控制每个配置的 Open Token 显示状态
            showRecyclebinPassword: {},  // 控制回收站密码显示状态
            // 签到相关
            checkinConfigs: {},  // 按 115 配置名称索引的签到配置 { configName: {id, enabled, cron} }
            checkinLoading: {},
            checkinSaving: false
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    async activated() {
        // 组件被 keep-alive 缓存后重新激活时刷新配置
        await this.loadConfigs();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const [configs115, checkinConfigs] = await Promise.all([
                    api.get115Configs(),
                    api.getCheckin115Configs()
                ]);
                this.configs = configs115 || [];
                // 按 use_115_config 名称建立签到配置索引
                const checkinMap = {};
                for (const cc of (checkinConfigs || [])) {
                    checkinMap[cc.use_115_config] = cc;
                }
                this.checkinConfigs = checkinMap;
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
                cookie: '',
                cache_ttl: 600,
                concurrent_play_enabled: false,
                fast_transfer_enabled: false,
                auto_delete_enabled: false,
                delete_cron_expression: '30 3 * * *',
                recyclebin_password: '',
                copy_directory: '',
                cookie_check_enabled: false,
                cookie_check_cron: '0 * * * *',
            });
        },
        
        removeConfig(index) {
            const config = this.configs[index];
            if (config.id) {
                // 已保存的配置，加入待删除列表
                this.pendingDeletes.push(config.id);
            }
            // 从列表移除
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
                if (config.auto_delete_enabled && config.delete_cron_expression) {
                    const r = validateCronExpression(config.delete_cron_expression);
                    if (!r.valid) { window.showMessage(`${label} 删除定时表达式错误: ${r.error}`, 'error'); return; }
                }
                if (config.cookie_check_enabled && config.cookie_check_cron) {
                    const r = validateCronExpression(config.cookie_check_cron);
                    if (!r.valid) { window.showMessage(`${label} Cookie检测定时表达式错误: ${r.error}`, 'error'); return; }
                }
            }
            this.saving = true;
            try {
                // 先删除待删除的配置
                for (const configId of this.pendingDeletes) {
                    await api.delete115Config(configId);
                }
                this.pendingDeletes = [];
                
                // 保存/更新配置
                for (const config of this.configs) {
                    if (config.id) {
                        await api.update115Config(config.id, config);
                    } else {
                        const res = await api.add115Config(config);
                        if (res.data) {
                            config.id = res.data.id;
                        }
                    }
                }
                // 同步保存签到配置
                // 更新签到配置中的 use_115_config（配置名称可能修改了）
                await this.saveCheckinConfigs();
                window.showMessage('115 配置保存成功', 'success');
            } catch (error) {
                console.error('保存配置失败:', error);
                window.showMessage('保存配置失败', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        
        async testOpenToken(index) {
            const config = this.configs[index];
            const label = config.name || '配置' + (index + 1);
            this.testingToken[index] = true;
            this.testingToken = { ...this.testingToken };
            try {
                if (!config.open_token || !config.open_token.access_token) {
                    window.showMessage('Open Token 为空，请先通过扫码授权', 'warning');
                    return;
                }
                const res = await api.test115OpenToken(config.open_token.access_token, config.id);
                if (res.success) {
                    // 如果后端自动刷新了 token，同步更新前端配置
                    if (res.refreshed_token) {
                        config.open_token = { ...config.open_token, ...res.refreshed_token };
                    }
                    window.showMessage(`${label}: ${res.message || 'Open Token 有效 ✅'}`, 'success');
                } else {
                    window.showMessage(`${label}: ${res.message || 'Open Token 无效'}`, 'error');
                }
            } catch (error) {
                window.showMessage(`${label}: 测试失败 ❌`, 'error');
            } finally {
                this.testingToken[index] = false;
                this.testingToken = { ...this.testingToken };
            }
        },


        async testCookie(index) {
            const config = this.configs[index];
            const label = config.name || '配置' + (index + 1);
            this.testingCookie[index] = true;
            this.testingCookie = { ...this.testingCookie };
            try {
                if (!config.cookie) {
                    window.showMessage('Cookie 为空，请先填写', 'warning');
                    this.testingCookie[index] = false;
                    this.testingCookie = { ...this.testingCookie };
                    return;
                }
                const res = await api.test115Cookie(config.cookie);
                if (res.success) {
                    window.showMessage(`${label}: Cookie 有效 ✅`, 'success');
                } else {
                    window.showMessage(`${label}: ${res.message || 'Cookie 无效'}`, 'error');
                }
            } catch (error) {
                window.showMessage(`${label}: 测试失败 ❌`, 'error');
            } finally {
                this.testingCookie[index] = false;
                this.testingCookie = { ...this.testingCookie };
            }
        },
        
        // ========== 签到相关方法 ==========
        getCheckinConfig(configName) {
            // 获取某个 115 配置对应的签到配置，不存在则返回默认值
            if (!this.checkinConfigs[configName]) {
                this.checkinConfigs[configName] = { id: null, use_115_config: configName, enabled: false, cron: '1 0 * * *' };
            }
            return this.checkinConfigs[configName];
        },
        
        async saveCheckinConfigs() {
            // 将 checkinConfigs 转为列表并批量保存
            const list = Object.values(this.checkinConfigs).filter(c => c.use_115_config);
            // cron 预校验
            for (const c of list) {
                if (c.enabled && c.cron) {
                    const r = validateCronExpression(c.cron);
                    if (!r.valid) {
                        window.showMessage(c.use_115_config + ' 签到定时表达式错误: ' + r.error, 'error');
                        return false;
                    }
                }
            }
            try {
                await api.batchSaveCheckin115Configs(list);
                // 刷新签到配置以获取服务端分配的 id
                const freshConfigs = await api.getCheckin115Configs();
                const checkinMap = {};
                for (const cc of (freshConfigs || [])) {
                    checkinMap[cc.use_115_config] = cc;
                }
                this.checkinConfigs = checkinMap;
                return true;
            } catch (error) {
                console.error('保存签到配置失败:', error);
                window.showMessage('保存签到配置失败', 'error');
                return false;
            }
        },
        
        async checkin115(configName, index) {
            if (!configName) {
                window.showMessage('请先填写配置名称', 'error');
                return;
            }
            this.checkinLoading[index] = true;
            this.checkinLoading = { ...this.checkinLoading };
            try {
                const res = await api.checkin115(configName);
                if (res.success) {
                    window.showMessage(res.message || '签到成功', 'success');
                } else {
                    window.showMessage(res.message || '签到失败', 'error');
                }
            } catch (error) {
                window.showMessage('签到失败: ' + error.message, 'error');
            } finally {
                this.checkinLoading[index] = false;
                this.checkinLoading = { ...this.checkinLoading };
            }
        },
        
        async deleteNanShareDir(configName) {
            if (!configName) {
                window.showMessage('配置名称为空', 'error');
                return;
            }
            try {
                const endpoint = '/concurrent_play/delete/' + encodeURIComponent(configName);
                const res = await api.request(endpoint, { method: 'POST' });
                if (res.success) {
                    window.showMessage(res.message || '删除成功', 'success');
                } else {
                    window.showMessage(res.message || '删除失败', 'error');
                }
            } catch (error) {
                window.showMessage('删除失败: ' + error.message, 'error');
            }
        }
    },

    template: `
        <div>
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="color: white; font-size: 28px; font-weight: 450; margin: 0;">
                            115 助手
                        </h2>
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
                        <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 4px; align-items: center;">
                            <v-btn v-if="config.open_token && config.open_token.access_token" color="teal" variant="tonal" size="small" style="border-radius: 8px;" @click="testOpenToken(index)" :loading="testingToken[index]">
                                测试Open
                            </v-btn>
                            <v-btn v-else-if="config.cookie" color="blue" variant="tonal" size="small" style="border-radius: 8px;" @click="testCookie(index)" :loading="testingCookie[index]">
                                测试Cookie
                            </v-btn>
                            <v-btn icon size="small" variant="text" style="opacity: 0.7;" @click="removeConfig(index)">
                                <v-icon color="error">mdi-minus-circle-outline</v-icon>
                            </v-btn>
                        </div>
                        
                        <h3 style="color: white; margin-bottom: 16px; padding-right: 120px;">
                            <v-icon color="primary">mdi-cloud</v-icon>
                            配置 {{ index + 1 }}
                            <v-chip v-if="config.open_token && config.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 6px; vertical-align: middle;">Open</v-chip>
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">({{ config.id }})</span>
                        </h3>
                        
                        <v-text-field v-model="config.name" label="名称" placeholder="如: 115一号" variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;"></v-text-field>
                        
                        <v-text-field v-if="config.open_token && config.open_token.access_token" v-model="config.open_token.access_token" label="Open Token (只读，通过扫码获取)" variant="outlined" density="comfortable" hide-details readonly style="margin-bottom: 12px;" :type="showToken[index] ? 'text' : 'password'" :append-inner-icon="showToken[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showToken[index] = !showToken[index]"></v-text-field>

                        <v-text-field v-if="!(config.open_token && config.open_token.access_token)" v-model="config.cookie" label="Cookie" placeholder="UID=xxx; CID=xxx; SEID=xxx; ..." variant="outlined" density="comfortable" hide-details style="margin-bottom: 12px;" :type="showCookie[index] ? 'text' : 'password'" :append-inner-icon="showCookie[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showCookie[index] = !showCookie[index]"></v-text-field>
                        
                        <v-text-field v-model.number="config.cache_ttl" label="缓存时间 (秒)" type="number" placeholder="600" variant="outlined" density="comfortable" hide-details style="margin-bottom: 16px;"></v-text-field>
                        
                        <!-- 同播复制/秒传 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 12px; font-weight: 500;">
                                <v-icon size="18" color="warning">mdi-content-copy</v-icon>
                                同播复制/秒传
                                <span style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); font-weight: normal; margin-left: 8px;">多设备同时播放同一部片自动复制一份文件重新获取下载链接，秒传: 播放时秒传到另一个账号获取下载链接，支持同播复制</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <v-switch v-model="config.concurrent_play_enabled" color="primary" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用同播复制</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                <v-switch v-model="config.fast_transfer_enabled" color="cyan" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">启用秒传</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                <v-switch v-model="config.auto_delete_enabled" color="warning" hide-details density="compact" style="flex: none;"></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.8); margin-left: 8px;">自动删除目录并清空回收站</span>
                            </div>
                            
                            <v-text-field v-model="config.delete_cron_expression" label="定时删除表达式" placeholder="30 3 * * *" hint="格式: 分 时 日 月 周 (5位)，如 30 3 * * * 每天凌晨3:30" persistent-hint variant="outlined" density="compact" :disabled="!config.auto_delete_enabled" style="margin-bottom: 12px;"></v-text-field>
                            
                            <v-text-field v-if="!(config.open_token && config.open_token.access_token)" v-model="config.recyclebin_password" label="回收站安全码" hint="Cookie 模式必填" persistent-hint variant="outlined" density="compact" style="margin-bottom: 12px;" :type="showRecyclebinPassword[index] ? 'text' : 'password'" :append-inner-icon="showRecyclebinPassword[index] ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showRecyclebinPassword[index] = !showRecyclebinPassword[index]"></v-text-field>
                            
                            <v-text-field v-model="config.copy_directory" label="复制/秒传目录" placeholder="/最近接收/NanShare" variant="outlined" density="compact" hide-details style="margin-bottom: 4px;"></v-text-field>
                            <div style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 12px;">同播复制或秒传文件到此目录，留空则默认为 /最近接收/NanShare</div>
                            
                            <v-btn color="warning" variant="tonal" size="small" style="border-radius: 8px;" @click="deleteNanShareDir(config.name)" :disabled="!config.name || !config.auto_delete_enabled || (!(config.open_token && config.open_token.access_token) && !config.recyclebin_password)">
                                <v-icon left size="18">mdi-delete</v-icon>删除目录并清空回收站
                            </v-btn>
                        </div>
                        
                        <!-- 115 签到 -->
                        <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;" :style="{ marginBottom: config.name ? '12px' : '0' }">
                                <v-icon size="18" color="success">mdi-calendar-check</v-icon>
                                每日签到
                                <v-switch v-if="config.name" v-model="getCheckinConfig(config.name).enabled" color="success" hide-details density="compact" style="display: inline-flex; margin-left: 12px; vertical-align: middle;"></v-switch>
                            </div>
                            <div v-if="!config.name" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5);">
                                请先填写配置名称后再设置签到
                            </div>
                            <template v-if="config.name && getCheckinConfig(config.name).enabled">
                                <v-text-field v-model="getCheckinConfig(config.name).cron" label="签到定时表达式" placeholder="1 0 * * *" hint="格式: 分 时 日 月 周 (5位)，如 1 0 * * * 每天0:01" persistent-hint variant="outlined" density="compact" style="margin-bottom: 12px;"></v-text-field>
                            </template>
                            <v-btn v-if="config.name" color="success" variant="tonal" size="small" style="border-radius: 8px; margin-top: 4px;" @click="checkin115(config.name, index)" :loading="checkinLoading[index]" :disabled="!config.name">
                                <v-icon left size="18">mdi-check-circle</v-icon>立即签到
                            </v-btn>
                        </div>
                        
                        <!-- Cookie 定时检测（仅 Cookie 模式显示） -->
                        <div v-if="config.cookie && !(config.open_token && config.open_token.access_token)" style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500;" :style="{ marginBottom: config.cookie_check_enabled ? '12px' : '0' }">
                                <v-icon size="18" color="info">mdi-shield-check</v-icon>
                                Cookie 定时检测
                                <v-switch v-model="config.cookie_check_enabled" color="info" hide-details density="compact" style="display: inline-flex; margin-left: 12px; vertical-align: middle;"></v-switch>
                            </div>
                            
                            <template v-if="config.cookie_check_enabled">
                                <div style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-bottom: 12px;">定时检测 Cookie 是否有效，失败时通过 TG Bot 通知，成功时仅输出到系统日志</div>
                                <v-text-field v-model="config.cookie_check_cron" label="检测定时表达式" placeholder="0 * * * *" hint="格式: 分 时 日 月 周 (5位)，如 0 * * * * 每小时整点检测" persistent-hint variant="outlined" density="compact"></v-text-field>
                            </template>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-cloud-off-outline</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">点击"添加配置"按钮创建新的 115 账号配置</p>
            </div>
        </div>
    `
};
