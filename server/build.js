const esbuild = require('esbuild');

const build = async () => {
  try {
    await esbuild.build({
      entryPoints: ['server.js'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist/server.js',
      format: 'cjs',
      external: [
      ],
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      logLevel: 'info'
    });

    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
};

build();
