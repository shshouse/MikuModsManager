import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { GameInfo, ModInfo, BackupInfo, PatchFolderInfo } from './types';

export class GameAPI {
  static async scanInstalledGames(): Promise<GameInfo[]> {
    return await invoke("scan_installed_games") as GameInfo[];
  }

  static async updateGamePath(gameName: string, newPath: string): Promise<void> {
    await invoke("update_game_path", { gameName, newPath });
  }

  static async getPatchFolders(): Promise<PatchFolderInfo[]> {
    return await invoke("get_patch_folders") as PatchFolderInfo[];
  }

  static async openFolder(path: string): Promise<void> {
    await invoke("open_folder", { path });
  }

  static async selectFolder(title: string): Promise<string | null> {
    const result = await open({
      directory: true,
      multiple: false,
      title
    });
    return result as string | null;
  }
}

export class ModAPI {
  static async getAvailableMods(gameName: string): Promise<ModInfo[]> {
    try {
      return await invoke("get_available_mods", { gameName }) as ModInfo[];
    } catch (error) {
      console.error(`Failed to get available mods for ${gameName}:`, error);
      return [];
    }
  }

  static async getModCounts(gameName: string): Promise<[number, number]> {
    try {
      return await invoke("get_mod_counts", { gameName }) as [number, number];
    } catch (error) {
      console.error(`Failed to get mod counts for ${gameName}:`, error);
      return [0, 0];
    }
  }

  static async installMod(modName: string, gameName: string, gamePath: string): Promise<string> {
    return await invoke("install_mod", { modName, gameName, gamePath }) as string;
  }
}

export class BackupAPI {
  static async getBackupList(gameName: string): Promise<BackupInfo[]> {
    try {
      return await invoke("get_backup_list", { gameName }) as BackupInfo[];
    } catch (error) {
      console.error(`Failed to get backup list for ${gameName}:`, error);
      return [];
    }
  }

  static async restoreFromBackup(gameName: string, timestamp: string, gamePath: string): Promise<string> {
    return await invoke("restore_from_backup", { gameName, timestamp, gamePath }) as string;
  }
}