import {pathToFileURL,fileURLToPath} from 'url';import path from 'path';
const dir=path.dirname(fileURLToPath(import.meta.url));
const MAP={'@minecraft/server':'server.mjs','@minecraft/server-net':'net.mjs','@minecraft/server-admin':'admin.mjs','@minecraft/server-ui':'ui.mjs'};
export async function resolve(spec,ctx,next){if(MAP[spec])return {url:pathToFileURL(path.join(dir,'stubs',MAP[spec])).href,shortCircuit:true};return next(spec,ctx);}
