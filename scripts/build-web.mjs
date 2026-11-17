import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=new URL('../',import.meta.url);
const modules=['server.mjs','db.mjs','domain.mjs','setup.mjs','native.mjs','import.mjs','import-parser.mjs','import-worker.mjs'];
const files=[...modules.map(file=>`web/${file}`),...['index.html','app.js','style.css','space-grotesk.ttf','FONT-LICENSE.txt'].map(file=>`web/public/${file}`),'web/README.md'];
for(const file of [...modules.map(file=>`web/${file}`),'web/public/app.js']){
  const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,root))],{stdio:'inherit'});
  if(result.status!==0)throw new Error(`Sintaxe inválida: ${file}`);
}
for(const file of files){const destination=new URL(`dist/painel/${file}`,root);await mkdir(new URL('.',destination),{recursive:true});await copyFile(new URL(file,root),destination);}
await copyFile(new URL('web/.env.example',root),new URL('dist/painel/.env.example',root));
const runtime=JSON.parse(await readFile(new URL('package.json',root),'utf8'));
runtime.scripts={start:'node --env-file-if-exists=.env web/server.mjs',setup:'node --env-file-if-exists=.env web/setup.mjs'};
await writeFile(new URL('dist/painel/package.json',root),JSON.stringify(runtime,null,2)+'\n');
await copyFile(new URL('package-lock.json',root),new URL('dist/painel/package-lock.json',root));
console.log('Build do painel pronto em dist/painel. Fontes, API e interface validadas.');
console.log('Credenciais e dados locais não fazem parte do pacote.');
