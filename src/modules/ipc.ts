import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { storeManager } from './store';
import { ServerManager } from './server';
import { TrayManager } from './tray';
import { ApiConfig } from '../types';
import { i18n } from '../i18n';

export class IpcManager {
  private serverManager: ServerManager;
  private trayManager: TrayManager;

  constructor(serverManager: ServerManager, trayManager: TrayManager) {
    this.serverManager = serverManager;
    this.trayManager = trayManager;
  }

  setupHandlers(): void {
    this.setupStoreHandlers();
    this.setupApiHandlers();
    this.setupTrayHandlers();
    this.setupLocaleHandlers();
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
  }
}
