// Emby 助手页面组件
const EmbyPage = {
    name: 'EmbyPage',
    
    data() {
        return {
            configs: [],
            configs115: [],  // 115 配置列表
            configs123: [],  // 123 配置列表
            embyUsers: {},   // 各配置的 Emby 用户列表 {configId: [{id, name}, ...]}
            loadingEmbyUsers: {},  // Emby 用户加载状态
            loading: false,
            saving: false,
            pendingDeletes: []  // 待删除的配置ID
        }
    },
    
    computed: {
        // 分享模式不支持 Open API 账号（没有分享下载接口），过滤掉仅有 open_token 没有 cookie 的账号
        configs115ForShare() {
            return this.configs115.filter(c => c.cookie);
        }
    },
    
    async mounted() {
        await this.loadConfigs();
    },
    
    methods: {
        async loadConfigs() {
            this.loading = true;
            try {
                const [embyConfigs, configs115, configs123] = await Promise.all([
                    api.getEmbyConfigs(),
                    api.get115Configs(),
                    api.get123Configs()
                ]);
                // 将 path_replacements 数组转换为文本
                this.configs = embyConfigs.map(config => ({
                    ...config,
                    enabled: config.enabled !== undefined ? config.enabled : true,
                    path_replacements_text: (config.path_replacements || []).join('\n'),
                    strm_123_mode_enabled: config.strm_123_mode_enabled || false,
                    strm_123_mode_config: config.strm_123_mode_config || '',
                    ed2k_mode_enabled: config.ed2k_mode_enabled || false,
                    ed2k_mode_115_config: config.ed2k_mode_115_config || '',
                    http_fallback_enabled: config.http_fallback_enabled || false,
                    block_ua_enabled: config.block_ua_enabled !== undefined ? config.block_ua_enabled : false,
                    blocked_uas_text: (config.blocked_uas || []).join('\n'),
                    precache_enabled: config.precache_enabled !== undefined ? config.precache_enabled : false,
                    precache_movie_enabled: config.precache_movie_enabled !== undefined ? config.precache_movie_enabled : false,
                    precache_series_enabled: config.precache_series_enabled !== undefined ? config.precache_series_enabled : false,
                    precache_movie_version_count: config.precache_movie_version_count || '',
                    precache_series_version_count: config.precache_series_version_count || '',
                    precache_user_ids: config.precache_user_ids || [],
                    use_115_open: config.use_115_open || false,
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
                enabled: true,
                share_mode_enabled: false,
                share_mode_115_config: '',
                path_mode_enabled: false,
                pickcode_mode_enabled: false,
                pickcode_mode_115_config: '',
                fileid_mode_enabled: false,
                fileid_mode_115_config: '',
                strm_123_mode_enabled: false,
                strm_123_mode_config: '',
                ed2k_mode_enabled: false,
                ed2k_mode_115_config: '',
                http_fallback_enabled: false,
                proxy_port: '',
                path_replacements_text: '',
                block_ua_enabled: false,
                blocked_uas_text: '',
                precache_enabled: false,
                precache_movie_enabled: false,
                precache_series_enabled: false,
                precache_movie_version_count: '',
                precache_series_version_count: '',
                precache_user_ids: [],
                use_115_open: false,
                local_proxy_enabled: false,
                local_proxy_paths_text: ''
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
        
        setMode(config, mode) {
            config.mode = mode;
        },
        
        async loadEmbyUsers(configId) {
            if (!configId) return;
            this.loadingEmbyUsers[configId] = true;
            try {
                const users = await api.getEmbyUsersForEmby(configId);
                this.embyUsers[configId] = users;
            } catch (error) {
                console.error('加载 Emby 用户失败:', error);
                this.embyUsers[configId] = [];
            } finally {
                this.loadingEmbyUsers[configId] = false;
            }
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
                    await api.deleteEmbyConfig(configId);
                }
                this.pendingDeletes = [];
                
                // 保存/更新配置
                let saveErrors = [];
                for (const config of this.configs) {
                    // 将文本转换回数组，过滤空行
                    const configToSave = {
                        ...config,
                        path_replacements: (config.path_replacements_text || '')
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0),
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
                        const res = await api.updateEmbyConfig(config.id, configToSave);
                        if (res && res.success === false) {
                            saveErrors.push(res.message || `配置 "${config.name}" 保存失败`);
                        }
                    } else {
                        const res = await api.addEmbyConfig(configToSave);
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
                    window.showMessage('Emby 配置保存成功，Caddy 配置已更新', 'success');
                    // 保存成功后重新加载用户列表
                    for (const config of this.configs) {
                        if (config.id && config.server && config.api_key) {
                            await this.loadEmbyUsers(config.id);
                        }
                    }
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
                            Emby 助手
                        </h2>
                        <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 4px;">
                            若要同播复制，那么所选账号必须开启同播复制
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
                            <v-icon color="success">mdi-filmstrip</v-icon>
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
                        
                        <!-- 模式开关 -->
                        <div style="margin-bottom: 16px; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.9); font-size: 14px; margin-bottom: 12px; font-weight: 500;">
                                <v-icon size="18" color="info">mdi-cog</v-icon>
                                工作模式
                                <span style="font-size: 11px; color: rgba(var(--v-theme-on-surface),0.5); margin-left: 8px;">
                                    (多模式同时开启时按顺序匹配)
                                </span>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 8px;">
                                <div style="flex-shrink: 0;">
                                    <div style="color: white; font-size: 14px; white-space: nowrap;">
                                        <v-icon size="18" color="success">mdi-share-variant</v-icon>
                                        分享模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px; white-space: nowrap;">
                                        使用 115 分享链接获取直链
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.share_mode_enabled"
                                    color="success"
                                    hide-details
                                    density="compact"
                                    style="flex-shrink: 0;"
                                ></v-switch>
                                <v-select
                                    v-if="config.share_mode_enabled"
                                    v-model="config.share_mode_115_config"
                                    :items="configs115ForShare"
                                    item-value="name"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    style="max-width: 130px; flex: 0 1 130px; font-size: 12px;"
                                    placeholder="选择"
                                >
                                    <template v-slot:item="{ item, props }">
                                        <v-list-item v-bind="props" :title="undefined">
                                            <span>{{ item.raw.name }}</span>
                                        </v-list-item>
                                    </template>
                                    <template v-slot:selection="{ item }">
                                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.raw.name }}</span>
                                    </template>
                                </v-select>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 12px;">
                                <div>
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="primary">mdi-folder-open</v-icon>
                                        路径替换模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        通过本地路径转换获取直链
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.path_mode_enabled"
                                    color="primary"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="flex-shrink: 0;">
                                    <div style="color: white; font-size: 14px; white-space: nowrap;">
                                        <v-icon size="18" color="warning">mdi-key-variant</v-icon>
                                        Pickcode 模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px; white-space: nowrap;">
                                        通过 pickcode 直接获取直链
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.pickcode_mode_enabled"
                                    color="warning"
                                    hide-details
                                    density="compact"
                                    style="flex-shrink: 0;"
                                ></v-switch>
                                <v-select
                                    v-if="config.pickcode_mode_enabled"
                                    v-model="config.pickcode_mode_115_config"
                                    :items="configs115"
                                    item-value="name"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    style="max-width: 130px; flex: 0 1 130px; font-size: 12px;"
                                    placeholder="选择"
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
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 8px;">
                                <div style="flex-shrink: 0;">
                                    <div style="color: white; font-size: 14px; white-space: nowrap;">
                                        <v-icon size="18" color="cyan">mdi-identifier</v-icon>
                                        FileId 模式
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px; white-space: nowrap;">
                                        通过数字 fileId 转 pickcode 获取直链
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.fileid_mode_enabled"
                                    color="cyan"
                                    hide-details
                                    density="compact"
                                    style="flex-shrink: 0;"
                                ></v-switch>
                                <v-select
                                    v-if="config.fileid_mode_enabled"
                                    v-model="config.fileid_mode_115_config"
                                    :items="configs115"
                                    item-value="name"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    style="max-width: 130px; flex: 0 1 130px; font-size: 12px;"
                                    placeholder="选择"
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
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 8px;">
                                <div style="flex-shrink: 0;">
                                    <div style="color: white; font-size: 14px; white-space: nowrap;">
                                        <v-icon size="18" color="deep-purple">mdi-cloud-outline</v-icon>
                                        123 STRM 模式
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.strm_123_mode_enabled"
                                    color="deep-purple"
                                    hide-details
                                    density="compact"
                                    style="flex-shrink: 0;"
                                ></v-switch>
                                <v-select
                                    v-if="config.strm_123_mode_enabled"
                                    v-model="config.strm_123_mode_config"
                                    :items="configs123.map(c => c.name)"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    style="max-width: 130px; flex: 0 1 130px; font-size: 12px;"
                                    placeholder="选择"
                                ></v-select>
                            </div>
                            
                            <div style="display: flex; align-items: center; margin-bottom: 12px; gap: 8px;">
                                <div style="flex-shrink: 0;">
                                    <div style="color: white; font-size: 14px; white-space: nowrap;">
                                        <v-icon size="18" color="pink">mdi-magnet</v-icon>
                                        ed2k 模式
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.ed2k_mode_enabled"
                                    color="pink"
                                    hide-details
                                    density="compact"
                                    style="flex-shrink: 0;"
                                ></v-switch>
                                <v-select
                                    v-if="config.ed2k_mode_enabled"
                                    v-model="config.ed2k_mode_115_config"
                                    :items="configs115"
                                    item-value="name"
                                    variant="outlined"
                                    density="compact"
                                    hide-details
                                    style="max-width: 130px; flex: 0 1 130px; font-size: 12px;"
                                    placeholder="选择"
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
                            
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div>
                                    <div style="color: white; font-size: 14px;">
                                        <v-icon size="18" color="orange">mdi-web</v-icon>
                                        HTTP 回退
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        源文件为 HTTP/HTTPS 时访问后端获取直链，不支持同播复制，缓存时间默认600秒不可修改
                                    </div>
                                </div>
                                <v-switch
                                    v-model="config.http_fallback_enabled"
                                    color="orange"
                                    hide-details
                                    density="compact"
                                ></v-switch>
                            </div>
                        </div>
                        
                        <!-- 路径替换 - 只在路径替换模式开启时显示 -->
                        <div v-if="config.path_mode_enabled" style="margin-bottom: 12px;">
                            <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 14px; margin-bottom: 8px;">路径替换</div>
                            <v-textarea
                                v-model="config.path_replacements_text"
                                placeholder="/CloudNAS/CloudDrive/115open => 115一号&#10;/CloudNAS/CloudDrive/123云盘 => 123二号&#10;/volume2/cloudnas/clouddrive/天翼云盘 => http://172.17.0.1:8515/d"
                                variant="outlined"
                                density="compact"
                                hide-details
                                rows="4"
                                auto-grow
                            ></v-textarea>
                            <div style="margin-top: 8px; padding: 12px; background: rgba(61,111,213,0.1); border-radius: 8px;">
                                <div style="color: rgba(var(--v-theme-on-surface),0.7); font-size: 12px; line-height: 1.6;">
                                    <v-icon size="16" color="info">mdi-information</v-icon>
                                    格式: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">路径前缀 => 配置名称 或 HTTP URL</code><br>
                                    • 支持本地路径和 HTTP/HTTPS URL 前缀<br>
                                    • <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">=></code> 前后都有空格，一行一个，按顺序匹配<br>
                                    • 右边为 115/123 配置名称时，走网盘直链模式（115 支持同播复制）<br>
                                    • 右边为 http/https URL 时，直接替换路径前缀并 302 重定向（固定缓存 600s）
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
                                            • 仅在 Emby 助手配置中生效，不影响秒传播放配置
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
                                        启用后所有 115 操作将通过 Open API 进行（获取直链、同播复制等）。<br>
                                        <span style="color: rgba(255,152,0,0.9);">⚠ 注意：</span>pickcode 模式需要重新选择 115 助手里的 open 账号配置才可以生效，路径替换也是要重新替换为 115 助手里的 open 配置名称
                                    </div>
                                </div>
                            </v-expand-transition>
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
                                            • 匹配优先级最高，匹配到后不再尝试其他模式（分享/路径替换/Pickcode 等）<br>
                                            • 匹配到的路径不会触发预缓存，预缓存时自动跳过<br>
                                            • 可在日志中查看"Emby 源文件"字段确认实际路径
                                        </div>
                                    </div>
                                </div>
                            </v-expand-transition>
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
                                    
                                    <!-- 预缓存用户选择 -->
                                    <div v-if="config.precache_movie_enabled || config.precache_series_enabled" style="margin-top: 12px;">
                                        <v-select
                                            v-model="config.precache_user_ids"
                                            :items="(embyUsers[config.id] || []).map(u => ({title: u.name, value: u.id}))"
                                            label="预缓存用户"
                                            placeholder="不选择则所有用户生效"
                                            variant="outlined"
                                            density="compact"
                                            hide-details
                                            multiple
                                            chips
                                            closable-chips
                                            clearable
                                            :loading="loadingEmbyUsers[config.id]"
                                        ></v-select>
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
                                        启用此 Emby
                                    </div>
                                    <div style="color: rgba(var(--v-theme-on-surface),0.5); font-size: 12px; margin-top: 2px;">
                                        是否启用此 Emby 配置
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
                <v-icon size="48" color="grey">mdi-filmstrip-off</v-icon>
                <h3 style="color: white; margin-top: 12px; font-size: 16px;">暂无配置</h3>
                <p style="color: rgba(var(--v-theme-on-surface),0.6); margin-top: 6px; font-size: 14px;">
                    点击"添加配置"按钮创建新的 Emby 服务器配置
                </p>
            </div>
        </div>
    `
};
