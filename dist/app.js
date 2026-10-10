/* Browser UI and renderer. The core does not depend on DOM or animation frames. */
'use strict';
document.documentElement.classList.toggle('dev-mode',new URLSearchParams(location.search).get('dev')==='true');
const {Game,rowAddress,triple,pixelX}=MinitCore;
const game=new Game(MINIT_ASSETS),$=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
game.continuous=true;game.skyHeight=160;game.fpsInterior=true;
const fpsRoom=new FpsRoom(game);
let fpsDebug=false;const debugWorld=document.createElement('canvas');const debugCtx=debugWorld.getContext('2d');
try{const saved=JSON.parse(localStorage.getItem("minitman-custom-zones"));if(saved&&Array.isArray(saved.collisions)&&Array.isArray(saved.teleports))game.customZones=saved;}catch{}
const screen=document.createElement('canvas');screen.width=280;screen.height=192;const gfx=screen.getContext('2d');
const palette=[[180,0,255],[0,210,40],[0,130,255],[255,120,0]];
function bitmap(bytes,width,height,hgr=false){
 const c=document.createElement('canvas');c.width=width*7;c.height=height;const x=c.getContext('2d'),image=x.createImageData(c.width,height);
 for(let y=0;y<height;y++)for(let p=0;p<c.width;p++){
  const base=hgr?rowAddress(y):y*width,v=bytes[base+Math.floor(p/7)],bit=(v>>(p%7))&1;
  const idx=(y*c.width+p)*4;if(!bit){if(hgr)image.data[idx+3]=255;continue;}
  const neighbor=q=>q>=0&&q<c.width&&((bytes[base+Math.floor(q/7)]>>(q%7))&1);
  const rgb=neighbor(p-1)||neighbor(p+1)?[255,255,255]:palette[((v>>7)&1)*2+(p&1)];
  image.data.set([...rgb,255],idx);
 }x.putImageData(image,0,0);return c;
}
const scenes=MINIT_ASSETS.backgrounds.map(b=>bitmap(b,40,192,true));
const sprites=MINIT_ASSETS.sprites.map(s=>s.variants.map(b=>bitmap(b,s.width,s.height)));
const combatArtwork={};
for(const name of ['mine','bonus']){const img=new Image();img.src='assets/themes/original/sprites/'+name+'.png';img.onload=()=>combatArtwork[name]=img;}
let artworkReady=false,selectedTheme='original';
try{const saved=localStorage.getItem('minitman-theme');if(MINIT_THEMES[saved])selectedTheme=saved;}catch{}
for(const [id,theme] of Object.entries(MINIT_THEMES)){const option=document.createElement('option');option.value=id;option.textContent=theme.name;$('#theme').append(option);}
$('#theme').value=selectedTheme;
async function loadArtwork(){
 const entries=[...MINIT_ART.backgrounds,...MINIT_ART.sprites,...MINIT_ART.sprites.flatMap(item=>(item.variants||[]).slice(1).map(path=>({...item,path})))];
 const loaded=await Promise.all(entries.map(async item=>{
  const img=new Image();img.src=MINIT_THEMES[selectedTheme].base+item.path+'?refresh='+Date.now();await img.decode();
  if(img.naturalWidth!==item.width||img.naturalHeight!==item.height)throw new Error(item.path+' : dimensions attendues '+item.width+' × '+item.height);
  return img;
 }));
 const collisionBase=MINIT_THEMES[selectedTheme].collisionBase;
 const collisionImages=collisionBase?await Promise.all(MINIT_ART.backgrounds.map(async item=>{
  const img=new Image();img.src=collisionBase+item.path+'?refresh='+Date.now();await img.decode();
  if(img.naturalWidth!==280||img.naturalHeight!==192)throw new Error('Dimensions du masque : '+item.path);
  return img;
 })):loaded.slice(0,3);
 const byPath=new Map(entries.map((item,i)=>[item.path,loaded[i]]));
 for(let i=0;i<3;i++){
  scenes[i]=loaded[i];
  const c=document.createElement('canvas');c.width=280;c.height=192;const x=c.getContext('2d');x.drawImage(collisionImages[i],0,0);
  const pixels=x.getImageData(0,0,280,192).data,bits=new Array(8192).fill(0);
  for(let y=0;y<192;y++)for(let px=0;px<280;px++){const j=(y*280+px)*4;if(pixels[j+3]>127&&(pixels[j]||pixels[j+1]||pixels[j+2]))bits[rowAddress(y)+Math.floor(px/7)]|=1<<(px%7);}
  MINIT_ASSETS.backgrounds[i]=bits;
 }
 for(let i=0;i<MINIT_ART.sprites.length;i++){
  const item=MINIT_ART.sprites[i],variants=[];
  sprites[i]=Array.from({length:MINIT_ASSETS.sprites[i].variants.length},(_,shift)=>{
   const c=document.createElement('canvas');c.width=Math.max(28,item.width);c.height=item.height;const x=c.getContext('2d');if(item.mirrorOf!==undefined){x.translate(item.width+2*(item.variants?0:shift),0);x.scale(-1,1);}x.drawImage(item.variants?byPath.get(item.variants[shift]):loaded[i+3],item.variants?0:shift,0);
   const pixels=x.getImageData(0,0,c.width,c.height).data,bits=new Array(c.width/7*c.height).fill(0);
   for(let y=0;y<c.height;y++)for(let px=0;px<c.width;px++)if(pixels[(y*c.width+px)*4+3]>127)bits[y*c.width/7+Math.floor(px/7)]|=1<<(px%7);
   variants.push(bits);return c;
  });
  MINIT_ASSETS.sprites[i].variants=variants;MINIT_ASSETS.sprites[i].width=Math.max(28,item.width)/7;
 }
 artworkReady=true;
}
loadArtwork().catch(error=>{artworkReady=true;game.notice='Chargement des PNG impossible : '+error.message;console.error(error);});
$('#theme').onchange=async()=>{
 const previous=selectedTheme,paused=game.paused;selectedTheme=$('#theme').value;
 $('#theme').disabled=true;artworkReady=false;game.paused=true;clearInput();
 try{await loadArtwork();try{localStorage.setItem('minitman-theme',selectedTheme);}catch{}}
 catch(error){selectedTheme=previous;$('#theme').value=previous;game.notice='Thème indisponible : '+error.message;console.error(error);}
 finally{artworkReady=true;game.paused=paused;$('#theme').disabled=false;last=performance.now();accumulator=0;}
};
const keys=new Set(),pointers={fire:new Set(),turn:new Set(),drop:new Set(),jump:new Set(),crouch:new Set()},joy={x:0,y:0,pointer:null};
const taps={fire:false,turn:false,drop:false,cockpit:false,interact:false,jump:false,crouch:false};
const axisTap={x:0,y:0};
const mouse=new MouseJoystick();mouse.world=true;mouse.skyHeight=game.skyHeight;mouse.enabled=matchMedia('(pointer: fine)').matches;
let started=false,sound=false,audio,last=0,accumulator=0;
function speedUI(value){
 const percent=game.setSpeedPercent(value);$('#speed-slider').value=String(percent);$('#speed-value').value=String(percent);
 try{localStorage.setItem('minitman-speed-percent-v2',String(percent));}catch{}
}
let savedSpeed=230;try{const stored=localStorage.getItem('minitman-speed-percent-v2');if(stored!==null)savedSpeed=Number(stored);}catch{}
speedUI(savedSpeed);
$('#speed-slider').addEventListener('input',e=>speedUI(Number(e.target.value)));
$('#speed-value').addEventListener('input',e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value)&&value>=10&&value<=400){game.setSpeedPercent(value);$('#speed-slider').value=String(game.speedPercent);try{localStorage.setItem('minitman-speed-percent-v2',String(game.speedPercent));}catch{}}});
$('#speed-value').addEventListener('change',e=>speedUI(e.target.valueAsNumber));
$('#speed-reset').onclick=()=>speedUI(230);
function pilotSpeedUI(value){
 const percent=game.setPilotSpeedPercent(value);$('#pilot-speed-slider').value=String(percent);$('#pilot-speed-value').value=String(percent);
 try{localStorage.setItem('minitman-pilot-speed-percent-v2',String(percent));}catch{}
}
let savedPilotSpeed=190;try{const stored=localStorage.getItem('minitman-pilot-speed-percent-v2');if(stored!==null)savedPilotSpeed=Number(stored);}catch{}
pilotSpeedUI(savedPilotSpeed);
$('#pilot-speed-slider').addEventListener('input',e=>pilotSpeedUI(Number(e.target.value)));
$('#pilot-speed-value').addEventListener('input',e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value)&&value>=10&&value<=400){game.setPilotSpeedPercent(value);$('#pilot-speed-slider').value=String(game.pilotSpeedPercent);try{localStorage.setItem('minitman-pilot-speed-percent-v2',String(game.pilotSpeedPercent));}catch{}}});
$('#pilot-speed-value').addEventListener('change',e=>pilotSpeedUI(e.target.valueAsNumber));
$('#pilot-speed-reset').onclick=()=>pilotSpeedUI(190);
function jumpHeightUI(value){
 const percent=game.setJumpHeightPercent(value);$('#jump-height-slider').value=String(percent);$('#jump-height-value').value=String(percent);
 try{localStorage.setItem('minitman-jump-height-percent-v4',String(percent));}catch{}
}
let savedJumpHeight=10;try{const stored=localStorage.getItem('minitman-jump-height-percent-v4');if(stored!==null)savedJumpHeight=Number(stored);}catch{}
jumpHeightUI(savedJumpHeight);
$('#jump-height-slider').addEventListener('input',e=>jumpHeightUI(Number(e.target.value)));
$('#jump-height-value').addEventListener('input',e=>{const value=e.target.valueAsNumber;if(Number.isFinite(value)&&value>=10&&value<=400){game.setJumpHeightPercent(value);$('#jump-height-slider').value=String(game.jumpHeightPercent);try{localStorage.setItem('minitman-jump-height-percent-v4',String(game.jumpHeightPercent));}catch{}}});
$('#jump-height-value').addEventListener('change',e=>jumpHeightUI(e.target.valueAsNumber));
$('#jump-height-reset').onclick=()=>jumpHeightUI(10);
const loupeThreshold={bridge:135,stock:50};
for(const kind of ['bridge','stock']){
 const storageKey='minitman-loupe-y-v2-'+kind,slider=$('#loupe-'+kind+'-slider'),field=$('#loupe-'+kind+'-value');
 try{const stored=localStorage.getItem(storageKey);if(stored!==null&&Number.isFinite(Number(stored)))loupeThreshold[kind]=Math.max(0,Math.min(262,Number(stored)));}catch{}
 function update(value){if(!Number.isFinite(value))value=loupeThreshold[kind];loupeThreshold[kind]=Math.round(Math.max(0,Math.min(262,value)));slider.value=field.value=String(loupeThreshold[kind]);try{localStorage.setItem(storageKey,String(loupeThreshold[kind]));}catch{}}
 update(loupeThreshold[kind]);slider.oninput=()=>update(slider.valueAsNumber);field.oninput=()=>{if(Number.isFinite(field.valueAsNumber))update(field.valueAsNumber);};field.onchange=()=>update(field.valueAsNumber);
}
const respawnInBase=$('#respawn-in-base');
try{respawnInBase.checked=localStorage.getItem('minitman-respawn-in-base')==='true';}catch{}
game.respawnInBase=respawnInBase.checked;
respawnInBase.onchange=()=>{game.respawnInBase=respawnInBase.checked;try{localStorage.setItem('minitman-respawn-in-base',String(game.respawnInBase));}catch{}};
for(const [kind,setter,initial] of [['computer-limit','setComputerHitLimit',3],['respawn','setRespawnSeconds',3],['bridge-chance','setEnemyBridgeChance',25],['spawn','setEnemySpawnSeconds',30],['safety','setEnemySafetyRadius',10]]){
 const slider=$('#enemy-'+kind+'-slider'),field=$('#enemy-'+kind+'-value'),key='minitman-enemy-v2-'+kind;
 function update(value){if(!Number.isFinite(value))return;const applied=game[setter](value);slider.value=field.value=String(applied);try{localStorage.setItem(key,String(applied));}catch{}}
 let saved=initial;try{const v=localStorage.getItem(key);if(v!==null&&Number.isFinite(Number(v)))saved=Number(v);}catch{}update(saved);slider.oninput=()=>update(slider.valueAsNumber);field.onchange=()=>update(field.valueAsNumber);
}
const trainMissileOffset={x:2,y:0};
$('#missile-preview').onchange=()=>{if(!started)$('#overlay').hidden=$('#missile-preview').checked;};
for(const group of ['train','pad-0','pad-1','pad-2'])for(const axis of ['x','y']){
 const id='missile-'+group+'-'+axis,slider=$('#'+id+'-slider'),field=$('#'+id+'-value'),key='minitman-v2-'+id;
 function update(value){if(!Number.isFinite(value))return;value=Math.round(Math.max(Number(slider.min),Math.min(Number(slider.max),value)));slider.value=field.value=String(value);if(group==='train')trainMissileOffset[axis]=value;else game.missilePadPositions[Number(group.slice(-1))][axis]=value+(axis==='y'?23:0);try{localStorage.setItem(key,String(value));}catch{}}
 let value=Number(field.value);try{const saved=localStorage.getItem(key);if(saved!==null&&Number.isFinite(Number(saved)))value=Number(saved);}catch{}update(value);slider.oninput=()=>update(slider.valueAsNumber);field.oninput=()=>{if(Number.isFinite(field.valueAsNumber))update(field.valueAsNumber);};
}
function input(){
 const onFoot=Boolean(game.pilot),keyboard=true;
 const x=(keys.has('ArrowRight')||keyboard&&keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keyboard&&keys.has('KeyQ')?1:0);
 const y=(keys.has('ArrowDown')||keyboard&&keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keyboard&&keys.has('KeyZ')?1:0);
 const fine=(keys.has('ShiftLeft')||keys.has('ShiftRight')?.2:1)*(!onFoot&&magnifierActive(game.worldPosition())?.25:1);
 const m=mouse.sample(onFoot?{x:game.pilot.x-11,y:game.pilot.y}:game.worldPosition(),game.carrying);
 const manual=x||y||joy.x||joy.y||axisTap.x||axisTap.y;
 return {up:joy.y<-.5||keyboard&&(y<0||axisTap.y<0),down:joy.y>.5||keyboard&&(y>0||axisTap.y>0),jump:taps.jump||keys.has('KeyZ')||pointers.jump.size>0,crouch:taps.crouch||keyboard&&(y>0||axisTap.y>0)||joy.y>.5||pointers.crouch.size>0,interact:taps.interact,cockpit:taps.cockpit,
 x:(x||joy.x||axisTap.x||(!keyboard?m.x:0))*fine,y:(y||joy.y||axisTap.y||(!keyboard?m.y:0))*fine,
 aimX:mouse.inside?m.aimX:(x||joy.x||axisTap.x),aimY:mouse.inside?m.aimY:(y||joy.y||axisTap.y),
 aimTargetX:mouse.enabled&&mouse.inside?mouse.targetX:undefined,aimTargetY:mouse.enabled&&mouse.inside?mouse.targetY:undefined,
 fire:taps.fire||!onFoot&&keys.has('Space')||pointers.fire.size>0||m.fire,drop:taps.drop||keys.has('KeyC')||keys.has('KeyX')||pointers.drop.size>0||m.drop};
}
function clearInput(){keys.clear();mouse.reset();Object.values(pointers).forEach(s=>s.clear());Object.keys(taps).forEach(k=>taps[k]=false);axisTap.x=axisTap.y=0;joy.x=joy.y=0;joy.pointer=null;$('#stick').style.transform='';game.previous={};}
function tone(kind){
 if(!sound)return;
 try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
  const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
  o.type='square';o.frequency.value={place:880,pickup:660,fire:140,crash:65,drop:95,complete:1100,turn:220}[kind]||120;
  g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.09);
 }catch{}
}
function drawSprite(type,t,alpha=1){gfx.globalAlpha=alpha;gfx.drawImage(sprites[type][t[1]],t[0]*7,t[2]);gfx.globalAlpha=1;}
function drawScene(scene){
 gfx.drawImage(scenes[scene-1],0,0);
 if(scene===1){
  for(let i=0;i<game.trusses;i++)if(!game.bridgeDamage.truss.includes(i))drawSprite(21,MINIT_ASSETS.trusses[i]);
  for(let i=0;i<game.beams;i++)if(!game.bridgeDamage.beam.includes(i))drawSprite(22,MINIT_ASSETS.beams[i]);
  const target=game.carrying?game.nextTarget(game.carrying):game.nextTarget('truss');
  if(target&&!game.completed)drawSprite(game.carrying==='beam'?22:21,target,.2+.15*Math.sin(game.tick*.08));
 }
 if(scene===3){
  const coords=[[20,6],[25,3],[30,0]];
  // Original $B6AC descriptors: triangles bottom 118 / step 3; bars bottom 128 / step 2.
  for(let k=0;k<3;k++)for(let n=0;n<game.stock[k];n++)drawSprite(k===1?22:21,[...coords[k],(k===1?128:118)-n*(k===1?2:3)]);
 }
}
function magnifierActive(world){
 const target=game.carrying?game.nextTarget(game.carrying):null;
 const nearBridge=game.carrying&&target&&world.x<310&&world.y>=loupeThreshold.bridge;
 const nearStock=game.scene===3&&MINIT_ASSETS.pickupColumns.some((column,i)=>{
  const kind=MINIT_ASSETS.pickupKinds[i],x=560+column*7+MINIT_ASSETS.pickupVariants[i][0];
  return (game.stock[kind]>0||game.carrying)&&Math.abs(world.x+13-x)<50&&world.y>=loupeThreshold.stock;
 });
 return Boolean(started&&!game.pilot&&(nearBridge||nearStock));
}
function renderMagnifier(world){
 const lens=$('#magnifier'),view=$('#magnifier-view'),near=magnifierActive(world);
 lens.hidden=!near;if(!near)return;
 const zoom=view.getContext('2d');zoom.imageSmoothingEnabled=false;
 const sx=Math.max(0,Math.min(canvas.width-140,(world.x+21)*2-70));
 const sy=Math.max(0,Math.min(canvas.height-112,(world.y+game.skyHeight+17)*2-56));
 zoom.drawImage(canvas,sx,sy,140,112,0,0,420,336);
 const scale=canvas.clientWidth/canvas.width,cx=(world.x+21)*2*scale,cy=(world.y+game.skyHeight+7)*2*scale;
 const width=lens.offsetWidth,height=lens.offsetHeight;
 const left=Math.max(6,Math.min(canvas.clientWidth-width-6,cx+35));
 let top=cy-height-20;if(top<6)top=cy+25;
 top=Math.max(6,Math.min(canvas.clientHeight-height-6,top));
 lens.style.left=`${left}px`;lens.style.top=`${canvas.offsetTop+top}px`;
}
function render(){
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(0,game.skyHeight*2);
 for(let scene=1;scene<=3;scene++){drawScene(scene);ctx.drawImage(screen,(scene-1)*560,scene===1?140:0,560,384);}
 const world=game.worldPosition();
 function actor(type,x,y,alpha=1){const t=triple(x,y);ctx.globalAlpha=alpha;ctx.drawImage(sprites[type][t[1]],t[0]*14,t[2]*2,sprites[type][t[1]].width*2,sprites[type][t[1]].height*2);ctx.globalAlpha=1;}
 for(const p of game.falls)actor(p.kind==='beam'?22:21,p.x,p.y);
 const missilePreview=$('#missile-preview').checked;
 const shownTrain=missilePreview?{x:315,y:168,cargo:true}:game.train;
 if(shownTrain){const t=shownTrain;ctx.drawImage(sprites[24][0],t.x*2,t.y*2,126,24);if(t.cargo)ctx.drawImage(sprites[25][0],(t.x+trainMissileOffset.x)*2,(t.y+trainMissileOffset.y)*2,70,18);}
 const pads=game.missilePads();for(let i=0;i<3;i++)if(missilePreview||game.missileSlots[i]==='loaded')actor(26,pads[i].x,pads[i].y-23);for(const m of game.launching)actor(26,m.x,m.y);
 ctx.strokeStyle='#fff';ctx.lineWidth=2;for(const p of game.shots){const vx=p.vx??p.v,vy=p.vy||0,d=Math.hypot(vx,vy)||1;ctx.beginPath();ctx.moveTo(p.x*2,p.y*2);ctx.lineTo((p.x+vx/d*4)*2,(p.y+vy/d*4)*2);ctx.stroke();}
 if(game.winchVisible())actor(23,world.x+13,world.y+11);
 if(game.carrying)actor(game.carrying==='beam'?22:21,world.x+3,world.y+13);
 for(const enemy of game.enemies){const sequence=enemy.state===1?[1,2,3,4,3,2]:enemy.state===2?[0,1,2,3,4,5,4,3,2,1]:[0];const frame=sequence[Math.floor(enemy.animation*15)%sequence.length];const img=sprites[17+enemy.state][frame];ctx.drawImage(img,Math.round(enemy.x*2),Math.round((enemy.y+2)*2),img.width*2,img.height*2);}
 ctx.fillStyle='#ff8060';for(const shot of game.enemyShots)ctx.fillRect(shot.x*2,shot.y*2,8,2);
 for(const [name,items]of [['mine',game.mines],['bonus',game.bonuses]]){const img=combatArtwork[name];if(img)for(const item of items)ctx.drawImage(img,item.x*2,(item.y-img.height)*2,img.width*2,img.height*2);}
 for(const explosion of game.explosions){const img=sprites[27][Math.min(6,Math.floor(explosion.age*14))];ctx.drawImage(img,explosion.x*2,explosion.y*2,img.width*2,img.height*2);}
 const alpha=game.invincible&&game.tick%12<6?.35:1;
 const heliY=world.y+(game.landed?3:0);
 const displayOrientation=magnifierActive(world)?2:game.orientation;
 if(game.respawnRemaining<=0)actor(displayOrientation,world.x,heliY,alpha);
 if(game.respawnRemaining<=0&&(game.landed||game.tick%6<3))actor(displayOrientation+5,world.x,heliY-1,alpha);
 if(game.pilot){
  const visual=game.pilotVisual(),p=game.pilot;
  const blend=game.paused?1:Math.min(1,accumulator*60),px=(p.previousX??p.x)+(p.x-(p.previousX??p.x))*blend,py=(p.previousY??p.y)+(p.y-(p.previousY??p.y))*blend;
  if(visual.frame!==undefined){const img=sprites[visual.type][visual.frame];ctx.save();ctx.translate(Math.round(px*2),Math.round((py+2)*2));if(visual.mirror){ctx.translate(28,0);ctx.scale(-1,1);}ctx.drawImage(img,0,0,img.width*2,img.height*2);ctx.restore();}
  else actor(visual.type,p.x,p.y+2);
 }
 for(const id of ['jump','crouch'])$('#'+id).hidden=!game.pilot;
 $('#cockpit').textContent=fpsRoom.active?'Interagir · E':game.fpsEntrance()?'Entrer · E':game.pilot?'Embarquer · E':'Sortir · E';
 ctx.restore();
 if(fpsRoom.active||fpsDebug){if(fpsDebug){debugWorld.width=canvas.width;debugWorld.height=canvas.height;debugCtx.drawImage(canvas,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(debugWorld,0,0,canvas.width/2,canvas.height/2);ctx.save();ctx.translate(canvas.width/2,0);fpsRoom.renderInspection(ctx,canvas.width/2,canvas.height/2,sprites,scenes);ctx.restore();ctx.fillStyle='#9fffd0';ctx.font='22px monospace';ctx.fillText('DEBUG 2D · états partagés',12,28);if(fpsRoom.active)ctx.fillText('Joueur : étage '+(fpsRoom.player.level+1)+' · escalier '+fpsRoom.project(fpsRoom.player).distance.toFixed(1),12,canvas.height/2+28);for(const e of game.enemies.filter(e=>e.fps).slice(0,6)){ctx.fillText('Robot : étage '+(e.fps.level+1)+' · escalier '+fpsRoom.project(e.fps).distance.toFixed(1),12,canvas.height/2+60+game.enemies.indexOf(e)*28);}}else fpsRoom.render(ctx,canvas.width,canvas.height,sprites,scenes);$('#magnifier').hidden=true;}else renderMagnifier(world);
 document.body.classList.toggle('fps-mode',fpsRoom.active);
 if(!fpsRoom.active&&document.pointerLockElement===canvas)document.exitPointerLock();
 $('#scene').textContent=['LE PONT','LE BÂTIMENT','RAVITAILLEMENT'][game.scene-1];
 const sec=Math.ceil(game.time);$('#timer').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
 $('#score').textContent=String(game.score).padStart(3,'0');$('#lives').textContent=game.infiniteLives?'♥ ∞':'♥ '.repeat(game.lives)||'—';
 $('#notice').textContent=game.paused?'Partie en pause':game.fpsEntrance()?'E · Entrer dans la base ('+(game.fpsEntrance()==='roof'?'accès du toit':'étage 3')+')':game.notice;$('#missile-progress').textContent='Missiles : '+game.launchedMissiles+'/3 · Ordi : '+game.computerHits+'/'+game.computerHitLimit+' · prêts : '+game.missileSlots.filter(s=>s==='loaded').length;
 $('#progress').textContent=`Pont : ${game.trusses-game.bridgeDamage.truss.length}/9 triangles · ${game.beams-game.bridgeDamage.beam.length}/8 poutres${game.carrying?' · AU TREUIL':''}`;
}
function endOverlay(){
 $('#overlay h2').textContent=game.won?'Mission accomplie !':'Fin de partie';
 $('#overlay p').textContent=`Score : ${game.score} · ${game.won?'Les trois missiles ont été lancés.':'Reprenez la mission depuis le début.'}`;
 $('#overlay small').textContent=game.won?'Pont réparé, livraisons et trois lancements accomplis.':'Réparez le pont, protégez la base et lancez les trois missiles.';
 $('#start').textContent='Rejouer';$('#overlay').hidden=false;
}
function frame(now){
 const dt=Math.min((now-last)/1000,.1);last=now;
 if(started&&!game.paused){accumulator+=dt;while(accumulator>=1/60){fpsRoom.sync();
 if(fpsRoom.active){const control={forward:(keys.has('KeyZ')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy.y,strafe:(keys.has('KeyD')?1:0)-(keys.has('KeyQ')?1:0)+joy.x,turn:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),fire:Boolean(mouse.mask&1)||pointers.fire.size>0||taps.fire,crouch:keys.has('ControlLeft')||keys.has('ControlRight')||pointers.crouch.size>0,jump:keys.has('Space')||pointers.jump.size>0,interact:taps.interact||taps.cockpit};game.step({});fpsRoom.step(control,1/60);}else{game.step(input());fpsRoom.step({},1/60);}fpsRoom.sync();Object.keys(taps).forEach(k=>taps[k]=false);axisTap.x=axisTap.y=0;accumulator-=1/60;}}
 else accumulator=0;
 for(const event of game.events.splice(0))tone(event);
 render();if(started&&(game.ended))endOverlay();requestAnimationFrame(frame);
}
function start(){if(!artworkReady){game.notice='Chargement des images…';return false;}game.reset();fpsRoom.active=false;fpsRoom.bullets=[];fpsRoom.effects=[];fpsRoom.flash=0;fpsRoom.recoil=0;fpsRoom.hitMarker=0;fpsRoom.cooldown=0;clearInput();started=true;$('#overlay').hidden=true;$('#pause').textContent='Pause';last=performance.now();accumulator=0;canvas.focus({preventScroll:true});return true;}
function pause(){if(!started||game.ended)return;game.paused=!game.paused;clearInput();$('#pause').textContent=game.paused?'Reprendre':'Pause';$('#notice').textContent=game.paused?'Partie en pause':game.notice;}
$('#cockpit').onclick=()=>{if(started&&!game.paused)taps.cockpit=true;};
$('#start').onclick=start;$('#new').onclick=start;$('#pause').onclick=pause;
$('.display').addEventListener('click',e=>{
 if(!started||game.ended)start();
 else if(game.paused){pause();canvas.focus({preventScroll:true});}
 if(fpsRoom.active&&e.target===canvas&&canvas.requestPointerLock)canvas.requestPointerLock()?.catch(()=>{});
});
$('#training').onclick=()=>{if(!start())return;Object.assign(game,{scene:1,x:156,y:79,carrying:'truss',time:266,notice:'Position vérifiée : appuyez sur C ou Poser pour fixer la pièce.'});};
$('#bridge-attack-training').onclick=()=>{if(!started||game.ended){if(!start())return;}game.spawnEnemy(true);};
$('#train-training').onclick=()=>{if(!started||game.ended){if(!start())return;}game.forceTrain();};
$('#missile-training').onclick=()=>{if(!started||game.ended){if(!start())return;}game.launchMissile(true);};
$('#landing-training').onclick=()=>{if(!start())return;Object.assign(game,{scene:2,x:180,y:24,orientation:4,notice:'Descendez sur le toit, puis E / Sortir pour quitter le cockpit.'});};
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=`Son : ${sound?'oui':'non'}`;$('#sound').setAttribute('aria-pressed',String(sound));if(sound)tone('pickup');};
$('#help').onclick=()=>{const d=$('#instructions');d.open=!d.open;$('#help').setAttribute('aria-expanded',String(d.open));};
function mouseLabel(){const b=$('#mouse');b.textContent=`Souris : ${mouse.enabled?'oui':'non'}`;b.setAttribute('aria-pressed',String(mouse.enabled));canvas.classList.toggle('mouse-control',mouse.enabled);}
$('#mouse').onclick=()=>{mouse.enabled=!mouse.enabled;clearInput();mouseLabel();};mouseLabel();
canvas.width=1680;canvas.height=(262+game.skyHeight)*2;document.body.classList.add('panorama');document.documentElement.style.setProperty('--world-height',String(262+game.skyHeight));
function controlRect(){const r=canvas.getBoundingClientRect();return fpsDebug&&!fpsRoom.active?{left:r.left,top:r.top,width:r.width/2,height:r.height/2}:r;}
function mouseButtons(mask){const edge=mouse.buttons(mask,game.carrying);if(edge.drop){taps.fire=taps.turn=false;taps.drop=true;}else if(edge.fire)taps.fire=true;}
canvas.addEventListener('mousemove',e=>{if(!started||game.paused)return;mouse.move(e.clientX,e.clientY,controlRect());mouseButtons(e.buttons);});
// mousedown is needed: pointerdown is not emitted for the second mouse button.
canvas.addEventListener('mousedown',e=>{if(!mouse.enabled||!started||game.paused||![0,2].includes(e.button))return;e.preventDefault();canvas.focus({preventScroll:true});mouse.move(e.clientX,e.clientY,controlRect());mouseButtons(e.buttons);});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&mouse.enabled&&started&&!game.paused)canvas.setPointerCapture(e.pointerId);});
window.addEventListener('mouseup',e=>{mouseButtons(e.buttons);if(!e.buttons){const r=canvas.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)mouse.reset();}});
canvas.addEventListener('mouseleave',()=>{if(!(mouse.mask&2))mouse.reset();});
canvas.addEventListener('pointercancel',()=>mouse.reset());
canvas.addEventListener('contextmenu',e=>{if(mouse.enabled)e.preventDefault();});
function controlKey(e){return /^[zqsd]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.code;}
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement)return;
 if(fpsRoom.active){if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!e.repeat&&e.code==='KeyE')taps.interact=true;if(!e.repeat&&(e.code==='Escape'||e.code==='KeyP'))pause();keys.add(controlKey(e));return;}
 if(e.target instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
 if(!e.repeat){if(e.code==='Escape'||e.code==='KeyP')pause();}
 if(!e.repeat){if(e.code==='KeyE'){if(game.pilot&&Math.abs(game.pilot.x+7-428)<22&&Math.abs(game.pilot.y+14-140)<8)taps.interact=true;else taps.cockpit=true;}if(controlKey(e)==='KeyZ'&&game.pilot)taps.jump=true;if(e.code==='Space'&&!game.pilot)taps.fire=true;if(e.code==='KeyX'||e.code==='KeyC')taps.drop=true;}
 if(!e.repeat){const k=controlKey(e),keyboard=true;if(k==='ArrowLeft'||keyboard&&k==='KeyQ')axisTap.x=-1;if(k==='ArrowRight'||keyboard&&k==='KeyD')axisTap.x=1;if(k==='ArrowUp'||keyboard&&k==='KeyZ')axisTap.y=-1;if(k==='ArrowDown'||keyboard&&k==='KeyS')axisTap.y=1;}
 keys.add(controlKey(e));
});
document.addEventListener('keyup',e=>keys.delete(controlKey(e)));
window.addEventListener('blur',()=>{clearInput();if(started&&!game.paused&&!game.ended&&!game.completed)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started&&!game.paused)pause();}});
for(const [id,action]of [['action-a','fire'],['drop','drop'],['jump','jump'],['crouch','crouch']]){
 const b=$('#'+id);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers[action].add(e.pointerId);taps[action]=true;};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>pointers[action].delete(e.pointerId);
}
const joystick=$('#joystick');
function moveJoy(e){const r=joystick.getBoundingClientRect(),radius=r.width*.35;let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;const norm=Math.hypot(x,y);if(norm>1){x/=norm;y/=norm;}joy.x=Math.abs(x)<.12?0:x;joy.y=Math.abs(y)<.12?0:y;$('#stick').style.transform=`translate(${x*radius}px,${y*radius}px)`;}
joystick.onpointerdown=e=>{if(joy.pointer!==null)return;e.preventDefault();joy.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);};
joystick.onpointermove=e=>{if(e.pointerId===joy.pointer)moveJoy(e);};
joystick.onpointerup=joystick.onpointercancel=joystick.onlostpointercapture=e=>{if(e.pointerId===joy.pointer){joy.x=joy.y=0;joy.pointer=null;$('#stick').style.transform='';}};
render();requestAnimationFrame(frame);

