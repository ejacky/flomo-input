'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

let floatingWindowId = null;
let visibilityIntervalId = null;
let cachedForegroundToggle = null;

// Cache the foreground toggle setting and listen for changes
chrome.storage.sync.get('foregroundToggle', (data) => {
  cachedForegroundToggle = data.foregroundToggle || false;
});
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && 'foregroundToggle' in changes) {
    cachedForegroundToggle = changes.foregroundToggle.newValue;
    if (cachedForegroundToggle && floatingWindowId !== null) {
      startEnsureVisibilityInterval();
    } else if (!cachedForegroundToggle && visibilityIntervalId) {
      clearInterval(visibilityIntervalId);
      visibilityIntervalId = null;
    }
  }
});

chrome.action.onClicked.addListener((tab) => {
  console.log("Action clicked");
  if (floatingWindowId !== null) {
    ensureFloatingWindowVisible(true); // 传入 true 表示这是用户点击
  } else {
    createFloatingWindow();
  }
});

function createFloatingWindow() {
  // 如果已经存在窗口，先关闭它
  if (floatingWindowId !== null) {
    const oldId = floatingWindowId;
    floatingWindowId = null; // 提前清空，防止重复操作
    chrome.windows.remove(oldId, () => {
      if (chrome.runtime.lastError) {
        console.log("Error closing existing window:", chrome.runtime.lastError.message);
      }
      actuallyCreateFloatingWindow();
    });
  } else {
    // 如果不存在窗口，直接创建
    actuallyCreateFloatingWindow();
  }
}

function actuallyCreateFloatingWindow() {
  chrome.system.display.getInfo((displays) => {
    if (chrome.runtime.lastError || !displays || !displays.length) {
      console.error("无法获取显示器信息:", chrome.runtime.lastError?.message);
      return;
    }
    const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
    chrome.windows.create({
      url: chrome.runtime.getURL("floating.html"),
      type: "popup",
      width: 350,
      height: 300,
      left: primaryDisplay.workArea.width - 350,
      top: 100,
      focused: true,
    }, (window) => {
      if (chrome.runtime.lastError || !window) {
        console.error("创建窗口失败:", chrome.runtime.lastError?.message);
        return;
      }
      floatingWindowId = window.id;
      
      // 尝试设置 alwaysOnTop
      chrome.windows.update(floatingWindowId, { alwaysOnTop: true }, () => {
        if (chrome.runtime.lastError) {
          console.log("无法设置 alwaysOnTop：", chrome.runtime.lastError.message);
          startEnsureVisibilityInterval();
        }
      });
    });
  });
}

// 全局统一的窗口移除监听器（只注册一次）
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === floatingWindowId) {
    floatingWindowId = null;
    if (visibilityIntervalId) {
      clearInterval(visibilityIntervalId);
      visibilityIntervalId = null;
    }
  }
});

function ensureFloatingWindowVisible(isUserClick = false) {
  // 没有活动窗口创建一个
  if (floatingWindowId === null) {
    createFloatingWindow();
    return;
  }

  chrome.windows.get(floatingWindowId, (window) => {
    // 异常窗口，移除并创建一个
    if (chrome.runtime.lastError || !window) {
      console.log("Window not found, creating a new one");
      floatingWindowId = null;
      createFloatingWindow();
      return;
    }
    // 如果已经位于前台则不处理
    if (window.focused) {
      return;
    }

    // 用户点击直接置于前台
    if (isUserClick) {
      chrome.windows.update(floatingWindowId, { focused: true });
      return;
    }

    // 定时判断：用户未活跃时才将窗口置前
    if (cachedForegroundToggle) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "checkUserActivity" }, (response) => {
            if (chrome.runtime.lastError) {
              // 内容脚本可能未注入（如 chrome:// 页面）
              return;
            }
            if (response && !response.isUserActive) {
              chrome.windows.update(floatingWindowId, { focused: true });
            }
          });
        }
      });
    }
  });
}

// 如果需要模拟 alwaysOnTop 行为
function startEnsureVisibilityInterval() {
  if (visibilityIntervalId) {
    clearInterval(visibilityIntervalId);
    visibilityIntervalId = null;
  }

  if (cachedForegroundToggle) {
    visibilityIntervalId = setInterval(() => ensureFloatingWindowVisible(false), 3000); // 每3秒检查一次
  }
}

// 监听来自浮动窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'resize' && sender.tab && sender.tab.windowId === floatingWindowId) {
        // 先获取当前窗口大小，只扩大不缩小，避免与用户手动拉伸冲突
        chrome.windows.get(floatingWindowId, (win) => {
            if (chrome.runtime.lastError || !win) return;

            const needResize = message.width > win.width || message.height > win.height;
            if (!needResize) return;

            chrome.system.display.getInfo((displays) => {
                if (chrome.runtime.lastError || !displays || !displays.length) return;
                const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
                const maxWidth = primaryDisplay.workArea.width * 0.8;
                const maxHeight = primaryDisplay.workArea.height * 0.8;
                chrome.windows.update(floatingWindowId, {
                    width: Math.min(Math.max(message.width, 200), maxWidth),
                    height: Math.min(Math.max(message.height, 100), maxHeight)
                });
            });
        });
    }
});


// 记录当前激活标签页的 url
let currentTabUrl = '';

function updateCurrentTabUrl(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (tab && tab.url && !tab.url.startsWith('chrome-extension://')) {
      currentTabUrl = tab.url;
    }
  });
}

// 监听标签页切换
chrome.tabs.onActivated.addListener(activeInfo => {
  updateCurrentTabUrl(activeInfo.tabId);
});

// 监听标签页更新（如跳转新页面）
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    updateCurrentTabUrl(tabId);
  }
});

// 监听窗口切换
chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({active: true, windowId}, (tabs) => {
    if (tabs[0]) updateCurrentTabUrl(tabs[0].id);
  });
});

// 处理弹窗请求 url
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_TAB_URL') {
    sendResponse({url: currentTabUrl});
  }
});
