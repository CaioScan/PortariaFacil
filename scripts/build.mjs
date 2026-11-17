import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const pages = ['index.html', 'acompanhamento-entregas.html', 'painel-sindico.html', 'demo-morador-sindico.html', 'onboarding.html', 'painel-comunicacao.html'];
const sources = ['prototype/delivery-server.mjs', 'whatsapp-estudos-export/waha/bridge.mjs'];
const workflows = ['whatsapp-estudos-export/n8n-workflow.json', 'whatsapp-estudos-export/n8n-workflow-entregas.json'];

for (const source of sources) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(source, root))], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Sintaxe inválida: ${source}`);
}
for (const page of pages) {
  const html = await readFile(new URL(`prototype/${page}`, root), 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    new Script(match[1], { filename: page });
  }
}
for (const workflow of workflows) JSON.parse(await readFile(new URL(workflow, root), 'utf8'));

const files = [...pages.map(page => `prototype/${page}`), 'prototype/delivery-server.mjs', 'prototype/README.md', 'prototype/COMO-FUNCIONA.md', 'docs/APRESENTACAO.md', 'package.json'];
for (const filename of files) {
  const destination = new URL(`dist/${filename}`, root);
  await mkdir(new URL('.', destination), { recursive: true });
  await copyFile(new URL(filename, root), destination);
}
console.log(`Build concluído: ${pages.length} telas e servidor em dist/.`);
console.log('HTML/JavaScript: sintaxe validada. Workflows: JSON válido.');
console.log('JavaScript não exige compilação nativa; este build valida e empacota a demonstração.');
