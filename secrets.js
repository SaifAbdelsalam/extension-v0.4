
const notify = new Notify(document.querySelector('#notify'));
let finalUrls = [];
let finalData = [];
let currentName = "";
let isCreatingNewFolder = false;
let shouldPopulateSecrets = true;
let currentSelectedFolder = ''; 
let moveToClicked = false;
let currentSelectedMoveFolder="";



async function mainLoaded() {

  finalData = (await browser.storage.local.get('vault')).vault;
  generateFolders();
  updateCurrentFolderDisplay(currentSelectedFolder);

  const result = await browser.storage.local.get("darkTheme");
  if (result.darkTheme) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  try {
    let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames;

    namesArray = namesArray || [];

    if (namesArray.length === 0) {
      notify.info("No vault names found.", { time: 1500 });
    } else {
      notify.success("Vault names retrieved successfully.", { time: 1500 });
    }
  } catch (error) {
    notify.error("Error retrieving vault names: " + error, { time: 2000 });
  }

  document.getElementById('addCredBtn').addEventListener('click', await addCred, false);

  document.getElementById('searchInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      performSearch();
    }
  });

  document.getElementById('searchButton').addEventListener("click", () => { performSearch(); });

  moveToClicked = sessionStorage.getItem('moveToClicked') === 'true';
  document.getElementById('move-secret-btn').addEventListener('click', function () {

    document.getElementById('itemContainerMove').classList.add('active');

    moveToClicked = true;
    sessionStorage.setItem('moveToClicked', true);
    const url = document.getElementById('item-url').value;
    const username = document.getElementById('item-username').value;
    const password = document.getElementById('item-password').value;
    const notes = document.getElementById('item-notes').value;

    sessionStorage.setItem('moveSecretUrl', url);
    sessionStorage.setItem('moveSecretUsername', username);
    sessionStorage.setItem('moveSecretPassword', password);
    sessionStorage.setItem('moveSecretNotes', notes);
    sessionStorage.setItem('currentName', currentName);

    generateMoveFolders();

  });

  document.getElementById('closeMoveContainer').addEventListener('click', function () {
    moveToClicked = false;
    sessionStorage.setItem('moveToClicked', false);
    document.getElementById('itemContainerMove').classList.remove('active');
    currentSelectedMoveFolder = "";
  });

  document.getElementById('doneButton').addEventListener('click', function () {
    moveSecret();
    moveToClicked = false;
    sessionStorage.setItem('moveToClicked', false);
    notify.success('Secret moved successfully!', { time: 1500 });
  });

  document.getElementById('addFolderButton').addEventListener('click', function () {
    document.getElementById('addFolderModal').style.display = 'flex';
  });

  document.querySelector('.close-modal').addEventListener('click', function () {
    document.getElementById('addFolderModal').style.display = 'none';
  });

  document.getElementById('addNewFolderButton').addEventListener('click', function () {
    var folderName = document.getElementById('newFolderName').value;

    if (folderName) {
      moveSecret(folderName);
      document.getElementById('addFolderModal').style.display = 'none';
      document.getElementById('newFolderName').value = '';
      moveToClicked = false;
      sessionStorage.setItem('moveToClicked', false);
      notify.success('Folder added and secret moved successfully!', { time: 1500 });
    } else {
      notify.error('Please enter a folder name.', { time: 1500 });
    }
  });

  document.getElementById('back-button').addEventListener('click', () => {
    const itemContainer = document.getElementById('item-container');
    itemContainer.style.display = 'none';
    document.querySelector('.secrets-list').style.display = 'block';
  });

  document.getElementById('folderButton').addEventListener('click', function () {
    const textBoxContainer = document.getElementById('SelectedFolderTextBoxContainer');
    if (textBoxContainer) {
      textBoxContainer.style.display = 'block';
    }
  });

  const addCredentialsContainer = document.querySelector('.add-credentials');
  if (!addCredentialsContainer) throw new Error("Add credentials container not found");

  document.getElementById('newCred').addEventListener('click', function () {
    if (addCredentialsContainer.style.display === 'none') {
      addCredentialsContainer.style.display = 'grid';
      document.getElementById('secrets').style.height = '170px';
    } else {
      addCredentialsContainer.style.display = 'none';
      document.getElementById('secrets').style.height = 'auto';
    }
  });

  document.querySelector('.update-button').addEventListener("click", updateCredentials, false);
  document.querySelector('.delete-button').addEventListener("click", deleteCredentials, false);

  document.getElementById('eyeIcon').addEventListener("click", () => {
    const icon = document.getElementById('eyeIcon');
    const passwordField = document.getElementById('item-password');

    if (icon.classList.contains('fa-eye-slash')) {
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
      passwordField.type = "password";
    } else {
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
      passwordField.type = "text";
    }
  });

  document.getElementById('cPass').addEventListener('click', (event) => {
    const text = document.getElementById("item-password").value;
    navigator.clipboard.writeText(text);
    notify.success('Password copied to clipboard!', { time: 1500 });
  });

  document.getElementById('cUser').addEventListener('click', (event) => {
    const text = document.getElementById("item-username").value;
    navigator.clipboard.writeText(text);
    notify.success('Username copied to clipboard!', { time: 1500 });
  });
}

