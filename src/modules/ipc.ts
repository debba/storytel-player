import { ipcMain, IpcMainInvokeEvent, shell } from 'electron';
import path from 'path';
import { storeManager } from './store';
import { ServerManager } from './server';
import { TrayManager } from './tray';
import { WindowManager } from './window';
import { ApiConfig } from '../types';
import { i18n } from '../i18n';

export class IpcManager {
  private serverManager: ServerManager;
  private trayManager: TrayManager;
  private windowManager: WindowManager;

  constructor(serverManager: ServerManager, trayManager: TrayManager, windowManager: WindowManager) {
    this.serverManager = serverManager;
    this.trayManager = trayManager;
    this.windowManager = windowManager;
  }

  setupHandlers(): void {
    this.setupStoreHandlers();
    this.setupApiHandlers();
    this.setupTrayHandlers();
    this.setupLocaleHandlers();
    this.setupWindowHandlers();
    this.setupLogsHandlers();
  }

  private setupStoreHandlers(): void {
    ipcMain.handle('store-get', (_event: IpcMainInvokeEvent, key: string) => {
      return storeManager.get(key);
    });

    ipcMain.handle(
      'store-set',
      (_event: IpcMainInvokeEvent, key: string, value: any) => {
        storeManager.set(key, value);
      }
    );

    ipcMain.handle('store-remove', (_event: IpcMainInvokeEvent, key: string) => {
      storeManager.remove(key);
    });
  }

  private setupApiHandlers(): void {
    ipcMain.handle(
      'api:get',
      async (_event: IpcMainInvokeEvent, url: string, config: ApiConfig = {}) => {
        return await this.serverManager.injectRequest(
          'GET',
          url,
          undefined,
          config?.headers
        );
      }
    );

    ipcMain.handle(
      'api:post',
      async (
        _event: IpcMainInvokeEvent,
        url: string,
        data: any = {},
        config: ApiConfig = {}
      ) => {
        return await this.serverManager.injectRequest(
          'POST',
          url,
          data,
          config?.headers
        );
      }
    );

    ipcMain.handle(
      'api:put',
      async (
        _event: IpcMainInvokeEvent,
        url: string,
        data: any = {},
        config: ApiConfig = {}
      ) => {
        return await this.serverManager.injectRequest(
          'PUT',
          url,
          data,
          config?.headers
        );
      }
    );

    ipcMain.handle(
      'api:delete',
      async (_event: IpcMainInvokeEvent, url: string, config: ApiConfig = {}) => {
        return await this.serverManager.injectRequest(
          'DELETE',
          url,
          undefined,
          config?.headers
        );
      }
    );
  }

  private setupTrayHandlers(): void {
    ipcMain.on(
      'update-playing-state',
      (_event, { isPlaying, bookTitle }: { isPlaying: boolean; bookTitle: string }) => {
        this.trayManager.updatePlayingState({ isPlaying, bookTitle });
      }
    );

    ipcMain.on(
      'update-auth-state',
      (_event, { isAuthenticated }: { isAuthenticated: boolean }) => {
        this.trayManager.updatePlayingState({ isAuthenticated });
      }
    );
  }

  private setupLocaleHandlers(): void {
    ipcMain.handle('get-locale', () => {
      return i18n.getLanguage();
    });

    ipcMain.handle('set-locale', (_event: IpcMainInvokeEvent, locale: string) => {
      storeManager.set('appLanguage', locale);
      
      // Update the current language in i18n
      i18n.detectLanguage();
      
      // Refresh fastify translations
      const fastifyServer = this.serverManager.getServer();
      if (fastifyServer) {
        i18n.initialize(fastifyServer).catch(err => {
          console.error('Failed to reinitialize i18n:', err);
        });
      }
      
      return true;
    });
  }

  private setupLogsHandlers(): void {
    ipcMain.handle('open-logs-folder', () => {
      const logPath = path.join(process.env.USER_DATA_PATH || '', 'app.log');
      shell.showItemInFolder(logPath);
    });
  }

  private setupWindowHandlers(): void {
    ipcMain.handle('window-set-always-on-top', (_event: IpcMainInvokeEvent, alwaysOnTop: boolean) => {
      this.windowManager.setAlwaysOnTop(alwaysOnTop);
    });

    ipcMain.handle('window-is-always-on-top', () => {
      return this.windowManager.isAlwaysOnTop();
    });
  }
}
