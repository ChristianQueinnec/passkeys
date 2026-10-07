import { build } from 'esbuild';

await build({
    entryPoints: ['build/index.js'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'build/server.cjs',
    sourcemap: false,
});