async function generateMoveFolders() {
  updateCurrentMoveFolderDisplay(currentSelectedMoveFolder);
  const secretsMoveContainer = document.getElementById('secretsmove');
  secretsMoveContainer.innerHTML = ''; 
  const folders = new Set();
  
  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];
  folders.add('default-folder');

  if (finalData) {
      namesArray.forEach(nameObject => {
          const folderName = Object.keys(nameObject)[0];
          if (folderName) {
              const folder = folderName.split('/')[0];
              folders.add(folder);
          }
      });

      folders.forEach(folder => {
          const folderId = folder.toLowerCase().replace(/\s+/g, '-');
          const folderItem = document.createElement('div');
          folderItem.classList.add('item', 'folder');
          folderItem.id = folderId;
          folderItem.innerHTML = `<i class="fa fa-folder"></i><span>${folder}</span>`;
          secretsMoveContainer.appendChild(folderItem);

          folderItem.addEventListener('click', () => {
              currentSelectedMoveFolder = folder; 
              generateMoveSubfolders(folder);
              updateCurrentMoveFolderDisplay(currentSelectedMoveFolder);
          });
      });

      notify.success("Folders loaded successfully.", { time: 1500 });
  } else {
      notify.info("No data found to generate folders.", { time: 1500 });
  }
}


async function generateMoveSubfolders(folderName) {
const secretsMoveContainer = document.getElementById('secretsmove');
secretsMoveContainer.innerHTML = ''; 
const namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];

const lastFolderName = folderName.substring(folderName.lastIndexOf('/') + 1);

// Recursive function to search through the folder structure
function findFolder(entries, folderToFind) {
    for (const entry of entries) {
        const folderPath = Object.keys(entry)[0];
        const contents = entry[folderPath];

        // Check if the current folder path matches the last folder name
        if (folderPath.replace(/\/+$/, '') === folderToFind) {
            return contents; // Return the entries if found
        }

        // If the contents are an array, recursively search them
        if (Array.isArray(contents)) {
            const foundEntries = findFolder(contents, folderToFind);
            if (foundEntries) {
                return foundEntries; // Return the found entries
            }
        }
    }
    return null; 
}

if (finalData) {
    const entries = findFolder(namesArray, lastFolderName);
    if (Array.isArray(entries)) {
        extractMoveFolder(entries, folderName); 
        updateCurrentMoveFolderDisplay(currentSelectedMoveFolder);

    }
}
}

async function extractMoveFolder(data, currentPath) {  
  const secretsContainer = document.getElementById('secretsmove');
  secretsContainer.innerHTML = ''; 
    for (const secretItem of data) {
        if (typeof secretItem === 'object') {
            const subfolderName = Object.keys(secretItem)[0];
            const subfolderPath = `${currentPath}/${subfolderName}/`.replace(/\/+$/, ''); 
            console.log('HERE IS FULLPATH',subfolderPath);


            const subfolderId = subfolderPath.toLowerCase().replace(/\s+/g, '-');
            const subfolderItem = document.createElement('div');
            subfolderItem.classList.add('item', 'subfolder');
            subfolderItem.id = subfolderId;
            subfolderItem.innerHTML = `<i class="fa fa-folder"></i><span>${subfolderName}</span>`;
            secretsContainer.appendChild(subfolderItem);


            subfolderItem.addEventListener('click', async (event) => {
                event.stopPropagation(); 
                currentSelectedMoveFolder = subfolderPath; 
                await extractImmediateMoveSubfolders(secretItem[subfolderName], subfolderPath);
                updateCurrentMoveFolderDisplay(currentSelectedMoveFolder);
            });
        }
    }


}

async function extractImmediateMoveSubfolders(data, currentPath) {
  const secretsContainer = document.getElementById('secretsmove');
  secretsContainer.innerHTML = ''; 
  for (const secretItem of data) {
    if (typeof secretItem === 'object') {
        const subfolderName = Object.keys(secretItem)[0];
        const subfolderPath = `${currentPath}/${subfolderName}/`.replace(/\/+$/, ''); // Create the full path

        // Create a UI element for the folder
        const subfolderId = subfolderPath.toLowerCase().replace(/\s+/g, '-');
        const subfolderItem = document.createElement('div');
        subfolderItem.classList.add('item', 'subfolder');
        subfolderItem.id = subfolderId;
        subfolderItem.innerHTML = `<i class="fa fa-folder"></i><span>${subfolderName}</span>`;
        secretsContainer.appendChild(subfolderItem);

        // Add click event to navigate to the immediate subfolder and show secrets
        subfolderItem.addEventListener('click', async (event) => {
          currentSelectedMoveFolder = subfolderPath;
          updateCurrentMoveFolderDisplay(currentSelectedMoveFolder);
          await extractMoveFolder(secretItem[subfolderName], subfolderPath); 



        });
    }
}
}


