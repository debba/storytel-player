import axios, { AxiosInstance } from 'axios';
import { encryptPassword } from './passwordCrypt';

interface AccountInfo {
    jwt: string;
    singleSignToken: string;
}

interface LoginData {
    accountInfo: AccountInfo;
}

interface Bookmark {
    id: string;
    position: number;
    note?: string;
}

interface BookmarkResponse {
    bookmarks: Bookmark[];
}

class StorytelClient {
    private client: AxiosInstance;
    public loginData: LoginData;

    constructor() {
        this.client = axios.create({
            headers: {
                'x-storytel-terminal': 'ios',
                'user-agent': 'Storytel/25.38.0 (iOS 26.0; iPhone16,2) Release/924.1'
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status < 400;
            },
            params: {
                version: '25.38.0'
            }
        });

        this.loginData = {
            accountInfo: {
                jwt: '',
                singleSignToken: ''
            }
        };
    }

    async login(email: string, password: string): Promise<LoginData> {
        const encryptedPassword = encryptPassword(password.trim());
        const url = `https://www.storytel.com/api/login.action?m=1&uid=${email.trim()}&pwd=${encryptedPassword}`;

        try {
            const response = await this.client.get<LoginData>(url);
            this.loginData = response.data;
            return this.loginData;
        } catch (error: any) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async getBookmarkPositional(consumableId: string | null = null): Promise<Bookmark[]> {
        const url = `https://api.storytel.net/bookmarks/positional?kidsMode=false&orderBy=updated&orderDirection=desc`;

        try {
            const response = await this.client.get<{ bookmarks: Bookmark[] }>(url, {
                params: {
                    ...(consumableId && { consumableIds: consumableId }),
                },
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`
                }
            });
            return response.data.bookmarks;
        } catch (error: any) {
            throw new Error(`Failed to get bookmark positional: ${error.message}`);
        }
    }

    async updateBookmarkPositional(
        consumableId: string,
        position: number,
        deviceId: string
    ): Promise<any> {
        const url = `https://api.storytel.net/bookmarks/positional`;

        try {
            const response = await this.client.post(url, {
                deviceId: deviceId,
                action: "player_paused",
                secondsSinceCreated: 0,
                position,
                type: "abook",
                kidsMode: false,
                consumableId: consumableId
            }, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`
                }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to get bookmark positional: ${error.message}`);
        }
    }

    async getBookshelf(): Promise<any> {
        const url = `https://www.storytel.com/api/getBookShelf.action?token=${this.loginData.accountInfo.singleSignToken}`;

        try {
            const response = await this.client.get(url);
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to get bookshelf: ${error.message}`);
        }
    }

    async getPlayBookMetaData(consumableId: string): Promise<any> {
        const url = `https://api.storytel.net/playback-metadata/consumable/${consumableId}`;

        try {
            const response = await this.client.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`
                }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to get bookinfo: ${error.message}`);
        }
    }

    async getStreamUrl(bookId: string): Promise<string> {
        const url = `https://www.storytel.com/mp3streamRangeReq?startposition=0&programId=${bookId}&token=${this.loginData.accountInfo.singleSignToken}`;

        try {
            const response = await this.client.get(url);
            return (response.request as any).res.responseUrl || response.headers.location;
        } catch (error: any) {
            if (error.response && error.response.headers.location) {
                return error.response.headers.location;
            }
            throw new Error(`Failed to get stream URL: ${error.message}`);
        }
    }

    async getBookmark(consumableId: string): Promise<BookmarkResponse> {
        const url = `https://api.storytel.net/bookmarks/manual?type=abook&consumableId=${consumableId}`;

        try {
            const response = await this.client.get<BookmarkResponse>(url, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(`Failed to get bookmark: ${error.message}`);
        }
    }

    async setBookmark(consumableId: string, position: number, note: string): Promise<void> {
        const url = 'https://api.storytel.net/bookmarks/manual';
        try {
            await this.client.post(url, {
                position,
                consumableId,
                note,
                type: "abook"
            }, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            });
        } catch (error: any) {
            throw new Error(`Failed to set bookmark: ${error.message}`);
        }
    }

    async updateBookmark(consumableId: string, bookmarkId: string, bookmarkData: any): Promise<void> {
        const { bookmarks } = await this.getBookmark(consumableId);

        if (!bookmarks || !bookmarks.some(bookmark => bookmark.id === bookmarkId)) {
            throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
        }

        const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
        try {
            await this.client.put(url, bookmarkData, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            });
        } catch (error: any) {
            throw new Error(`Failed to update bookmark: ${error.message}`);
        }
    }

    async deleteBookmark(consumableId: string, bookmarkId: string): Promise<void> {
        const { bookmarks } = await this.getBookmark(consumableId);

        if (!bookmarks || !bookmarks.some(bookmark => bookmark.id === bookmarkId)) {
            throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
        }

        const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
        try {
            await this.client.delete(url, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            });
        } catch (error: any) {
            throw new Error(`Failed to delete bookmark: ${error.message}`);
        }
    }
}

export default StorytelClient;