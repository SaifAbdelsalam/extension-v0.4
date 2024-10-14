const notify = new Notify(document.querySelector('#notify'));
const lengthEl = document.getElementById('length');
const uppercaseEl = document.getElementById('uppercase');
const lowercaseEl = document.getElementById('lowercase');
const numbersEl = document.getElementById('numbers');
const symbolsEl = document.getElementById('symbols');
let finalUrls = [];
let finalData = [];

async function mainLoaded() {
  const token = await chrome.storage.local.get(['vaultToken']);
  if (token.vaultToken == null){
    window.location.href = chrome.runtime.getURL('start.html');
  }
  document.getElementById('generate').addEventListener('click', genPassword, false);
  uppercaseEl.addEventListener('input', genPassword, false);
  lowercaseEl.addEventListener('input', genPassword, false);
  numbersEl.addEventListener('input', genPassword, false);
  symbolsEl.addEventListener('input', genPassword, false); 
  document.getElementById('length').addEventListener('input', (event) => {
    const { value, min, max, step } = event.target;
    getPercentage(value, min, max, step);
  });
  document.getElementById('clipboard').addEventListener('click', (event) => {
    const text = document.getElementById("result").value;
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard!', { time: 1500 });
  });

  const result = await browser.storage.local.get("darkTheme");

  if (result.darkTheme) {
      document.body.classList.add('dark-theme');
  } else {
      document.body.classList.remove('dark-theme');
  }

  const openPopupBtn = document.getElementById('openPopup');
    const closePopupBtn = document.getElementById('closePopup');
    const popup = document.getElementById('popup');

    openPopupBtn.addEventListener('click', () => {
        popup.style.display = 'block';
    });

    closePopupBtn.addEventListener('click', () => {
        popup.style.display = 'none';
    });

  document.getElementById('addCredBtn').addEventListener('click', await addCred, false);
  document.getElementById('updateBtn').addEventListener('click', await updateCred, false);
  document.getElementById('deleteBtn').addEventListener('click', await deleteCredentials, false);
  document.getElementById('eyeIcon').addEventListener('click', changeIcon, false);
  document.getElementById('TheFolder').addEventListener('click', populateFolderDropdown);
  let isCreatingNewFolder = false;
  document.getElementById('TheFolder').addEventListener('change', function() {
    const selectedValue = this.value;
    const selectedFolderText = this.options[this.selectedIndex].text;
  
    if (selectedValue === 'create-new-folder') {
      isCreatingNewFolder = true;
      createFolderTextBox(true); 
    } else {
      isCreatingNewFolder = false;
      createFolderTextBox(false, selectedFolderText); 
    }
  });

  document.getElementById('copyPassword').addEventListener('click', (event) => {
    const text = document.getElementById("ThePassword").value;
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard!', { time: 1500 });
  });

  var container = document.querySelector('.container');
  container.style.display = "none";

  // checkForFields();
  await retrieveData();

  container.style.display = "block";
  var loader = document.getElementById("loader");
  loader.style.display = "none";  
}

