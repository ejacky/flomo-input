(function () {
    'use strict';

    const textarea = document.querySelector('textarea');
    const submitButton = document.querySelector('.submit-button');
    const settingsBar = document.getElementById('settings-bar');
    const apiUrlInput = document.getElementById('api-url-inline');
    const foregroundToggleCheckbox = document.getElementById('foreground-toggle-inline');
    const toggleSettingsBtn = document.getElementById('toggle-settings');
    const closeSettingsBtn = document.getElementById('close-settings');
    const STORAGE_KEY = 'flomoInputDraft';

    // ---------- Debounce helper ----------
    function debounce(fn, wait) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // ---------- Window resize ----------
    function updateWindowSize() {
        const width = document.body.scrollWidth;
        const height = document.body.scrollHeight;

        chrome.runtime.sendMessage({
            action: 'resize',
            width: Math.max(width + 40, 200),
            height: Math.max(height + 40, 100)
        });
    }

    // Initial adjustment
    window.addEventListener('load', () => {
        setTimeout(updateWindowSize, 0);
    });

    // ---------- Auto focus textarea on open / focus ----------
    window.addEventListener('DOMContentLoaded', () => {
        if (textarea) textarea.focus();
    });

    window.addEventListener('focus', () => {
        if (textarea) textarea.focus();
    });

    // ---------- Draft auto-save / restore ----------
    function saveDraft() {
        const text = textarea.value;
        if (text.trim()) {
            chrome.storage.local.set({ [STORAGE_KEY]: text });
        } else {
            chrome.storage.local.remove(STORAGE_KEY);
        }
    }

    function restoreDraft() {
        chrome.storage.local.get(STORAGE_KEY, (data) => {
            if (data[STORAGE_KEY]) {
                textarea.value = data[STORAGE_KEY];
            }
        });
    }

    const debouncedSaveDraft = debounce(saveDraft, 300);
    const debouncedResize = debounce(updateWindowSize, 300);
    textarea.addEventListener('input', () => {
        debouncedSaveDraft();
        debouncedResize();
    });
    window.addEventListener('load', restoreDraft);

    // ---------- Submit with loading state ----------
    function setSubmitLoading(loading) {
        submitButton.disabled = loading;
        submitButton.textContent = loading ? '⏳' : '➡';
    }

    function submit() {
        const content = textarea.value.trim();
        if (!content) {
            showNotification('请输入内容后再提交', 'error');
            return;
        }

        chrome.storage.sync.get('apiUrl', (data) => {
            if (!data.apiUrl) {
                showNotification('API URL 未设置，请先在下方配置', 'error');
                settingsBar.classList.remove('collapsed');
                if (apiUrlInput) apiUrlInput.focus();
                return;
            }
            submitContent(data.apiUrl, content);
        });
    }

    submitButton.addEventListener('click', submit);

    // Ctrl/Cmd + Enter 快速提交
    textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
    });

    function submitContent(apiUrl, content) {
        setSubmitLoading(true);
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: content }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((data) => {
                console.log('Success:', data);
                textarea.value = '';
                chrome.storage.local.remove(STORAGE_KEY);
                showNotification('提交成功！', 'success');
                // 提交成功后不需要显示 open-options，配置已内置
            })
            .catch((error) => {
                console.error('Error:', error);
                showNotification('提交失败，请检查 API URL 或网络连接', 'error');
            })
            .finally(() => {
                setSubmitLoading(false);
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
        notification.style.opacity = '1';
        notification.style.transition = 'opacity 0.5s ease-out';

        if (type === 'error') {
            notification.style.backgroundColor = '#f44336';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#4CAF50';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    // ---------- Inline settings panel ----------
    function initSettings() {
        chrome.storage.sync.get(['apiUrl', 'foregroundToggle'], (data) => {
            if (apiUrlInput) apiUrlInput.value = data.apiUrl || '';
            if (foregroundToggleCheckbox) foregroundToggleCheckbox.checked = data.foregroundToggle || false;

            if (!data.apiUrl) {
                // 未配置时自动展开配置条
                settingsBar.classList.remove('collapsed');
                toggleSettingsBtn.style.display = 'none';
            } else {
                // 已配置时收起，显示"设置"入口
                settingsBar.classList.add('collapsed');
                toggleSettingsBtn.style.display = 'inline';
            }
        });
    }

    window.addEventListener('load', initSettings);

    // 展开/收起切换
    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', () => {
            settingsBar.classList.toggle('collapsed');
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsBar.classList.add('collapsed');
        });
    }

    // 自动保存 API URL
    function saveApiUrl() {
        const value = apiUrlInput.value.trim();
        chrome.storage.sync.set({ apiUrl: value }, () => {
            if (chrome.runtime.lastError) {
                console.error('保存 API URL 失败:', chrome.runtime.lastError);
                return;
            }
            // 视觉反馈：边框闪绿
            apiUrlInput.classList.add('saved');
            setTimeout(() => apiUrlInput.classList.remove('saved'), 1500);

            // 如果是首次配置（从空到有值），收起配置条并显示设置入口
            if (value) {
                toggleSettingsBtn.style.display = 'inline';
            }
        });
    }

    // 自动保存前台置顶开关
    function saveForegroundToggle() {
        const checked = foregroundToggleCheckbox.checked;
        chrome.storage.sync.set({ foregroundToggle: checked }, () => {
            if (chrome.runtime.lastError) {
                console.error('保存设置失败:', chrome.runtime.lastError);
            }
        });
    }

    if (apiUrlInput) {
        apiUrlInput.addEventListener('input', debounce(saveApiUrl, 500));
    }

    if (foregroundToggleCheckbox) {
        foregroundToggleCheckbox.addEventListener('change', saveForegroundToggle);
    }

    // 监听 storage 变化（如从其他页面修改）
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            if ('apiUrl' in changes && apiUrlInput) {
                apiUrlInput.value = changes.apiUrl.newValue || '';
            }
            if ('foregroundToggle' in changes && foregroundToggleCheckbox) {
                foregroundToggleCheckbox.checked = changes.foregroundToggle.newValue || false;
            }
        }
    });

    // ---------- Formatting tools ----------
    function wrapText(before, after) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        const replacement = before + selected + after;
        textarea.setRangeText(replacement, start, end, 'end');
        textarea.focus();
        saveDraft();
    }

    const formatButtons = document.querySelectorAll('.formatting-tools button[data-format]:not(#insert-link)');
    formatButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            switch (format) {
                case 'bold':
                    wrapText('**', '**');
                    break;
                case 'italic':
                    wrapText('*', '*');
                    break;
                case 'underline':
                    wrapText('<u>', '</u>');
                    break;
                case 'list':
                    wrapText('\n- ', '');
                    break;

            }
        });
    });

    // ---------- Insert current tab URL ----------
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
                    saveDraft();
                } else {
                    alert('未获取到网页链接，请切换到你想要插入链接的页面。');
                }
            });
        });
    }

    // ---------- Go to Flomo ----------
    document.getElementById('goto-flomo').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://v.flomoapp.com/' });
    });
})();
