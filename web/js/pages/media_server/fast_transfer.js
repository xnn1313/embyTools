// 秒传播放页面组件
const FastTransferPage = {
    name: 'FastTransferPage',
    
    data() {
        return {
            configs: [],
            configs115: [],  // 115 配置列表
            configs123: [],  // 123 配置列表
            embyUsers: {},   // 各配置的 Emby 用户列表 {configId: [{id, name}, ...]}
            loadingEmbyUsers: {},  // Emby 用户加载状态
            loading: false,
            saving: false,
            pendingDeletes: [],  // 待删除的配置ID
        }
    },
    
    computed: {
        configs115OpenOnly() {
            return this.configs115.filter(c => c.open_token && c.open_token.access_token);
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const [fastTransferConfigs, configs115, configs123] = await Promise.all([
                    api.getFastTransferConfigs(),
                    api.get115Configs(),
                    api.get123Configs()
                ]);
                
                this.configs = fastTransferConfigs.map(config => ({
                    ...config,
                    enabled: config.enabled !== undefined ? config.enabled : true,
                    share_mode_enabled: config.share_mode_enabled !== undefined ? config.share_mode_enabled : false,
                    path_mode_enabled: config.path_mode_enabled !== undefined ? config.path_mode_enabled : false,
                    pickcode_mode_enabled: config.pickcode_mode_enabled !== undefined ? config.pickcode_mode_enabled : false,
                    fileid_mode_enabled: config.fileid_mode_enabled !== undefined ? config.fileid_mode_enabled : false,
                    strm_123_mode_enabled: config.strm_123_mode_enabled !== undefined ? config.strm_123_mode_enabled : false,
                    ed2k_mode_enabled: config.ed2k_mode_enabled !== undefined ? config.ed2k_mode_enabled : false,
                    source_config_123: config.source_config_123 || '',
                    target_config_123: config.target_config_123 || '',
                    path_replacements_text: (config.path_replacements || []).join('\n'),
                    block_ua_enabled: config.block_ua_enabled !== undefined ? config.block_ua_enabled : false,
                    blocked_uas_text: (config.blocked_uas || []).join('\n'),
                    emby_user_configs: (config.emby_user_configs || []).map(uc => {
                        const result = {
                            ...uc,
                            emby_user_ids: uc.emby_user_ids || (uc.emby_user_id ? [uc.emby_user_id] : []),
                            emby_user_names: uc.emby_user_names || (uc.emby_user_name ? [uc.emby_user_name] : []),
                            precache_movie: uc.precache_movie !== undefined ? uc.precache_movie : false,
                            precache_series: uc.precache_series !== undefined ? uc.precache_series : false
                        };
                        delete result.emby_user_id;
                        delete result.emby_user_name;
                        return result;
                    }),
                    shared_account_enabled: config.shared_account_enabled !== undefined ? config.shared_account_enabled : false,
                    shared_source_config_115: config.shared_source_config_115 || '',
                    shared_target_config_115: config.shared_target_config_115 || '',
                    shared_source_config_123: config.shared_source_config_123 || '',
                    shared_target_config_123: config.shared_target_config_123 || '',
                    precache_enabled: config.precache_enabled !== undefined ? config.precache_enabled : false,
                    precache_movie_enabled: config.precache_movie_enabled !== undefined ? config.precache_movie_enabled : false,
                    precache_series_enabled: config.precache_series_enabled !== undefined ? config.precache_series_enabled : false,
                    precache_movie_version_count: config.precache_movie_version_count || '',
                    precache_series_version_count: config.precache_series_version_count || '',
                    use_115_open: config.use_115_open || false,
                    random_delay_enabled: config.random_delay_enabled !== undefined ? config.random_delay_enabled : false,
                    random_delay_min: config.random_delay_min !== undefined ? config.random_delay_min : 0.4,
                    random_delay_max: config.random_delay_max !== undefined ? config.random_delay_max : 1.2,
                    local_proxy_enabled: config.local_proxy_enabled || false,
                    local_proxy_paths_text: (config.local_proxy_paths || []).join('\n')
                }));
                
                // 加载各配置的 Emby 用户列表
                for (const config of this.configs) {
                    if (config.id) {
                        this.loadEmbyUsers(config.id);
                    }
                }
                this.configs115 = configs115;
                this.configs123 = configs123;
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
                server: '',
                api_key: '',
                proxy_port: '',
                enabled: true,
                source_config: '',
                target_config: '',
                source_config_123: '',
                target_config_123: '',
                share_mode_enabled: false,
                path_mode_enabled: false,
                pickcode_mode_enabled: false,
                fileid_mode_enabled: false,
                strm_123_mode_enabled: false,
                ed2k_mode_enabled: false,
                path_replacements_text: '',
                block_ua_enabled: false,
                blocked_uas_text: '',
                random_delay_enabled: false,
                random_delay_min: 0.4,
                random_delay_max: 1.2,
                emby_user_configs: [],
                shared_account_enabled: false,
                shared_source_config_115: '',
                shared_target_config_115: '',
                shared_source_config_123: '',
                shared_target_config_123: '',
                precache_enabled: false,
                precache_movie_enabled: false,
                precache_series_enabled: false,
                precache_movie_version_count: '',
                precache_series_version_count: '',
                use_115_open: false,
                local_proxy_enabled: false,
                local_proxy_paths_text: ''
            });
        },
        
        async loadEmbyUsers(configId) {
            if (!configId) return;
            this.loadingEmbyUsers[configId] = true;
            try {
                const users = await api.getEmbyUsers(configId);
                this.embyUsers[configId] = users;
            } catch (error) {
                console.error('加载 Emby 用户失败:', error);
                this.embyUsers[configId] = [];
            } finally {
                this.loadingEmbyUsers[configId] = false;
            }
        },
        
        addEmbyUserConfig(config) {
            if (!config.emby_user_configs) {
                config.emby_user_configs = [];
            }
            config.emby_user_configs.push({
                emby_user_ids: [],
                emby_user_names: [],
                source_config_115: '',
                target_config_115: '',
                source_config_123: '',
                target_config_123: '',
                precache_movie: false,
                precache_series: false
            });
        },
        
        removeEmbyUserConfig(config, index) {
            config.emby_user_configs.splice(index, 1);
        },
        
        onEmbyUserSelect(config, userConfig, userIds) {
            const users = this.embyUsers[config.id] || [];
            userConfig.emby_user_ids = userIds || [];
            userConfig.emby_user_names = (userIds || []).map(id => {
                const user = users.find(u => u.id === id);
                return user ? user.name : '';
            }).filter(n => n);
        },
        
        getAvailableEmbyUsers(config, currentUserConfig) {
            const allUsers = this.embyUsers[config.id] || [];
            const currentIds = new Set(currentUserConfig.emby_user_ids || []);
            const otherSelectedIds = new Set();
            for (const uc of (config.emby_user_configs || [])) {
                if (uc !== currentUserConfig) {
                    for (const id of (uc.emby_user_ids || [])) {
                        otherSelectedIds.add(id);
                    }
                }
            }
            return allUsers
                .filter(u => currentIds.has(u.id) || !otherSelectedIds.has(u.id))
                .map(u => ({title: u.name, value: u.id}));
        },
        
        toggleAllUsersPrecacheMovie(config) {
            if (!config.emby_user_configs || config.emby_user_configs.length === 0) return;
            const allEnabled = config.emby_user_configs.every(uc => uc.precache_movie);
            config.emby_user_configs.forEach(uc => { uc.precache_movie = !allEnabled; });
        },
        
        toggleAllUsersPrecacheSeries(config) {
            if (!config.emby_user_configs || config.emby_user_configs.length === 0) return;
            const allEnabled = config.emby_user_configs.every(uc => uc.precache_series);
            config.emby_user_configs.forEach(uc => { uc.precache_series = !allEnabled; });
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
            // 校验配置名称
            for (let i = 0; i < this.configs.length; i++) {
                if (!this.configs[i].name || !this.configs[i].name.trim()) {
                    window.showMessage(`配置 ${i + 1} 的名称不能为空，请填写后再保存`, 'error');
                    return;
                }
            }
            this.saving = true;
            try {
                // 先删除待删除的配置
                for (const configId of this.pendingDeletes) {
                    await api.deleteFastTransferConfig(configId);
                }
                this.pendingDeletes = [];
                
                // 保存/更新配置
                let saveErrors = [];
                for (const config of this.configs) {
                    // 转换 path_replacements_text 和 blocked_uas_text 为数组
                    const configToSave = {
                        ...config,
                        path_replacements: config.path_replacements_text
                            ? config.path_replacements_text.split('\n').filter(line => line.trim())
                            : [],
                        blocked_uas: config.blocked_uas_text
                            ? config.blocked_uas_text.split('\n').filter(line => line.trim())
                            : [],
                        local_proxy_paths: (config.local_proxy_paths_text || '')
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0)
                    };
                    delete configToSave.path_replacements_text;
                    delete configToSave.blocked_uas_text;
                    delete configToSave.local_proxy_paths_text;
                    
                    if (config.id) {
                        const res = await api.updateFastTransferConfig(config.id, configToSave);
                        if (res && res.success === false) {
                            saveErrors.push(res.message || `配置 "${config.name}" 保存失败`);
                        }
                    } else {
                        const res = await api.addFastTransferConfig(configToSave);
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
                    // 保存成功后重新加载所有配置的用户列表
                    for (const config of this.configs) {
                        if (config.id && (config.server && config.api_key)) {
                            await this.loadEmbyUsers(config.id);
                        }
                    }
                    window.showMessage('秒传播放配置保存成功，Caddy 配置已更新', 'success');
                }
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
                            秒传播放
                        </h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">
                            秒传到另一个账号获取下载链接播放，目标账号对应的115,123助手账号需要开启秒传，如果需要同播复制目标账号也需要开启同播复制功能
                        </div>
                        <div style="height: 1.5px; background: linear-gradient(90deg, rgba(138,43,226,0.8), rgba(186,85,211,0.8)); margin-top: 8px; border-radius: 2px; width: 200px;"></div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <v-btn color="success" @click="addConfig" size="small" style="border-radius: 8px;">
                            <v-icon left size="18">mdi-plus</v-icon>
                            添加配置
                        </v-btn>
                        <v-btn 
                            color="primary" 
                            @click="saveConfigs" 
                            size="small" 
                            style="border-radius: 8px;" 
                            :loading="saving"
                        >
                            <v-icon left size="18">mdi-content-save</v-icon>
                            保存设置
                        </v-btn>
                    </div>
                </div>
            </div>
            
            <!-- 加载中 -->
            <div v-if="loading" style="text-align: center; padding: 40px;">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <!-- 配置列表 -->
            <v-row v-else>
                <v-col v-for="(config, index) in configs" :key="index" cols="12" lg="4">
                    <div class="glass-card" style="padding: 24px; position: relative; border-radius: 16px;">
                        <!-- 删除按钮 -->
                        <v-btn
                            icon
                            size="small"
                            variant="text"
                            style="position: absolute; top: 16px; right: 16px; opacity: 0.7;"
                            @click="removeConfig(index)"
                        >
                            <v-icon color="error">mdi-minus-circle-outline</v-icon>
                        </v-btn>
                        
                        <h3 style="color: white; margin-bottom: 16px; padding-right: 40px;">
                            <v-icon color="purple">mdi-flash-triangle</v-icon>
                            配置 {{ index + 1 }}
                            <span v-if="config.id" style="font-size: 12px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">
                                ({{ config.id }})
                            </span>
                        </h3>
                        
                        <v-text-field
                            v-model="config.name"
                            label="配置名称"
                            variant="outlined"
                            density="comfortable"
                            style="margin-bottom: 12px;"
                            hide-details
                        ></v-text-field>
                        
                        <v-text-field
                            v-model="config.server"
                            label="Emby 地址"
                            placeholder="http://127.0.0.1:8096"
                            variant="outlined"
                            density="comfortable"
                            style="margin-bottom: 12px;"
                            hide-details
                        ></v-text-field>
                        
                        <v-text-field
                            v-model="config.api_key"
                            label="Emby 密钥 (API Key)"
                            variant="outlined"
                            density="comfortable"
                            style="margin-bottom: 12px;"
                            hide-details
                        ></v-text-field>
                        
                        <v-text-field
                            v-model.number="config.proxy_port"
                            label="反代端口号"
                            type="number"
                            variant="outlined"
                            density="comfortable"
                            style="margin-bottom: 16px;"
                            hide-details
                        ></v-text-field>
                        
                        <!-- 工作模式 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 12px; font-weight: 500;">
                                <v-icon size="18" color="orange">mdi-cog</v-icon>
                                工作模式
                                <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">
                                    多模式开启按顺序匹配，ed2k 模式直接使用目标账号离线
                                </span>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 12px;">
                                <div style="flex: 1;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="success">mdi-share-variant</v-icon>
                                        分享模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        根据参数直接从115目标账号获取直链（不支持 Open API 账号）
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.share_mode_enabled"
                                    color="success"
                                    hide-details
                                    density="compact"
                                    :disabled="config.use_115_open"
                                ></v-switch>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 12px;">
                                <div style="flex: 1;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="primary">mdi-folder-open</v-icon>
                                        路径替换模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        通过本地路径转换秒传
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.path_mode_enabled"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 12px;">
                                <div style="flex: 1;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="warning">mdi-key-variant</v-icon>
                                        Pickcode 模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        通过 pickcode 直接秒传
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.pickcode_mode_enabled"
                                    color="warning"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 12px;">
                                <div style="flex: 1;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="cyan">mdi-identifier</v-icon>
                                        FileId 模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        通过数字 fileId 转 pickcode 秒传
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.fileid_mode_enabled"
                                    color="cyan"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="flex: 1;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="deep-purple">mdi-cloud-outline</v-icon>
                                        123 STRM 模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        根据参数直接从123目标账号获取直链
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.strm_123_mode_enabled"
                                    color="deep-purple"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-top: 12px; gap: 12px;">
                                <div style="flex: 1;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="pink">mdi-magnet-on</v-icon>
                                        ed2k 模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        使用115目标账号离线获取直链，离线目录复用目标账号复制/秒传目录
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.ed2k_mode_enabled"
                                    color="pink"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                        </div>
                        
                        <!-- 路径替换 - 只在路径模式开启时显示 -->
                        <div v-if="config.path_mode_enabled" style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 14px; margin-bottom: 8px;">路径替换</div>
                            <v-textarea
                                v-model="config.path_replacements_text"
                                placeholder="/CloudNAS/CloudDrive/115open => 115一号&#10;/CloudNAS/CloudDrive/123云盘 => 123二号"
                                variant="outlined"
                                density="compact"
                                hide-details
                                rows="4"
                                auto-grow
                            ></v-textarea>
                            <div style="margin-top: 8px; padding: 12px; background: rgba(138,43,226,0.1); border-radius: 8px;">
                                <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.6;">
                                    <v-icon size="16" color="purple">mdi-information</v-icon>
                                    格式: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">路径前缀 => 源账号名称</code><br>
                                    • 右边填写源账号的 115 或 123 配置名称<br>
                                    • 右边的账号配置必须是源账号，如上方工作模式中所说仅用于获取源账号文件<br>
                                    • 支持本地路径和 URL 路径，一行一个，按顺序匹配
                                </div>
                            </div>
                        </div>
                        
                        <!-- 屏蔽客户端 UA -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                <v-switch
                                    v-model="config.block_ua_enabled"
                                    color="error"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.9); margin-left: 8px; font-size: 14px; font-weight: 500;">
                                    <v-icon size="18" color="error">mdi-block-helper</v-icon>
                                    屏蔽客户端 UA
                                </span>
                            </div>
                            
                            <v-expand-transition>
                                <div v-if="config.block_ua_enabled">
                                    <v-textarea
                                        v-model="config.blocked_uas_text"
                                        label="屏蔽的 UA 列表"
                                        placeholder="Forward&#10;Infuse-Direct&#10;Infuse-Library"
                                        variant="outlined"
                                        density="comfortable"
                                        rows="4"
                                        hide-details
                                        style="margin-bottom: 12px;"
                                    ></v-textarea>
                                    <div style="padding: 12px; background: rgba(255,76,81,0.1); border-radius: 8px; border-left: 3px solid #FF4C51;">
                                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.6;">
                                            <v-icon size="16" color="error">mdi-information</v-icon>
                                            <strong>屏蔽规则说明：</strong><br>
                                            • 一行一个 UA，例如 Forward，不用带 / 后的版本号也就是例如 SenPlayer/5.7.0 直接填写 SenPlayer 即可<br>
                                            • 填写时区分大小写，要和请求头中的一致，防止误拦截<br>
                                            • 获取 UA 方法：播放一部影片后查看日志中的请求头 User-Agent<br>
                                            • 仅在秒传播放配置中生效，不影响 Emby 助手配置
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>
                        </div>
                        
                        <!-- 随机延迟 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                <v-switch
                                    v-model="config.random_delay_enabled"
                                    color="amber"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.9); margin-left: 8px; font-size: 14px; font-weight: 500;">
                                    <v-icon size="18" color="amber">mdi-timer-sand</v-icon>
                                    随机延迟
                                </span>
                            </div>
                            
                            <v-expand-transition>
                                <div v-if="config.random_delay_enabled">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                                        <v-text-field
                                            v-model.number="config.random_delay_min"
                                            label="最小延迟(秒)"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            style="max-width: 130px; min-width: 100px; flex: 1;"
                                        ></v-text-field>
                                        <span style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 14px;">~</span>
                                        <v-text-field
                                            v-model.number="config.random_delay_max"
                                            label="最大延迟(秒)"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            style="max-width: 130px; min-width: 100px; flex: 1;"
                                        ></v-text-field>
                                    </div>
                                    <div style="padding: 12px; background: rgba(255,193,7,0.1); border-radius: 8px; border-left: 3px solid #FFC107;">
                                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.6;">
                                            <v-icon size="16" color="amber">mdi-information</v-icon>
                                            <strong>随机延迟说明：</strong><br>
                                            • 以账号为基准，每个账号的 API 操作请求之间会添加随机延迟<br>
                                            • 源账号和目标账号分别独立计算延迟，互不影响<br>
                                            • 秒传步骤本身不受延迟影响，对 115 Cookie / 115 Open / 123 网盘均生效<br>
                                            • 仅在秒传播放中生效，不影响其他模块
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>
                            
                            <div v-if="!config.random_delay_enabled" style="color: rgba(var(--v-theme-on-surface),0.4); font-size: 12px; margin-top: 4px; margin-left: 4px;">
                                以账号为基准，每个账号的操作请求延迟 0.4 ~ 1.2 秒
                            </div>
                        </div>
                        
                        <!-- 本地代理 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                <v-switch
                                    v-model="config.local_proxy_enabled"
                                    color="blue"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <span style="color: rgba(var(--v-theme-on-surface),0.9); margin-left: 8px; font-size: 14px; font-weight: 500;">
                                    <v-icon size="18" color="blue">mdi-server-network</v-icon>
                                    本地代理
                                </span>
                            </div>
                            
                            <v-expand-transition>
                                <div v-if="config.local_proxy_enabled">
                                    <v-textarea
                                        v-model="config.local_proxy_paths_text"
                                        label="本地代理路径（Emby 源文件路径前缀）"
                                        placeholder="/mnt/media/本地影片/&#10;/volume1/video/"
                                        variant="outlined"
                                        density="comfortable"
                                        rows="3"
                                        auto-grow
                                        hide-details
                                        style="margin-bottom: 12px;"
                                    ></v-textarea>
                                    <div style="padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px; border-left: 3px solid rgba(61,111,213,0.6);">
                                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.6;">
                                            <v-icon size="16" color="info">mdi-information</v-icon>
                                            <strong>本地代理说明：</strong><br>
                                            • 匹配到时直接将请求转发给 Emby 原生处理，适用于 Emby 可直接播放的文件<br>
                                            • 匹配优先级最高，匹配到后不再尝试秒传等其他模式<br>
                                            • 无需 Emby 账号校验，使用配置的 API Key 自动鉴权<br>
                                            • 可在日志中查看"Emby 源文件"字段确认实际路径
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>
                        </div>
                        
                        <!-- 115 Open API 开关 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,191,165,0.08); border-radius: 12px; border: 1px solid rgba(0,191,165,0.2);">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <v-switch
                                    v-model="config.use_115_open"
                                    color="teal"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                    @update:model-value="(val) => { if (val) config.share_mode_enabled = false; }"
                                ></v-switch>
                                <div style="margin-left: 8px;">
                                    <div style="color: white; font-size: 14px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <v-icon size="18" color="teal">mdi-api</v-icon>
                                        使用 115 Open API
                                        <v-chip color="teal" size="x-small" variant="elevated">Open</v-chip>
                                    </div>
                                </div>
                            </div>
                            
                            <v-expand-transition>
                                <div v-if="config.use_115_open">
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; padding: 8px; background: rgba(0,191,165,0.08); border-radius: 8px; line-height: 1.6;">
                                        <v-icon size="14" color="teal">mdi-information</v-icon>
                                        启用后通过 Open API 进行 115 操作（秒传、同播复制、获取直链等）。<br>
                                        <span style="color: rgba(255,152,0,0.9);">⚠ 开启 115 open api 分享模式会自动禁用，下方账号配置需要重新配置源账号与目标账号都必须是 115 open，路径替换也需要重新替换为 115 open 配置名称</span>
                                    </div>
                                </div>
                            </v-expand-transition>
                        </div>
                        
                        <!-- Emby 用户账号配置 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                                <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; font-weight: 500; flex: 1; min-width: 150px;">
                                    <v-icon size="18" color="purple">mdi-account-multiple</v-icon>
                                    Emby 用户账号配置
                                </div>
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    <v-btn color="primary" size="small" variant="tonal" @click="addEmbyUserConfig(config)" style="border-radius: 8px;" :disabled="config.shared_account_enabled">
                                        <v-icon left size="16">mdi-plus</v-icon>
                                        添加配置
                                    </v-btn>
                                    <template v-if="config.precache_enabled && !config.shared_account_enabled && config.emby_user_configs && config.emby_user_configs.length > 0">
                                        <v-btn color="cyan" size="x-small" variant="tonal" @click="toggleAllUsersPrecacheMovie(config)" style="border-radius: 8px;">
                                            <v-icon size="14">mdi-movie-open</v-icon>
                                            一键全选
                                        </v-btn>
                                        <v-btn color="cyan" size="x-small" variant="tonal" @click="toggleAllUsersPrecacheSeries(config)" style="border-radius: 8px;">
                                            <v-icon size="14">mdi-television-classic</v-icon>
                                            一键全选
                                        </v-btn>
                                    </template>
                                </div>
                            </div>
                            
                            <!-- 共享账号模式开关 -->
                            <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 12px; background: rgba(138,43,226,0.1); border-radius: 8px; border: 1px solid rgba(138,43,226,0.3);">
                                <v-switch
                                    v-model="config.shared_account_enabled"
                                    color="purple"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <div style="margin-left: 8px;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="purple">mdi-account-group</v-icon>
                                        共享账号模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        开启后所有 Emby 用户共用同一组网盘账号，无需单独配置
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 共享账号配置 - 开启共享模式时显示 -->
                            <v-expand-transition>
                                <div v-if="config.shared_account_enabled" style="margin-bottom: 12px;">
                                    <div style="padding: 12px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                                        <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; margin-bottom: 8px;">
                                            <v-icon size="14" color="purple">mdi-information</v-icon>
                                            所有 Emby 用户将共用以下账号配置
                                        </div>
                                        <!-- 115 共享账号 -->
                                        <div style="display: flex; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                                            <v-select
                                                v-model="config.shared_source_config_115"
                                                :items="config.use_115_open ? configs115OpenOnly : configs115"
                                                item-value="name"
                                                label="115 源账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            >
                                                <template v-slot:item="{ item, props }">
                                                    <v-list-item v-bind="props" :title="undefined">
                                                        <span>{{ item.raw.name }}</span>
                                                        <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 6px;">Open</v-chip>
                                                    </v-list-item>
                                                </template>
                                                <template v-slot:selection="{ item }">
                                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.raw.name }}</span>
                                                    <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 4px;">Open</v-chip>
                                                </template>
                                            </v-select>
                                            <v-select
                                                v-model="config.shared_target_config_115"
                                                :items="config.use_115_open ? configs115OpenOnly : configs115"
                                                item-value="name"
                                                label="115 目标账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            >
                                                <template v-slot:item="{ item, props }">
                                                    <v-list-item v-bind="props" :title="undefined">
                                                        <span>{{ item.raw.name }}</span>
                                                        <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 6px;">Open</v-chip>
                                                    </v-list-item>
                                                </template>
                                                <template v-slot:selection="{ item }">
                                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.raw.name }}</span>
                                                    <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 4px;">Open</v-chip>
                                                </template>
                                            </v-select>
                                        </div>
                                        <!-- 123 共享账号 -->
                                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                            <v-select
                                                v-model="config.shared_source_config_123"
                                                :items="configs123.map(c => c.name)"
                                                label="123 源账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            ></v-select>
                                            <v-select
                                                v-model="config.shared_target_config_123"
                                                :items="configs123.map(c => c.name)"
                                                label="123 目标账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            ></v-select>
                                        </div>
                                        <!-- 共享模式预缓存开关 -->
                                        <div v-if="config.precache_enabled" style="margin-top: 8px; display: flex; gap: 12px; flex-wrap: wrap;">
                                            <div v-if="config.precache_movie_enabled" style="display: flex; align-items: center; gap: 4px;">
                                                <v-icon size="14" color="cyan">mdi-movie-open</v-icon>
                                                <span style="color: rgba(var(--v-theme-on-surface),0.6); font-size: 12px;">电影预缓存</span>
                                                <v-icon size="14" color="success">mdi-check-circle</v-icon>
                                            </div>
                                            <div v-if="config.precache_series_enabled" style="display: flex; align-items: center; gap: 4px;">
                                                <v-icon size="14" color="cyan">mdi-television-classic</v-icon>
                                                <span style="color: rgba(var(--v-theme-on-surface),0.6); font-size: 12px;">剧集预缓存</span>
                                                <v-icon size="14" color="success">mdi-check-circle</v-icon>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>
                            
                            <!-- 非共享模式时的说明和用户配置 -->
                            <div v-if="!config.shared_account_enabled">
                                <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-bottom: 12px;">
                                    为不同 Emby 用户配置不同的网盘账号
                                    <span v-if="!config.id" style="color: #FFA726; display: block; margin-top: 4px;">
                                        <v-icon size="14" color="warning">mdi-alert</v-icon>
                                        请先填写 Emby 地址和密钥并保存配置后，才能获取用户列表
                                    </span>
                                </div>
                                
                                <!-- 用户配置列表 -->
                                <div v-if="config.emby_user_configs && config.emby_user_configs.length > 0">
                                    <div v-for="(userConfig, uIndex) in config.emby_user_configs" :key="uIndex" style="margin-bottom: 8px; padding: 12px; background: rgba(var(--v-theme-on-surface),0.03); border-radius: 8px; border: 1px solid rgba(var(--v-theme-on-surface),0.08);">
                                        <!-- Emby 用户选择 -->
                                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                                            <v-select
                                                v-model="userConfig.emby_user_ids"
                                                :items="getAvailableEmbyUsers(config, userConfig)"
                                                label="Emby 用户（可多选）"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1;"
                                                :loading="loadingEmbyUsers[config.id]"
                                                multiple
                                                chips
                                                closable-chips
                                                @update:model-value="onEmbyUserSelect(config, userConfig, $event)"
                                            ></v-select>
                                            <v-btn color="error" variant="text" size="small" @click="removeEmbyUserConfig(config, uIndex)" style="min-width: 40px;">
                                                <v-icon size="18">mdi-delete</v-icon>
                                            </v-btn>
                                        </div>
                                        <!-- 115 账号 -->
                                        <div style="display: flex; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                                            <v-select
                                                v-model="userConfig.source_config_115"
                                                :items="config.use_115_open ? configs115OpenOnly : configs115"
                                                item-value="name"
                                                label="115 源账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            >
                                                <template v-slot:item="{ item, props }">
                                                    <v-list-item v-bind="props" :title="undefined">
                                                        <span>{{ item.raw.name }}</span>
                                                        <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 6px;">Open</v-chip>
                                                    </v-list-item>
                                                </template>
                                                <template v-slot:selection="{ item }">
                                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.raw.name }}</span>
                                                    <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 4px;">Open</v-chip>
                                                </template>
                                            </v-select>
                                            <v-select
                                                v-model="userConfig.target_config_115"
                                                :items="config.use_115_open ? configs115OpenOnly : configs115"
                                                item-value="name"
                                                label="115 目标账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            >
                                                <template v-slot:item="{ item, props }">
                                                    <v-list-item v-bind="props" :title="undefined">
                                                        <span>{{ item.raw.name }}</span>
                                                        <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 6px;">Open</v-chip>
                                                    </v-list-item>
                                                </template>
                                                <template v-slot:selection="{ item }">
                                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.raw.name }}</span>
                                                    <v-chip v-if="item.raw.open_token && item.raw.open_token.access_token" color="teal" size="x-small" variant="elevated" style="margin-left: 4px;">Open</v-chip>
                                                </template>
                                            </v-select>
                                        </div>
                                        <!-- 123 账号 -->
                                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                            <v-select
                                                v-model="userConfig.source_config_123"
                                                :items="configs123.map(c => c.name)"
                                                label="123 源账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            ></v-select>
                                            <v-select
                                                v-model="userConfig.target_config_123"
                                                :items="configs123.map(c => c.name)"
                                                label="123 目标账号"
                                                variant="outlined"
                                                density="compact"
                                                hide-details
                                                style="flex: 1 1 0; min-width: 0;"
                                                clearable
                                            ></v-select>
                                        </div>
                                        <!-- 用户预缓存开关：仅当父级预缓存和对应子开关都开启时才显示 -->
                                        <div v-if="config.precache_enabled && (config.precache_movie_enabled || config.precache_series_enabled)" style="display: flex; gap: 12px; margin-top: 8px; padding: 8px; background: rgba(0,188,212,0.06); border-radius: 6px;">
                                            <div v-if="config.precache_movie_enabled" style="display: flex; align-items: center; flex: 1; gap: 4px;">
                                                <v-icon size="14" color="cyan">mdi-movie-open</v-icon>
                                                <span style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">电影预缓存</span>
                                                <v-switch
                                                    v-model="userConfig.precache_movie"
                                                    color="cyan"
                                                    hide-details
                                                    density="compact"
                                                    style="flex: none;"
                                                ></v-switch>
                                            </div>
                                            <div v-if="config.precache_series_enabled" style="display: flex; align-items: center; flex: 1; gap: 4px;">
                                                <v-icon size="14" color="cyan">mdi-television-classic</v-icon>
                                                <span style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px;">剧集预缓存</span>
                                                <v-switch
                                                    v-model="userConfig.precache_series"
                                                    color="cyan"
                                                    hide-details
                                                    density="compact"
                                                    style="flex: none;"
                                                ></v-switch>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else style="padding: 16px; text-align: center; color: rgba(var(--v-theme-on-surface),0.4); background: rgba(var(--v-theme-on-surface),0.02); border-radius: 8px; border: 1px dashed rgba(var(--v-theme-on-surface),0.1);">
                                    <v-icon size="32" color="grey-darken-1">mdi-account-outline</v-icon>
                                    <p style="margin-top: 8px; font-size: 12px;">暂无用户配置，请添加 Emby 用户并配置账号</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 预缓存功能 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <v-switch
                                    v-model="config.precache_enabled"
                                    color="cyan"
                                    hide-details
                                    density="compact"
                                    style="flex: none;"
                                ></v-switch>
                                <div style="margin-left: 8px;">
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="cyan">mdi-cached</v-icon>
                                        预缓存
                                    </div>
                                </div>
                            </div>
                            
                            <v-expand-transition>
                                <div v-if="config.precache_enabled">
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-bottom: 12px; padding: 8px; background: rgba(0,188,212,0.08); border-radius: 8px;">
                                        <v-icon size="14" color="cyan">mdi-information</v-icon>
                                        开启后，进入详情页时会自动提前获取直链并缓存，播放时直接使用缓存的链接，下方的框所填的是缓存版本数，为空为当前电影/集全部版本缓存可自行设置
                                    </div>
                                    
                                    <div style="display: flex; align-items: center; margin-bottom: 8px; gap: 4px;">
                                        <div style="color: white; font-size: 13px; white-space: nowrap;">
                                            <v-icon size="16" color="cyan">mdi-movie-open</v-icon>
                                            电影预缓存
                                        </div>
                                        <v-switch
                                            v-model="config.precache_movie_enabled"
                                            color="cyan"
                                            hide-details
                                            density="compact"
                                            style="flex: none;"
                                        ></v-switch>
                                        <v-text-field
                                            v-if="config.precache_movie_enabled"
                                            v-model="config.precache_movie_version_count"
                                            placeholder="为空全部缓存"
                                            type="number"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            style="max-width: 130px; flex: none;"
                                            :min="1"
                                        ></v-text-field>
                                    </div>
                                    
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <div style="color: white; font-size: 13px; white-space: nowrap;">
                                            <v-icon size="16" color="cyan">mdi-television-classic</v-icon>
                                            剧集预缓存
                                        </div>
                                        <v-switch
                                            v-model="config.precache_series_enabled"
                                            color="cyan"
                                            hide-details
                                            density="compact"
                                            style="flex: none;"
                                        ></v-switch>
                                        <v-text-field
                                            v-if="config.precache_series_enabled"
                                            v-model="config.precache_series_version_count"
                                            placeholder="为空全部缓存"
                                            type="number"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            style="max-width: 130px; flex: none;"
                                            :min="1"
                                        ></v-text-field>
                                    </div>
                                </div>
                            </v-expand-transition>
                        </div>
                        
                        <!-- 启用/禁用开关 -->
                        <div style="margin-top: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" :color="config.enabled ? 'success' : 'grey'">mdi-power</v-icon>
                                        启用此配置
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        是否启用此秒传播放配置
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.enabled"
                                    :color="config.enabled ? 'success' : 'grey'"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                        </div>
                    </div>
                </v-col>
            </v-row>
            
            <!-- 空状态 -->
            <div v-if="!loading && configs.length === 0" class="glass-card" style="padding: 40px 20px; text-align: center; border-radius: 16px; margin-top: 16px;">
                <v-icon size="48" color="grey">mdi-flash-triangle-outline</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">
                    点击"添加配置"按钮创建新的秒传播放配置
                </p>
            </div>
        </div>
    `
};
