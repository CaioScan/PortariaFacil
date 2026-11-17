import { Pool,neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor=WebSocket;
neonConfig.poolQueryViaFetch=true;
export function createDatabase(env) {
  if(!env.DATABASE_URL)throw new Error('Configure o segredo DATABASE_URL no Site.');
  const schema=env.DATABASE_SCHEMA||'portaria_facil';
  const dataSchema=env.DATA_SCHEMA||'public';
  for(const name of [schema,dataSchema])if(!/^[a-z_][a-z0-9_]{0,62}$/.test(name))throw new Error('Schema inválido.');
  const pool=new Pool({connectionString:env.DATABASE_URL,max:3,connectionTimeoutMillis:15000,idleTimeoutMillis:1000});
  pool.on('error',()=>console.error('Conexão Neon interrompida.'));
  return {pool,schema,dataSchema};
}
