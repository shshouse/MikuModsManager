import { GameAPI } from '../api';
import { GamesListUI } from '../ui/gamesList';

export class GameManager {
  private gamesListUI: GamesListUI;

  constructor() {
    this.gamesListUI = new GamesListUI('.games-list-container');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('pageChange', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.pageId === 'mod-manager') {
        this.loadModManagerPage();
      }
    });
  }

  async loadModManagerPage(): Promise<void> {
    try {
      const games = await GameAPI.scanInstalledGames();
      await this.gamesListUI.displayGames(games);
    } catch (error) {
      console.error('Failed to load mod manager data:', error);
      this.gamesListUI.showError('加载游戏列表失败: ' + error);
    }
  }

  async scanGames(): Promise<void> {
    try {
      const games = await GameAPI.scanInstalledGames();
      await this.gamesListUI.displayGames(games);
    } catch (error) {
      console.error('Failed to scan games:', error);
      this.gamesListUI.showError('扫描游戏失败: ' + error);
    }
  }

  async editGamePath(gameName: string): Promise<void> {
    try {
      const selectedFolder = await GameAPI.selectFolder("选择游戏文件夹");

      if (selectedFolder) {
        await GameAPI.updateGamePath(gameName, selectedFolder);
        alert(`游戏路径已更新: ${selectedFolder}`);
        await this.loadModManagerPage();
      }
    } catch (error) {
      console.error('Failed to update game path:', error);
      alert(`更新游戏路径失败: ${error}`);
    }
  }

  async openModFolder(gameName: string): Promise<void> {
    try {
      const patchFolders = await GameAPI.getPatchFolders();
      const patchFolder = patchFolders.find(folder => folder.gameName === gameName);
      
      if (patchFolder) {
        await GameAPI.openFolder(patchFolder.path);
      } else {
        alert(`未找到游戏 ${gameName} 的模组文件夹`);
      }
    } catch (error) {
      console.error('Failed to open mod folder:', error);
      alert(`打开模组文件夹失败: ${error}`);
    }
  }

  async openGameFolder(gamePath: string): Promise<void> {
    try {
      await GameAPI.openFolder(gamePath);
    } catch (error) {
      console.error('Failed to open game folder:', error);
      alert(`打开游戏目录失败: ${error}`);
    }
  }
}