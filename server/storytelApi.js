const axios = require('axios');
const {encryptPassword} = require('./passwordCrypt');

class StorytelClient {
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

    async login(email, password) {
        const encryptedPassword = encryptPassword(password.trim());
        const url = `https://www.storytel.com/api/login.action?m=1&uid=${email.trim()}&pwd=${encryptedPassword}`;

        try {
            const response = await this.client.get(url);
            this.loginData = response.data;
            return this.loginData;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async getBookmarkPositional(
        consumableId = null
    ) {
        const url = `https://api.storytel.net/bookmarks/positional?kidsMode=false&orderBy=updated&orderDirection=desc`;

        try {
            const response = await this.client.get(url, {
                params: {
                    ...consumableId && {consumableIds: consumableId},
                },
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`
                }
            });
            return response.data.bookmarks;
        } catch (error) {
            throw new Error(`Failed to get bookmark positional: ${error.message}`);
        }
    }

    async getBookshelf() {
        const url = `https://www.storytel.com/api/getBookShelf.action?token=${this.loginData.accountInfo.singleSignToken}`;

        try {
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get bookshelf: ${error.message}`);
        }
    }

    async getPlayBookMetaData(
        consumableId
    ) {
        const url = `https://api.storytel.net/playback-metadata/consumable/${consumableId}`;

        try {
            const response = await this.client.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get bookinfo: ${error.message}`);
        }
    }


    async getStreamUrl(bookId) {
        const url = `https://www.storytel.com/mp3streamRangeReq?startposition=0&programId=${bookId}&token=${this.loginData.accountInfo.singleSignToken}`;

        try {
            const response = await this.client.get(url);
            return response.request.res.responseUrl || response.headers.location;
        } catch (error) {
            if (error.response && error.response.headers.location) {
                return error.response.headers.location;
            }
            throw new Error(`Failed to get stream URL: ${error.message}`);
        }
    }

    async getBookmark(consumableId) {
        const url = `https://api.storytel.net/bookmarks/manual?type=abook&consumableId=${consumableId}`;

        try {
            const response = await this.client.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get bookmark: ${error.message}`);
        }
    }

    async setBookmark(consumableId, position, note) {
        const url = 'https://api.storytel.net/bookmarks/manual';
        try {
            await this.client.post(url,{
                position,
                consumableId,
                note,
                type: "abook"
            }, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            } );
        } catch (error) {
            throw new Error(`Failed to set bookmark: ${error.message}`);
        }
    }

    async updateBookmark(consumableId, bookmarkId, bookmarkData) {

        const {bookmarks} = await this.getBookmark(consumableId);

        if (!bookmarks || !bookmarks.some(bookmark => bookmark.id === bookmarkId)){
            throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
        }

        const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
        try {
            await this.client.put(url,bookmarkData, {
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            } );
        } catch (error) {
            throw new Error(`Failed to update bookmark: ${error.message}`);
        }
    }


    async deleteBookmark(consumableId, bookmarkId) {

        const {bookmarks} = await this.getBookmark(consumableId);

        if (!bookmarks || !bookmarks.some(bookmark => bookmark.id === bookmarkId)){
            throw new Error(`Failed to remove bookmark: bookmark does not exists!`);
        }

        const url = `https://api.storytel.net/bookmarks/manual/${bookmarkId}?id=${bookmarkId}`;
        try {
            await this.client.delete(url,{
                headers: {
                    'Authorization': `Bearer ${this.loginData.accountInfo.jwt}`,
                    'Accept': 'application/vnd.storytel.bookmark+json;v=2.0'
                }
            } );
        } catch (error) {
            throw new Error(`Failed to delete bookmark: ${error.message}`);
        }
    }

}

module.exports = StorytelClient;
