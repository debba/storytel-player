import esbuild from 'esbuild';

const build = async (): Promise<void> => {
    try {
        await esbuild.build({
            entryPoints: ['fastify-common.ts'],
            bundle: true,
            platform: 'node',
            target: 'node18',
            outfile: 'dist/server.js',
            format: 'cjs',
            external: [],
            minify: process.env.NODE_ENV === 'production',
            sourcemap: process.env.NODE_ENV !== 'production',
            logLevel: 'info',
            define: {
                'process.env.NODE_ENV': '"production"'
            }
        });

        console.log('✅ Build completed successfully');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
};

build();