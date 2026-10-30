import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';

export async function buildNavigation(){
 await build({entryPoints:['ui/collection-menu.jsx'],bundle:true,format:'esm',outfile:'web/collection-menu.js',minify:true,define:{'process.env.NODE_ENV':'"production"'}});
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) await buildNavigation();