function updateCurrentMoveFolderDisplay(currentMoveFolder) {
  const folderParts = ['Home', ...currentMoveFolder.split('/').filter(Boolean)]; 
  const folderDisplayElement = document.getElementById('movepath');
  const secretsContainer = document.getElementById('secretsmove'); 

  folderDisplayElement.innerHTML = '';

  let breadcrumb = folderParts.join(' > '); 
  const maxWidth = folderDisplayElement.clientWidth; 

  function getTextWidth(text, font) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = font || window.getComputedStyle(folderDisplayElement).font;
      return context.measureText(text).width;
  }

  const fullFolderParts = [...folderParts];

  let breadcrumbParts = [...folderParts];
  if (getTextWidth(breadcrumb) > maxWidth && folderParts.length > 4) {
      breadcrumbParts = [
          folderParts[0], 
          folderParts[1], 
          '...', 
          folderParts[folderParts.length - 2], 
          folderParts[folderParts.length - 1]
      ];
  }

  for (let index = 0; index < breadcrumbParts.length; index++) {
      const part = breadcrumbParts[index];
      const folderSpan = document.createElement('span');
      folderSpan.textContent = part;
      folderSpan.style.cursor = 'pointer'; 

      folderSpan.addEventListener('click', async () => {
          let pathWithoutHome = '';
          if (part === '...') return;

          if (index === 2 && part === '...') {
              return;
          } else if (index < 2) {
              pathWithoutHome = fullFolderParts.slice(1, index + 1).join('/'); 
          } else {
              const adjustedIndex = index + (fullFolderParts.length - breadcrumbParts.length);
              pathWithoutHome = fullFolderParts.slice(1, adjustedIndex + 1).join('/');
          }

          if (part === 'Home') {
              window.location.href = 'secrets.html'; 
              currentSelectedMoveFolder = '';
          } else {
              currentSelectedMoveFolder = pathWithoutHome;
              secretsContainer.innerHTML = "";
              await generateMoveSubfolders(pathWithoutHome); 
              updateCurrentMoveFolderDisplay();
                
          }
      });

      folderDisplayElement.appendChild(folderSpan);

      if (index < breadcrumbParts.length - 1) {
          const separator = document.createElement('span');
          separator.textContent = ' > ';
          folderDisplayElement.appendChild(separator);
      }
  }
}
































async function generateFolders() {
    const secretsContainer = document.getElementById('secrets');
    secretsContainer.innerHTML = ''; 

    const folders = new Set();
    
    let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];
    folders.add('default-folder');

    if (finalData) {
        namesArray.forEach(nameObject => {
            const folderName = Object.keys(nameObject)[0];
            if (folderName) {
                const folder = folderName.split('/')[0];
                folders.add(folder);
            }
        });

        folders.forEach(folder => {
            const folderId = folder.toLowerCase().replace(/\s+/g, '-');
            const folderItem = document.createElement('div');
            folderItem.classList.add('item', 'folder');
            folderItem.id = folderId;
            folderItem.innerHTML = `<i class="fa fa-folder"></i><span>${folder}</span>`;
            secretsContainer.appendChild(folderItem);

            folderItem.addEventListener('click', () => {
                currentSelectedFolder = folder;
                filterSecretsByFolder(folder);


            });
        });
    }
}

async function updateCurrentFolderDisplay(currentFolder) {
  const folderParts = ['Home', ...currentFolder.split('/').filter(Boolean)];
  const folderDisplayElement = document.getElementById('current-folder-display');
  const secretsContainer = document.getElementById('secrets');

  folderDisplayElement.innerHTML = '';

  let breadcrumb = folderParts.join(' > '); 
  const maxWidth = folderDisplayElement.clientWidth; 

  function getTextWidth(text, font) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = font || window.getComputedStyle(folderDisplayElement).font;
      return context.measureText(text).width;
  }

  const fullFolderParts = [...folderParts];

  let breadcrumbParts = [...folderParts];
  if (getTextWidth(breadcrumb) > maxWidth && folderParts.length > 4) {
      breadcrumbParts = [
          folderParts[0], 
          folderParts[1], 
          '...', 
          folderParts[folderParts.length - 2], 
          folderParts[folderParts.length - 1]
      ];
  }

  for (let index = 0; index < breadcrumbParts.length; index++) {
      const part = breadcrumbParts[index];
      const folderSpan = document.createElement('span');
      folderSpan.textContent = part;
      folderSpan.style.cursor = 'pointer'; 

      folderSpan.addEventListener('click', async () => {
          let pathWithoutHome = '';
          if (part === '...') return;

          if (index === 2 && part === '...') {
              return;
          } else if (index < 2) {
              pathWithoutHome = fullFolderParts.slice(1, index + 1).join('/'); 
          } else {
              const adjustedIndex = index + (fullFolderParts.length - breadcrumbParts.length);
              pathWithoutHome = fullFolderParts.slice(1, adjustedIndex + 1).join('/');
          }

          if (part === 'Home') {
              window.location.href = 'secrets.html'; 
              currentSelectedFolder = '';
          } else {
              currentSelectedFolder = pathWithoutHome;
              secretsContainer.innerHTML = "";
              filterSecretsByFolder(pathWithoutHome);
              await generateSubfolders(pathWithoutHome); 
          }
      });

      folderDisplayElement.appendChild(folderSpan);

      if (index < breadcrumbParts.length - 1) {
          const separator = document.createElement('span');
          separator.textContent = ' > ';
          folderDisplayElement.appendChild(separator);
      }
  }
}


