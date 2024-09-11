'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages


chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    url: chrome.runtime.getURL("floating.html"),
    type: "popup",
    width: 350,
    height: 300,
    left: screen.width - 350,
    top: 100
  });
});
