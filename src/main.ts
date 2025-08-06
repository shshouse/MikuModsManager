import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface ModInfo {
  name: string;
  path: string;
  game: string;
  version?: string;
  description?: string;
}

interface GameInfo {
  name: string;
  path: string;
  icon: string | null;
  executable?: string;
  mod_support: boolean;
}

interface PatchFolderInfo {
  gameName: string;
  path: string;
  folderName: string;
  fileCount: number;
  createdTime?: string;
}

interface BackupInfo {
  timestamp: string;
  mod_name: string;
  files: string[];
  backup_path: string;
}

let selectedGame: string | null = null;
let currentPage: string = 'mod-manager';

// Navigation functionality
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute('data-page');
      if (targetPage) {
        switchPage(targetPage);
      }
    });
  });

  // Initialize with mod manager page
  switchPage('mod-manager');
}

function switchPage(pageId: string) {
  // Update navigation active state
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    const link = item.querySelector('.nav-link');
    if (link && link.getAttribute('data-page') === pageId) {
      item.classList.add('active');
    }
  });

  // Update page visibility
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => {
    page.classList.remove('active');
  });

  const targetPage = document.getElementById(`${pageId}-page`);
  if (targetPage) {
    targetPage.classList.add('active');
    currentPage = pageId;
  }

  // Load page-specific content
  loadPageContent(pageId);
}

function loadPageContent(pageId: string) {
  switch (pageId) {
    case 'mod-manager':
      loadModManagerPage();
      break;
    case 'settings':
      loadSettingsPage();
      break;
    case 'about':
      loadAboutPage();
      break;
    case 'game-details':
      // Game details page is loaded via viewGameDetails function
      break;
  }
}

async function loadModManagerPage() {
  try {
    // Load games list for mod management
    const games = await invoke("scan_installed_games") as GameInfo[];
    const patchFolders = await invoke("get_patch_folders") as PatchFolderInfo[];
    displayGamesList(games, patchFolders);
  } catch (error) {
    console.error('Failed to load mod manager data:', error);
    showModsPageError('加载游戏列表失败: ' + error);
  }
}

async function scanGames() {
  console.log('Scanning for games...');
  
  try {
    const games = await invoke("scan_installed_games") as GameInfo[];
    const patchFolders = await invoke("get_patch_folders") as PatchFolderInfo[];
    displayGamesList(games, patchFolders);
  } catch (error) {
    console.error('Failed to scan games:', error);
    showModsPageError('扫描游戏失败: ' + error);
  }
}

function displayGamesList(games: GameInfo[], _patchFolders?: PatchFolderInfo[]) {
  const gamesListContainer = document.querySelector('.games-list-container');
  if (!gamesListContainer) return;

  if (games.length === 0) {
    gamesListContainer.innerHTML = `
      <div class="no-games">
        <h3>未找到游戏</h3>
        <p>请点击"扫描游戏"按钮来搜索已安装的游戏</p>
        <button class="retry-btn" onclick="scanGames()">扫描游戏</button>
      </div>
    `;
    return;
  }

  // Create simplified games list for mod manager
  const gamesTableHtml = `
    <div class="games-table">
      <div class="table-header">
        <div class="table-row header-row">
          <div class="table-cell game-name">游戏名称</div>
          <div class="table-cell available-mods">可用模组数</div>
          <div class="table-cell used-mods">已用模组数</div>
          <div class="table-cell actions">操作</div>
        </div>
      </div>
      <div class="table-body">
        ${games.map(game => {
          // For now, we'll use placeholder values for mod counts
          // In a real implementation, these would come from the backend
          const availableMods = 15; // Placeholder value
          const usedMods = 8;       // Placeholder value
          
          return `
            <div class="table-row game-row" data-game-name="${game.name}" onclick="viewGameDetails('${game.name}')" style="cursor: pointer;">
              <div class="table-cell game-name">
                <div class="game-info">
                  <div class="game-details">
                    <div class="game-title" title="${game.name}">${game.name}</div>
                  </div>
                </div>
              </div>
              <div class="table-cell available-mods">
                <span class="count-badge">${availableMods}</span>
              </div>
              <div class="table-cell used-mods">
                <span class="count-badge">${usedMods}</span>
              </div>
              <div class="table-cell actions">
                <button class="action-btn view-details" onclick="event.stopPropagation(); viewGameDetails('${game.name}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  查看详情
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  gamesListContainer.innerHTML = gamesTableHtml;
}

// Removed unused functions - functionality is now handled by openModFolder and openGameFolder

