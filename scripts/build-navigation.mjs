import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';

export async function buildNavigation(){
 await build({entryPoints:['ui/collection-menu.jsx'],bundle:true,format:'esm',outfile:'web/collection-menu.js',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{
  name:'external-sonner-styles',setup(build){
   // Sonner also injects its CSS at runtime. Our CSP permits only external
   // stylesheets, so emit its official CSS through the import above instead.
   build.onLoad({filter:/sonner\/dist\/index\.mjs$/},async({path})=>{
    const source=await readFile(path,'utf8');
    if(!/^__insertCSS\(.*\);$/m.test(source))throw Error('Review Sonner CSS packaging before upgrading.');
    return {contents:source.replace(/^__insertCSS\(.*\);$/m,''),loader:'js'};
   });
  }
 }]});
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) await buildNavigation();