const gameDisplay=$('.display'),fullscreenButton=$('#fullscreen');
function fullscreenState(){const active=document.fullscreenElement===gameDisplay||gameDisplay.classList.contains('fullscreen-fallback');fullscreenButton.textContent=active?'Quitter plein écran':'Plein écran';fullscreenButton.setAttribute('aria-pressed',String(active));document.body.classList.toggle('game-fullscreen',active);clearInput();}
fullscreenButton.onclick=async e=>{
 e.stopPropagation();
 if(document.fullscreenElement===gameDisplay)await document.exitFullscreen();
 else if(gameDisplay.classList.contains('fullscreen-fallback'))gameDisplay.classList.remove('fullscreen-fallback');
 else{try{if(!gameDisplay.requestFullscreen)throw new Error('Fullscreen indisponible');await gameDisplay.requestFullscreen();}catch{gameDisplay.classList.add('fullscreen-fallback');}}
 fullscreenState();
};
document.addEventListener('fullscreenchange',fullscreenState);
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&gameDisplay.classList.contains('fullscreen-fallback')){gameDisplay.classList.remove('fullscreen-fallback');fullscreenState();}});
$('#touch-cockpit').onclick=e=>{e.stopPropagation();if(started&&!game.paused){if(game.pilot&&Math.abs(game.pilot.x+7-428)<22&&Math.abs(game.pilot.y+14-140)<8)taps.interact=true;else taps.cockpit=true;}};

