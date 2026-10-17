import {all,put,remove} from './storage.js';
import {decode,orientation,reduced} from './camera.js';
export const none={id:'none',name:'Sin marco'};
const thumbnails=new Map(),images=new Map();
export async function loadFrames(){let packed=[];try{const r=await fetch('frames.json');if(r.ok)packed=await r.json();}catch{}return [...packed.map(f=>({...f,source:'packaged'})),...await all('frames')];}
export function matching(frames,o){return [none,...frames.filter(f=>f.orientation===o||f.orientation==='square'||o==='square')];}
export async function frameImage(frame){if(!frame||frame.id==='none')return null;if(!images.has(frame.id))images.set(frame.id,(async()=>{if(frame.blob)return decode(frame.blob);return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{images.delete(frame.id);reject(Error('No se pudo cargar el marco'));};img.src=frame.src;});})());return images.get(frame.id);}
export async function thumbnail(frame){if(frame.id==='none')return '';if(!thumbnails.has(frame.id))thumbnails.set(frame.id,reduced(await frameImage(frame),240).toDataURL());return thumbnails.get(frame.id);}
export async function addFrame(file){const b=new Uint8Array(await file.slice(0,8).arrayBuffer());if([...b].join(',')!=='137,80,78,71,13,10,26,10')throw Error('Selecciona un marco PNG');const image=await decode(file),ctx=image.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,image.width,image.height).data;let transparent=false;for(let i=3;i<data.length;i+=4)if(data[i]<255){transparent=true;break;}const frame={id:crypto.randomUUID(),name:file.name.replace(/\.png$/i,'').replace(/[-_]/g,' '),blob:file,width:image.width,height:image.height,orientation:orientation(image.width,image.height),source:'user'};await put('frames',frame);return {frame,transparent};}
export async function deleteFrame(id){await remove('frames',id);thumbnails.delete(id);images.delete(id);}
