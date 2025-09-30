import { Tray, Menu, app } from 'electron';
import * as path from 'path';
import { PlayingState } from '../types';
import { WindowManager } from './window';

export class TrayManager {
  private tray: Tray | null = null;
  private currentPlayingState: PlayingState = {
    isPlaying: false,
    bookTitle: null,
  };
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  create(): void {
    const iconPath = path.join(__dirname, '../../../assets/icon.png');
    this.tray = new Tray(iconPath);

    this.updateMenu();
    this.tray.setToolTip('Storytel Player');

    this.tray.on('double-click', () => {
      if (this.windowManager.isVisible()) {
        this.windowManager.hide();
      } else {
        this.windowManager.show();
      }
    });
  }

  updatePlayingState(state: Partial<PlayingState>): void {
    this.currentPlayingState = {
      ...this.currentPlayingState,
      ...state,
    };
    this.updateMenu();
  }

  private truncateTitle(title: string, maxLength: number = 50): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }

  updateMenu(): void {
    if (!this.tray) return;

    const displayTitle = this.currentPlayingState.bookTitle
      ? this.truncateTitle(this.currentPlayingState.bookTitle)
      : 'No book playing now';

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: displayTitle,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Show App',
        click: () => this.windowManager.show(),
      },
    ];

    if (this.currentPlayingState.isPlaying || this.currentPlayingState.bookTitle) {
      menuTemplate.push(
        { type: 'separator' },
        {
          label: 'Play/Pause',
          click: () => this.sendToRenderer('tray-play-pause'),
        },
        {
          label: 'Playback Speed',
          submenu: this.createSpeedSubmenu(),
        }
      );
    }

    menuTemplate.push(
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
            app.isQuitting = true;
          app.quit();
        },
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  private createSpeedSubmenu(): Electron.MenuItemConstructorOptions[] {
    const speeds = [0.5, 1.0, 1.25, 1.75, 2.0];
    return speeds.map((speed) => ({
      label: `${speed}x`,
      click: () => this.sendToRenderer('tray-set-speed', speed),
    }));
  }

  private sendToRenderer(channel: string, ...args: any[]): void {
    const window = this.windowManager.getWindow();
    if (window) {
      window.webContents.send(channel, ...args);
    }
  }
}
