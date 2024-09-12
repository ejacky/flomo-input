'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

let floatingWindowId = null;
let isWindowClosedByUser = false;
let visibilityIntervalId = null;

chrome.action.onClicked.addListener((tab) => {
  console.log("Action clicked");
  
  if (floatingWindowId !== null) {
    ensureFloatingWindowVisible(); // 这里原来是 focusFloatingWindow()
  } else {
    createFloatingWindow();
  }
});

function createFloatingWindow() {
  // 如果已经存在窗口，先关闭它
  if (floatingWindowId !== null) {
    chrome.windows.remove(floatingWindowId, () => {
      if (chrome.runtime.lastError) {
        console.log("Error closing existing window:", chrome.runtime.lastError.message);
      }
      floatingWindowId = null;
      // 在关闭回调中创建新窗口
      actuallyCreateFloatingWindow();
    });
  } else {
    // 如果不存在窗口，直接创建
    actuallyCreateFloatingWindow();
  }
}

function actuallyCreateFloatingWindow() {
  chrome.system.display.getInfo((displays) => {
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
      floatingWindowId = window.id;
      
      // 尝试设置 alwaysOnTop
      try {
        chrome.windows.update(floatingWindowId, { alwaysOnTop: true }, () => {
          if (chrome.runtime.lastError) {
            console.log("无法设置 alwaysOnTop：", chrome.runtime.lastError.message);
            startEnsureVisibilityInterval();
          }
        });
      } catch (error) {
        console.error("不支持 alwaysOnTop：", error.message);
        console.log("使用备选方案确保窗口可见性");
        startEnsureVisibilityInterval();
      }

      // 监听窗口关闭事件
      chrome.windows.onRemoved.addListener(function windowRemovedListener(windowId) {
        if (windowId === floatingWindowId) {
          floatingWindowId = null;
          if (visibilityIntervalId) {
            clearInterval(visibilityIntervalId);
            visibilityIntervalId = null;
          }
          chrome.windows.onRemoved.removeListener(windowRemovedListener);
        }
      });
    });
  });
}

function ensureFloatingWindowVisible() {
  if (floatingWindowId !== null) {
    chrome.windows.get(floatingWindowId, (window) => {
      console.log("Window focused:", window.focused);
      if (chrome.runtime.lastError) {
        console.log("Window not found, creating a new one");
        floatingWindowId = null;
        createFloatingWindow();
      } else if (!window.focused) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "checkUserActivity"}, function(response) {
              if (response && !response.isUserActive) {
                chrome.windows.update(floatingWindowId, { focused: true });
              }
            });
          }
        });
      }
    });
  } else {
    createFloatingWindow();
  }
}

// 如果需要模拟 alwaysOnTop 行为
function startEnsureVisibilityInterval() {
  if (visibilityIntervalId) {
    clearInterval(visibilityIntervalId);
  }
  visibilityIntervalId = setInterval(ensureFloatingWindowVisible, 3000); // 每3秒检查一次
}

// 监听来自浮动窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'resize' && sender.tab && sender.tab.windowId === floatingWindowId) {
        chrome.system.display.getInfo((displays) => {
            const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
            const maxWidth = primaryDisplay.workArea.width * 0.8;
            const maxHeight = primaryDisplay.workArea.height * 0.8;
            chrome.windows.update(floatingWindowId, {
                width: Math.min(Math.max(message.width, 200), maxWidth),  // Set minimum and maximum width
                height: Math.min(Math.max(message.height, 100), maxHeight) // Set minimum and maximum height
            });
        });
    }
});
