'use strict';

let lastActivityTime = Date.now();

function updateLastActivityTime() {
  console.log('event triggered');
  lastActivityTime = Date.now();
}

// Listen for user input events
document.addEventListener('keydown', updateLastActivityTime);
document.addEventListener('mousedown', updateLastActivityTime);
document.addEventListener('mousemove', updateLastActivityTime);
document.addEventListener('wheel', updateLastActivityTime);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkUserActivity") {
    console.log(Date.now());
    console.log(lastActivityTime);
    const isUserActive = (Date.now() - lastActivityTime) < 5000; // Consider user active if there was activity in the last 5 seconds
    console.log(isUserActive);
    sendResponse({isUserActive: isUserActive});
  }
  return true; // Keep the message channel open for asynchronous response
});