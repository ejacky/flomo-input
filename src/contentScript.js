'use strict';

let lastActivityTime = Date.now();

function updateLastActivityTime() {
  lastActivityTime = Date.now();
}

// Throttle helper: limit execution to once per `limit` ms
function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

// Listen for user input events
// keydown/mousedown: immediate response
// mousemove/wheel: throttled to 500ms to reduce CPU usage
document.addEventListener('keydown', updateLastActivityTime);
document.addEventListener('mousedown', updateLastActivityTime);
document.addEventListener('mousemove', throttle(updateLastActivityTime, 500));
document.addEventListener('wheel', throttle(updateLastActivityTime, 500));

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkUserActivity") {
    const isUserActive = (Date.now() - lastActivityTime) < 5000; // Consider user active if there was activity in the last 5 seconds
    sendResponse({isUserActive: isUserActive});
  }
  return true; // Keep the message channel open for asynchronous response
});
