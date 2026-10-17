import {mkdir,writeFile} from 'node:fs/promises';
import {png} from './png.mjs';
await mkdir('tests/fixtures',{recursive:true});
for(const [name,w,h] of [['marco-vertical',120,180],['marco-horizontal',180,120]])await writeFile(`tests/fixtures/${name}.png`,png(w,h,(x,y)=>x<8||y<8||x>=w-8||y>=h-8?[228,0,124,255]:[0,0,0,0]));
await writeFile('tests/fixtures/foto.png',png(400,300,(x,y)=>[Math.round(x/400*255),Math.round(y/300*255),140,255]));
