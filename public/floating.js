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
            fetch(data.apiUrl, {
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
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        } else {
            console.error('API URL not set. Please configure in options.');
        }
    });
});
