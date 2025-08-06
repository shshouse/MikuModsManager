import { ModAPI, BackupAPI } from '../api';

export class ModManager {
  constructor(private gameManager: any) {}

  async installMod(modName: string, gameName: string, gamePath: string): Promise<void> {
    try {
      const result = await ModAPI.installMod(modName, gameName, gamePath);
      console.log(`Successfully installed mod: ${modName}`);
      alert(result);
      
      // Refresh mod manager data
      await this.gameManager.loadModManagerPage();
    } catch (error) {
      console.error(`Failed to install mod: ${modName}`, error);
      alert(`安装模组失败: ${error}`);
    }
  }

  async restoreFromBackup(gameName: string, timestamp: string, gamePath: string): Promise<void> {
    try {
      const result = await BackupAPI.restoreFromBackup(gameName, timestamp, gamePath);
      console.log(`Successfully restored from backup: ${timestamp}`);
      alert(result);
      
      // Refresh mod manager data
      await this.gameManager.loadModManagerPage();
    } catch (error) {
      console.error(`Failed to restore from backup: ${timestamp}`, error);
      alert(`恢复备份失败: ${error}`);
    }
  }
}