async function filterSecretsByFolder(folderName) {
  const secretsListContainer = document.querySelector('.secrets');
  const backButton = document.getElementById('back-to-secrets');

  if (!secretsListContainer) throw new Error("Secrets list container not found");

  secretsListContainer.innerHTML = '';
  backButton.style.display = 'block';

  backButton.onclick = () => {
      window.location.href = 'secrets.html';
      currentSelectedFolder = '';
  };

  if (finalData) {
      console.log("Final Data: ", finalData);  // Log finalData
      let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];
      console.log("Vault Names: ", namesArray); // Log namesArray

      const secretsToDisplay = []; // List to hold matched secrets

      // Iterate over finalData to filter secrets
      finalData.forEach(secret => {
          // Use findPath to get the complete path of the secret
          const foundPath = findPath(secret.name, namesArray);

          console.log(`Secret Name: ${secret.name}, Found Path: ${foundPath}`); // Log each secret and its found path

          // Verify if the found path matches the desired format
          if (foundPath && foundPath === `${folderName}/${secret.name}`) {
              secretsToDisplay.push(secret); // Append matching secret to the list
          }
      });

      console.log(`Filtered Secrets: ${secretsToDisplay.length}`); // Log the count of filtered secrets

      // Show only first-level subfolders if we're not at max depth
          await generateSubfolders(folderName);
          updateCurrentFolderDisplay(currentSelectedFolder);

      

      // Generate secret items for filtered secrets
      if (secretsToDisplay.length === 0) {
          console.log(`No secrets found for ${folderName}`);
      } else {
          secretsToDisplay.forEach(secret => {
              const existingSecretItem = document.querySelector(`.item[data-name="${secret.name}"]`);
              if (existingSecretItem) {
                  existingSecretItem.querySelector('span').textContent = secret.name;
              } else {
                  const secretItem = createSecretItem(secret.name);
                  secretsListContainer.appendChild(secretItem);
              }
          });
      }
  } else {
      console.log(`No final data found to filter secrets.`);
  }
}



async function extractFolder(data, currentPath) {

  console.log("Extracting immediate subfolders for:", currentPath, "Data:", data); // Debugging line

    const secretsContainer = document.getElementById('secrets');
    secretsContainer.innerHTML = ''; 

    for (const secretItem of data) {
        if (typeof secretItem === 'object') {
            const subfolderName = Object.keys(secretItem)[0];
            const subfolderPath = `${currentPath}/${subfolderName}/`.replace(/\/+$/, ''); 
            console.log('HERE IS FULLPATH',subfolderPath);


            const subfolderId = subfolderPath.toLowerCase().replace(/\s+/g, '-');
            const subfolderItem = document.createElement('div');
            subfolderItem.classList.add('item', 'subfolder');
            subfolderItem.id = subfolderId;
            subfolderItem.innerHTML = `<i class="fa fa-folder"></i><span>${subfolderName}</span>`;
            secretsContainer.appendChild(subfolderItem);


            subfolderItem.addEventListener('click', async (event) => {
                event.stopPropagation(); // Prevent triggering parent folder clicks
                currentSelectedFolder = subfolderPath; // Use full path for currentSelectedFolder
                secretsContainer.innerHTML = ''; // Clear current secrets and folders
                filterSecretsByFolder(currentSelectedFolder);
                await extractImmediateSubfolders(secretItem[subfolderName], subfolderPath);
                console.log("looooook" , currentSelectedFolder);
                updateCurrentFolderDisplay(currentSelectedFolder);

                
            });
        }
    }
}

async function extractImmediateSubfolders(data, currentPath) {
  const secretsContainer = document.getElementById('secrets');
  secretsContainer.innerHTML = ''; 
    for (const secretItem of data) {
        if (typeof secretItem === 'object') {
            const subfolderName = Object.keys(secretItem)[0];
            const subfolderPath = `${currentPath}/${subfolderName}/`.replace(/\/+$/, ''); // Create the full path
            const secretsContainer = document.getElementById('secrets');

            // Create a UI element for the folder
            const subfolderId = subfolderPath.toLowerCase().replace(/\s+/g, '-');
            const subfolderItem = document.createElement('div');
            subfolderItem.classList.add('item', 'subfolder');
            subfolderItem.id = subfolderId;
            subfolderItem.innerHTML = `<i class="fa fa-folder"></i><span>${subfolderName}</span>`;
            secretsContainer.appendChild(subfolderItem);

            // Add click event to navigate to the immediate subfolder and show secrets
            subfolderItem.addEventListener('click', async (event) => {

            filterSecretsByFolder(subfolderPath);
            console.log('looooook222',subfolderPath);
            currentSelectedFolder = subfolderPath;
            await extractFolder(secretItem[subfolderName], subfolderPath); 
            updateCurrentFolderDisplay(currentSelectedFolder);



            });
        }
    }
}



async function generateSubfolders(folderName) {
  const namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];

  const lastFolderName = folderName.substring(folderName.lastIndexOf('/') + 1);

  // Recursive function to search through the folder structure
  function findFolder(entries, folderToFind) {
      for (const entry of entries) {
          const folderPath = Object.keys(entry)[0];
          const contents = entry[folderPath];

          // Check if the current folder path matches the last folder name
          if (folderPath.replace(/\/+$/, '') === folderToFind) {
              return contents; // Return the entries if found
          }

          // If the contents are an array, recursively search them
          if (Array.isArray(contents)) {
              const foundEntries = findFolder(contents, folderToFind);
              if (foundEntries) {
                  return foundEntries; // Return the found entries
              }
          }
      }
      return null; 
  }

  if (finalData) {
      const entries = findFolder(namesArray, lastFolderName);
      if (Array.isArray(entries)) {
          extractFolder(entries, folderName); 
      } else {
          console.log(`No entries found for folder: ${lastFolderName}`);
      }
  }
}




























