import {build}from 'esbuild';
import {mkdir,readFile,writeFile,copyFile}from 'node:fs/promises';

const mapping={'index.html':'text/html; charset=utf-8','app.js':'text/javascript; charset=utf-8','style.css':'text/css; charset=utf-8','space-grotesk.ttf':'font/ttf'};
const assets={};
for(const[name,type]of Object.entries(mapping))assets[name]={type,data:(await readFile(new URL('../src/public/'+name,import.meta.url))).toString('base64')};
await writeFile(new URL('../worker/assets.generated.mjs',import.meta.url),'export const assets='+JSON.stringify(assets)+';\n');
await mkdir(new URL('../dist/server/',import.meta.url),{recursive:true});
await mkdir(new URL('../dist/.openai/',import.meta.url),{recursive:true});
await build({entryPoints:['worker/index.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',mainFields:['module','main'],conditions:['workerd','worker','browser'],external:['node:*'],minify:true});
await copyFile(new URL('../.openai/hosting.json',import.meta.url),new URL('../dist/.openai/hosting.json',import.meta.url));
await writeFile(new URL('../dist/.openai/deploy-config.json',import.meta.url),JSON.stringify({compatibility_date:'2026-11-16',compatibility_flags:['nodejs_compat']}));
console.log('Worker ESM gerado com API e assets; sem credenciais no pacote.');
