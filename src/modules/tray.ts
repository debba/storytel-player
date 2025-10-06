import {Tray, Menu, app, shell, dialog} from 'electron';
import * as path from 'path';
import {PlayingState} from '../types';
import {WindowManager} from './window';
import {i18n} from '../i18n';

export class TrayManager {
    private tray: Tray | null = null;
    private currentPlayingState: PlayingState = {
        isPlaying: false,
        bookTitle: null,
        isAuthenticated: false,
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
            : i18n.t('tray.noBookPlaying');

        const menuTemplate: Electron.MenuItemConstructorOptions[] = [
            {
                label: displayTitle,
                enabled: false,
            },
            {type: 'separator'},
            {
                label: i18n.t('tray.showApp'),
                click: () => this.windowManager.show(),
            },
        ];

        if (this.currentPlayingState.isPlaying || this.currentPlayingState.bookTitle) {
            const playPauseLabel = this.currentPlayingState.isPlaying
                ? i18n.t('tray.pause')
                : i18n.t('tray.play');

            menuTemplate.push(
                {type: 'separator'},
                {
                    label: playPauseLabel,
                    click: () => this.sendToRenderer('tray-play-pause'),
                },
                {
                    label: i18n.t('tray.playbackSpeed'),
                    submenu: this.createSpeedSubmenu(),
                }
            );
        }

        menuTemplate.push({type: 'separator'});

        menuTemplate.push({
            label: "About",
            click: () => {
                const appInfo = [];
                appInfo.push(`storytel-player@${app.getVersion()}\n`);
                for (const prop in process.versions) {
                    if (
                        prop === "node" ||
                        prop === "v8" ||
                        prop === "electron" ||
                        prop === "chrome"
                    ) {
                        appInfo.push(`${prop}: ${process.versions[prop]}`);
                    }
                }
                dialog.showMessageBoxSync(this.windowManager.getWindow()!, {
                    buttons: ["OK"],
                    title: "About",
                    normalizeAccessKeys: true,
                    defaultId: 0,
                    cancelId: 0,
                    message: appInfo.join("\n"),
                    type: "info",
                });
            }
        }, {
            label: "Help",
            submenu: [
                {
                    label: "Github Project",
                    click: () =>
                        shell.openExternal(
                            "https://github.com/debba/storytel-player"
                        ),
                }
            ]
        });

        if (this.currentPlayingState.isAuthenticated) {
            menuTemplate.push({
                label: i18n.t('tray.logout'),
                click: () => {
                    this.windowManager.show();
                    this.sendToRenderer('tray-logout');
                },
            });
        }

        menuTemplate.push({
            label: i18n.t('tray.quit'),
            click: () => {
                //@ts-ignore
                app.isQuitting = true;
                app.quit();
            },
        });

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
