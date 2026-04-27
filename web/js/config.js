// NanShare API 配置
const API_CONFIG = {
    baseURL: '/api',
    timeout: 30000,
    useMockData: false  // 使用真实 API
};

// API 请求工具
const api = {
    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        try {
            const url = API_CONFIG.baseURL + endpoint;
            
            // 获取 token
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            // 如果返回 401，需要区分不同情况处理
            if (response.status === 401) {
                // 对于第三方服务接口（115/123/Telegram），401 表示第三方凭证失效而非 NanShare 会话过期
                const thirdPartyPrefixes = ['/115/', '/123/login', '/telegram/test'];
                const isTestEndpoint = thirdPartyPrefixes.some(prefix => endpoint.includes(prefix));
                
                if (!isTestEndpoint) {
                    // 非测试接口的401错误，表示用户会话过期，跳转到登录页
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('username');
                    window.location.href = '/login.html';
                    return;
                } else {
                    // 测试接口的401错误，尝试解析响应中的错误信息
                    try {
                        const errorData = await response.json();
                        return errorData; // 返回包含错误信息的数据，让调用方处理
                    } catch (parseError) {
                        // 如果解析失败，返回通用错误
                        return { success: false, message: '认证失败' };
                    }
                }
            }
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        return errorData;
                    }
                } catch (parseError) {
                    // JSON 解析失败，抛出原始错误
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error('API 请求超时:', endpoint);
            } else {
                console.error('API 请求失败:', error);
            }
            throw error;
        }
    },
    
    // Emby 配置 API
    async getEmbyConfigs() {
        const res = await this.request('/emby/configs');
        return res.data || [];
    },
    
    async getMediaStats() {
        const res = await this.request('/emby/media_stats');
        return res.data || { movie_count: 0, tv_count: 0, episode_count: 0, user_count: 0 };
    },

    async getRecentAdded() {
        const res = await this.request('/dashboard/recent_added');
        return res.data || [];
    },
    
    async addEmbyConfig(config) {
        return await this.request('/emby/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateEmbyConfig(configId, config) {
        return await this.request(`/emby/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteEmbyConfig(configId) {
        return await this.request(`/emby/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    // 秒传播放配置 API
    async getFastTransferConfigs() {
        const res = await this.request('/fast_transfer/configs');
        return res.data || [];
    },
    
    async addFastTransferConfig(config) {
        return await this.request('/fast_transfer/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateFastTransferConfig(configId, config) {
        return await this.request(`/fast_transfer/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteFastTransferConfig(configId) {
        return await this.request(`/fast_transfer/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    // 115 配置 API
    async get115Configs() {
        const res = await this.request('/115/configs');
        return res.data || [];
    },
    
    async add115Config(config) {
        return await this.request('/115/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async update115Config(configId, config) {
        return await this.request(`/115/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async delete115Config(configId) {
        return await this.request(`/115/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    async test115Cookie(cookie) {
        return await this.request('/115/test_cookie', {
            method: 'POST',
            body: JSON.stringify({ cookie })
        });
    },
    
    async test115OpenToken(access_token, config_id) {
        const payload = { access_token };
        if (config_id) payload.config_id = config_id;
        return await this.request('/115/test_open_token', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    
    // 123 配置 API
    async get123Configs() {
        const res = await this.request('/123/configs');
        return res.data || [];
    },
    
    async add123Config(config) {
        return await this.request('/123/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async update123Config(configId, config) {
        return await this.request(`/123/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async delete123Config(configId) {
        return await this.request(`/123/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    async login123(passport, password) {
        return await this.request('/123/login', {
            method: 'POST',
            body: JSON.stringify({ passport, password })
        });
    },
    
    async reset123Token(configId) {
        return await this.request(`/123/reset_token/${configId}`, {
            method: 'POST'
        });
    },
    
    // 夸克配置 API
    async getQuarkConfigs() {
        const res = await this.request('/quark/configs');
        return res.data || [];
    },
    
    async addQuarkConfig(config) {
        return await this.request('/quark/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateQuarkConfig(configId, config) {
        return await this.request(`/quark/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteQuarkConfig(configId) {
        return await this.request(`/quark/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    async quarkTvGetQrcode() {
        return await this.request('/quark/tv/qrcode', {
            method: 'POST',
            body: JSON.stringify({})
        });
    },
    
    async quarkTvPoll(queryToken, deviceId) {
        return await this.request('/quark/tv/poll', {
            method: 'POST',
            body: JSON.stringify({ query_token: queryToken, device_id: deviceId })
        });
    },
    
    async quarkTvVerify(refreshToken, deviceId, accessToken) {
        return await this.request('/quark/tv/verify', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken, device_id: deviceId, access_token: accessToken })
        });
    },
    
    // 天翼云盘配置 API
    async getCloud189Configs() {
        const res = await this.request('/cloud189/configs');
        return res.data || [];
    },
    
    async addCloud189Config(config) {
        return await this.request('/cloud189/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateCloud189Config(configId, config) {
        return await this.request(`/cloud189/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteCloud189Config(configId) {
        return await this.request(`/cloud189/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    async cloud189Verify(username, password, configId) {
        return await this.request('/cloud189/verify', {
            method: 'POST',
            body: JSON.stringify({ username, password, config_id: configId })
        });
    },
    
    // 系统状态
    async getStatus() {
        const res = await this.request('/status');
        return res.data || {};
    },
    
    async restartCaddy() {
        return await this.request('/caddy/restart', { method: 'POST' });
    },
    
    // 兼容旧接口（返回空数据，真实数据由各页面组件自行加载）
    getStats() {
        return Promise.resolve([]);
    },
    
    getSystemUsage() {
        return Promise.resolve({});
    },
    
    getConfigs() {
        return Promise.resolve([]);
    },

    async getFileTransferConfigs() {
        const res = await this.request('/file_transfer/configs');
        return res.data || [];
    },

    async getFileTransferStatus() {
        const res = await this.request('/file_transfer/status');
        return res.data || {};
    },

    async previewFileTransfer(path, configId = '', options = null) {
        const payload = { path };
        if (configId) payload.config_id = configId;
        if (options) payload.options = options;
        return await this.request('/file_transfer/preview', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async organizeFileTransfer(path, configId = '', options = null) {
        const payload = { path };
        if (configId) payload.config_id = configId;
        if (options) payload.options = options;
        return await this.request('/file_transfer/organize', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async getTransferHistories(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        const res = await this.request(`/transfer_history${query ? `?${query}` : ''}`);
        return res.data || { list: [], total: 0, page: 1, total_pages: 0 };
    },

    async getTransferHistory(historyId) {
        const res = await this.request(`/transfer_history/${historyId}`);
        return res.data || null;
    },

    async deleteTransferHistory(historyId, payload = {}) {
        return await this.request(`/transfer_history/${historyId}`, {
            method: 'DELETE',
            body: JSON.stringify(payload || {})
        });
    },

    async batchDeleteTransferHistories(payload = {}) {
        return await this.request('/transfer_history', {
            method: 'DELETE',
            body: JSON.stringify(payload || {})
        });
    },

    async clearTransferHistories() {
        return await this.request('/transfer_history/all', {
            method: 'DELETE'
        });
    },

    async reorganizeTransferHistories(payload = {}) {
        return await this.request('/transfer_history/reorganize', {
            method: 'POST',
            body: JSON.stringify(payload || {})
        });
    },
    
    // 缓存管理 API
    async getCache() {
        const res = await this.request('/cache');
        return res.data || [];
    },
    
    async deleteCache(cacheKey) {
        return await this.request(`/cache/${encodeURIComponent(cacheKey)}`, {
            method: 'DELETE'
        });
    },
    
    async clearCache() {
        return await this.request('/cache/clear', { method: 'POST' });
    },
    
    // Telegram 配置 API
    async getTelegramConfig() {
        const res = await this.request('/telegram/config');
        return res.data || {};
    },
    
    async updateTelegramConfig(config) {
        return await this.request('/telegram/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async testTelegram() {
        return await this.request('/telegram/test', { method: 'POST' });
    },
    
    // 分享 STRM 配置 API
    async getShareStrmConfig() {
        const res = await this.request('/share_strm/config');
        return res.data || {};
    },
    
    async updateShareStrmConfig(config) {
        return await this.request('/share_strm/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    // 清理助手配置 API
    async getCleanerConfig() {
        const res = await this.request('/cleaner/config');
        return res.data || {};
    },
    
    async updateCleanerConfig(config) {
        return await this.request('/cleaner/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    // STRM 备份配置 API
    async getStrmBackupConfig() {
        const res = await this.request('/strm_backup/config');
        return res.data || {};
    },
    
    async updateStrmBackupConfig(config) {
        return await this.request('/strm_backup/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async runStrmBackup() {
        return await this.request('/strm_backup/run', { method: 'POST' });
    },
    
    async getStrmBackupStatus() {
        const res = await this.request('/strm_backup/status');
        return res.data || {};
    },
    
    // 日志 API
    async getLogs(logType) {
        return await this.request(`/logs/${logType}`);
    },
    
    // 系统监控 API
    async getSystemStats() {
        const res = await this.request('/system/stats');
        return res.data || {};
    },
    
    // 同播复制 API
    async deleteNanShareDirectory(configName) {
        return await this.request(`/concurrent_play/delete/${encodeURIComponent(configName)}`, { method: 'POST' });
    },
    
    // 分享 API 配置
    async getShareApiConfig() {
        const res = await this.request('/share_api/config');
        return res.data || {};
    },
    
    async updateShareApiConfig(config) {
        return await this.request('/share_api/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    // 123 STRM 配置 API
    async getStrm123Config() {
        const res = await this.request('/strm_123/config');
        return res.data || {};
    },
    
    async updateStrm123Config(config) {
        return await this.request('/strm_123/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async generateStrm123(configId, mode) {
        return await this.request('/strm_123/generate', {
            method: 'POST',
            body: JSON.stringify({ config_id: configId, mode: mode })
        });
    },
    
    // 123 API 配置
    async getApi123Config() {
        const res = await this.request('/api_123/config');
        return res.data || {};
    },
    
    async updateApi123Config(config) {
        return await this.request('/api_123/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    // 115 签到 API
    async checkin115(configName) {
        return await this.request('/115/checkin', {
            method: 'POST',
            body: JSON.stringify({ config_name: configName })
        });
    },
    
    // 115 签到配置 API
    async getCheckin115Configs() {
        const res = await this.request('/checkin_115/configs');
        return res.data || [];
    },
    
    async addCheckin115Config(config) {
        return await this.request('/checkin_115/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateCheckin115Config(configId, config) {
        return await this.request(`/checkin_115/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteCheckin115Config(configId) {
        return await this.request(`/checkin_115/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    async batchSaveCheckin115Configs(configs) {
        return await this.request('/checkin_115/configs/batch', {
            method: 'PUT',
            body: JSON.stringify({ configs })
        });
    },
    
    // 获取 Emby 助手的用户列表
    async getEmbyUsersForEmby(configId) {
        const res = await this.request(`/emby/emby_users/${configId}`);
        return res.data || [];
    },
    
    // 获取秒传播放的 Emby 用户列表
    async getEmbyUsers(ftConfigId) {
        const res = await this.request(`/fast_transfer/emby_users/${ftConfigId}`);
        return res.data || [];
    },
    
    // HDHive 账号管理 API
    async getHdhiveAccounts() {
        const res = await this.request('/hdhive/accounts');
        return res.data || [];
    },
    
    async addHdhiveAccount(config) {
        return await this.request('/hdhive/accounts', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateHdhiveAccount(accountId, config) {
        return await this.request(`/hdhive/accounts/${accountId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteHdhiveAccount(accountId) {
        return await this.request(`/hdhive/accounts/${accountId}`, {
            method: 'DELETE'
        });
    },
    
    async refreshHdhiveAccountToken(accountId) {
        return await this.request(`/hdhive/accounts/${accountId}/refresh_token`, {
            method: 'POST'
        });
    },
    
    async getHdhiveAccountsInfo() {
        return await this.request('/hdhive/accounts/info');
    },
    
    async getHdhiveAccountInfo(accountId) {
        return await this.request('/hdhive/account/' + accountId + '/info');
    },
    
    async getHdhiveAccountsInfoCache() {
        return await this.request('/hdhive/accounts/info/cache');
    },
    
    async saveHdhiveAccountInfoCache(accountId, info) {
        return await this.request('/hdhive/accounts/info/cache', {
            method: 'POST',
            body: JSON.stringify({ account_id: accountId, info: info })
        });
    },
    
    // HDHive 签到配置 API
    async getHdhiveCheckinConfigs() {
        const res = await this.request('/hdhive_checkin/configs');
        return res.data || [];
    },
    
    async addHdhiveCheckinConfig(config) {
        return await this.request('/hdhive_checkin/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    
    async updateHdhiveCheckinConfig(configId, config) {
        return await this.request(`/hdhive_checkin/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    
    async deleteHdhiveCheckinConfig(configId) {
        return await this.request(`/hdhive_checkin/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    
    async batchSaveHdhiveCheckinConfigs(configs) {
        return await this.request('/hdhive_checkin/configs/batch', {
            method: 'PUT',
            body: JSON.stringify({ configs })
        });
    },
    
    async hdhiveCheckin(accountName, isGambling) {
        return await this.request('/hdhive_checkin/checkin', {
            method: 'POST',
            body: JSON.stringify({ account_name: accountName, is_gambling: isGambling })
        });
    },
    
    // 调试模式 API
    async getDebugStatus() {
        const res = await this.request('/debug/status');
        return res.data || {};
    },
    
    async toggleDebugMode() {
        return await this.request('/debug/toggle', { method: 'POST' });
    },
    
    // 停止分享线程 API
    async stopShareTasks() {
        return await this.request('/share/stop', { method: 'POST' });
    },
    
    // 提交生成115分享STRM
    async submitShareStrm(content, enableReshare = false, pathIndex = 0) {
        return await this.request('/share/submit', {
            method: 'POST',
            body: JSON.stringify({ content, enable_reshare: enableReshare, path_index: pathIndex })
        });
    },
    
    // 获取分享STRM配置（用于获取strm_folders）
    async getShareStrmConfig() {
        const res = await this.request('/share_strm/config');
        return res.data || {};
    },

    // TG API 配置管理
    async getTgApiConfigs() {
        const res = await this.request('/tg_api/configs');
        return res.data || [];
    },
    async addTgApiConfig(config) {
        return await this.request('/tg_api/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        });
    },
    async updateTgApiConfig(configId, config) {
        return await this.request(`/tg_api/configs/${configId}`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    async deleteTgApiConfig(configId) {
        return await this.request(`/tg_api/configs/${configId}`, {
            method: 'DELETE'
        });
    },
    async getTgApiConfigStatus(configId) {
        const res = await this.request(`/tg_api/configs/${configId}/status`);
        return res.data || {};
    },
    async tgApiConfigLogout(configId) {
        return await this.request(`/tg_api/configs/${configId}/logout`, { method: 'POST' });
    },
    async tgApiQrLoginStart(configId) {
        return await this.request(`/tg_api/configs/${configId}/qr_login`, { method: 'POST' });
    },
    async tgApiQrLoginStatus(configId) {
        const res = await this.request(`/tg_api/configs/${configId}/qr_login`);
        return res.data || {};
    },
    async tgApiQrLoginRecreate(configId) {
        return await this.request(`/tg_api/configs/${configId}/qr_login/recreate`, { method: 'POST' });
    },
    async tgApiQrLoginSubmit2fa(configId, password) {
        return await this.request(`/tg_api/configs/${configId}/qr_login/submit_2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
    },

    // TG 搜索 API
    async getTgSearchChannels() {
        const res = await this.request('/tg_search/channels');
        return res.data || [];
    },
    async addTgSearchChannel(channel) {
        return await this.request('/tg_search/channels', {
            method: 'POST',
            body: JSON.stringify(channel)
        });
    },
    async updateTgSearchChannel(index, channel) {
        return await this.request(`/tg_search/channels/${index}`, {
            method: 'PUT',
            body: JSON.stringify(channel)
        });
    },
    async deleteTgSearchChannel(index) {
        return await this.request(`/tg_search/channels/${index}`, {
            method: 'DELETE'
        });
    },
    async getTgMyChannels() {
        return await this.request('/tg_search/my_channels');
    },
    async getTgSearchStatus() {
        const res = await this.request('/tg_search/status');
        return res.data || {};
    },
    async tgSearchLogout() {
        return await this.request('/tg_search/logout', { method: 'POST' });
    },
    async tgSearchSearch(channelId, keyword, limit = 50) {
        return await this.request('/tg_search/search', {
            method: 'POST',
            body: JSON.stringify({ channel_id: channelId, keyword, limit })
        });
    },

    // HDHive 搜索 API（账号和积分限制统一使用工具箱-HDHive 解析的配置）
    async hdhiveSearch(accountName, searchType, query, tmdbId = 0, page = 1) {
        return await this.request('/hdhive/search', {
            method: 'POST',
            body: JSON.stringify({
                account_name: accountName,
                search_type: searchType,
                query: query,
                tmdb_id: tmdbId,
                page: page
            })
        });
    },
    async hdhiveGetResources(accountName, tmdbId, mediaType = 'movie', websiteFilter = '115') {
        return await this.request('/hdhive/resources', {
            method: 'POST',
            body: JSON.stringify({
                account_name: accountName,
                tmdb_id: tmdbId,
                media_type: mediaType,
                website_filter: websiteFilter
            })
        });
    },
    async hdhiveResourceSave(slug, accountName = '') {
        return await this.request('/hdhive/resource/save', {
            method: 'POST',
            body: JSON.stringify({ slug, account_name: accountName })
        });
    },

    // ========== 订阅 API ==========
    async getSubscribedTmdbIds() {
        const res = await this.request('/subscribe/tmdb_ids');
        return res.data || [];
    },
    async getSubscribes(params = {}) {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
        );
        const query = new URLSearchParams(cleanParams).toString();
        const res = await this.request(`/subscribe/list?${query}`);
        return res.data || { subscribes: [], total: 0 };
    },
    async addSubscribe(data) {
        return await this.request('/subscribe', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    async getSubscribe(subscribeId) {
        const res = await this.request(`/subscribe/${subscribeId}`);
        return res.data || null;
    },
    async updateSubscribe(subscribeId, data) {
        return await this.request(`/subscribe/${subscribeId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    async deleteSubscribe(subscribeId) {
        return await this.request(`/subscribe/${subscribeId}`, {
            method: 'DELETE'
        });
    },
    async getSubscribeConfig() {
        const res = await this.request('/subscribe/config');
        return res.data || {};
    },
    async updateSubscribeConfig(config) {
        return await this.request('/subscribe/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    async getSubscribeOptions() {
        const res = await this.request('/subscribe/options');
        return res.data || {};
    },
    async runSubscribe(subscribeId) {
        return await this.request(`/subscribe/${subscribeId}/run`, { method: 'POST' });
    },
    async runSubscribesBatch(subscribeIds) {
        return await this.request('/subscribe/batch/run', {
            method: 'POST',
            body: JSON.stringify({ subscribe_ids: subscribeIds })
        });
    },

    // ========== 订阅预设 API ==========
    async getSubscribePresets() {
        const res = await this.request('/subscribe/presets');
        return res.data || [];
    },
    async addSubscribePreset(preset) {
        return await this.request('/subscribe/presets', {
            method: 'POST',
            body: JSON.stringify(preset)
        });
    },
    async updateSubscribePreset(presetId, data) {
        return await this.request(`/subscribe/presets/${presetId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    async deleteSubscribePreset(presetId) {
        return await this.request(`/subscribe/presets/${presetId}`, {
            method: 'DELETE'
        });
    },

    // ========== TG 频道监控 API ==========
    async getTgMonitorConfig() {
        const res = await this.request('/subscribe/tg-monitor/config');
        return res.data || {};
    },
    async updateTgMonitorConfig(config) {
        return await this.request('/subscribe/tg-monitor/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    async startTgMonitor() {
        return await this.request('/subscribe/tg-monitor/start', { method: 'POST' });
    },
    async stopTgMonitor() {
        return await this.request('/subscribe/tg-monitor/stop', { method: 'POST' });
    },
    async restartTgMonitor() {
        return await this.request('/subscribe/tg-monitor/restart', { method: 'POST' });
    },
    async getTgMonitorStatus() {
        const res = await this.request('/subscribe/tg-monitor/status');
        return res.data || {};
    },

    // ========== TMDB API ==========
    async tmdbTrending(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/tmdb/trending?${query}`);
        return res.data || [];
    },
    async tmdbDiscoverMovies(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/tmdb/discover/movies?${query}`);
        return res.data || [];
    },
    async tmdbDiscoverTvs(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await this.request(`/tmdb/discover/tvs?${query}`);
        return res.data || [];
    },
    async tmdbUpcoming(page = 1) {
        const res = await this.request(`/tmdb/movies/upcoming?page=${page}`);
        return res.data || [];
    },
    async tmdbNowPlaying(page = 1) {
        const res = await this.request(`/tmdb/movies/now_playing?page=${page}`);
        return res.data || [];
    },
    async tmdbPopularMovies(page = 1) {
        const res = await this.request(`/tmdb/movies/popular?page=${page}`);
        return res.data || [];
    },
    async tmdbTopRatedMovies(page = 1) {
        const res = await this.request(`/tmdb/movies/top_rated?page=${page}`);
        return res.data || [];
    },
    async tmdbPopularTvs(page = 1) {
        const res = await this.request(`/tmdb/tvs/popular?page=${page}`);
        return res.data || [];
    },
    async tmdbTopRatedTvs(page = 1) {
        const res = await this.request(`/tmdb/tvs/top_rated?page=${page}`);
        return res.data || [];
    },
    async tmdbOnTheAir(page = 1) {
        const res = await this.request(`/tmdb/tvs/on_the_air?page=${page}`);
        return res.data || [];
    },
    async tmdbSearch(query, type = 'multi', page = 1) {
        const res = await this.request(`/tmdb/search?query=${encodeURIComponent(query)}&type=${type}&page=${page}`);
        return res.data || [];
    },
    async tmdbDetail(tmdbId, type = 'movie') {
        const res = await this.request(`/tmdb/detail/${tmdbId}?type=${type}`);
        return res.data || null;
    },
    async tmdbSeasons(tmdbId) {
        const res = await this.request(`/tmdb/seasons/${tmdbId}`);
        return res.data || [];
    },
    async tmdbEpisodes(tmdbId, season) {
        const res = await this.request(`/tmdb/episodes/${tmdbId}/${season}`);
        return res.data || [];
    },
    async tmdbGenres(type = 'movie') {
        const res = await this.request(`/tmdb/genres?type=${type}`);
        return res.data || [];
    },
    async tmdbRecommend(tmdbId, type = 'movie', page = 1) {
        const res = await this.request(`/tmdb/recommend/${tmdbId}?type=${type}&page=${page}`);
        return res.data || { results: [], total_pages: 1, page: page };
    },
    async tmdbSimilar(tmdbId, type = 'movie', page = 1) {
        const res = await this.request(`/tmdb/similar/${tmdbId}?type=${type}&page=${page}`);
        return res.data || { results: [], total_pages: 1, page: page };
    },
    async tmdbPerson(personId) {
        const res = await this.request(`/tmdb/person/${personId}`);
        return res.data || null;
    },
    async tmdbPersonCredits(personId) {
        const res = await this.request(`/tmdb/person/credits/${personId}`);
        return res.data || [];
    },

    // ========== Emby 季集入库检测 ==========
    async embySeasonEpisodesCheck(name, year, tmdbId) {
        const res = await this.request('/emby/season_episodes_check', {
            method: 'POST',
            body: JSON.stringify({ name, year, tmdb_id: tmdbId || null })
        });
        return res.data || {};
    },

    async embyMediaVersions(name, year, tmdbId, type) {
        const res = await this.request('/emby/media_versions', {
            method: 'POST',
            body: JSON.stringify({ name, year, tmdb_id: tmdbId || null, type: type || 'movie' })
        });
        return res.data || {};
    },

    // ========== 豆瓣 API ==========
    async doubanShowing(page = 1) {
        const res = await this.request(`/douban/showing?page=${page}`);
        return res.data || [];
    },
    async doubanMovieHot(page = 1) {
        const res = await this.request(`/douban/movie_hot?page=${page}`);
        return res.data || [];
    },
    async doubanTvHot(page = 1) {
        const res = await this.request(`/douban/tv_hot?page=${page}`);
        return res.data || [];
    },
    async doubanTvAnimation(page = 1) {
        const res = await this.request(`/douban/tv_animation?page=${page}`);
        return res.data || [];
    },
    async doubanMovies(page = 1, sort = 'R', tags = '') {
        const res = await this.request(`/douban/movies?page=${page}&sort=${sort}&tags=${tags}`);
        return res.data || [];
    },
    async doubanTvs(page = 1, sort = 'R', tags = '') {
        const res = await this.request(`/douban/tvs?page=${page}&sort=${sort}&tags=${tags}`);
        return res.data || [];
    },
    async doubanMovieTop250(page = 1) {
        const res = await this.request(`/douban/movie_top250?page=${page}`);
        return res.data || [];
    },
    async doubanTvWeeklyChinese(page = 1) {
        const res = await this.request(`/douban/tv_weekly_chinese?page=${page}`);
        return res.data || [];
    },
    async doubanTvWeeklyGlobal(page = 1) {
        const res = await this.request(`/douban/tv_weekly_global?page=${page}`);
        return res.data || [];
    },
    async doubanMovieSoon(page = 1) {
        const res = await this.request(`/douban/movie_soon?page=${page}`);
        return res.data || [];
    },
    async doubanMovieScifi(page = 1) {
        const res = await this.request(`/douban/movie_scifi?page=${page}`);
        return res.data || [];
    },
    async doubanMovieComedy(page = 1) {
        const res = await this.request(`/douban/movie_comedy?page=${page}`);
        return res.data || [];
    },
    async doubanMovieAction(page = 1) {
        const res = await this.request(`/douban/movie_action?page=${page}`);
        return res.data || [];
    },
    async doubanMovieLove(page = 1) {
        const res = await this.request(`/douban/movie_love?page=${page}`);
        return res.data || [];
    },
    async doubanTvDomestic(page = 1) {
        const res = await this.request(`/douban/tv_domestic?page=${page}`);
        return res.data || [];
    },
    async doubanTvAmerican(page = 1) {
        const res = await this.request(`/douban/tv_american?page=${page}`);
        return res.data || [];
    },
    async doubanTvJapanese(page = 1) {
        const res = await this.request(`/douban/tv_japanese?page=${page}`);
        return res.data || [];
    },
    async doubanTvKorean(page = 1) {
        const res = await this.request(`/douban/tv_korean?page=${page}`);
        return res.data || [];
    },
    async doubanTvVarietyShow(page = 1) {
        const res = await this.request(`/douban/tv_variety_show?page=${page}`);
        return res.data || [];
    },
    async doubanShowHot(page = 1) {
        const res = await this.request(`/douban/show_hot?page=${page}`);
        return res.data || [];
    },
    async doubanSearch(query, page = 1, count = 20) {
        const res = await this.request(`/douban/search?query=${encodeURIComponent(query)}&page=${page}&count=${count}`);
        return res.data || [];
    },

    // ========== 榜单订阅 API ==========
    async getChartSubscribeConfig() {
        const res = await this.request('/chart_subscribe/config');
        return res.data || {};
    },
    async updateChartSubscribeConfig(data) {
        return await this.request('/chart_subscribe/config', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    async runChartSubscribe() {
        return await this.request('/chart_subscribe/run', { method: 'POST' });
    },
    async getChartSubscribeStatus() {
        const res = await this.request('/chart_subscribe/status');
        return res.data || {};
    },
    async getAvailableCharts() {
        const res = await this.request('/chart_subscribe/charts');
        return res.data || [];
    },

    // ========== ed2k STRM API ==========
    async getEd2kStrmConfig() {
        const res = await this.request('/ed2k_strm/config');
        return res.data || {};
    },
    async updateEd2kStrmConfig(config) {
        return await this.request('/ed2k_strm/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    // ed2k API 配置
    async getApiEd2kConfig() {
        const res = await this.request('/api_ed2k/config');
        return res.data || {};
    },
    async updateApiEd2kConfig(config) {
        return await this.request('/api_ed2k/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },
    async generateEd2kStrm(data) {
        // 此接口可能耗时很长，不设超时
        const token = localStorage.getItem('auth_token');
        const resp = await fetch(API_CONFIG.baseURL + '/ed2k_strm/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(data)
        });
        return await resp.json();
    },

    // ========== ED2K Hash API ==========
    async ed2kHashSubmit(path) {
        return await this.request('/ed2k_hash/submit', {
            method: 'POST',
            body: JSON.stringify({ path })
        });
    },
    async ed2kHashQueue(page = 1, pageSize = 20, status = '') {
        const params = new URLSearchParams({ page, page_size: pageSize });
        if (status) params.set('status', status);
        const res = await this.request(`/ed2k_hash/queue?${params}`);
        return res.data || {};
    },
    async ed2kHashCancel(taskId = '', batchId = '') {
        return await this.request('/ed2k_hash/cancel', {
            method: 'POST',
            body: JSON.stringify({ task_id: taskId, batch_id: batchId })
        });
    },
    async ed2kHashClear() {
        return await this.request('/ed2k_hash/clear', { method: 'POST' });
    },
    async ed2kHashRemove(taskIds = [], all = false) {
        return await this.request('/ed2k_hash/remove', {
            method: 'POST',
            body: JSON.stringify({ task_ids: taskIds, all })
        });
    },
    async ed2kHashBatch(batchId) {
        const res = await this.request(`/ed2k_hash/batch/${batchId}`);
        return res.data || {};
    },
    async ed2kHashSettingsGet() {
        const res = await this.request('/ed2k_hash/settings');
        return res.data || {};
    },
    async ed2kHashSettingsUpdate(settings) {
        return await this.request('/ed2k_hash/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    },
    // ========== 文件管理收藏夹 ==========
    async fileManagerFavorites() {
        const res = await this.request('/filemanager/favorites');
        return (res && res.data) || [];
    },
    async fileManagerFavoriteAdd(path, name = '') {
        return await this.request('/filemanager/favorites/add', {
            method: 'POST',
            body: JSON.stringify({ path, name })
        });
    },
    async fileManagerFavoriteRemove(path) {
        return await this.request('/filemanager/favorites/remove', {
            method: 'POST',
            body: JSON.stringify({ path })
        });
    },
};

// Cron 表达式客户端预校验
function validateCronExpression(cronExpr) {
    if (!cronExpr || !cronExpr.trim()) {
        return { valid: false, error: 'Cron 表达式不能为空' };
    }
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) {
        return { valid: false, error: `必须包含5个字段（分 时 日 月 周），当前有 ${parts.length} 个` };
    }
    const fieldNames = ['分钟', '小时', '日期', '月份', '星期'];
    const fieldRanges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
    for (let i = 0; i < 5; i++) {
        const result = _validateCronField(parts[i], fieldRanges[i][0], fieldRanges[i][1], fieldNames[i]);
        if (!result.valid) return result;
    }
    return { valid: true, error: null };
}

function _validateCronField(field, minVal, maxVal, fieldName) {
    if (field === '*') return { valid: true, error: null };
    if (field.startsWith('*/')) {
        const step = parseInt(field.substring(2));
        if (isNaN(step) || step <= 0) return { valid: false, error: `${fieldName}步进值无效: ${field}` };
        if (step > (maxVal - minVal + 1)) return { valid: false, error: `${fieldName}步进值 ${step} 超出范围 (${minVal}-${maxVal})` };
        return { valid: true, error: null };
    }
    if (field.includes('/') && field.includes('-')) {
        const [rangePart, stepStr] = field.split('/');
        const [startStr, endStr] = rangePart.split('-');
        const start = parseInt(startStr), end = parseInt(endStr), step = parseInt(stepStr);
        if (isNaN(start) || isNaN(end) || isNaN(step)) return { valid: false, error: `${fieldName}格式无效: ${field}` };
        if (start < minVal || end > maxVal) return { valid: false, error: `${fieldName}范围超出限制 (${minVal}-${maxVal})` };
        if (start > end) return { valid: false, error: `${fieldName}起始值不能大于结束值` };
        if (step <= 0) return { valid: false, error: `${fieldName}步进值必须大于0` };
        return { valid: true, error: null };
    }
    if (field.includes('-')) {
        const [startStr, endStr] = field.split('-');
        const start = parseInt(startStr), end = parseInt(endStr);
        if (isNaN(start) || isNaN(end)) return { valid: false, error: `${fieldName}格式无效: ${field}` };
        if (start < minVal || end > maxVal) return { valid: false, error: `${fieldName}范围超出限制 (${minVal}-${maxVal})` };
        if (start > end) return { valid: false, error: `${fieldName}起始值不能大于结束值` };
        return { valid: true, error: null };
    }
    if (field.includes(',')) {
        const values = field.split(',').map(v => parseInt(v.trim()));
        for (const v of values) {
            if (isNaN(v) || v < minVal || v > maxVal) return { valid: false, error: `${fieldName}值 ${v} 超出范围 (${minVal}-${maxVal})` };
        }
        return { valid: true, error: null };
    }
    const val = parseInt(field);
    if (isNaN(val) || val < minVal || val > maxVal) return { valid: false, error: `${fieldName}值 ${field} 超出范围 (${minVal}-${maxVal})` };
    return { valid: true, error: null };
}