function showModsPageError(message: string) {
  const gamesListContainer = document.querySelector('.games-list-container');
  if (!gamesListContainer) return;

  const errorHtml = `
    <div class="error-message">
      <h3>加载失败</h3>
      <p>${message}</p>
      <button onclick="loadModsPage()" class="retry-btn">重试</button>
    </div>
  `;

  gamesListContainer.innerHTML = errorHtml;
}

// Game management functions
async function editGamePath(gameName: string) {
  try {
    // Open folder selection dialog
    const selectedFolder = await open({
      directory: true,
      multiple: false,
      title: "选择游戏文件夹"
    });

    // If a folder was selected, update the game path
    if (selectedFolder) {
      const gameRow = document.querySelector(`[data-game-name="${gameName}"]`);
      if (!gameRow) return;

      const pathInput = gameRow.querySelector('.path-input') as HTMLInputElement;
      pathInput.value = selectedFolder as string;
      
      // Save the new path
      await saveGamePath(gameName);
    }
  } catch (error) {
    console.error('Failed to select folder:', error);
    alert(`选择文件夹失败: ${error}`);
  }
}

async function saveGamePath(gameName: string) {
  const gameRow = document.querySelector(`[data-game-name="${gameName}"]`);
  if (!gameRow) return;

  const pathInput = gameRow.querySelector('.path-input') as HTMLInputElement;
  const editBtn = gameRow.querySelector('.path-edit-btn') as HTMLButtonElement;

  try {
    // Save the new path using Rust backend
    await invoke("update_game_path", { 
      gameName: gameName, 
      newPath: pathInput.value 
    });
    
    console.log(`Successfully saved new path for ${gameName}: ${pathInput.value}`);
    
    // Update the original path attribute
    pathInput.setAttribute('data-original-path', pathInput.value);
    
  } catch (error) {
    console.error('Failed to save game path:', error);
    alert(`保存游戏路径失败: ${error}`);
    
    // Revert to original path on error
    const originalPath = pathInput.getAttribute('data-original-path') || '';
    pathInput.value = originalPath;
  }

  // Reset UI state
  pathInput.readOnly = true;
  editBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
}

function cancelEditGamePath(gameName: string) {
  const gameRow = document.querySelector(`[data-game-name="${gameName}"]`);
  if (!gameRow) return;

  const pathInput = gameRow.querySelector('.path-input') as HTMLInputElement;
  const editBtn = gameRow.querySelector('.path-edit-btn') as HTMLButtonElement;
  const originalPath = pathInput.getAttribute('data-original-path') || '';

  pathInput.value = originalPath;
  pathInput.readOnly = true;
  editBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
}

async function openModFolder(gameName: string) {
  try {
    // Get the patch folder path for this game
    const patchFolders = await invoke("get_patch_folders") as PatchFolderInfo[];
    const patchFolder = patchFolders.find(folder => folder.gameName === gameName);
    
    if (patchFolder) {
      console.log(`Opening mod folder for ${gameName}: ${patchFolder.path}`);
      await invoke("open_folder", { path: patchFolder.path });
    } else {
      console.error(`No mod folder found for game: ${gameName}`);
      alert(`未找到游戏 ${gameName} 的模组文件夹`);
    }
  } catch (error) {
    console.error('Failed to open mod folder:', error);
    alert(`打开模组文件夹失败: ${error}`);
  }
}

async function openGameFolder(gamePath: string) {
  try {
    console.log(`Opening game folder: ${gamePath}`);
    await invoke("open_folder", { path: gamePath });
  } catch (error) {
    console.error('Failed to open game folder:', error);
    alert(`打开游戏目录失败: ${error}`);
  }
}



function loadSettingsPage() {
  // Load current user settings
  const savedUserName = localStorage.getItem('user-name');
  const savedUserAvatar = localStorage.getItem('user-avatar');
  
  if (savedUserName) {
    const userNameInput = document.getElementById('user-name') as HTMLInputElement;
    if (userNameInput) {
      userNameInput.value = savedUserName;
      // Update the displayed user name
      const displayName = document.querySelector('.user-name');
      if (displayName) {
        displayName.textContent = savedUserName;
      }
    }
  }
  
  if (savedUserAvatar) {
    // Update the displayed user avatar
    const avatarImg = document.querySelector('.user-avatar img') as HTMLImageElement | null;
    if (avatarImg) {
      avatarImg.src = savedUserAvatar;
    }
  }
  
  console.log('Loading settings page...');
}

function loadAboutPage() {
  // This will be implemented when the about page is fully developed
  console.log('Loading about page...');
}

