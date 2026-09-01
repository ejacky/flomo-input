document.getElementById('save').addEventListener('click', () => {
    const apiUrl = document.getElementById('api-url').value;
    const foregroundToggle = document.getElementById('foreground-toggle').checked;
    
    // 多平台同步配置
    const publicSync = {
        platforms: {
            douban: {
                enabled: document.getElementById('douban-enabled').checked,
                cookie: document.getElementById('douban-cookie').value.trim()
            },
            weibo: {
                enabled: document.getElementById('weibo-enabled').checked,
                cookie: document.getElementById('weibo-cookie').value.trim()
            },
            xiaohongshu: {
                enabled: document.getElementById('xiaohongshu-enabled').checked,
                cookie: document.getElementById('xiaohongshu-cookie').value.trim()
            }
        }
    };

    chrome.storage.sync.set({ 
        apiUrl: apiUrl, 
        foregroundToggle: foregroundToggle,
        publicSync: publicSync
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 750);
    });
});

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['apiUrl', 'foregroundToggle', 'publicSync'], (data) => {
        document.getElementById('api-url').value = data.apiUrl || '';
        document.getElementById('foreground-toggle').checked = data.foregroundToggle || false;
        
        // 恢复多平台同步配置
        const syncConfig = data.publicSync || { platforms: {} };
        const platforms = syncConfig.platforms || {};
        
        // 豆瓣
        if (platforms.douban) {
            document.getElementById('douban-enabled').checked = platforms.douban.enabled || false;
            document.getElementById('douban-cookie').value = platforms.douban.cookie || '';
        }
        
        // 微博
        if (platforms.weibo) {
            document.getElementById('weibo-enabled').checked = platforms.weibo.enabled || false;
            document.getElementById('weibo-cookie').value = platforms.weibo.cookie || '';
        }
        
        // 小红书
        if (platforms.xiaohongshu) {
            document.getElementById('xiaohongshu-enabled').checked = platforms.xiaohongshu.enabled || false;
            document.getElementById('xiaohongshu-cookie').value = platforms.xiaohongshu.cookie || '';
        }
    });
});