function createSecretItem(name) {
  const itemContainer = document.getElementById('item-container');
  const existingItem = document.querySelector(`.item[data-name="${name}"]`);

  if (existingItem) {
    existingItem.querySelector('span').textContent = name;
    return existingItem;
  }

  const item = document.createElement('div');
  item.classList.add('item');
  item.dataset.name = name;

  item.innerHTML = `
    <i class="fa fa-lock"></i>
    <span>${name}</span>
  `;

  item.addEventListener('click', async () => {
    const matchedData = finalData.find(data => data.name === name);
    let folderFromPath = '';
    
    if (matchedData) {
      // Retrieve the folder associated with the secret
      let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames;
      namesArray = namesArray || [];
      let secretPath = null;

      namesArray.forEach(nameObject => {
        const folderKey = Object.keys(nameObject)[0];
        const secretNames = nameObject[folderKey];
        if (secretNames.includes(name)) {
          secretPath = folderKey;
        }
      });

      if (secretPath) {
        folderFromPath = secretPath; // Use the full folder path
      }

      currentName = name;
      document.getElementById('item-url').value = matchedData.url || '';
      document.getElementById('item-username').value = matchedData.username || '';
      document.getElementById('item-password').value = matchedData.password || '';
      document.getElementById('item-notes').value = matchedData.notes || ''; // Set notes from saved data


      const creationDate = matchedData.creationDate || new Date().toISOString().split('T')[0];
      const formattedDate = formatDateToDDMonYYYY(creationDate);
      document.getElementById('item-date').value = formattedDate;

      
      const folderParts = ['Home', ...currentSelectedFolder.split('/')];
      let breadcrumb = folderParts.join(' > '); 

      const folderDisplayElement = document.getElementById('item-folder');
      const maxLength = folderDisplayElement.clientWidth; 

      function getTextWidth(text, font) {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          context.font = font || window.getComputedStyle(folderDisplayElement).font;
          return context.measureText(text).width;
        
        }

      if (getTextWidth(breadcrumb) > maxLength) {
          if (folderParts.length > 4) {
           breadcrumb = `${folderParts[0]} > ${folderParts[1]} > ... > ${folderParts[folderParts.length - 2]} > ${folderParts[folderParts.length - 1]}`;
    }
}

    folderDisplayElement.value = breadcrumb;


      document.querySelector('.title').innerHTML = matchedData.name || matchedData.url;
    } else {
      document.getElementById('item-url').value = '';
      document.getElementById('item-username').value = '';
      document.getElementById('item-password').value = '';
      document.getElementById('item-notes').value = ''; // Clear notes if no matched data

      document.getElementById('item-date').value = new Date().toISOString().split('T')[0];

      // Clear the folder text box if no matched data
      document.getElementById('item-folder').value = '';
    }
    document.querySelector('.container').style.display = 'none';
    itemContainer.style.display = 'block';
    document.querySelector('.secrets-list').style.display = 'none';
  });

  return item;
}

function formatDateToDDMonYYYY(dateString) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dateParts = dateString.split('-'); // Split the input date string 'YYYY-MM-DD'

  const year = dateParts[0];
  const monthIndex = parseInt(dateParts[1], 10) - 1; // Convert month to zero-based index
  const day = dateParts[2];

  const month = months[monthIndex]; // Get the month abbreviation

  return `${day}-${month}-${year}`;
}




function createAccordionMenu(namesArray, credentials, ii, parentElement, sub) {
  const accordionContainer = document.createElement('ul');
  if (sub == "child"){
    accordionContainer.id = `sub-credentialList${ii}`;
  }else{
    accordionContainer.id = 'credentialList';
  }

  (parentElement || document.body).appendChild(accordionContainer);

  namesArray.forEach(item => {
    const accordionItem = document.createElement('div');
    accordionItem.className = 'accordion-item';

    if (typeof item === 'object') {
      const subList = document.createElement('ul');
      subList.className = 'sub-list';

      for (const subItem of Object.keys(item)) {
        const subAccordionItem = document.createElement('li');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.id = `check${ii}`;
        checkbox.addEventListener('click', () => {
          id = checkbox.id.replace('check','');Eye
          const tag = checkbox.parentNode.querySelectorAll(`#sub-credentialList${id}`);
          tag.forEach(element => {
            element.querySelectorAll('li').forEach(e => {
              if (checkbox.checked) {
                e.classList.add('hidden');
              } else {
                e.classList.remove('hidden');
              }
            }); 
          });
        });
        
        const arrow = document.createElement('i');
        arrow.className = "arrow";
        const header = document.createElement('h2');
        header.innerHTML = `${subItem}`;

        subAccordionItem.appendChild(checkbox);
        subAccordionItem.appendChild(arrow);
        subAccordionItem.appendChild(header);
        if (sub == "child"){
          subAccordionItem.className = "hidden";
        }
        if (Array.isArray(item[subItem])) {
          
          createAccordionMenu(item[subItem], credentials, ii, subAccordionItem, "child");
        } else {
          matchCredentials(subItem, credentials, subAccordionItem);
        }

        subList.appendChild(subAccordionItem);
      }
      accordionItem.appendChild(subList);
      
    } else {
      matchCredentials(item, credentials, accordionItem, sub);
    }
    ii++;
    accordionContainer.appendChild(accordionItem);
  });

  if (!parentElement) {
    const listContainer = document.getElementById('root-accordion');
    listContainer.appendChild(accordionContainer);
  }
}




