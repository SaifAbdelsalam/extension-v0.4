const notify = new Notify(document.querySelector('#notify'));

async function mainLoaded() {
  let storedUsername = (await browser.storage.local.get('vaultUsername')).vaultUsername;
  let storedPassword = (await browser.storage.local.get('vaultPassword')).vaultPassword;
  let storedKey = (await browser.storage.local.get('tempVaultKey')).tempVaultKey;

  document.getElementById('loginBox').value = storedUsername || "";
  document.getElementById('passBox').value = storedPassword || "";
  document.getElementById('keyBox').value = storedKey || "";

  let key = (await browser.storage.local.get('vaultKey')).vaultKey

  if (key !== null && key !== "" && key !== undefined){
    document.getElementById('keyBox').style.display = 'none';
    document.querySelector('.reset-button').style.display = 'block';
    document.querySelector('.login-button').style.marginLeft = '35%';
  }
  document.querySelector('.login-button').addEventListener('click', authButtonClick, false);
  document.querySelector('.reset-button').addEventListener('click', showNotification, false);
  document.getElementById('cancel-reset').addEventListener('click', hideNotification, false);
  document.getElementById('proceed-reset').addEventListener('click', async () => {
    await browser.storage.local.remove('vaultKey');
    location.href = location.href;
  });
  document.getElementById('loginBox').addEventListener('input', async () => {
    var username = (document.getElementById('loginBox')).value;
    await browser.storage.local.set({ vaultUsername: username });
  });
  document.getElementById('passBox').addEventListener('input', async () => {
    var password = (document.getElementById('passBox')).value;
    await browser.storage.local.set({ vaultPassword: password });
  });
  document.getElementById('keyBox').addEventListener('input', async () => {
    var key = (document.getElementById('keyBox')).value;
    await browser.storage.local.set({ 'tempVaultKey': key });
  });

}

async function authButtonClick() {
  notify.clear();
  var key = (await browser.storage.local.get('vaultKey')).vaultKey;
  if (key == null || key == "") {
    key = document.getElementById('keyBox').value;
  }
  var vaultServer = decrypt(key);
  var authMount = "userpass";
  var login = document.getElementById('loginBox');
  var pass = document.getElementById('passBox');

  if ((login.value.length > 0) && (pass.value.length > 0)) {
    try {
      let response = await fetch(vaultServer, { method: 'HEAD' });
      if (response.ok) {
        await browser.storage.local.set({ 'vaultKey': key });
        await browser.storage.sync.set({ 'vaultAddress': vaultServer });
        await browser.storage.sync.set({ 'username': login.value });
        await browser.storage.sync.set({ 'vaultAuthMount': authMount });
        authToVault(vaultServer, login.value, pass.value, authMount);
      } else {
        notify.error('Vault key is invalid. Please check the key.');
      }
    } catch (error) {
      notify.error('Vault key is invalid. Please check the key.');
    }
  } else {
    notify.error('Username and Password must be entered.');
  }
}

async function authToVault(vaultServer, username, password, authMount) {

    const authinfo = {
      client_token: 'STUB_TOKEN',
      policies: ['default', 'vault-pass'],
    }
  
    var loginUrl = `${vaultServer}/v1/auth/${authMount}/login/${username}`
  
    fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password }),
    })
      .then(response => {
      return response.json()
    }).then( async json => {
        const authinfo = json.auth;
        browser.storage.local.set({ 'vaultToken': authinfo.client_token });
        browser.storage.local.set({ 'vaultTokenPolicies': authinfo.policies });
        await browser.storage.local.set({ vaultToken: authinfo.client_token });
        await browser.storage.local.set({ vaultTokenPolicies: authinfo.policies });
        await browser.storage.local.set({ vaultUsername: username });
        await browser.storage.local.set({ vaultPassword: password });
        window.location.href = chrome.runtime.getURL('home.html');
    })
    .catch(error => {
      notify.error(`
        Please check if your username and password are correct.
      `);
    })
}

function decrypt(encryptedHex) {
  function a(b) {
    let c = '';
    for (let d = 0; d < b.length; d += 2) {
      c += String.fromCharCode(parseInt(b.substr(d, 2), 16));
    }
    return c;
  }

  let e = '4f70',
      f = '457870657274';
  let key = a(e) + a(f);

  let g = '';
  for (let h = 0; h < encryptedHex.length; h += 2) {
    g += String.fromCharCode(parseInt(encryptedHex.substr(h, 2), 16));
  }

  let i = [];
  for (let j = 0; j < g.length; j++) {
    let k = key.charCodeAt(j % key.length),
        l = g.charCodeAt(j),
        m = String.fromCharCode(l ^ k);
    i.push(m);
  }

  let n = i.join('');
  return n;
}

function showNotification() {
  const notificationContainer = document.getElementById('notificationContainer');
  notificationContainer.style.display = 'flex';
}

function hideNotification() {
  const notificationContainer = document.getElementById('notificationContainer');
  notificationContainer.style.display = 'none';
}

  document.addEventListener('DOMContentLoaded', mainLoaded, false);