async function retrieveData(){
  var currentUrlHost = await getUrlHostOfCurrentTab();
  var vaultToken = await getStoredVaultToken();
  var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const userID = await getUserID();
  var secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentUrlHost}`

  const names = await getSecretsList(`${vaultServerAddress}/v1/user_${userID}/metadata/`,vaultToken);
  if (!names){
    var pathInput = document.getElementById("ThePath");
    pathInput.value= currentUrlHost;
    return;
  }
  browser.storage.local.set({ vaultNames: names });

  await processSecrets(names, vaultServerAddress, userID, vaultToken);

  browser.storage.local.set({ vault: finalData });
  browser.storage.local.set({ vaultUrls: finalUrls });

  let response = false;
  try{
    if (finalUrls.length > 0){
      for (const data of finalUrls){

        if (data == currentUrlHost){
          response = true;
          var pathInput = document.getElementById("ThePath");
          pathInput.style.display = "none";
          var addCredBtn = document.getElementById("addCredBtn");
          addCredBtn.style.display = "none";
          var secretName = document.querySelector('.label');
          secretName.style.display = "block";
          var uptCredBtn = document.getElementById("updateBtn");
          uptCredBtn.style.display = "block";
          var dltCredBtn = document.getElementById("deleteBtn");
          dltCredBtn.style.display = "block";
          await getSecretsAtUrl(currentUrlHost,showSecrets);
        }
      }
    } 
  }catch{

  }
  if (response == false){
    var button = document.getElementById("deleteBtn");
    button.style.display = "none";
    var pathInput = document.getElementById("ThePath");
    pathInput.value= currentUrlHost;
    var updateBtn = document.getElementById("updateBtn");
    updateBtn.style.display = "none";
    var elementsToRemove = document.querySelectorAll('.setBtn');
    elementsToRemove.forEach(function(element) {
        element.remove();
    });
    var gridContainer = document.querySelectorAll('.input-group');
    gridContainer.forEach(function(element) {
      element.style.gridTemplateColumns = 'auto';
    }); 
    getUrlHostOfCurrentTab()
  }
}

async function populateFolderDropdown() {
  const folderDropdown = document.getElementById('TheFolder');
  
    const existingFolders = Array.from(folderDropdown.options).map(option => option.value.toLowerCase());
  
    const folders = new Set();
    let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames;
    namesArray = namesArray || [];
  
    if (namesArray.length > 0) {
      namesArray.forEach(nameObject => {
        const folderName = Object.keys(nameObject)[0];
        const path = folderName;
  
        if (path) {
          const folder = path.split('/')[0];
          folders.add(folder);
        }
      });
  
      let hasDefaultFolder = false;
  
      folders.forEach(folder => {
        const optionValue = folder.toLowerCase().replace(/\s+/g, '-');
  
        if (!existingFolders.includes(optionValue)) {
          const option = document.createElement('option');
          option.value = optionValue;
          option.textContent = folder;
          folderDropdown.appendChild(option);
        }
  
        if (optionValue === 'default-folder') {
          hasDefaultFolder = true;
        }
      });
  
      if (!hasDefaultFolder && !existingFolders.includes('default-folder')) {
        const defaultFolderOption = document.createElement('option');
        defaultFolderOption.value = 'default-folder';
        defaultFolderOption.textContent = 'default-folder';
        folderDropdown.appendChild(defaultFolderOption);
      }
    } else {
      if (!existingFolders.includes('default-folder')) {
        const defaultFolderOption = document.createElement('option');
        defaultFolderOption.value = 'default-folder';
        defaultFolderOption.textContent = 'default-folder';
        folderDropdown.appendChild(defaultFolderOption);
      }
    }
  
    if (!existingFolders.includes('create-new-folder')) {
      const newFolderOption = document.createElement('option');
      newFolderOption.value = 'create-new-folder';
      newFolderOption.textContent = 'Create a New Folder';
      folderDropdown.appendChild(newFolderOption);
    }
  }
  


/**
 * @param {boolean} isEditable - Whether the text box is editable or not.
 * @param {string} folderName - Folder name to assign if not editable.
 */
function createFolderTextBox(isEditable = false, folderName = '') {
  const folderContainer = document.getElementById('folderContainer');


  // Remove existing text box, if any
  const existingTextBox = folderContainer.querySelector('#SelectedFolderTextBoxContainer');
  if (existingTextBox) {
    existingTextBox.remove();
  }

  if (isEditable) {
    // Create a new input box for folder name if editable (i.e., 'Create a New Folder' selected)
    const textBoxContainer = document.createElement('div');
    textBoxContainer.classList.add('input-group2');
    textBoxContainer.id = 'SelectedFolderTextBoxContainer';

    const textBox = document.createElement('input');
    textBox.type = 'text';
    textBox.id = 'SelectedFolderTextBox';
    textBox.value = folderName;
    textBox.placeholder = 'New Folder Name'; 
    textBox.disabled = !isEditable; // Only editable when creating new folder

    textBoxContainer.appendChild(textBox);
    folderContainer.appendChild(textBoxContainer);
  } else {
    // Assign the selected folder value without showing the input box
    const hiddenTextBox = document.createElement('input');
    hiddenTextBox.type = 'hidden';  // Hidden input to store the folder name
    hiddenTextBox.id = 'SelectedFolderTextBox'; 
    hiddenTextBox.value = folderName;

    folderContainer.appendChild(hiddenTextBox);
  }
}



async function reloadPage(){

  location.href = location.href;
}



async function getSecretsList(secretsUrl, vaultToken) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); 

  try {
    const response = await fetch(secretsUrl, {
      method: 'LIST',
      headers: {
        'X-Vault-Token': vaultToken,
      },
      signal: controller.signal, 
    });

    clearTimeout(timeoutId); 

    if (!response.ok) {
      await browser.storage.local.set({ vaultNames: [] });
      return false;
    }

    const data = await response.json();
    const secrets = data.data.keys || [];

    const subfolderPromises = secrets.map(async (secretName) => {
      const subfolderUrl = `${secretsUrl}${secretName}`;
      if (secretName.endsWith('/')) {
        const subfolderSecrets = await getSecretsList(subfolderUrl, vaultToken);
        return { [secretName]: subfolderSecrets };
      } else {
        return secretName;
      }
    });

    const subfolderResults = await Promise.all(subfolderPromises);
    const flattenedResults = subfolderResults.flat();

    return flattenedResults;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Fetch request timed out');
      // Handle the timeout here, e.g., by returning an empty result or a specific error message
      window.location.href = chrome.runtime.getURL('start.html');
      throw new Error('Fetch request timed out');
    } else {
      console.error('Error fetching secrets:', error.message);
      throw error;
    }
  }
}

async function getSecretData(secretsUrl, vaultToken, name) {
  try {
    const response = await fetch(secretsUrl, {
      method: 'GET',
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching secret. HTTP status: ${response.status}`);
    }

    var secretData = await response.json();
    secretData.data.data["name"]=name;

    return secretData.data.data;
  } catch (error) {
    console.error('Error fetching secret:', error.message);
    throw error;
    return "";  
  }
}

