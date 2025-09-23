const axios = require('axios');
const { encryptPassword } = require('./passwordCrypt');

class StorytelClient {
    constructor() {
        this.client = axios.create({
            headers: {
                'User-Agent': 'okhttp/3.12.8'
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status < 400;
            }
        });

        this.loginData = {
            accountInfo: {
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

    async getBookshelf() {
        const url = `https://www.storytel.com/api/getBookShelf.action?token=${this.loginData.accountInfo.singleSignToken}`;

        try {
            const response = await this.client.get(url);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get bookshelf: ${error.message}`);
        }
    }

    async getBookInfoContent(
        bookId
    ) {
        const url = `https://api.storytel.net/playback-metadata/consumable/${bookId}?token=${this.loginData.accountInfo.singleSignToken}`;

        try {
            const response = await this.client.get(url);
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

    async setBookmark(bookId, position) {
        const microsecToSec = 1000000;
        const params = new URLSearchParams({
            token: this.loginData.accountInfo.singleSignToken,
            bookId: bookId,
            bookName: 'test',
            pos: (position * microsecToSec).toString(),
            type: '1'
        });

        const url = 'https://www.storytel.se/api/setABookmark.action';

        try {
            await this.client.post(url, params);
        } catch (error) {
            throw new Error(`Failed to set bookmark: ${error.message}`);
        }
    }
}

module.exports = StorytelClient;
