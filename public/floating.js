function updateWindowSize() {
    const content = document.querySelector('.app');
    const width = content.offsetWidth;
    const height = content.offsetHeight;

    chrome.runtime.sendMessage({
        action: 'resize',
        width: width + 40, // Add some padding
        height: height + 40
    });
}

// Initial adjustment
window.addEventListener('load', () => {
    setTimeout(updateWindowSize, 0);
});

// Listen for content changes
const observer = new MutationObserver(() => {
    setTimeout(updateWindowSize, 0);
});
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
});

// Listen for window resize
window.addEventListener('resize', updateWindowSize);

document.querySelector('.submit-button').addEventListener('click', () => {
    const content = document.querySelector('textarea').value;
    chrome.storage.sync.get('apiUrl', (data) => {
        if (data.apiUrl) {
            submitContent(data.apiUrl, content);
        } else {
            showNotification('API URL not set. Please configure in options.', 'error');
            document.getElementById('open-options').style.display = 'block';
        }
    });
});

function submitContent(apiUrl, content) {
    // 检测是否包含 #public 标签
    const hasPublicTag = content.includes('#public');
    let cleanContent = content;

    if (hasPublicTag) {
        // 移除 #public 标签（支持多种格式）
        cleanContent = content
            .replace(/#public\s+/g, '')  // #public 后跟空格
            .replace(/\s+#public/g, '')   // #public 前有空格
            .replace(/#public/g, '')       // 独立的 #public
            .trim();
    }

    // 并行执行：提交到 flomo 和同步到平台
    const flomoPromise = fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content }), // 原始内容（包含 #public）
    })
        .then(response => response.json())
        .then(data => {
            console.log('Flomo Success:', data);
            return { success: true };
        })
        .catch((error) => {
            console.error('Flomo Error:', error);
            return { success: false, error: error.message };
        });

    // 如果包含 #public 标签，同步到平台
    const syncPromise = hasPublicTag
        ? new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { type: 'SYNC_TO_PLATFORMS', content: cleanContent },
                (response) => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else if (response && response.success) {
                        resolve({ success: true, results: response.results });
                    } else {
                        resolve({ success: false, error: response?.error || '同步失败' });
                    }
                }
            );
        })
        : Promise.resolve({ success: true, skipped: true });

    // 等待所有操作完成
    Promise.all([flomoPromise, syncPromise]).then(([flomoResult, syncResult]) => {
        // 清空输入框
        document.querySelector('textarea').value = '';

        // 检查 flomo 提交结果
        if (!flomoResult.success) {
            showNotification('提交到 Flomo 失败，请重试。', 'error');
            return;
        }

        // 处理同步结果
        if (hasPublicTag && !syncResult.skipped) {
            if (syncResult.success && syncResult.results) {
                const { success, failed } = syncResult.results;
                let message = '';

                if (success.length > 0 && failed.length === 0) {
                    // 全部成功
                    message = `已同步到：${success.join('、')}`;
                    showNotification(message, 'success');
                } else if (success.length > 0 && failed.length > 0) {
                    // 部分成功
                    message = `已同步到：${success.join('、')} | 失败：${failed.map(f => f.platform).join('、')}`;
                    showNotification(message, 'error');
                } else if (failed.length > 0) {
                    // 全部失败
                    message = `同步失败：${failed.map(f => f.platform).join('、')}`;
                    showNotification(message, 'error');
                }
            } else {
                showNotification('同步失败，请检查配置。', 'error');
            }
        }

        checkAndDisplayOpenOptions(); // 重新检查 API URL 状态
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.color = '#fff';
    notification.style.fontSize = '14px';
    notification.style.zIndex = '1000';

    if (type === 'error') {
        notification.style.backgroundColor = '#f44336';
    } else if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// 在文件开头添加这个函数
function checkAndDisplayOpenOptions() {
    chrome.storage.sync.get('apiUrl', (data) => {
        const openOptionsElement = document.getElementById('open-options');
        if (!data.apiUrl) {
            openOptionsElement.style.display = 'block';
        } else {
            openOptionsElement.style.display = 'none';
        }
    });
}

// 在文件加载完成时检查 API URL 状态
window.addEventListener('load', checkAndDisplayOpenOptions);

document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

// 添加一个监听器来检测存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && 'apiUrl' in changes) {
        checkAndDisplayOpenOptions();
    }
});

// 添加 flomo 快捷方式点击事件
document.getElementById('goto-flomo').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://v.flomoapp.com/' });
});

// floating.js
window.addEventListener('DOMContentLoaded', () => {
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
});

// 监听窗口获得焦点事件
window.addEventListener('focus', () => {
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
});

document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.querySelector('textarea');
    const linkBtn = document.getElementById('insert-link');
    if (linkBtn && textarea) {
        linkBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_URL' }, (response) => {
                if (response && response.url) {
                    const url = response.url;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const before = textarea.value.substring(0, start);
                    const after = textarea.value.substring(end);
                    const insertText = '\n' + url + '\n';
                    textarea.value = before + insertText + after;
                    const newPos = before.length + insertText.length;
                    textarea.selectionStart = textarea.selectionEnd = newPos;
                    textarea.focus();
                } else {
                    alert('未获取到网页链接，请切换到你想要插入链接的页面。');
                }
            });
        });
    }
});