$('#fps-training').onclick=()=>{if(!start())return;Object.assign(game,{scene:2,x:210,y:30,landed:true,pilot:{x:519,y:48,floor:62,inside:true,vy:0,facing:1,pose:'idle',animation:0}});game.enemies=[{x:668,y:126,state:1,hits:0,animation:0,action:'base',phase:'inside',fps:{x:14,z:8,level:0}},{x:668,y:126,state:1,hits:0,animation:0,action:'base',phase:'inside',fps:{x:9,z:11,level:0}}];fpsRoom.enter();};
document.addEventListener('mousemove',e=>{if(fpsRoom.active&&!game.paused&&(document.pointerLockElement===canvas||e.target===canvas))fpsRoom.look(e.movementX,e.movementY);});
let fpsTouch=null;
canvas.addEventListener('pointerdown',e=>{if(fpsRoom.active&&e.pointerType!=='mouse'){fpsTouch={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(fpsTouch?.id===e.pointerId){fpsRoom.look(e.clientX-fpsTouch.x,e.clientY-fpsTouch.y);fpsTouch.x=e.clientX;fpsTouch.y=e.clientY;}});
canvas.addEventListener('pointerup',e=>{if(fpsTouch?.id===e.pointerId)fpsTouch=null;});

$('#fps-debug').onclick=()=>{fpsDebug=!fpsDebug;$('#fps-debug').setAttribute('aria-pressed',String(fpsDebug));$('#fps-debug').textContent='Debug 2D + FPS : '+(fpsDebug?'oui':'non');};