// Window controls functionality
function initializeWindowControls() {
  const minimizeBtn = document.querySelector('.control-btn.minimize');
  const maximizeBtn = document.querySelector('.control-btn.maximize');
  const closeBtn = document.querySelector('.control-btn.close');

  minimizeBtn?.addEventListener('click', () => {
    // This would integrate with Tauri's window API
    console.log('Minimize window');
  });

  maximizeBtn?.addEventListener('click', () => {
    // This would integrate with Tauri's window API
    console.log('Maximize/restore window');
  });

  closeBtn?.addEventListener('click', () => {
    // This would integrate with Tauri's window API
    console.log('Close window');
  });
}

// User profile functionality
function initializeUserProfile() {
  const userProfile = document.querySelector('.user-profile');
  
  userProfile?.addEventListener('click', () => {
    // Show user menu dropdown
    console.log('Show user menu');
  });
}

// Update user name function
function updateUserName() {
  const userNameInput = document.getElementById('user-name') as HTMLInputElement;
  if (userNameInput) {
    const newName = userNameInput.value.trim();
    if (newName) {
      // Save to localStorage
      localStorage.setItem('user-name', newName);
      
      // Update the displayed user name
      const displayName = document.querySelector('.user-name');
      if (displayName) {
        displayName.textContent = newName;
      }
      
      console.log('User name updated:', newName);
    }
  }
}

// Update user avatar function
function updateUserAvatar() {
  const avatarInput = document.getElementById('user-avatar') as HTMLInputElement;
  if (avatarInput && avatarInput.files && avatarInput.files[0]) {
    const file = avatarInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const avatarData = e.target?.result as string;
      if (avatarData) {
        // Save to localStorage
        localStorage.setItem('user-avatar', avatarData);
        
        // Update the displayed user avatar
        const avatarImg = document.querySelector('.user-avatar img') as HTMLImageElement | null;
        if (avatarImg) {
          avatarImg.src = avatarData;
        }
        
        console.log('User avatar updated');
      }
    };
    
    reader.readAsDataURL(file);
  }
}

// Animation utilities
function animateElements(selector: string, delay: number = 100) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element, index) => {
    const el = element as HTMLElement;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, delay * index);
  });
}

// Legacy mod scanning functions (kept for compatibility)
async function scanMods() {
  try {
    const mods: ModInfo[] = await invoke("scan_mods", { gameName: selectedGame });
    
    if (mods.length === 0) {
      console.log('No mods found');
    } else {
      displayMods(mods);
      setTimeout(() => animateElements('.mod-item'), 100);
    }
  } catch (error) {
    console.error('Error scanning mods:', error);
  }
}

async function scanInstalledGames() {
  try {
    const games: GameInfo[] = await invoke("scan_installed_games");
    
    if (games.length === 0) {
      console.log('No games found');
    } else {
      displayGames(games);
      setTimeout(() => animateElements('.game-item'), 100);
    }
  } catch (error) {
    console.error('Error scanning games:', error);
  }
}

function displayMods(mods: ModInfo[]) {
  // Legacy function - would be updated for new UI
  console.log('Displaying mods:', mods);
}

function displayGames(games: GameInfo[]) {
  // Legacy function - would be updated for new UI
  console.log('Displaying games:', games);
}

function selectGame(gameName: string) {
  selectedGame = gameName;
  console.log('Selected game:', gameName);
  
  // Update mod manager if currently on mod manager page
    if (currentPage === 'mod-manager') {
      loadModManagerPage();
    }
}

async function installMod(modName: string, gameName: string, gamePath: string) {
  try {
    const result = await invoke("install_mod", { 
      modName, 
      gameName, 
      gamePath 
    }) as string;
    console.log(`Successfully installed mod: ${modName}`);
    alert(result);
    
    // Refresh mod manager data
    if (currentPage === 'mod-manager') {
      loadModManagerPage();
    }
  } catch (error) {
    console.error(`Failed to install mod: ${modName}`, error);
    alert(`安装模组失败: ${error}`);
  }
}

async function restoreFromBackup(gameName: string, timestamp: string, gamePath: string) {
  try {
    const result = await invoke("restore_from_backup", { 
      gameName, 
      timestamp, 
      gamePath 
    }) as string;
    console.log(`Successfully restored from backup: ${timestamp}`);
    alert(result);
    
    // Refresh mod manager data
    if (currentPage === 'mod-manager') {
      loadModManagerPage();
    }
  } catch (error) {
    console.error(`Failed to restore from backup: ${timestamp}`, error);
    alert(`恢复备份失败: ${error}`);
  }
}

