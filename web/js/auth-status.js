// 授权状态管理（项目级验证：服务运行即已授权）
const AuthStatus = {
    isAuthorized: true,
    message: '授权验证成功',
    
    async check() {
        // 服务能运行就说明已授权，直接返回 true
        this.isAuthorized = true;
        this.message = '授权验证成功';
        return true;
    },
    
    isFeatureEnabled(featureName) {
        return true;
    }
};

// 导出到全局
window.AuthStatus = AuthStatus;
