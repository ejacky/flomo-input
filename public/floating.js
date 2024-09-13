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
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        document.querySelector('textarea').value = '';
        // 如果需要显示通知，可以取消注释以下行，目前的弹出框影响用户体验，需要改进
        //showNotification('Content submitted successfully!', 'success');
        checkAndDisplayOpenOptions(); // 重新检查 API URL 状态
    })
    .catch((error) => {
        console.error('Error:', error);
        showNotification('Error submitting content. Please try again.', 'error');
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