async function getAvailableMods(gameName: string): Promise<ModInfo[]> {
  try {
    const mods = await invoke("get_available_mods", { gameName }) as ModInfo[];
    return mods;
  } catch (error) {
    console.error(`Failed to get available mods for ${gameName}:`, error);
    return [];
  }
}

async function getBackupList(gameName: string): Promise<BackupInfo[]> {
  try {
    const backups = await invoke("get_backup_list", { gameName }) as BackupInfo[];
    return backups;
  } catch (error) {
    console.error(`Failed to get backup list for ${gameName}:`, error);
    return [];
  }
}

async function getModCounts(gameName: string): Promise<[number, number]> {
  try {
    const counts = await invoke("get_mod_counts", { gameName }) as [number, number];
    return counts;
  } catch (error) {
    console.error(`Failed to get mod counts for ${gameName}:`, error);
    return [0, 0];
  }
}

async function viewModFiles(modName: string) {
  try {
    const files = await invoke("get_mod_files", { modName, gameName: selectedGame });
    console.log(`Mod files for ${modName}:`, files);
    
    // This would open a modal or dedicated view
    alert(`Mod files: ${modName}\n\n${JSON.stringify(files, null, 2)}`);
  } catch (error) {
    console.error(`Failed to view mod files: ${modName}`, error);
  }
}

// Game details functions
async function viewGameDetails(gameName: string) {
  try {
    // Get game info
    const games: GameInfo[] = await invoke("scan_installed_games");
    const game = games.find(g => g.name === gameName);
    
    if (!game) {
      console.error('Game not found:', gameName);
      return;
    }

    // Get patch folders info
    const patchFolders = await invoke("get_patch_folders") as PatchFolderInfo[];
    const patchFolder = patchFolders.find((folder: PatchFolderInfo) => folder.gameName === gameName);

    // Get available mods and backups
    const availableMods = await getAvailableMods(gameName);
    const backups = await getBackupList(gameName);
    
    // Get mod counts
    const [availableCount, installedCount] = await getModCounts(gameName);

    // Update game details page
    const gameDetailsTitle = document.getElementById('game-details-title');
    const gameNameDisplay = document.getElementById('game-name-display');
    const gamePathInput = document.getElementById('game-path-input') as HTMLInputElement;
    
    if (gameDetailsTitle) gameDetailsTitle.textContent = `${game.name} - 游戏详情`;
    if (gameNameDisplay) gameNameDisplay.textContent = game.name;
    if (gamePathInput) {
      gamePathInput.value = game.path;
      gamePathInput.setAttribute('data-original-path', game.path);
    }
    
    if (patchFolder) {
      const modPathInput = document.getElementById('mod-path-input') as HTMLInputElement;
      if (modPathInput) modPathInput.value = patchFolder.path;
    } else {
      const modPathInput = document.getElementById('mod-path-input') as HTMLInputElement;
      if (modPathInput) modPathInput.value = '未设置模组路径';
    }

    // Update mod counts with real data
    const availableModsCount = document.getElementById('available-mods-count');
    const usedModsCount = document.getElementById('used-mods-count');
    if (availableModsCount) availableModsCount.textContent = availableCount.toString();
    if (usedModsCount) usedModsCount.textContent = installedCount.toString();

    // Display available mods
    displayAvailableMods(availableMods, gameName, game.path);
    
    // Display backup list
    displayBackupList(backups, gameName, game.path);

    // Switch to game details page
    switchPage('game-details');
    
  } catch (error) {
    console.error('Error loading game details:', error);
    alert(`加载游戏详情失败: ${error}`);
  }
}

function displayAvailableMods(mods: ModInfo[], gameName: string, gamePath: string) {
  const modsContainer = document.getElementById('available-mods-list');
  if (!modsContainer) return;

  if (mods.length === 0) {
    modsContainer.innerHTML = `
      <div class="no-mods">
        <p>暂无可用模组</p>
        <p>请将模组文件夹放置在游戏的patch目录中</p>
      </div>
    `;
    return;
  }

  const modsHtml = mods.map(mod => `
    <div class="mod-item">
      <div class="mod-info">
        <div class="mod-name">${mod.name}</div>
        <div class="mod-description">${mod.description || '无描述'}</div>
        ${mod.version ? `<div class="mod-version">版本: ${mod.version}</div>` : ''}
      </div>
      <div class="mod-actions">
        <button class="install-btn" onclick="installMod('${mod.name}', '${gameName}', '${gamePath}')">
          安装模组
        </button>
      </div>
    </div>
  `).join('');

  modsContainer.innerHTML = modsHtml;
}