async function processSecrets(secretsList, vaultServerAddress, userID, vaultToken, currentPath = '') {
  const promises = [];
  for (const secretItem of secretsList) {
    if (typeof secretItem === 'string') {
      const secretUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentPath}${secretItem}`;
      promises.push(getSecretData(secretUrl, vaultToken, secretItem));
    } else if (typeof secretItem === 'object') {
      const subfolderName = Object.keys(secretItem)[0];
      const subfolderPath = `${currentPath}${subfolderName}`;
      promises.push(processSecrets(secretItem[subfolderName], vaultServerAddress, userID, vaultToken, subfolderPath));
    }
  }
  try {
    const results = await Promise.all(promises);
    results.forEach((data) => {
      if (data != undefined) {
        finalUrls.push(data.url);
        finalData.push(data);
      }
    });
  } catch (error) {
    console.error('Error fetching secrets:', error.message);
    throw error; 
  }
}

async function getUserID() {
  const storageData = await browser.storage.sync.get('username');

  if ('username' in storageData) {
    return storageData.username;
  } else {
    console.error('Username not found in storage');
    return null;
  }
}

async function getUrlHostOfCurrentTab() {
  var tabs = await browser.tabs.query({ active: true, currentWindow: true });
  for (let tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
    var tab = tabs[tabIndex];
    if (tab.url) {
      return tab.url.match(/.+:\/\/(?<baseurl>[^\/]+).+$/).groups.baseurl
      break;
    }
  }
}

async function getStoredVaultToken() {
  var vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  if (!vaultToken || vaultToken.length === 0) {
    return notify.clear().info(
      `No Vault-Token information available.<br>
      Please use the <a href="/options.html" class="link">settings page</a> to login.`,
      { removeOption: false }
    );
  }
  return vaultToken;
}

function showSecrets(secrets) {
    for (i of secrets){
      if(i[0] == "username"){
        document.getElementById('TheUsername').value = i[1];
      }else if (i[0] == "password"){
        document.getElementById('ThePassword').value = i[1];
      } else if (i[0] === "name") {
        document.getElementById('SecretName').innerText = i[1]; 
      }
    }
}

async function getSecretsAtUrl(currentUrl, withSecrets) {
  for (data of finalData){
    if (data.url == currentUrl){
      withSecrets(Object.entries(data));
    }
  }
}

async function createSecretAtUrl(secretsUrl, vaultToken, secretData) {
  try {
    const response = await fetch(secretsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': vaultToken,
      },
      body: JSON.stringify(secretData),
    });
    if (!response.ok) {
      throw new Error(`Failed to create secret. Status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    notify.error('Error creating secret:', error);
    throw error;
  }
}

