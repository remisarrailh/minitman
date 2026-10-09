const $=s=>document.querySelector(s),canvas=$('#map'),ctx=canvas.getContext('2d');
let data={version:1,collisions:[],teleports:[]},selected=null,start=null,draft=null,placing=false,history=[];
let tool="collision",drag=null,testing=false,testGame=null,testLast=0,testAccumulator=0;const testKeys=new Set();
const backgrounds=[];const key='minitman-custom-zones';
try{const saved=localStorage.getItem(key);if(saved)data=JSON.parse(saved);}catch{}
data.version=2;data.teleportDistance=Number.isFinite(data.teleportDistance)?Math.max(1,data.teleportDistance):13;
$('#distance').value=data.teleportDistance;$('#distance-slider').value=data.teleportDistance;
function checkpoint(){history.push(JSON.stringify(data));if(history.length>50)history.shift();}
function zones(){return [...data.collisions,...data.teleports];}
function message(s){$('#status').textContent=s;}
function point(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(839,Math.round((e.clientX-r.left)*840/r.width))),y:Math.max(0,Math.min(261,Math.round((e.clientY-r.top)*262/r.height)))};}
function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,840,262);backgrounds.forEach((im,i)=>ctx.drawImage(im,i*280,i===0?70:0));for(const z of [...zones(),...(draft?[draft]:[])]){const teleport=z.type==='teleport';ctx.fillStyle=teleport?'#00dfff44':'#ff555544';ctx.strokeStyle=z===selected?'#fff':teleport?'#00dfff':'#ff5555';ctx.fillRect(z.x,z.y,z.w,z.h);ctx.strokeRect(z.x+.5,z.y+.5,z.w,z.h);if(teleport){ctx.strokeStyle='#ffee55';ctx.beginPath();ctx.moveTo(z.x+z.w/2,z.y+z.h/2);const endX=z.x+z.w/2;for(const direction of z.trigger==='both'?[-1,1]:[z.trigger==='down'?1:-1]){const endY=z.y+z.h/2+direction*data.teleportDistance;ctx.moveTo(endX,z.y+z.h/2);ctx.lineTo(endX,endY);ctx.stroke();ctx.fillStyle='#ffee55';ctx.fillRect(endX-2,endY-2,5,5);}}}
 if(selected&&!testing){ctx.fillStyle='#fff';for(const [x,y]of handles(selected))ctx.fillRect(x-3,y-3,6,6);}
 if(testing&&testGame?.pilot){const p=testGame.pilot;ctx.fillStyle='#7edcc2';ctx.fillRect(p.x+3,p.y+4,9,10);ctx.strokeStyle='#fff';ctx.strokeRect(p.x,p.y,14,14);}
}
function select(z){selected=z;for(const id of ['name','x','y','w','h','trigger'])$('#'+id).value=z?.[id]??'';draw();}
function list(){const root=$('#list');root.replaceChildren();zones().forEach(z=>{const b=document.createElement('button');b.textContent=(z.type==='teleport'?(z.trigger==='both'?'↕ ':z.trigger==='down'?'↓ ':'↑ '):'■ ')+z.name;b.onclick=()=>select(z);root.append(b);});draw();}
function handles(z){return [[z.x,z.y],[z.x+z.w,z.y],[z.x,z.y+z.h],[z.x+z.w,z.y+z.h]];}
function setTool(value){tool=value;placing=false;document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===value)));}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{if(testing)return;setTool(b.dataset.tool);});
canvas.onpointerdown=e=>{const p=point(e);canvas.focus();if(testing)return;

 if(tool==='select'){
  const handle=selected?handles(selected).findIndex(([x,y])=>Math.abs(x-p.x)<=5&&Math.abs(y-p.y)<=5):-1;
  if(handle<0)select(zones().findLast(z=>p.x>=z.x&&p.x<=z.x+z.w&&p.y>=z.y&&p.y<=z.y+z.h)||null);
  if(selected){checkpoint();drag={start:p,original:{...selected},handle};canvas.setPointerCapture(e.pointerId);}return;
 }start=p;canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove=e=>{const p=point(e);if(drag){const o=drag.original,dx=p.x-drag.start.x,dy=p.y-drag.start.y;
 if(drag.handle<0){selected.x=Math.max(0,Math.min(840-o.w,o.x+dx));selected.y=Math.max(0,Math.min(262-o.h,o.y+dy));}
 else{let left=o.x,right=o.x+o.w,top=o.y,bottom=o.y+o.h;if(drag.handle%2===0)left=Math.min(p.x,right-1);else right=Math.max(p.x,left+1);if(drag.handle<2)top=Math.min(p.y,bottom-1);else bottom=Math.max(p.y,top+1);Object.assign(selected,{x:left,y:top,w:right-left,h:bottom-top});}select(selected);return;
 }if(!start)return;draft={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.max(1,Math.abs(p.x-start.x)),h:Math.max(1,Math.abs(p.y-start.y)),type:tool};draw();};
canvas.onpointerup=e=>{if(drag){drag=null;list();return;}if(!start)return;const p=point(e);checkpoint();const z=draft||{x:p.x,y:p.y,w:8,h:14,type:tool};z.name=z.type+' '+(zones().length+1);if(z.type==='teleport')Object.assign(z,{trigger:'up'});data[z.type==='teleport'?'teleports':'collisions'].push(z);start=draft=null;setTool('select');select(z);list();};
canvas.onpointercancel=()=>{if(drag)Object.assign(selected,drag.original);drag=null;start=draft=null;draw();};
for(const id of ['name','x','y','w','h','trigger'])$('#'+id).onchange=()=>{if(!selected)return;const value=['name','trigger'].includes(id)?$('#'+id).value:Number($('#'+id).value);if(typeof value==='number'&&!Number.isFinite(value))return;checkpoint();selected[id]=['w','h'].includes(id)?Math.max(1,value):value;list();};
$('#delete').onclick=()=>{if(!selected)return;checkpoint();data.collisions=data.collisions.filter(z=>z!==selected);data.teleports=data.teleports.filter(z=>z!==selected);select(null);list();};
$('#undo').onclick=()=>{if(!history.length)return;data=JSON.parse(history.pop());$('#distance').value=data.teleportDistance;$('#distance-slider').value=data.teleportDistance;select(null);list();};
$('#apply').onclick=()=>{localStorage.setItem(key,JSON.stringify(data));message('Zones appliquées. Rechargez le jeu pour les utiliser.');};
$('#disable').onclick=()=>{localStorage.removeItem(key);message('Règles originales réactivées au prochain chargement du jeu. Votre dessin reste ouvert.');};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='minitman-zones.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import').onchange=async e=>{try{const value=JSON.parse(await e.target.files[0].text());if(!Array.isArray(value.collisions)||!Array.isArray(value.teleports)||[...value.collisions,...value.teleports].some(z=>!['x','y','w','h'].every(k=>Number.isFinite(z[k]))||z.w<=0||z.h<=0)||value.teleports.some(z=>!['up','down','both'].includes(z.trigger)))throw Error('Format de zones invalide');checkpoint();data=value;data.version=2;data.teleportDistance=Number.isFinite(data.teleportDistance)?Math.max(1,data.teleportDistance):13;$('#distance').value=data.teleportDistance;$('#distance-slider').value=data.teleportDistance;data.collisions.forEach(z=>z.type='collision');data.teleports.forEach(z=>z.type='teleport');select(null);list();message('JSON importé. Cliquez sur Appliquer au jeu pour l’activer.');}catch(e){message(e.message);}};
Promise.all(['pont','batiment','ravitaillement'].map(async name=>{const im=new Image();im.src='assets/themes/original/decors/'+name+'.png';await im.decode();return im;})).then(images=>{backgrounds.push(...images);list();}).catch(e=>message(e.message));list();

