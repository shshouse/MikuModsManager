export interface ModInfo {
  name: string;
  path: string;
  game: string;
  version?: string;
  description?: string;
}

export interface GameInfo {
  name: string;
  path: string;
  icon: string | null;
  executable?: string;
  mod_support: boolean;
}

export interface PatchFolderInfo {
  gameName: string;
  path: string;
  folderName: string;
  fileCount: number;
  createdTime?: string;
}

export interface BackupInfo {
  timestamp: string;
  mod_name: string;
  files: string[];
  backup_path: string;
}