function getUsernameFields() {
  var result = Array.from(document.documentElement.querySelectorAll(
    'input[type="email"], ' +
    'input[type="text"][id*="username"], ' +
    'input[type="text"][name*="username"], ' +
    'input[type="text"][id*="email"], ' +
    'input[type="text"][name*="email"], ' +
    'input[type="text"][id*="login"], ' +
    'input[type="text"][name*="login"], ' +
    'input[type="text"][id*="user"], ' +
    'input[type="text"][name*="user"], ' +
    'input[type="text"][id*="userid"], ' +
    'input[type="text"][name*="userid"], ' +
    'input[type="text"][id*="usr"], ' +
    'input[type="text"][name*="usr"], ' +
    'input[type="text"][id*="uname"], ' +
    'input[type="text"][name*="uname"], ' +
    'input[type="text"][id*="loginid"], ' +
    'input[type="text"][name*="loginid"] '
  ));
  if(result.length > 0){
    result = [result[0].value, result[0].attributes[2].nodeValue];
    return result;
  }
}

function getPasswordFields() {
  var result = Array.from(document.documentElement.querySelectorAll(
    'input[type="password"], ' +
    'input[type="password"][id*="password"], ' +
    'input[type="password"][name*="password"], ' +
    'input[type="password"][id*="pass"], ' +
    'input[type="password"][name*="pass"], ' +
    'input[type="password"][id*="pwd"], ' +
    'input[type="password"][name*="pwd"], ' +
    'input[type="password"][id*="secret"], ' +
    'input[type="password"][name*="secret"], ' +
    'input[type="password"][id*="passwd"], ' +
    'input[type="password"][name*="passwd"]'
  ));
  if(result.length > 0){
    result = [result[0].value, result[0].attributes[2].nodeValue];
    return result;
  }
}

async function checkForFields() {
  if (chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var currentTab = tabs[0];
      chrome.scripting.executeScript({
        target : {tabId : currentTab.id, allFrames : true},
        func : getUsernameFields,
      }, async (result) => {
        try{
        result = result[0].result;
        if (result && result.length > 0) {
          await browser.storage.local.set({ 'inputUserID': `${result[1]}` });
          if (result[0].length > 0){
            document.getElementById('TheUsername').value = result[0];
          }
        }
      }catch(err){
        
      }
      });
      chrome.scripting.executeScript({
        target : {tabId : currentTab.id, allFrames : true},
        func : getPasswordFields,
      }, async (result) => {
        try{
        result = result[0].result;
        if (result && result.length > 0) {
          await browser.storage.local.set({ 'inputPassID': `${result[1]}` });
          if (result[0].length > 0){
            document.getElementById('ThePassword').value = result[0];
          }
        }
      }catch(err){
        
      }
      });
    }); 
  } else {
    console.error("chrome.tabs API not supported");
  }
}



async function addCred() {
  notify.clear();
  
  // Get values from input fields
  let secretName = document.getElementById('ThePath').value;
  let iusername = document.getElementById('TheUsername').value;
  let ipassword = document.getElementById('ThePassword').value;
  const currentUrlHost = await getUrlHostOfCurrentTab();
  const path = secretName;
  const creationDate = new Date().toISOString().split('T')[0]; // Set creation date

  // Get folder from SelectedFolderTextBox
  let folderTextBox = document.getElementById("SelectedFolderTextBox");
  let folder = folderTextBox?.value.trim() || "default-folder"; // Default to 'default-folder' if no value

  // Retrieve necessary values from browser storage
  const userID = (await browser.storage.sync.get('username')).username;
  const vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;

  // Construct the Vault API URL
  const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${folder}/${path}`;

  // Prepare secret data to be sent
  const secretData = {
    data: {
      username: iusername,
      password: ipassword,
      url: currentUrlHost,
      creationDate: creationDate,
    }
  };

  try {
    // Send POST request to create secret
    const response = await fetch(secretsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': vaultToken,
      },
      body: JSON.stringify(secretData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create secret. Status: ${response.status}`);
    }

    // Refresh the page after successful creation
    await reloadPage();

  } catch (error) {
    notify.error('Error creating secret:', error);
    throw error;
  }
}


