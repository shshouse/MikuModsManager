import { Navigation } from './ui/navigation';
import { GameManager } from './managers/gameManager';
import { GameDetailsManager } from './managers/gameDetailsManager';
import { ModManager } from './managers/modManager';
import { SettingsManager } from './managers/settingsManager';

// Global managers
let navigation: Navigation;
let gameManager: GameManager;
let gameDetailsManager: GameDetailsManager;
let modManager: ModManager;
let settingsManager: SettingsManager;

// Initialize application
window.addEventListener("DOMContentLoaded", () => {
  // Initialize managers
  navigation = new Navigation();
  gameManager = new GameManager();
  gameDetailsManager = new GameDetailsManager(navigation);
  modManager = new ModManager(gameManager);
  settingsManager = new SettingsManager();

  // Make managers globally accessible for HTML onclick handlers
  (window as any).navigation = navigation;
  (window as any).gameManager = gameManager;
  (window as any).gameDetailsManager = gameDetailsManager;
  (window as any).modManager = modManager;
  (window as any).settingsManager = settingsManager;

  // Legacy global functions for HTML compatibility
  (window as any).switchPage = (pageId: string) => navigation.switchPage(pageId);
  (window as any).scanGames = () => gameManager.scanGames();
  (window as any).editGamePath = (gameName: string) => gameManager.editGamePath(gameName);
  (window as any).openGameFolder = (gamePath: string) => gameManager.openGameFolder(gamePath);
  (window as any).openModFolder = (gameName: string) => gameManager.openModFolder(gameName);
  (window as any).loadModsPage = () => gameManager.loadModManagerPage();
  (window as any).viewGameDetails = (gameName: string) => gameDetailsManager.viewGameDetails(gameName);
  (window as any).goBack = () => gameDetailsManager.goBack();
  (window as any).installMod = (modName: string, gameName: string, gamePath: string) => 
    modManager.installMod(modName, gameName, gamePath);
  (window as any).restoreFromBackup = (gameName: string, timestamp: string, gamePath: string) => 
    modManager.restoreFromBackup(gameName, timestamp, gamePath);
  (window as any).updateUserName = () => settingsManager.updateUserName();
  (window as any).updateUserAvatar = () => settingsManager.updateUserAvatar();

  // Initialize navigation
  navigation.initialize();
});

// Export managers for potential external use
export {
  navigation,
  gameManager,
  gameDetailsManager,
  modManager,
  settingsManager
};