function matchCredentials(name, credentials, element, sub) {
  const matchingCredential = credentials.find(credential => credential.name === name);
  const i = credentials.indexOf(matchingCredential);

  if (matchingCredential) {
    const name = matchingCredential.name;
    delete matchingCredential.name;
    const listItem = document.createElement('li');
    if (sub == "child"){
      listItem.className = "hidden";
    }
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = `${i}`;
    checkbox.addEventListener('click', () => {
      const i = checkbox.id;
      let elementsToToggle = [`${i}.5`, `${i}.6`];
      Object.keys(matchingCredential).map(key => {
        elementsToToggle.push(`${key}${i}.3`)
        elementsToToggle.push(`${key}${i}.4`)
        elementsToToggle.push(`${key}${i}.7`)
        if (key == "password") {
          elementsToToggle.push(`${key}${i}.8`)
        }
      });
      elementsToToggle.forEach(selector => {
        const element = document.getElementById(selector);
        if (checkbox.checked) {
          element.classList.add('hidden');
        } else {
          element.classList.remove('hidden');
          const title = document.getElementById(i);
          title.scrollIntoView({
            behavior: 'smooth'
          });
        }
      });
    });
    const arrow = document.createElement('i');
    arrow.className = "arrow";
    arrow.id = `${i}.1`;
    const header = document.createElement('h2');
    header.innerHTML = `${name}`;
    header.id = `${i}.2`;
    const inputs = Object.keys(matchingCredential).map(key => {
      const label = document.createElement('p');
      label.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}:`;
      label.classList.add('hidden');
      label.id = `${key}${i}.3`;
      const input = document.createElement('input');
      input.type = 'text';
      if (key == "password"){
        input.type = 'password';
      }
      input.value = matchingCredential[key];
      input.classList.add('hidden');
      input.id = `${key}${i}.4`;
      return [label, input];
    });
    const updateButton = document.createElement('button');
    updateButton.textContent = "Update Credentials";
    updateButton.classList.add('hidden');
    updateButton.id = `${i}.5`;
    updateButton.addEventListener('click', async () => {
      await updateCred(name, updateButton.id[0]);
    });
    const deleteButton = document.createElement('button');
    deleteButton.textContent = "Delete Credentials";
    deleteButton.classList.add('hidden');
    deleteButton.classList.add('deleteButtons');
    deleteButton.id = `${i}.6`;
    deleteButton.addEventListener('click', async () => {
      await deleteCred(name);
    });
    listItem.appendChild(checkbox);
    listItem.appendChild(arrow);
    listItem.appendChild(header);
    inputs.forEach(([label, input]) => {
      listItem.appendChild(label);
      listItem.appendChild(input);
    });
    listItem.appendChild(updateButton);
    listItem.appendChild(deleteButton);
    element.appendChild(listItem);
  } else {
    element.textContent = name;
  }
}

async function addCred() {
  notify.clear();
  let secretName = document.getElementById('ThePath').value;
  let iusername = document.getElementById('TheUsername').value;
  let ipassword = document.getElementById('ThePassword').value;
  let iurl = document.getElementById('TheUrl').value;
  let inotes = document.getElementById('TheNotes').value; 
  let path = secretName;
  const username = document.getElementById("TheUsername").value;
  const password = document.getElementById("ThePassword").value;
  const url = document.getElementById("TheUrl").value;
  const notes = document.getElementById("TheNotes").value;
  const creationDate = new Date().toISOString().split('T')[0]; 

// Get the folder text box element
var folderTextBox = document.getElementById("SelectedFolderTextBox");

// Trim and assign the folder value if it exists, otherwise set it to an empty string
var folder = folderTextBox && folderTextBox.value ? folderTextBox.value.trim() : "";

// Retrieve user ID and vault server address
const userID = (await browser.storage.sync.get('username')).username;
var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;

let secretsUrl = "";

if (!currentSelectedFolder && !folder) {
    alert("Secret is assigned to default-folder");
    secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/default-folder/${path}`;
} else {
    if (!currentSelectedFolder && folder) {
        secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${folder}/${path}`;
    } else if (currentSelectedFolder && !folder) {
        secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentSelectedFolder}/${path}`;
    } else {
        secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentSelectedFolder}/${folder}/${path}`;
    }
}




  //const userID = (await browser.storage.sync.get('username')).username;
  //var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  //const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentSelectedFolder}/${path}`;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  const secretData = {
    data: {
      username: `${iusername}`,
      password: `${ipassword}`,
      url: `${iurl}`,
      notes: `${inotes}`, 
      creationDate: creationDate,  
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
    await reloadPage();
  } catch (error) {
    notify.error('Error creating secret:', error);
    throw error;
  }
}





async function updateCredentials() {
  const url = document.getElementById('item-url').value;
  const username = document.getElementById('item-username').value;
  const password = document.getElementById('item-password').value;
  const notes = document.getElementById('item-notes').value;

  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];
  let folder = '';
  if (finalData) {
    const folderPath = findPath(currentName, namesArray);
    folder = folderPath;
 
  }

  const matchedData = finalData.find(data => data.name === currentName);
  const vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const userID = (await browser.storage.sync.get('username')).username;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;

  // Update existing secret data
  if (matchedData) {
    matchedData.url = url || '';
    matchedData.username = username || '';
    matchedData.password = password || '';
    matchedData.notes = notes || '';

    await browser.storage.local.set({ vault: finalData });

    const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${folder}`;
    const secretData = {
      data: {
        username: matchedData.username,
        password: matchedData.password,
        url: matchedData.url,
        creationDate: matchedData.creationDate,
        notes: matchedData.notes,
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

      setTimeout(async () => {
        await reloadPage();
      }, 500); 
    }
  } else {
    notify.error('Secret not found.');
    await reloadPage();
  }
}



async function moveSecret(file="") {

  const currentName = sessionStorage.getItem('currentName'); 
  let secretsUrl = '';
  const matchedData = finalData.find(data => data.name === currentName);
  const vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const userID = (await browser.storage.sync.get('username')).username;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  const url = sessionStorage.getItem('moveSecretUrl');
  const username = sessionStorage.getItem('moveSecretUsername');
  const password = sessionStorage.getItem('moveSecretPassword');
  const notes = sessionStorage.getItem('moveSecretNotes');



  if (currentSelectedMoveFolder === "") {  
    if (file === "") {
      secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/default-folder/${currentName}`;
    } else {
      secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${file}/${currentName}`;
    }
  } else {
    // Check if file is not empty
    if (file !== "") {
      secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentSelectedMoveFolder}/${file}/${currentName}`;
    } else {
      secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${currentSelectedMoveFolder}/${currentName}`;
    }
  }

  const secretData = {
    data: {
      username,
      password,
      url,
      notes,
      creationDate: matchedData?.creationDate || new Date().toISOString(),
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


    await deleteCred(currentName); 
    document.getElementById('itemContainerMove').classList.remove('active');
    currentSelectedFolder = currentSelectedMoveFolder;
    currentSelectedMoveFolder = "";
    const folderParts = ['Home', ...currentSelectedFolder.split('/')];  
    const breadcrumb = folderParts.join(' > ');  
    const folderDisplayElement = document.getElementById('item-folder');
    folderDisplayElement.value = breadcrumb;

  } catch (error) {
    notify.error('Error creating secret:', error);
  } 

  //   finally {
  //   await deleteCred(currentName);
  //   document.getElementById('itemContainerMove').classList.remove('active');
  //   currentSelectedMoveFolder = ""; 
  //   console.log(" Reload");
  //   await reloadPage();
  // }
  
}




async function deleteCredentials() {
  const userID = (await browser.storage.sync.get('username')).username;
  const vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames || [];
  const folderPath = findPath(currentName, namesArray);


  const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${folderPath}`;
  const metadataUrl = `${vaultServerAddress}/v1/user_${userID}/metadata/${folderPath}`;

  try {
    const [metadataResponse, secretResponse] = await Promise.all([
      fetch(metadataUrl, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': vaultToken,
        },
      }),
      fetch(secretsUrl, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': vaultToken,
        },
      })
    ]);

    if (!metadataResponse.ok) {
      throw new Error(`Failed to delete metadata. Status: ${metadataResponse.status}`);
    }

    if (!secretResponse.ok) {
      throw new Error(`Failed to delete secret. Status: ${secretResponse.status}`);
    }

    finalData = finalData.filter(data => data.name !== currentName);
    await browser.storage.local.set({ vault: finalData });

    notify.success('Secret deleted successfully.');
    await reloadPage(); 
  } catch (error) {
    notify.error('Error deleting secret:', error);
  }
}