async function updateCred() {
  const currentUrlHost = await getUrlHostOfCurrentTab();
  let credentials = (await browser.storage.local.get("vault")).vault;
  let name = "";

  // Find the secret by matching the current URL with credentials
  for (const data of credentials) {
    if (data.url === currentUrlHost) {
      name = data["name"];
      break;
    }
  }

  const selectedFolderTextBox = document.getElementById('SelectedFolderTextBox');
  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];
  let folder = '';

  if (finalData) {
    const folderPath = findPath(name, namesArray);
    if (folderPath) {
      folder = folderPath.split('/')[0];
    }
  }

  const matchedData = finalData.find(data => data.name === name);
  const vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const userID = (await browser.storage.sync.get('username')).username;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;

  // Retrieve user input from the form
  const username = document.getElementById('TheUsername').value;
  const password = document.getElementById('ThePassword').value;

  // Handle new folder name from selectedFolderTextBox
  if (selectedFolderTextBox && selectedFolderTextBox.value.trim() !== '') {
    const newFolder = selectedFolderTextBox.value.trim();
    const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${newFolder}/${name}`;

    const secretData = {
      data: {
        username: matchedData ? matchedData.username : username,
        password: matchedData ? matchedData.password : password,
        url: currentUrlHost, // Use the current URL as the new secret URL
      }
    };

    try {
      const response = await fetch(secretsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Token': vaultToken,
        },
        body: JSON.stringify(secretData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create secret. Status: ${response.status}`);
      }

      // Delete the old credential
      await deleteCred(name);
    }
    finally {
      // Update the UI before reloading the page
      setTimeout(async () => {
        await reloadPage();
      }, 500); // Optional delay of 500ms to allow UI to update
    }
    return;
  }

  // Update existing secret data
  if (matchedData) {
    matchedData.url = currentUrlHost || '';
    matchedData.username = username || '';
    matchedData.password = password || '';

    // Store updated data locally
    await browser.storage.local.set({ vault: finalData });

    const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${folder}/${name}`;
    const secretData = {
      data: {
        username: matchedData.username,
        password: matchedData.password,
        url: currentUrlHost,
      }
    };

    try {
      const response = await fetch(secretsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Token': vaultToken,
        },
        body: JSON.stringify(secretData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update secret. Status: ${response.status}`);
      }
    } catch (error) {
      notify.error(`Error updating secret: ${error.message}`);
    } finally {
      // Update the UI before reloading the page
      setTimeout(async () => {
        await reloadPage();
      }, 500); // Optional delay of 500ms to allow UI to update
    }
  } else {
    notify.error('Secret not found.');
    await reloadPage();
  }
}







async function deleteCred(name) {
  const userID = (await browser.storage.sync.get('username')).username;
  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames;
  const path = findPath(name, namesArray);
  var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${path}`;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  try {
    fetch(`${vaultServerAddress}/v1/user_${userID}/metadata/${path}`, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });
    fetch(secretsUrl, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });
    await reloadPage();
  } catch (error) {
    await reloadPage();
  }
}







async function deleteCredentials() {
  var currentUrlHost = await getUrlHostOfCurrentTab();
  let credentials = (await browser.storage.local.get("vault")).vault;
  let name = "";
  for (data of credentials){
    if (data.url == currentUrlHost){
      name = data["name"];
    }
  }
  const userID = (await browser.storage.sync.get('username')).username;
  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames;
  const path = findPath(name, namesArray);
  var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${path}`;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  try {
    await fetch(`${vaultServerAddress}/v1/user_${userID}/metadata/${path}`, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });
    await fetch(secretsUrl, {
      method: 'DELETE',
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });
    await reloadPage();
  } catch (error) {
    notify.error('Failed to delete secret:', error);
  }
}

async function setUserField() {
  const userResult = await browser.storage.local.get('inputUserID');
  const inputUserID = userResult.inputUserID;
  const inputUser = document.getElementById('TheUsername').value;
  if (chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var currentTab = tabs[0];
      if (inputUserID.length > 0){
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id},
          function: function(inputUserID, inputUser){
            try{
              document.getElementById(inputUserID).value = inputUser;
            }catch{
              document.getElementById("identifierId").value = inputUser;
              document.getElementById("identifierId").focus();
            }
          },
          args: [inputUserID, inputUser]
        });
      }
    });
  }
}

