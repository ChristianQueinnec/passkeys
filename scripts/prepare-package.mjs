import { readFile, writeFile } from 'node:fs/promises';

const entry = 'build/index.js';
let source = await readFile(entry, 'utf8');
source = source.replace("env('HOST', '0.0.0.0')", "env('HOST', '127.0.0.1')");
source = source.replace("env('PORT', !path && '3000')", "env('PORT', !path && '54123')");
await writeFile(entry, source);

const handlerEntry = 'build/handler.js';
let handler = await readFile(handlerEntry, 'utf8');
handler = handler.replace('await server.init({', 'const initialization = server.init({');
handler = handler.replace('fileURLToPath(import.meta.url)', '__filename');
if (!handler.includes('const ensureInitialized =')) {
    handler = handler.replace(
        'const handler = sequence(\n',
        'const ensureInitialized = (req, res, next) => initialization.then(() => next()).catch(next);\n\nconst handler = sequence(\n',
    );
}
handler = handler.replace(
    "([serve(path.join(dir, 'client'), true), serve_prerendered(), ssr].filter(Boolean))",
    "([ensureInitialized, serve(path.join(dir, 'client'), true), serve_prerendered(), ssr].filter(Boolean))",
);
await writeFile(handlerEntry, handler);
