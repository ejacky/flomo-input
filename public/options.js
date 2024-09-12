document.getElementById('save').addEventListener('click', () => {
    const apiUrl = document.getElementById('api-url').value;
    chrome.storage.sync.set({ apiUrl: apiUrl }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 750);
    });
});

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get('apiUrl', (data) => {
        document.getElementById('api-url').value = data.apiUrl || '';
    });
});
