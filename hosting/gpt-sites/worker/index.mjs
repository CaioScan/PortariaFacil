import { Buffer } from 'node:buffer';
import { createWebHandler } from '../src/server.mjs';
import { createDatabase } from '../src/db.mjs';
import { assets } from './assets.generated.mjs';

const loginFailures=new Map();

export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    const assetName={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/space-grotesk.ttf':'space-grotesk.ttf'}[url.pathname];
    if(request.method==='GET'&&assetName) {
      const asset=assets[assetName];
      return new Response(Buffer.from(asset.data,'base64'),{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}});
    }
    let database;
    try {
      database=createDatabase(env);
      const handler=createWebHandler({database,appOrigin:url.origin,secureCookies:url.protocol==='https:',loginFailures});
      const incoming={method:request.method,url:url.pathname+url.search,headers:Object.fromEntries(request.headers),socket:{remoteAddress:request.headers.get('oai-authenticated-user-id')||request.headers.get('cf-connecting-ip')||'site-visitor'},
        async *[Symbol.asyncIterator](){
          if(!request.body)return;
          const reader=request.body.getReader();
          try{while(true){const result=await reader.read();if(result.done)break;yield Buffer.from(result.value);}}finally{reader.releaseLock();}
        }
      };
      const headers=new Headers();let status=200;let payload;let ended=false;let headersSent=false;
      const outgoing={
        get headersSent(){return headersSent;},
        setHeader(name,value){headers.set(name,String(value));},
        writeHead(code,values={}){status=code;for(const [name,value]of Object.entries(values))headers.set(name,String(value));headersSent=true;},
        end(value){payload=value;ended=true;}
      };
      await handler(incoming,outgoing);
      if(!ended)throw new Error('Resposta incompleta.');
      return new Response(payload,{status,headers});
    }catch(error){
      console.error('Falha no serviço do painel:',error.code||error.name||'INTERNAL');
      return Response.json({error:'Não foi possível acessar o painel. Tente novamente.'},{status:503,headers:{'Cache-Control':'no-store'}});
    }finally{if(database)ctx.waitUntil(database.pool.end());}
  }
};
