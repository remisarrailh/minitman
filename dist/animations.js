const $=s=>document.querySelector(s),canvas=$('#preview'),ctx=canvas.getContext('2d');
let frames=[],index=0,playing=false,last=0,elapsed=0;
const numeric=new Intl.Collator('fr',{numeric:true});
function status(text,error=false){$('#status').textContent=text;$('#status').classList.toggle('error',error);}
function stop(){playing=false;$('#play').textContent='Lire';}
async function frame(name,src,path=name){const image=new Image();image.src=src;await image.decode();return {name,src,path,image};}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;if(!frames.length)return;
 const zoom=Math.max(1,Math.min(12,Number($('#zoom').value)||6)),maxHeight=Math.max(...frames.map(f=>f.image.height)),bottom=130+maxHeight*zoom/2;
 function paint(f,alpha){ctx.globalAlpha=alpha;ctx.drawImage(f.image,170,bottom-f.image.height*zoom,f.image.width*zoom,f.image.height*zoom);}
 if($('#onion').checked&&frames.length>1)paint(frames[(index+frames.length-1)%frames.length],.25);paint(frames[index],1);ctx.globalAlpha=1;
 status(`Frame ${index+1}/${frames.length} · ${frames[index].name} · ${frames[index].image.width} × ${frames[index].image.height}`);
 document.querySelectorAll('.frame').forEach((el,i)=>el.classList.toggle('active',i===index));
}
function render(){const container=$('#frames');container.replaceChildren();frames.forEach((f,i)=>{const el=document.createElement('div');el.className='frame';const img=document.createElement('img');img.src=f.src;img.alt=f.name;img.onclick=()=>{stop();index=i;draw();};const name=document.createElement('p');name.className='name';name.textContent=`${i+1}. ${f.name}`;el.append(img,name);
 for(const [label,delta]of [['←',-1],['→',1],['×',0]]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',delta?`Déplacer ${f.name} ${delta<0?'à gauche':'à droite'}`:`Retirer ${f.name}`);b.disabled=delta<0&&i===0||delta>0&&i===frames.length-1;b.onclick=()=>{stop();if(!delta){if(f.src.startsWith('blob:'))URL.revokeObjectURL(f.src);frames.splice(i,1);index=Math.min(i,frames.length-1);}else{[frames[i],frames[i+delta]]=[frames[i+delta],frames[i]];index=i+delta;}index=Math.max(0,index);render();};el.append(b);}container.append(el);});if(!frames.length)status('Ajoutez des images ou chargez une animation du jeu.');draw();}
function clear(){stop();frames.forEach(f=>{if(f.src.startsWith('blob:'))URL.revokeObjectURL(f.src);});frames=[];index=0;render();}
$('#files').onchange=async e=>{stop();const files=[...e.target.files].sort((a,b)=>numeric.compare(a.name,b.name));for(const f of files){const src=URL.createObjectURL(f);try{frames.push(await frame(f.name,src));}catch{URL.revokeObjectURL(src);status(`Image illisible : ${f.name}`,true);}}render();e.target.value='';};
$('#clear').onclick=clear;
$('#load').onclick=async()=>{stop();$('#load').disabled=true;try{const base=`assets/themes/${$('#theme').value}/`,response=await fetch(base+'manifest.json');if(!response.ok)throw Error('Manifeste inaccessible');const m=await response.json(),preset=$('#preset').value;let paths;
 if(preset==='robot-1-animation'){const s=m.sprites.find(s=>s.id===18);paths=[1,2,3,4,3,2].map(i=>s.variants[i]);}
 else if(preset==='robot-2-animation'){const s=m.sprites.find(s=>s.id===19);paths=[0,1,2,3,4,5,4,3,2,1].map(i=>s.variants[i]);}
 else if(preset==='robot-states')paths=[18,19,20].map(id=>m.sprites.find(s=>s.id===id).path);
 else if(preset==='poses')paths=[m.sprites.find(s=>s.id===11).variants[4],... [12,15,17].map(id=>m.sprites.find(s=>s.id===id).path)];
 else{const id=preset==='game-right'?11:preset==='game-left'||preset==='mirror'?11:Number(preset),s=m.sprites.find(s=>s.id===id);paths=s.variants||[s.path];if(preset==='game-right'||preset==='game-left')paths=[0,2,5,6,1,6,5,2].map(i=>paths[i]);}
 const loaded=await Promise.all(paths.map(p=>frame(p.split('/').pop(),base+p+'?v='+Date.now(),p)));clear();frames=loaded;if(preset==='game-left'||preset==='mirror'){frames=await Promise.all(loaded.map(async f=>{const c=document.createElement('canvas');c.width=f.image.width;c.height=f.image.height;const x=c.getContext('2d');x.translate(c.width,0);x.scale(-1,1);x.drawImage(f.image,0,0);return frame(f.name+' (miroir)',c.toDataURL(),f.path);}));}render();}catch(e){status(e.message,true);}finally{$('#load').disabled=false;}};
$('#play').onclick=()=>{if(!frames.length)return;playing=!playing;elapsed=0;$('#play').textContent=playing?'Pause':'Lire';};
function step(delta){stop();if(frames.length){index=(index+delta+frames.length)%frames.length;draw();}}
$('#prev').onclick=()=>step(-1);$('#next').onclick=()=>step(1);$('#zoom').oninput=draw;$('#onion').onchange=draw;
$('#export').onclick=()=>{if(!frames.length)return;const json={fps:Math.max(1,Math.min(60,Number($('#fps').value)||10)),frames:frames.map(f=>({file:f.path,width:f.image.width,height:f.image.height}))};const url=URL.createObjectURL(new Blob([JSON.stringify(json,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='animation-order.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function tick(time){const dt=Math.min(250,time-last);last=time;if(playing&&frames.length){const period=1000/Math.max(1,Math.min(60,Number($('#fps').value)||10));elapsed+=dt;while(elapsed>=period){elapsed-=period;index=(index+1)%frames.length;}draw();}requestAnimationFrame(tick);}render();requestAnimationFrame(tick);
