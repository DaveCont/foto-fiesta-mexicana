import {mkdir,writeFile} from 'node:fs/promises';
import {png} from './png.mjs';
await mkdir('icons',{recursive:true});
for(const [name,n] of [['icon-192',192],['icon-512',512],['icon-maskable-512',512]]) await writeFile(`icons/${name}.png`,png(n,n,(x,y)=>{const a=x/n,b=y/n;const camera=a>.22&&a<.78&&b>.32&&b<.69;const lens=Math.hypot(a-.5,b-.5)<.115;return lens?[26,20,35,255]:camera?[255,248,238,255]:Math.hypot(a-.5,b-.5)<.45?[228,0,124,255]:[26,20,35,255];}));
