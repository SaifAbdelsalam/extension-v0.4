const notify = new Notify(document.querySelector('#notify'));

document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const updatePassButton = document.getElementById('updatePass');
    const popup = document.getElementById('popup');
    const popupClose = document.getElementById('popupClose');
    const confirmChangeButton = document.getElementById('confirmChange');
    const cancelChangeButton = document.getElementById('cancelChange');

    // Open popup
    updatePassButton.addEventListener('click', function () {
        // Show popup
        popup.style.display = 'flex';
        // Remove any previous popup functions
        removePreviousPopupFunctions();
    });

    // Close popup
    popupClose.addEventListener('click', function () {
        popup.style.display = 'none';
    });

    cancelChangeButton.addEventListener('click', function () {
        popup.style.display = 'none';
    });

    confirmChangeButton.addEventListener('click', async function (event) {
        event.preventDefault(); // Prevent any default action, like form submission
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (newPassword !== confirmPassword) {
            notify.error('Passwords do not match.', { time: 1500 });
            return;
        }

        await updatePassword(newPassword);
        popup.style.display = 'none';
    });

    function removePreviousPopupFunctions() {
        // If you had any previous popup functionality, you would remove it here
        // e.g., remove event listeners or reset states
    }
    
});

async function updateTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fa fa-sun"></i>';
    } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fa fa-moon"></i>';
    }

    // Update header color
    const header = document.querySelector('.header2');
    if (header) {
        header.classList.toggle('dark-theme', isDark);
        header.classList.toggle('light-theme', !isDark);
    }

    // Update link items color
    const linkItems = document.querySelectorAll('.link-item');
    linkItems.forEach(item => {
        item.classList.toggle('dark-theme', isDark);
        item.classList.toggle('light-theme', !isDark);
    });
}

async function mainLoaded() {
    const result = await browser.storage.local.get("darkTheme");
    console.log(result);

    // Initial theme setup
    if (result.darkTheme !== undefined) {
        updateTheme(result.darkTheme)
    } else {
        await browser.storage.local.set({ 'darkTheme': false });
        updateTheme(false);
    }

    // Theme toggle button click handler
    document.getElementById('themeToggle').addEventListener('click', async () => {
        const result = await browser.storage.local.get("darkTheme");
        const newTheme = !result.darkTheme;

        await browser.storage.local.set({ 'darkTheme': newTheme });
        updateTheme(newTheme);
    });

    // Other initialization code
    document.getElementById('logoutButton').addEventListener('click', logout, false);
    document.getElementById('eyeIcon').addEventListener('click', (event) => {
        const icon = document.getElementById('eyeIcon');
        const passwordField = document.getElementById('password');

        if (icon.classList.contains('fa-eye-slash')) {
            icon.classList.remove('fa-eye-slash', 'hide');
            icon.classList.add('fa-eye', 'show');
            passwordField.type = "password";
        } else {
            icon.classList.remove('fa-eye', 'show');
            icon.classList.add('fa-eye-slash', 'hide');
            passwordField.type = "text";
        }
    });

    const username = (await browser.storage.local.get("vaultUsername")).vaultUsername;
    const password = (await browser.storage.local.get("vaultPassword")).vaultPassword;
    const vaultAddress = (await browser.storage.sync.get("vaultAddress")).vaultAddress.replace(/^https?:\/\//, "");

    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    document.getElementById('vAddress').textContent = vaultAddress;
}

document.addEventListener('DOMContentLoaded', mainLoaded, false);

async function logout() {
    const key = (await browser.storage.local.get('vaultKey')).vaultKey;
    await browser.storage.local.clear();
    await browser.storage.local.set({ 'vaultKey' : key });
    window.location.href = chrome.runtime.getURL('start.html');
}

async function updatePassword(NEW_PASSWORD) {
    const VAULT_ADDR = (await browser.storage.sync.get("vaultAddress")).vaultAddress;
    const VAULT_TOKEN = (await browser.storage.local.get("vaultToken")).vaultToken;
    const USERNAME = (await browser.storage.sync.get("username")).username;
    const url = `${VAULT_ADDR}/v1/auth/userpass/users/${USERNAME}/password`;
    const requestOptions = {
        method: 'POST',
        headers: {
            'X-Vault-Token': VAULT_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: USERNAME, password: NEW_PASSWORD })
    };

    try {
        const response = await fetch(url, requestOptions);
        if (response.ok) {
            await browser.storage.local.set({ vaultPassword: NEW_PASSWORD });
            notify.success('Updated Password', { time: 1500 });
        } else {
            notify.error('Failed to update password.', { time: 1500 });
        }
    } catch (error) {
        notify.error('Error updating password.', { time: 1500 });
    }
}