function displayBackupList(backups: BackupInfo[], gameName: string, gamePath: string) {
  const backupsContainer = document.getElementById('backup-list');
  if (!backupsContainer) return;

  if (backups.length === 0) {
    backupsContainer.innerHTML = `
      <div class="no-backups">
        <p>暂无备份记录</p>
        <p>安装模组后将自动创建备份</p>
      </div>
    `;
    return;
  }

  const backupsHtml = backups.map(backup => `
    <div class="backup-item">
      <div class="backup-info">
        <div class="backup-timestamp">${backup.timestamp}</div>
        <div class="backup-mod">模组: ${backup.mod_name}</div>
        <div class="backup-files">影响文件: ${backup.files.length} 个</div>
      </div>
      <div class="backup-actions">
        <button class="restore-btn" onclick="restoreFromBackup('${gameName}', '${backup.timestamp}', '${gamePath}')">
          恢复此状态
        </button>
      </div>
    </div>
  `).join('');

  backupsContainer.innerHTML = backupsHtml;
}

function goBack() {
  // Return to the mod manager page
  switchPage('mod-manager');
}

async function uninstallMod(modName: string) {
  try {
    await invoke("uninstall_mod", { modName, gameName: selectedGame });
    console.log(`Successfully uninstalled mod: ${modName}`);
    
    // Refresh mod manager data
    if (currentPage === 'mod-manager') {
      loadModManagerPage();
    }
  } catch (error) {
    console.error(`Failed to uninstall mod: ${modName}`, error);
    alert(`卸载模组失败: ${error}`);
  }
}

// Make functions globally accessible for HTML onclick handlers
declare global {
  interface Window {
    switchPage: (pageId: string) => void;
    scanGames: () => Promise<void>;
    scanInstalledGames: () => Promise<void>;
    selectGame: (gameName: string) => void;
    installMod: (modName: string, gameName: string, gamePath: string) => Promise<void>;
    uninstallMod: (modName: string) => Promise<void>;
    restoreFromBackup: (gameName: string, timestamp: string, gamePath: string) => Promise<void>;
    viewModFiles: (modName: string) => Promise<void>;
    editGamePath: (gameName: string) => Promise<void>;
    saveGamePath: (gameName: string) => Promise<void>;
    cancelEditGamePath: (gameName: string) => void;
    openGameFolder: (gamePath: string) => Promise<void>;
    openModFolder: (gameName: string) => Promise<void>;
    loadModsPage: () => Promise<void>;
    updateUserName: () => void;
    updateUserAvatar: () => void;
    viewGameDetails: (gameName: string) => Promise<void>;
    goBack: () => void;
    getModCounts: (gameName: string) => Promise<[number, number]>;
  }
}

// Initialize application
window.addEventListener("DOMContentLoaded", () => {
  // Initialize all components
  initializeNavigation();
  initializeWindowControls();
  initializeUserProfile();
  
  // Load initial data
  scanInstalledGames();
  
  // Add smooth animations to mod manager cards
    setTimeout(() => {
      animateElements('.dashboard-card', 150);
    }, 300);
  
  // Make functions globally accessible
  window.switchPage = switchPage;
  window.scanGames = scanGames;
  window.scanInstalledGames = scanInstalledGames;
  window.selectGame = selectGame;
  window.installMod = installMod;
  window.uninstallMod = uninstallMod;
  window.restoreFromBackup = restoreFromBackup;
  window.viewModFiles = viewModFiles;
  window.editGamePath = editGamePath;
  window.saveGamePath = saveGamePath;
  window.cancelEditGamePath = cancelEditGamePath;
  window.openGameFolder = openGameFolder;
  window.openModFolder = openModFolder;
  window.loadModsPage = loadModManagerPage;
  window.updateUserName = updateUserName;
  window.updateUserAvatar = updateUserAvatar;
  window.viewGameDetails = viewGameDetails;
  window.goBack = goBack;
  window.getModCounts = getModCounts;
});

// Export functions for potential external use
export {
  switchPage,
  selectGame,
  installMod,
  uninstallMod,
  restoreFromBackup,
  getAvailableMods,
  getBackupList,
  viewModFiles,
  scanMods,
  scanInstalledGames,
  scanGames,
  editGamePath,
  openModFolder,
  openGameFolder,
  loadModManagerPage,
  updateUserName,
  updateUserAvatar,
  getModCounts
};
