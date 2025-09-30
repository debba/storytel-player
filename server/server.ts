import fastifyCmn from './fastify-common';

const PORT = parseInt(process.env.PORT || '3001', 10);

const start = async (): Promise<void> => {
    try {
        await fastifyCmn.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Storytel server running on port ${PORT}`);
    } catch (err) {
        fastifyCmn.log.error(err);
        process.exit(1);
    }
};

start();