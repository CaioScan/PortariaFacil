import { parentPort, workerData } from 'node:worker_threads';
import { parseSpreadsheet } from './import-parser.mjs';
try {parentPort.postMessage({rows:await parseSpreadsheet(Buffer.from(workerData.bytes),workerData.filename)});}
catch(error){parentPort.postMessage({error:error.message});}
