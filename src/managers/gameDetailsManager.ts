import { GameAPI, ModAPI, BackupAPI } from '../api';
import type { ModInfo, BackupInfo } from '../types';

export class GameDetailsManager {
  constructor(private navigation: any) {}

  async viewGameDetails(gameName: string): Promise<void> {
    try {
      const games = await GameAPI.scanInstalledGames();
      const game = games.find(g => g.name === gameName);
      
      if (!game) {
        console.error('Game not found:', gameName);
        return;
      }

      const patchFolders = await GameAPI.getPatchFolders();
      const patchFolder = patchFolders.find(folder => folder.gameName === gameName);

      const availableMods = await ModAPI.getAvailableMods(gameName);
      const backups = await BackupAPI.getBackupList(gameName);
      const [availableCount, installedCount] = await ModAPI.getModCounts(gameName);

      this.updateGameDetailsPage(game, patchFolder, availableCount, installedCount);
      this.displayAvailableMods(availableMods, gameName, game.path);
      this.displayBackupList(backups, gameName, game.path);

      this.navigation.switchPage('game-details');
      
    } catch (error) {
      console.error('Error loading game details:', error);
      alert(`加载游戏详情失败: ${error}`);
    }
  }

  private updateGameDetailsPage(game: any, patchFolder: any, availableCount: number, installedCount: number): void {
    const gameDetailsTitle = document.getElementById('game-details-title');
    const gameNameDisplay = document.getElementById('game-name-display');
    const gamePathInput = document.getElementById('game-path-input') as HTMLInputElement;
    
    if (gameDetailsTitle) gameDetailsTitle.textContent = `${game.name} - 游戏详情`;
    if (gameNameDisplay) gameNameDisplay.textContent = game.name;
    if (gamePathInput) {
      gamePathInput.value = game.path;
      gamePathInput.setAttribute('data-original-path', game.path);
    }
    
    const modPathInput = document.getElementById('mod-path-input') as HTMLInputElement;
    if (modPathInput) {
      modPathInput.value = patchFolder ? patchFolder.path : '未设置模组路径';
    }

    const availableModsCount = document.getElementById('available-mods-count');
    const usedModsCount = document.getElementById('used-mods-count');
    if (availableModsCount) availableModsCount.textContent = availableCount.toString();
    if (usedModsCount) usedModsCount.textContent = installedCount.toString();
  }

  private displayAvailableMods(mods: ModInfo[], gameName: string, gamePath: string): void {
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
          <button class="install-btn" onclick="window.modManager.installMod('${mod.name}', '${gameName}', '${gamePath}')">
            安装模组
          </button>
          <button class="open-folder-btn" onclick="window.gameDetailsManager.openModFolder('${mod.path}')">
            打开文件夹
          </button>
        </div>
      </div>
    `).join('');

    modsContainer.innerHTML = modsHtml;
  }

  async openModFolder(modPath: string): Promise<void> {
    try {
      // 使用Tauri的shell功能打开模组文件夹
      const { invoke } = (window as any).__TAURI__ || {};
      if (invoke) {
        await invoke('open_folder', { 
          path: modPath 
        });
      } else {
        // 如果TAURI不可用，显示提示
        alert(`模组文件夹路径:\n${modPath}`);
      }
    } catch (error) {
      console.error('打开模组文件夹失败:', error);
      alert(`打开模组文件夹失败: ${error}`);
    }
  }

  private displayBackupList(backups: BackupInfo[], gameName: string, gamePath: string): void {
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
          <button class="restore-btn" onclick="window.modManager.restoreFromBackup('${gameName}', '${backup.timestamp}', '${gamePath}')">
            恢复此状态
          </button>

        </div>
      </div>
    `).join('');

    backupsContainer.innerHTML = backupsHtml;
  }

  goBack(): void {
    this.navigation.switchPage('mod-manager');
  }
}