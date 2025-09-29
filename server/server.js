const fastifyCmn = require('./fastify-common');
const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        await fastifyCmn.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Storytel server running on port ${PORT}`);
    } catch (err) {
        fastifyCmn.log.error(err);
        process.exit(1);
    }
};


start();