async function setPassField() {
  const passResult = await browser.storage.local.get('inputPassID');
  const inputPassID = passResult.inputPassID;
  const inputPass = document.getElementById('ThePassword').value;
  if (chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      var currentTab = tabs[0];
      if (inputPassID.length > 0){
        chrome.scripting.executeScript({
          target: { tabId: currentTab.id},
          function: function(inputPassID, inputPass){
            try{
            document.getElementById(inputPassID).value = inputPass;
            }catch{
              document.querySelector("#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input").value = inputPass;
            }
          },
          args: [inputPassID, inputPass]
        });
      }
    });
  }
}

function findPath(target, data, currentPath = '') {
  for (let i = 0; i < data.length; i++) {
    const currentKey = data[i];
    if (typeof currentKey === 'string') {
      const newPath = currentPath ? `${currentPath}${currentKey}` : currentKey;
      if (currentKey === target) {
        return newPath;
      }
    } else if (typeof currentKey === 'object') {
      const newPath = currentPath ? `${currentPath}${Object.keys(currentKey)[0]}` : Object.keys(currentKey)[0];
      const result = findPath(target, Object.values(currentKey)[0], newPath);
      if (result) {
        return result;
      }
    }
  }
  return null; 
}

function changeIcon() {
  const icon = document.getElementById('eyeIcon');
  const passwordField = document.getElementById('ThePassword');

  if (icon.classList.contains('fa-eye-slash')) {
    icon.classList.remove('fa-eye-slash', 'hide');
    icon.classList.add('fa-eye', 'show');
    passwordField.type = "password";
  } else {
    icon.classList.remove('fa-eye', 'show');
    icon.classList.add('fa-eye-slash', 'hide');
    passwordField.type = "text";
  }
}

function copyUserField() {
  const text = document.getElementById("TheUsername").value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard!');
  } else {
    document.createElement("textarea").value = text;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function copyPassField() {
  const text = document.getElementById("ThePassword").value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard!');
  } else {
    document.createElement("textarea").value = text;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.commandId("copy");
    document.body.removeChild(textarea);
  }
}

function genPassword(){
  const length = lengthEl.value;
  const hasLower = lowercaseEl.checked;
  const hasUpper = uppercaseEl.checked;
  const hasNumber = numbersEl.checked;
  const hasSymbol = symbolsEl.checked;

  const generatedPassword = getPassword(length,hasLower,hasUpper,hasNumber,hasSymbol);
  document.getElementById('result').value = generatedPassword;
}

function getPassword(length, useLowercase, useUppercase, useNumbers, useSpecialChars) {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*-=';

  let allChars = '';
  let password = '';

  if (useLowercase) {
    allChars += lowercaseChars;
    password += getRandomChar(lowercaseChars);
  }

  if (useUppercase) {
    allChars += uppercaseChars;
    password += getRandomChar(uppercaseChars);
  }

  if (useNumbers) {
    allChars += numberChars;
    password += getRandomChar(numberChars);
  }

  if (useSpecialChars) {
    allChars += specialChars;
    password += getRandomChar(specialChars);
  }

  if (allChars.length === 0) {
    console.error('At least one character type must be selected.');
    return null;
  }

  for (let i = password.length; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * allChars.length);
    password += allChars.charAt(randomIndex);
  }

  password = password.split('').sort(() => Math.random() - 0.5).join('');

  return password;
}

function getRandomChar(characters) {
  const randomIndex = Math.floor(Math.random() * characters.length);
  return characters.charAt(randomIndex);
}

function getPercentage(value, min, max, step) {
  const hasUpper = uppercaseEl.checked;
  const hasLower = lowercaseEl.checked;
  const hasNumber = numbersEl.checked;
  const hasSymbol = symbolsEl.checked;

  const output = document.querySelector("output");
  const parent = document.getElementById("length").parentElement;
  const decimals = step && step.includes(".") ? step.split(".")[1] : 1;
  const percent = `${(((value - min) / (max - min)) * 100).toFixed(decimals)}%`;
  parent.style.setProperty("--p", percent);

  output.value = `${value}`;
  const generatedPassword = getPassword(value,hasLower,hasUpper,hasNumber,hasSymbol);
  document.getElementById('result').value = generatedPassword;
}

document.addEventListener('DOMContentLoaded', mainLoaded, false);