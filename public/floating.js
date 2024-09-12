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
