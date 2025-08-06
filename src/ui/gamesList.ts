import { ModAPI } from '../api';
import type { GameInfo } from '../types';

export class GamesListUI {
  private container: Element | null;

  constructor(containerSelector: string) {
    this.container = document.querySelector(containerSelector);
  }

  async displayGames(games: GameInfo[]): Promise<void> {
    if (!this.container) return;

    if (games.length === 0) {
      this.showNoGames();
      return;
    }

    const gameRows = await Promise.all(games.map(game => this.createGameRow(game)));
    this.renderGamesTable(gameRows);
  }

  private showNoGames(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="no-games">
        <h3>未找到游戏</h3>
        <p>请点击"扫描游戏"按钮来搜索已安装的游戏</p>
        <button class="retry-btn" onclick="window.gameManager.scanGames()">扫描游戏</button>
      </div>
    `;
  }

  private async createGameRow(game: GameInfo): Promise<string> {
    try {
      const [availableCount, usedCount] = await ModAPI.getModCounts(game.name);
      
      return `
        <div class="table-row game-row" data-game-name="${game.name}" onclick="window.gameDetailsManager.viewGameDetails('${game.name}')" style="cursor: pointer;">
          <div class="table-cell game-name">
            <div class="game-info">
              <div class="game-details">
                <div class="game-title" title="${game.name}">${game.name}</div>
              </div>
            </div>
          </div>
          <div class="table-cell available-mods">
            <span class="count-badge">${availableCount}</span>
          </div>
          <div class="table-cell used-mods">
            <span class="count-badge">${usedCount}</span>
          </div>
          <div class="table-cell actions">
            <button class="action-btn view-details" onclick="event.stopPropagation(); window.gameDetailsManager.viewGameDetails('${game.name}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              查看详情
            </button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error(`Failed to get mod counts for ${game.name}:`, error);
      return this.createFallbackGameRow(game);
    }
  }

  private createFallbackGameRow(game: GameInfo): string {
    return `
      <div class="table-row game-row" data-game-name="${game.name}" onclick="window.gameDetailsManager.viewGameDetails('${game.name}')" style="cursor: pointer;">
        <div class="table-cell game-name">
          <div class="game-info">
            <div class="game-details">
              <div class="game-title" title="${game.name}">${game.name}</div>
            </div>
          </div>
        </div>
        <div class="table-cell available-mods">
          <span class="count-badge">0</span>
        </div>
        <div class="table-cell used-mods">
          <span class="count-badge">0</span>
        </div>
        <div class="table-cell actions">
          <button class="action-btn view-details" onclick="event.stopPropagation(); window.gameDetailsManager.viewGameDetails('${game.name}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            查看详情
          </button>
        </div>
      </div>
    `;
  }

  private renderGamesTable(gameRows: string[]): void {
    if (!this.container) return;

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
          ${gameRows.join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = gamesTableHtml;
  }

  showError(message: string): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="error-message">
        <h3>加载失败</h3>
        <p>${message}</p>
        <button onclick="window.gameManager.loadModManagerPage()" class="retry-btn">重试</button>
      </div>
    `;
  }
}