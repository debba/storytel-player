import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import StorytelClient from './storytelApi';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fastifyJWT from '@fastify/jwt';
import fastifyCors from '@fastify/cors';

// Extend JWT user type
interface JWTUser {
    storytelToken: string;
    jwt: string;
    email: string;
}

// Extend FastifyRequest with user property
declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: JWTUser;
    }
}

// Extend Fastify instance with authenticate decorator
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}


dotenv.config({
    quiet: true
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const fastify = Fastify({ logger: process.env.NODE_ENV !== 'production' });

// Register plugins
fastify.register(fastifyCors, {
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
});

fastify.register(fastifyJWT, {
    secret: JWT_SECRET
});
// Authentication decorator
fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: 'Not authenticated' });
    }
});

// Route per login
fastify.post<{
    Body: { email: string; password: string };
}>('/api/login', async (request, reply) => {
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
    } catch (error: any) {
        reply.code(401).send({ error: error.message });
    }
});

// Route per logout
fastify.post('/api/logout', async (_request, reply) => {
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
                singleSignToken: request.user.storytelToken,
                jwt: ''
            }
        };

        const bookshelf = await storytelClient.getBookshelf();
        reply.send(bookshelf);
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

// Route per ottenere stream URL
fastify.post<{
    Body: { bookId: string };
}>('/api/stream', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { bookId } = request.body;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                singleSignToken: request.user.storytelToken,
                jwt: ''
            }
        };
        const streamUrl = await storytelClient.getStreamUrl(bookId);
        reply.send({ streamUrl });
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

// Route per salvare bookmark
fastify.post<{
    Params: { consumableId: string };
    Body: { position: number; note: string };
}>('/api/bookmarks/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { consumableId } = request.params;
        const { position, note } = request.body;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        await storytelClient.setBookmark(consumableId, position, note);

        reply.send({ success: true, message: 'Bookmark saved' });
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.delete<{
    Params: { consumableId: string; bookmarkId: string };
}>('/api/bookmarks/:consumableId/:bookmarkId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { consumableId, bookmarkId } = request.params;
        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        await storytelClient.deleteBookmark(consumableId, bookmarkId);

        reply.send({ success: true, message: 'Bookmark removed' });
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.put<{
    Params: { consumableId: string; bookmarkId: string };
    Body: any;
}>('/api/bookmarks/:consumableId/:bookmarkId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { consumableId, bookmarkId } = request.params;
        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        await storytelClient.updateBookmark(consumableId, bookmarkId, request.body);

        reply.send({ success: true, message: 'Bookmark removed' });
    } catch (error: any) {
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
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        const bookmarks = await storytelClient.getBookmarkPositional();
        reply.send(bookmarks);
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.get<{
    Params: { consumableId: string };
}>('/api/bookmark-positional/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { consumableId } = request.params;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        const bookmarks = await storytelClient.getBookmarkPositional(consumableId);
        reply.send(bookmarks);
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.put<{
    Params: { consumableId: string };
    Body: { position: number };
}>('/api/bookmark-positional/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { consumableId } = request.params;
        const { position } = request.body;

        const storytelClient = new StorytelClient();
        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        const deviceId = process.env.DEVICE_ID || crypto.randomUUID().toUpperCase();
        const updated = await storytelClient.updateBookmarkPositional(consumableId, position, deviceId);
        reply.send(updated);
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.get<{
    Params: { consumableId: string };
}>('/api/bookmarks/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const storytelClient = new StorytelClient();
        const { consumableId } = request.params;

        // Set the login data from JWT token
        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };

        const bookmarks = await storytelClient.getBookmark(consumableId);
        reply.send(bookmarks);
    } catch (error: any) {
        reply.code(500).send({ error: error.message });
    }
});

fastify.get<{
    Params: { consumableId: string };
}>('/api/bookmetadata/:consumableId', {
    preHandler: fastify.authenticate
}, async (request, reply) => {
    try {
        const { consumableId } = request.params;
        const storytelClient = new StorytelClient();

        storytelClient.loginData = {
            accountInfo: {
                jwt: request.user.jwt,
                singleSignToken: ''
            }
        };
        const bookInfoContent = await storytelClient.getPlayBookMetaData(consumableId);
        reply.send(bookInfoContent);
    } catch (error: any) {
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

fastify.get<{
    Querystring: { lang?: string };
}>('/api/translations', async (request, reply) => {
    try {
        const { lang } = request.query;

        if (lang === 'it') {
            const translations = await import('./locales/it.json');
            reply.send(translations.default);
        } else if (lang === 'en') {
            const translations = await import('./locales/en.json');
            reply.send(translations.default);
        } else {
            const translationsIt = await import('./locales/it.json');
            const translationsEn = await import('./locales/en.json');
            reply.send({
                it: translationsIt.default,
                en: translationsEn.default
            });
        }
    } catch (error: any) {
        reply.code(500).send({ error: 'Failed to load translations' });
    }
});

export default fastify;
