const fastify = require('fastify')({ logger: true });
const StorytelClient = require('./storytelApi');

require('dotenv').config();

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Register plugins
fastify.register(require('@fastify/cors'), {
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['POST', 'PATCH', 'PUT', 'DELETE'],
});

fastify.register(require('@fastify/jwt'), {
    secret: JWT_SECRET
});

// Authentication decorator
fastify.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: 'Not authenticated' });
    }
});

// Route per login
fastify.post('/api/login', async (request, reply) => {
    try {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.code(400).send({ error: 'Email and password required' });
        }

        const storytelClient = new StorytelClient();
        const loginData = await storytelClient.login(email, password);
        // Create JWT token with storytel client data
        const token = fastify.jwt.sign({
            storytelToken: loginData.accountInfo.singleSignToken,
            jwt: loginData.accountInfo.jwt,
            email: email
        });

        reply.send({ success: true, message: 'Login successful', token });
    } catch (error) {
        reply.code(401).send({ error: error.message });
    }
});

// Route per logout
fastify.post('/api/logout', async (request, reply) => {
    reply.send({ success: true, message: 'Logged out successfully' });
});

// Route per ottenere bookshelf
fastify.get('/api/bookshelf', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const storytelClient = new StorytelClient();

        storytelClient.loginData = {
            accountInfo: {
                singleSignToken: request.user.storytelToken
            }
        };

        const bookshelf = await storytelClient.getBookshelf();
        reply.send(bookshelf);
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

// Route per ottenere stream URL
fastify.post('/api/stream', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { bookId } = request.body;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                singleSignToken: request.user.storytelToken
            }
        };
        const streamUrl = await storytelClient.getStreamUrl(bookId);
        reply.send({ streamUrl });
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

// Route per salvare bookmark
fastify.post('/api/bookmarks/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {

        const { consumableId } = request.params;

        const { position, note } = request.body;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        await storytelClient.setBookmark(consumableId, position, note);

        reply.send({ success: true, message: 'Bookmark saved' });
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.delete('/api/bookmarks/:consumableId/:bookmarkId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {

        const { consumableId, bookmarkId } = request.params;
        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        await storytelClient.deleteBookmark(consumableId, bookmarkId);

        reply.send({ success: true, message: 'Bookmark removed' });
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.put('/api/bookmarks/:consumableId/:bookmarkId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {

        const { consumableId, bookmarkId } = request.params;
        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        await storytelClient.updateBookmark(consumableId, bookmarkId, request.body);

        reply.send({ success: true, message: 'Bookmark removed' });
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});




fastify.get('/api/bookmark-positional', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        const bookmarks = await storytelClient.getBookmarkPositional();
        reply.send(bookmarks);

    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});


fastify.get('/api/bookmark-positional/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {


        const { consumableId } = request.params;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        const bookmarks = await storytelClient.getBookmarkPositional(consumableId);
        reply.send(bookmarks);

    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});


fastify.put('/api/bookmark-positional/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {


        const { consumableId } = request.params;
        const {position} = request.body;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        const deviceId = process.env.DEVICE_ID || crypto.randomUUID().toUpperCase();
        const updated = await storytelClient.updateBookmarkPositional(consumableId, position, deviceId);
        reply.send(updated);

    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.get('/api/bookmarks/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {

        const storytelClient = new StorytelClient();
        const { consumableId } = request.params;

        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };

        const bookmarks = await storytelClient.getBookmark(consumableId);
        reply.send(bookmarks);

    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.get('/api/bookmetadata/:consumableId', {
    preHandler: fastify.authenticate
}, async(request, reply) => {
    try {

        const { consumableId } = request.params;
        const storytelClient = new StorytelClient();

        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt
            }
        };
        const bookInfoContent = await storytelClient.getPlayBookMetaData(consumableId);
        reply.send(bookInfoContent);
    } catch (error) {
        reply.code(500).send({ error: error.message });
    }
});

// Route per controllare stato autenticazione
fastify.get('/api/auth/status', async (request, reply) => {
    try {
        await request.jwtVerify();
        reply.send({ authenticated: true });
    } catch (err) {
        reply.send({ authenticated: false });
    }
});

// Start server
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Storytel server running on port ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