async function updateCred(name, id) {
  let credentials = (await browser.storage.local.get("vault")).vault;
  let namesArray = (await browser.storage.local.get("vaultNames")).vaultNames;
  const path = findPath(name, namesArray);
  const userID = (await browser.storage.sync.get('username')).username;
  var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const secretsUrl = `${vaultServerAddress}/v1/user_${userID}/data/${path}`;
  const vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  var secretData = extractValuesByName(name, credentials)[0];
  for (key in secretData) {
    secretData[key] = document.getElementById(`${key}${id}.4`).value;
  }
  let count = 0;
  secretData['name'] = name;
  for (data of credentials) {
    if (data.name == name) {
      credentials[count] = secretData;
    }
    count++;
  }
  browser.storage.local.set({
    vault: credentials
  });
  secretData = {
    data: secretData
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
    const responseData = await response.json();
    await reloadPage();
    return responseData;
  } catch (error) {
    notify.error('Error creating secret:', error);
    throw error;
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
    

    await retrieveData();
  } catch (error) {
    await reloadPage();
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

function extractValuesByName(name, dataArray) {
  const result = dataArray.map(item => {
    if (item.name === name) {
      const {
        name,
        ...rest
      } = item;
      return rest;
    } else {
      return null;
    }
  });
  return result.filter(item => item !== null);
}

async function retrieveData(){
  await browser.storage.local.set({ vaultNames: null });
  var vaultToken = (await browser.storage.local.get('vaultToken')).vaultToken;
  var vaultServerAddress = (await browser.storage.sync.get('vaultAddress')).vaultAddress;
  const userID = (await browser.storage.sync.get('username')).username;

  const names = await getSecretsList(`${vaultServerAddress}/v1/user_${userID}/metadata/`,vaultToken);
  if (!names) {
    return;
  }
  browser.storage.local.set({ vaultNames: names });

  await processSecrets(names, vaultServerAddress, userID, vaultToken);

  browser.storage.local.set({ vault: finalData });
  browser.storage.local.set({ vaultUrls: finalUrls });
  return;
}

async function getSecretsList(secretsUrl, vaultToken) {
  try {
    const response = await fetch(secretsUrl, {
      method: 'LIST',
      headers: {
        'X-Vault-Token': vaultToken,
      },
    });

    if (!response.ok) {
      return false;
      // throw new Error(`Failed to list secrets. HTTP status: ${response.status}`);
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
    console.error('Error fetching secrets:', error.message);
    throw error;
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
    secretData.data.data["name"] = name;

    // Ensure creationDate and notes are included
    if (!secretData.data.data.creationDate) {
      secretData.data.data.creationDate = new Date().toISOString().split('T')[0];
    }
    if (!secretData.data.data.notes) {
      secretData.data.data.notes = ''; // Default to empty string if no notes
    }

    return secretData.data.data;
  } catch (error) {
    console.error('Error fetching secret:', error.message);
    throw error;
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


/*
async function extractFolder(data, currentPath = '') {
  for (const secretItem of data) {
    if (typeof secretItem === 'object') {
      const subfolderName = Object.keys(secretItem)[0];
      document.getElementById('mounts').innerHTML += `<option>${subfolderName}</option>`;
      const subfolderPath = `${currentPath}${subfolderName}`;
      extractFolder(secretItem[subfolderName], subfolderPath);
    }
  }
}
*/
async function reloadPage(){
  await retrieveData();
  location.href = location.href;
}

async function addIcons(){
  const inputFields = document.querySelectorAll('input')
  inputFields.forEach(element => {
    if (element.classList.contains('hidden')){
      if (element.type == "password"){
        addEyeIcon(element.id,(element.id.match(/^([a-zA-Z]+[0-9]+\.)[0-9]+$/)[1]+"8"));
      }
      addCopyButton(element.id,(element.id.match(/^([a-zA-Z]+[0-9]+\.)[0-9]+$/)[1]+"7"));
    }
  });
}

function addCopyButton(inputId, buttonId) {
  const imgSrc = "icons/copy-solid-blue.svg"
  var inputField = document.getElementById(inputId);
  var copyButton = document.createElement("button");
  copyButton.id = buttonId;
  copyButton.className = "copyBtn hidden";
  copyButton.title = "Copy";
  var copyImage = document.createElement("img");
  copyImage.src = imgSrc;
  copyButton.appendChild(copyImage);
  inputField.parentNode.insertBefore(copyButton, inputField.nextSibling);
  copyButton.addEventListener("click", ()=>{
    const text = document.getElementById(inputId).value;
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard!');
  });
}

function addEyeIcon(passwordInputId, iconId) {
  var passwordInput = document.getElementById(passwordInputId);

  var passwordDiv = document.createElement('div');
  passwordDiv.id = 'passwordContainer';

  passwordInput.parentNode.replaceChild(passwordDiv, passwordInput);

  passwordDiv.appendChild(passwordInput);

  var eyeIcon = document.createElement("img");
  eyeIcon.src = "icons/eye-slash-solid.svg";
  eyeIcon.id = iconId;
  eyeIcon.classList.add("hide");
  eyeIcon.classList.add("eyeIcon");
  eyeIcon.classList.add("hidden");

  passwordDiv.appendChild(eyeIcon);

  eyeIcon.addEventListener("click", function () {
      if (passwordInput.type === "password") {
          passwordInput.type = "text";
          eyeIcon.src = "icons/eye-solid.svg"; 
      } else {
          passwordInput.type = "password";
          eyeIcon.src = "icons/eye-slash-solid.svg"; 
      }
  });
}

async function performSearch(){
  const newCredentials = (await browser.storage.local.get("vault")).vault;
  console.log(newCredentials);
  const secretsListContainer = document.querySelector('.secrets');
  secretsListContainer.innerHTML = ""
  let searchTerm = document.getElementById('searchInput').value;
  let namesArray = [];
  if (searchTerm.length > 0){
    for (let i in newCredentials) {if (newCredentials[i].name.includes(searchTerm)){namesArray.push(newCredentials[i].name)}}
    namesArray.forEach(name => {
        const secretItem = createSecretItem(name);
        secretsListContainer.appendChild(secretItem);
    });
  } else{
    let names = (await browser.storage.local.get("vaultNames")).vaultNames;
    names.forEach(name => {
        const secretItem = createSecretItem(name);
        secretsListContainer.appendChild(secretItem);
    });
  }
}

document.addEventListener('DOMContentLoaded', mainLoaded, false);