document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;
 if(!testing&&e.key==='Delete'){e.preventDefault();$('#delete').click();}
 if(!testing&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('#undo').click();}
 if(testing&&['q','d','z','s'].includes(e.key.toLowerCase())){e.preventDefault();testKeys.add(e.key.toLowerCase());}
});document.addEventListener('keyup',e=>testKeys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>testKeys.clear());
$('#test').onclick=()=>{testing=!testing;testKeys.clear();start=drag=draft=null;placing=false;$('#test').textContent=testing?'Quitter le test':'Mode test';$('#test').setAttribute('aria-pressed',String(testing));document.querySelectorAll('[data-tool],#fields input,#fields select,#delete,#undo,#distance,#distance-slider,#import,#apply,#disable').forEach(el=>el.disabled=testing);
 if(testing){testGame=new MinitCore.Game(MINIT_ASSETS);testGame.continuous=true;testGame.customZones=data;testGame.pilot={x:490,y:31,inside:true,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};testGame.setPilotSpeedPercent(190);testGame.setJumpHeightPercent(10);testLast=performance.now();testAccumulator=0;message('Test depuis le toit : Q/D déplacent, Z saute ou monte, S descend. La gravité utilise les collisions dessinées comme plateformes.');}else{testGame=null;message('Édition réactivée.');}canvas.focus();draw();};
function testTick(now){if(testing&&testGame?.pilot){testAccumulator+=Math.min(.1,(now-testLast)/1000);while(testAccumulator>=1/60){testGame.step({x:(testKeys.has('d')?1:0)-(testKeys.has('q')?1:0),up:testKeys.has('z'),down:testKeys.has('s'),jump:testKeys.has('z'),crouch:testKeys.has('s')});testAccumulator-=1/60;}draw();}testLast=now;requestAnimationFrame(testTick);}requestAnimationFrame(testTick);

function distanceChanged(e){const value=Number(e.target.value);if(!Number.isFinite(value)||value<1||value>262)return;checkpoint();data.teleportDistance=value;$('#distance').value=value;$('#distance-slider').value=value;draw();}
$('#distance').onchange=distanceChanged;$('#distance-slider').oninput=distanceChanged;
