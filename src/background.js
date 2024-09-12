'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

let floatingWindowId = null;

chrome.action.onClicked.addListener((tab) => {
  console.log("Action clicked");
  
  if (floatingWindowId !== null) {
    focusFloatingWindow();
  } else {
    createFloatingWindow();
  }
});

function createFloatingWindow() {
  chrome.system.display.getInfo((displays) => {
    const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
    chrome.windows.create({
      url: chrome.runtime.getURL("floating.html"),
      type: "popup",
      width: 350,
      height: 300,
      left: primaryDisplay.workArea.width - 350,
      top: 100
    }, (window) => {
      floatingWindowId = window.id;
      
      // 监听窗口关闭事件
      chrome.windows.onRemoved.addListener((windowId) => {
        if (windowId === floatingWindowId) {
          floatingWindowId = null;
        }
      });
    });
  });
}

function focusFloatingWindow() {
  chrome.windows.update(floatingWindowId, { focused: true }, (window) => {
    if (chrome.runtime.lastError) {
      floatingWindowId = null;
      createFloatingWindow();
    }
  });
}

// 监听标签页激活事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (floatingWindowId !== null) {
    focusFloatingWindow();
  }
});

// 监听窗口焦点变化事件
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE && floatingWindowId !== null) {
    focusFloatingWindow();
  }
});

// Listen for messages from the floating window
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
