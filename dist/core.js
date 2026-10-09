/* Native prototype simulation. No 6502 emulator. Original-address references
   identify verified rules; movement cadence remains provisional. */
(function(root){
 'use strict';
 const rowAddress=y=>(y&7)*1024+((y>>3)&7)*128+(y>>6)*40;
 const triple=(x,y)=>[Math.floor(Math.round(x)/7),((Math.round(x)%7)+7)%7,Math.round(y)];
 const pixelX=t=>t[0]*7+t[1];
 const FLIGHT_SPEED={x:84,y:51};
 class Game {
  constructor(assets){this.assets=assets;this.speedPercent=100;this.pilotSpeedPercent=100;this.jumpHeightPercent=100;this.missilePadPositions=[{x:346,y:139},{x:356,y:133},{x:363,y:128}];this.infiniteLives=true;this.computerHitLimit=3;this.respawnSeconds=3;this.respawnInBase=false;this.enemyBridgeChance=25;this.enemySpawnSeconds=30;this.enemySafetyRadius=10;this.random=Math.random;this.continuous=false;this.reset();}
  setSpeedPercent(value){
   if(Number.isFinite(value))this.speedPercent=Math.round(Math.max(10,Math.min(400,value))*10)/10;
   return this.speedPercent;
  }
  setPilotSpeedPercent(value){
   if(Number.isFinite(value))this.pilotSpeedPercent=Math.round(Math.max(10,Math.min(400,value))*10)/10;
   return this.pilotSpeedPercent;
  }
  setJumpHeightPercent(value){
   if(Number.isFinite(value))this.jumpHeightPercent=Math.round(Math.max(10,Math.min(400,value))*10)/10;
   return this.jumpHeightPercent;
  }
  reset(){Object.assign(this,{scene:1,x:112,y:1,orientation:2,trusses:6,beams:4,bridgeDamage:{truss:[],beam:[]},score:0,lives:5,time:300,tick:0,carrying:null,falls:[],shots:[],enemyShots:[],explosions:[],mines:[],bonuses:[],enemies:[],enemySpawnRemaining:this.enemySpawnSeconds*(.5+this.random()),cooldown:0,invincible:0,paused:false,ended:false,completed:false,won:false,computerHits:0,respawnRemaining:0,respawnPilot:null,train:null,trainDelay:0,missileSlots:['empty','empty','empty'],launchedMissiles:0,launching:[],interactHeld:false,previous:{},landed:false,pilot:null,stock:[10,20,10],heights:[89,89,90],notice:'Direction le ravitaillement, à droite →',events:[]});}
  emit(type){this.events.push(type);}
  worldPosition(){return {x:(this.scene-1)*280+this.x,y:this.y+(this.scene===1?70:0)};}
  piecePosition(){return triple(this.x+3,this.y+13);}
  winchPosition(){return triple(this.x+13,this.y+11);}
  winchVisible(){
   if(this.carrying)return true;
   if(this.scene!==3)return false;
   const t=this.winchPosition(),x=pixelX(t);
   return this.assets.pickupColumns.some((column,i)=>{
    const k=this.assets.pickupKinds[i],target=column*7+this.assets.pickupVariants[i][0];
    return this.stock[k]>0&&Math.abs(x-target)<=18&&t[2]>=this.heights[k]-28&&t[2]<=this.heights[k]+4;
   });
  }
  nextTarget(kind){const holes=this.bridgeDamage[kind];return this.assets[kind==='truss'?'trusses':'beams'][holes.length?Math.min(...holes):kind==='truss'?this.trusses:this.beams]||null;}
  // $B783: exact winch column/variant, height and stock check.
  pickup(){
   if(this.scene!==3||this.carrying)return false;
   const winch=this.winchPosition();
   for(let i=0;i<4;i++){
    const k=this.assets.pickupKinds[i];
    if(winch[0]===this.assets.pickupColumns[i]&&this.assets.pickupVariants[i].includes(winch[1])&&winch[2]===this.heights[k]&&this.stock[k]>0){
     this.carrying=k===1?'beam':'truss';this.stock[k]--;this.heights[k]+=k===1?2:3;
     this.notice='Pièce au treuil. Remontez, puis retour au pont ←';this.emit('pickup');return true;
    }
   }return false;
  }
  // $B842, $B87E, $B93C: three-byte equality and beam construction order.
  drop(){
   if(!this.carrying)return false;
   const kind=this.carrying,t=this.piecePosition(),expected=this.nextTarget(kind);
   const allowed=kind==='truss'||this.beams+2<=this.trusses;
   const valid=this.scene===1&&allowed&&expected&&t.every((v,i)=>v===expected[i]);
   if(valid){if(this.bridgeDamage[kind].length)this.bridgeDamage[kind].splice(this.bridgeDamage[kind].indexOf(Math.min(...this.bridgeDamage[kind])),1);else this[kind==='truss'?'trusses':'beams']++;this.score=(this.score+10)%1000;
    this.notice='Pièce fixée ! +10 points';this.emit('place');
    if(this.trusses===9&&this.beams===8&&!this.bridgeDamage.truss.length&&!this.bridgeDamage.beam.length){this.completed=true;this.notice='Pont réparé ! Vous pouvez vous poser sur le bâtiment.';this.emit('complete');}
   }else{this.falls.push({x:pixelX(t)+(this.continuous?(this.scene-1)*280:0),y:t[2]+(this.continuous&&this.scene===1?70:0),kind});this.notice=allowed?'Pièce lâchée : alignement incorrect':'Poser d’abord les éléments triangulaires';this.emit('drop');}
   this.carrying=null;return valid;
  }
  collidesAt(scene,x,y){
   const parts=[[this.orientation,x,y]];
   // Only the active construction slot allows cargo to overlap its supports.
   const target=this.carrying?this.nextTarget(this.carrying):null;
   const allowed=this.carrying==='truss'||this.beams+2<=this.trusses;
   const docking=scene===1&&allowed&&target&&Math.abs(x-(pixelX(target)-3))<=.5&&y<=target[2]-13&&y>=target[2]-53;
   if(this.carrying&&!docking)parts.push([23,x+13,y+11],[this.carrying==='beam'?22:21,x+3,y+13]);
   return parts.some(([type,px,py])=>this.spriteCollidesAt(scene,type,px,py));
  }
  spriteCollidesAt(scene,type,x,y){
   const sprite=this.assets.sprites[type],t=triple(x,y),bytes=sprite.variants[t[1]],background=this.assets.backgrounds[scene-1];
   for(let row=0;row<sprite.height;row++)for(let col=0;col<sprite.width;col++){
    const yy=t[2]+row;if(!this.continuous&&(yy<0||yy>=192))continue;
    const bits=bytes[row*sprite.width+col];
    for(let bit=0;bit<7;bit++){
     const px=t[0]*7+col*7+bit;
     let hitScene=scene,hitX=px,hitY=yy;
     if(this.continuous){
      const worldX=(scene-1)*280+px;
      hitScene=Math.floor(worldX/280)+1;hitX=((worldX%280)+280)%280;
      hitY=yy+(scene===1?70:0)-(hitScene===1?70:0);
     }
     if(hitScene<1||hitScene>3||hitY<0||hitY>=192)continue;
     if(hitScene===2&&hitX>=253&&hitX<=263&&hitY>=29&&hitY<=44)continue;
     if(hitX>=0&&hitX<280&&(bits&(1<<bit))&&(this.assets.backgrounds[hitScene-1][rowAddress(hitY)+Math.floor(hitX/7)]&(1<<(hitX%7))))return true;
    }
   }return false;
  }
  shotHitsScenery(x,y){
   // Match the rendered four-pixel line, using pixels rather than building bounds.
   for(let i=0;i<4;i++){
    const wx=Math.round(x)+i,wy=Math.round(y);
    const scene=this.continuous?Math.floor(wx/280)+1:this.scene;
    const px=this.continuous?((wx%280)+280)%280:wx;
    const py=wy-(this.continuous&&scene===1?70:0);
    if(scene<1||scene>3||px<0||px>=280||py<0||py>=192)continue;
    if(scene===2&&px>=253&&px<=263&&py>=29&&py<=44)continue;
    if(this.assets.backgrounds[scene-1][rowAddress(py)+Math.floor(px/7)]&(1<<(px%7)))return true;
   }
   return false;
  }
  forceTrain(){
   this.trusses=9;this.beams=8;this.bridgeDamage={truss:[],beam:[]};this.completed=true;
   if(this.missileSlots.every(s=>s==='launched'))return false;
   if(this.train?.phase==='approach')return false;
   this.train=null;this.trainDelay=0;this.startTrain();return true;
  }
  startTrain(){
   if(!this.continuous||!this.completed||this.train||this.launchedMissiles>=3)return false;
   const slot=this.missileSlots.indexOf('empty');if(slot<0)return false;
   this.missileSlots[slot]='transit';this.train={x:-100,y:168,phase:'approach',slot,cargo:true};this.notice='Train en route — livraison du missile';return true;
  }
  launchMissile(force=false){
   if(this.ended)return false;
   let slot=this.missileSlots.indexOf('loaded');
   if(slot<0&&force){slot=this.missileSlots.indexOf('empty');if(slot<0&&this.train?.cargo){slot=this.train.slot;this.train.cargo=false;}if(slot>=0)this.missileSlots[slot]='loaded';}
   if(slot<0){this.notice='Aucun missile chargé sur la base de lancement';return false;}
   this.missileSlots[slot]='launched';const pads=this.missilePads();this.launching.push({slot,x:pads[slot].x,y:pads[slot].y-23});this.launchedMissiles++;this.emit('launch');
   this.notice='Missile lancé — '+this.launchedMissiles+'/3';
   return true;
  }
  missilePads(){return this.missilePadPositions;}
  stepMission(input,dt){
   if(!this.continuous)return;
   this.trainDelay=Math.max(0,this.trainDelay-dt);
   if(this.completed&&!this.train&&this.trainDelay===0)this.startTrain();
   if(this.train){
    const t=this.train;t.x+=32*dt;
    if(t.phase==='approach'&&t.x>=315){t.x=315;t.phase='unload';t.wait=1;t.cargo=false;this.missileSlots[t.slot]='loaded';this.notice='Missile chargé — activez l’ordinateur en bas du bâtiment avec E';}
    else if(t.phase==='unload'){t.x=315;t.wait-=dt;if(t.wait<=0)t.phase='leaving';}
    else if(t.phase==='leaving'&&t.x>840){this.train=null;this.trainDelay=4;}
   }
   const p=this.pilot;
   if(p&&input.interact&&!this.interactHeld&&Math.abs(p.x+7-428)<22&&Math.abs(p.y+14-140)<8)this.launchMissile();
   this.interactHeld=Boolean(input.interact);
   this.launching.forEach(m=>m.y-=90*dt);this.launching=this.launching.filter(m=>m.y>-30);
   if(this.launchedMissiles===3&&this.launching.length===0){this.won=true;this.ended=true;this.notice='Victoire — trois missiles lancés !';this.emit('complete');}
  }
  setEnemyBridgeChance(value){if(Number.isFinite(value))this.enemyBridgeChance=Math.max(0,Math.min(100,value));return this.enemyBridgeChance;}
  bridgeTargets(){
   const targets=[];for(const kind of ['truss','beam'])for(let i=0;i<this[kind==='truss'?'trusses':'beams'];i++)if(!this.bridgeDamage[kind].includes(i)){
    const t=this.assets[kind==='truss'?'trusses':'beams'][i];targets.push({kind,index:i,x:pixelX(t)+10,y:t[2]+70});
   }return targets;
  }
  damageBridge(target){
   if(this.bridgeDamage[target.kind].includes(target.index))return;
   this.bridgeDamage[target.kind].push(target.index);this.completed=false;this.notice='Élément du pont détruit — réparation nécessaire';this.emit('crash');
   if(!this.bridgeTargets().length){this.ended=true;this.notice='Fin de partie — pont entièrement détruit';}
  }
  setComputerHitLimit(value){if(Number.isFinite(value))this.computerHitLimit=Math.max(1,Math.min(20,Math.round(value)));return this.computerHitLimit;}
  setRespawnSeconds(value){if(Number.isFinite(value))this.respawnSeconds=Math.max(.1,Math.min(15,value));return this.respawnSeconds;}
  setEnemySpawnSeconds(value){if(Number.isFinite(value)){this.enemySpawnSeconds=Math.max(1,Math.min(120,value));this.enemySpawnRemaining=this.enemySpawnSeconds*(.5+this.random());}return this.enemySpawnSeconds;}
  setEnemySafetyRadius(value){if(Number.isFinite(value))this.enemySafetyRadius=Math.max(0,Math.min(300,value));return this.enemySafetyRadius;}
  spawnEnemy(forceBridge=false){
   const heli=this.worldPosition(),safe=[];
   for(let x=0;x<=826;x++)if(Math.abs(x+7-(heli.x+21))>=this.enemySafetyRadius+28)safe.push(x);
   if(!safe.length)return false;
   const targets=this.bridgeTargets(),attack=(forceBridge||this.random()*100<this.enemyBridgeChance)&&targets.length>0;
   const bridgeTarget=attack?targets[Math.min(targets.length-1,Math.floor(this.random()*targets.length))]:null;
   this.enemies.push({x:safe[Math.min(safe.length-1,Math.floor(this.random()*safe.length))],y:-14,state:1,hits:0,animation:0,action:attack?'bridge':'base',bridgeTarget,phase:'arrival',arrivalY:0});return true;
  }
  enemyHitsWall(e,x,y){
   const indoors=['inside','walking','aligning'].includes(e.phase);
   if(indoors&&this.customZones)return this.customZones.collisions.some(z=>x+13>z.x&&x+2<z.x+z.w&&y+12>z.y&&y+4<z.y+z.h);
   for(let py=Math.floor(y+4);py<=Math.floor(y+12);py++)for(let px=Math.floor(x+2);px<=Math.floor(x+12);px++){
    const scene=Math.floor(px/280)+1,localX=px-(scene-1)*280,localY=py-(scene===1?70:0);
    if(scene<1||scene>3||localY<0||localY>=192)continue;
    if(this.assets.backgrounds[scene-1][rowAddress(localY)+Math.floor(localX/7)]&(1<<(localX%7)))return true;
   }return false;
  }
  moveEnemy(e,x,y){
   const dx=x-e.x,dy=y-e.y,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
   for(let i=0;i<steps;i++){
    if(!this.enemyHitsWall(e,e.x+dx/steps,e.y))e.x+=dx/steps;
    if(!this.enemyHitsWall(e,e.x,e.y+dy/steps))e.y+=dy/steps;
   }
  }
  stepEnemies(dt){
   if(!this.continuous)return;
   this.enemySpawnRemaining-=dt;
   if(this.enemySpawnRemaining<=0){if(this.spawnEnemy())this.enemySpawnRemaining=this.enemySpawnSeconds*(.5+this.random());else this.enemySpawnRemaining=1;}
   const zones=this.customZones?.teleports.filter(z=>z.trigger==='down'||z.trigger==='both').sort((a,b)=>a.y-b.y);
   let route=zones?.length?zones.map(z=>{
    const x=z.x+z.w/2-7,center=z.y+z.h/2;
    const floors=this.customZones.collisions.filter(c=>x+11>c.x&&x+3<c.x+c.w&&c.y>=center).map(c=>c.y);
    return {x,y:floors.length?Math.min(...floors)-14:center-7};
   }):[{x:527,y:31},{x:421,y:48},{x:513,y:61},{x:421,y:74},{x:668,y:87},{x:421,y:100},{x:668,y:113}];
   const roofEntry={x:519,y:31};
   route=[roofEntry,...route.filter(stop=>stop.y>roofEntry.y+1)];
   const heli=this.worldPosition();
   for(const e of [...this.enemies]){
    e.animation+=dt;
    if(e.action==='bridge'){
     const target=e.phase==='arrival'?{x:e.x,y:0}:e.phase==='attack-align'?{x:e.bridgeTarget.x,y:0}:{x:e.bridgeTarget.x,y:e.bridgeTarget.y-7};
     const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),step=Math.min(d,(e.phase==='arrival'?120:75)*dt);
     if(d)this.moveEnemy(e,e.x+dx/d*step,e.y+dy/d*step);
     if(Math.hypot(target.x-e.x,target.y-e.y)<.01){if(e.phase==='arrival')e.phase='attack-align';else if(e.phase==='attack-align')e.phase='attack';else{this.damageBridge(e.bridgeTarget);this.destroyEnemy(e);}}
     continue;
    }
    if(e.action!=='base')continue;
    if(e.phase==='inside'){
     const target=e.y<126-.01?{x:e.x,y:126}:{x:421,y:126},dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),step=Math.min(d,20*dt);
     if(d)this.moveEnemy(e,e.x+dx/d*step,e.y+dy/d*step);
     if(Math.abs(e.x-421)<.01&&Math.abs(e.y-126)<.01){this.destroyEnemy(e);this.computerHits++;this.notice='Ordinateur touché — '+this.computerHits+'/'+this.computerHitLimit;if(this.computerHits>=this.computerHitLimit){this.ended=true;this.notice='Fin de partie — ordinateur détruit';}}
     continue;
    }
    e.routeIndex??=0;const entry=route[Math.min(e.routeIndex,route.length-1)];
    const distance=this.customZones?.teleportDistance||13;
    const target=e.phase==='arrival'?{x:e.x,y:e.arrivalY}:e.phase==='approach'?{x:roofEntry.x,y:e.arrivalY??0}:e.phase==='descending'?{x:entry.x,y:Math.min(248,route[e.routeIndex+1]?.y??entry.y+distance)}:e.phase==='walking'?{x:entry.x,y:e.walkY??e.y}:entry;
    const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy),step=Math.min(d,(e.phase==='arrival'&&e.y<0?120:24)*dt),x=d?e.x+dx/d*step:e.x,y=d?e.y+dy/d*step:e.y;
    // Safety governs entry from the sky; indoor movement must remain possible.
    if(e.phase==='descending'){e.x=x;e.y=y;}else this.moveEnemy(e,x,y);
    if(Math.hypot(target.x-e.x,target.y-e.y)<.01){
     if(e.phase==='arrival')e.phase='approach';else if(e.phase==='approach')e.phase='landing';
     else if(e.phase==='landing')e.phase='descending';
     else if(e.phase==='walking')e.phase='aligning';
     else if(e.phase==='aligning')e.phase='descending';
     else if(++e.routeIndex<route.length){e.walkY=e.y;e.phase='walking';}
     else e.phase='inside';
    }
   }
  }
  clearMineFromTeleport(m){
   const zones=this.customZones?.teleports||[{x:414,y:62,w:28,h:1},{x:506,y:75,w:28,h:1},{x:414,y:88,w:28,h:1},{x:661,y:101,w:28,h:1},{x:414,y:114,w:28,h:1},{x:661,y:127,w:28,h:14}];
   const nearby=zones.filter(z=>m.y>=z.y-1&&m.y-1<=z.y+z.h+1);
   const blocked=x=>nearby.some(z=>x+3>z.x-8&&x<z.x+z.w+8);
   if(!blocked(m.x))return;
   const candidates=nearby.flatMap(z=>[z.x-11,z.x+z.w+8]).filter(x=>x>=0&&x<=837&&!blocked(x)&&(!this.customZones||this.customZones.collisions.some(z=>x+3>z.x&&x<z.x+z.w&&Math.abs(z.y-m.y)<=1)));
   candidates.sort((a,b)=>Math.abs(a-m.x)-Math.abs(b-m.x));
   if(candidates.length)m.x=candidates[0];
  }
  destroyEnemy(e,dropMine=false){
   const inBase=['walking','descending','inside'].includes(e.phase)||e.action===undefined&&e.y>=45;
   this.explosions.push({x:e.x,y:e.y,age:0});
   if(dropMine&&inBase){const mine={x:e.x,y:e.y+14};this.clearMineFromTeleport(mine);this.mines.push(mine);}
   this.enemies=this.enemies.filter(other=>other!==e);
  }
  hurtPlayer(){
   if(this.pilot?.pose==='crouch'||this.invincible>0||this.respawnRemaining>0||this.ended)return false;
   const p=this.pilot,w=this.worldPosition();
   this.explosions.push({x:p?p.x:w.x,y:p?p.y:w.y,age:0});
   if(p)this.bonuses.push({x:p.x,y:p.y+14});
   if(!this.infiniteLives)this.lives--;this.respawnPilot=p?{...p,vy:0,pose:"idle",animation:0,jumpHeld:false,upHeld:false,downHeld:false,elevator:null}:null;if(p?.inside&&!this.respawnInBase){
    const side=this.landingSurface(w.x+52)===this.landingSurface(w.x+21)?42:-10;
    this.respawnPilot={x:w.x+side,y:w.y+1,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false,upHeld:false,downHeld:false};
   }
   this.respawnRemaining=this.respawnSeconds;this.invincible=0;this.pilot=null;this.carrying=null;
   if(!p){this.scene=1;this.x=112;this.y=1;this.landed=false;}
   if(!this.infiniteLives&&this.lives<=0){this.ended=true;this.notice='Fin de partie — plus de vies';}else this.notice='Réapparition dans '+this.respawnSeconds+' s';
   this.emit('crash');return true;
  }
  stepCombat(dt){
   const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
   const w=this.worldPosition(),p=this.pilot,player=p?{x:p.x+3,y:p.y+4,w:10,h:10}:{x:w.x+3,y:w.y+3,w:34,h:11};
   for(const e of [...this.enemies]){
    const body={x:e.x+2,y:e.y+4,w:11,h:11};
    if(this.respawnRemaining<=0&&overlap(body,player)){if(!p)this.destroyEnemy(e);this.hurtPlayer();continue;}
    e.fireCooldown=Math.max(0,(e.fireCooldown||0)-dt);
    if(this.respawnRemaining<=0&&e.canShoot!==false&&Math.abs((body.y+body.h/2)-(player.y+player.h/2))<=8&&e.fireCooldown===0){
     const right=player.x>e.x;this.enemyShots.push({x:e.x+(right?14:-4),y:e.y+8,v:right?180:-180});e.fireCooldown=1;
    }
   }
   this.enemyShots=this.enemyShots.filter(shot=>{
    const travel=shot.v*dt,steps=Math.max(1,Math.ceil(Math.abs(travel)));
    for(let i=0;i<steps;i++){
     shot.x+=travel/steps;
     if(p?.pose!=='crouch'&&this.respawnRemaining<=0&&overlap({x:shot.x,y:shot.y,w:4,h:1},player)){this.hurtPlayer();return false;}
     const blocked=this.customZones?this.customZones.collisions.some(z=>shot.x+4>z.x&&shot.x<z.x+z.w&&shot.y>=z.y&&shot.y<z.y+z.h):this.shotHitsScenery(shot.x,shot.y);
     if(blocked)return false;
    }return shot.x>=0&&shot.x<=840;
   });
   this.bonuses=this.bonuses.filter(b=>{
    const box={x:b.x,y:b.y-10,w:14,h:10};
    if(this.pilot&&overlap(box,{x:this.pilot.x+3,y:this.pilot.y+4,w:10,h:10})){this.lives++;this.notice='Bonus : une vie gagnée';return false;}
    const enemy=this.enemies.find(e=>overlap(box,{x:e.x+2,y:e.y+4,w:11,h:11}));if(enemy){enemy.canShoot=false;return false;}return true;
   });
   if(this.pilot){const p=this.pilot;p.mineGrace=p.vy!==0?.18:Math.max(0,(p.mineGrace||0)-dt);}
   this.mines=this.mines.filter(m=>{
    this.clearMineFromTeleport(m);
    const box={x:m.x,y:m.y-1,w:3,h:1};
    const enemy=this.enemies.find(e=>overlap(box,{x:e.x+3,y:e.y+12,w:8,h:3}));
    if(enemy){this.destroyEnemy(enemy);return false;}
    const p=this.pilot;
    // Only the centre of the feet triggers a mine, with landing grace after a jump.
    if(p&&p.vy===0&&!(p.mineGrace>0)&&overlap(box,{x:p.x+6,y:p.y+12,w:2,h:2})&&this.invincible<=0&&this.hurtPlayer()){
     this.explosions.push({x:m.x,y:m.y-14,age:0});return false;
    }
    return true;
   });
   this.explosions.forEach(e=>e.age+=dt);this.explosions=this.explosions.filter(e=>e.age<.5);
  }
  shotHitsEnemy(shot){
   if(!this.continuous)return false;
   const e=this.enemies.find(e=>shot.x+4>=e.x+2&&shot.x<=e.x+13&&shot.y>=e.y+2&&shot.y<e.y+13);
   if(!e)return false;
   e.hits++;e.animation=0;
   if(e.hits>=3)this.destroyEnemy(e,true);else e.state=e.hits+1;
   this.emit('hit');this.notice=e.hits>=3?'Robot détruit':'Robot touché — état '+e.state;return true;
  }
  advanceShot(p,dt){
   const travel=p.v*dt,steps=Math.max(1,Math.ceil(Math.abs(travel)));
   if(this.shotHitsScenery(p.x,p.y)||this.shotHitsEnemy(p))return false;
   for(let i=0;i<steps;i++){p.x+=travel/steps;if(this.shotHitsScenery(p.x,p.y)||this.shotHitsEnemy(p))return false;}
   return p.x>-40&&p.x<(this.continuous?840:280);
  }
  move(dx,dy){
   const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
   for(let i=0;i<steps;i++)this.moveSegment(dx/steps,dy/steps);
  }
  moveSegment(dx,dy){
   if(this.continuous){
    const world=this.worldPosition();
    const wx=Math.max(0,Math.min(798,world.x+dx)),scene=Math.min(3,Math.floor(wx/280)+1);
    const x=wx-(scene-1)*280,y=world.y-(scene===1?70:0);
    if(!this.collidesAt(scene,x,y))Object.assign(this,{scene,x,y});
    const nextY=Math.max(1,Math.min(230,world.y+dy))-(this.scene===1?70:0);
    if(!this.collidesAt(this.scene,this.x,nextY))this.y=nextY;
    return;
   }
   // Resolve each axis independently, so contact blocks without a crash and
   // tangential movement remains possible. The carried piece and winch also hit scenery.
   const before={scene:this.scene,x:this.x,y:this.y};
   this.x+=dx;
   if(this.x>250){if(this.scene<3){this.scene++;this.x=0;if(this.scene===2)this.y=Math.min(160,this.y+67);}else this.x=250;}
   if(this.x<0){if(this.scene>1){this.scene--;this.x=250;if(this.scene===1)this.y=Math.max(1,this.y-70);}else this.x=0;}
   if(this.collidesAt(this.scene,this.x,this.y))Object.assign(this,before);
   const nextY=Math.max(1,Math.min(160,this.y+dy));
   if(!this.collidesAt(this.scene,this.x,nextY))this.y=nextY;
  }
  landingSurface(x){
   if(x>=420&&x<=540)return 45;
   if(x>=540&&x<=693)return 85;
   return null;
  }
  updateLanding(input){
   if(!this.continuous||this.carrying||this.pilot||this.landed||!(input.y>0))return;
   const w=this.worldPosition(),floor=this.landingSurface(w.x+21);
   if(floor===null||this.landingSurface(w.x+5)!==floor||this.landingSurface(w.x+37)!==floor)return;
   if(w.y>=floor-17&&w.y<=floor-14){
    this.orientation=4;
    const y=floor-15;
    if(this.collidesAt(this.scene,this.x,y))return;
    this.y=y;this.landed=true;this.notice='Hélico posé — E / Sortir pour quitter le cockpit. Haut pour décoller.';
   }
  }
  cockpit(){
   if(!this.continuous)return false;
   const w=this.worldPosition();
   if(this.pilot){
    if(Math.hypot(this.pilot.x-(w.x+21),this.pilot.y-(w.y+1))>35){this.notice='Revenez près de l’hélico pour embarquer.';return false;}
    this.pilot=null;this.notice='À bord — dirigez-vous vers le haut pour décoller.';return true;
   }
   if(!this.landed||this.carrying){this.notice='Posez l’hélico sans charge sur le bâtiment avant de sortir.';return false;}
   const side=this.landingSurface(w.x+52)===this.landingSurface(w.x+21)?42:-10;
   this.pilot={x:w.x+side,y:w.y+1,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};this.notice='Pilote à pied — ZQSD : déplacement, Z : saut, clic gauche : tir, E : embarquer.';return true;
  }
  pilotVisual(){
   const p=this.pilot,right=p.facing>=0;
   if(p.pose==='jump')return {type:right?17:16,frame:0};
   if(p.pose==='crouch')return {type:right?15:14,frame:0};
   if(p.pose==='run')return {type:11,frame:[0,2,5,6,1,6,5,2][Math.floor(p.animation*15)%8],mirror:!right};
   if(p.pose==='shoot')return {type:right?13:12,frame:0};
   return {type:11,frame:4,mirror:!right};
  }
  pilotHitsWall(p,x){
   if(this.customZones)return this.customZones.collisions.some(z=>(p.jumpFloor===undefined||z.y+z.h>=p.jumpFloor)&&x+11>z.x&&x+3<z.x+z.w&&p.y+13>z.y&&p.y+4<z.y+z.h);
   // Body rectangle in world pixels; keep its feet above the supporting floor.
   const bottom=Math.min(Math.floor(p.y+13),this.pilotFloor(p)-1);
   for(let y=Math.floor(p.y+4);y<=bottom;y++)for(let px=Math.floor(x+3);px<=Math.floor(x+11);px++){
    const scene=Math.floor(px/280)+1,localX=px-(scene-1)*280,localY=y-(scene===1?70:0);
    if(scene<1||scene>3||localY<0||localY>=192)continue;
    if(this.assets.backgrounds[scene-1][rowAddress(localY)+Math.floor(localX/7)]&(1<<(localX%7)))return true;
   }
   return false;
  }
  pilotFloor(p,x=p.x){
   if(this.customZones){
    const feet=p.y+14;
    const surfaces=this.customZones.collisions.filter(z=>x+11>z.x&&x+3<z.x+z.w&&z.y>=feet-.1&&(p.jumpFloor===undefined||z.y>=p.jumpFloor)).map(z=>z.y);
    surfaces.push(262);return Math.min(...surfaces);
   }
   return p.inside?p.floor:(this.landingSurface(x+10)??178);
  }
  pilotElevator(p){
   const stops=[{x:534,y:45},{x:428,y:62},{x:520,y:75},{x:428,y:88},{x:675,y:101},{x:428,y:114},{x:675,y:127},{x:675,y:140}];
   const atFloor=Math.abs(p.y-(this.pilotFloor(p)-14))<1;
   return atFloor&&((p.liftX!==undefined&&Math.abs(p.x+7-p.liftX)<=14)||stops.some(t=>Math.abs(p.x+7-t.x)<=14&&Math.abs(p.y-(t.y-14))<1));
  }
  stepPilot(input,dt){
   const p=this.pilot,floor=this.pilotFloor(p);
   p.previousX=p.x;p.previousY=p.y;
   const up=Boolean(input.up),down=Boolean(input.down),edge=(up&&!p.upHeld)||(down&&!p.downHeld);
   p.upHeld=up;p.downHeld=down;
   if(p.elevator){
    p.jumpHeld=Boolean(input.jump);
    if(p.elevator.y>p.y)this.invincible=Math.max(this.invincible,1+dt);
    p.y+=Math.sign(p.elevator.y-p.y)*Math.min(Math.abs(p.elevator.y-p.y),28*dt);
    p.vy=0;p.pose='idle';
    if(Math.abs(p.y-p.elevator.y)<.001){p.floor=p.elevator.floor;p.inside=p.floor!==45;if(!p.inside){p.x=Math.max(420,Math.min(530,p.x));p.previousX=p.x;p.liftX=p.x+7;}p.elevator=null;}
    return;
   }
   const entrance=Math.abs(p.x+7-686)<30&&Math.abs(p.y-(85-14))<1;
   let atCustomLift=false;
   if(this.customZones){
    // Include the feet on the zone boundary, where thin floor-level lifts sit.
    const touches=z=>p.x+11>z.x&&p.x+3<z.x+z.w&&p.y+14>=z.y-1&&p.y<z.y+z.h;
    atCustomLift=up&&this.customZones.teleports.some(z=>z.trigger!=='down'&&touches(z));
    const zone=this.customZones.teleports.find(z=>edge&&(z.trigger==='both'?(up!==down):z.trigger==='up'?up:down)&&touches(z));
    if(zone){const beforeY=p.y;if(Number.isFinite(this.customZones.teleportDistance)){p.y=Math.max(0,Math.min(248,p.y+(zone.trigger==='down'||zone.trigger==='both'&&down?1:-1)*this.customZones.teleportDistance));}else{p.x=zone.toX;p.y=zone.toY;}p.previousX=p.x;p.previousY=p.y;p.floor=p.y+14;p.inside=true;p.vy=0;p.pose='idle';p.jumpHeld=Boolean(input.jump);if(p.y>beforeY)this.invincible=Math.max(this.invincible,1+dt);return;}
   }
   if(!this.customZones&&edge&&Math.abs(p.x+7-686)<30){
    if(entrance&&down){p.x=670;p.previousX=p.x;p.inside=true;p.floor=101;p.y=87;p.vy=0;p.pose='idle';return;}
    if(p.inside&&p.floor===101&&up){p.inside=false;p.floor=85;p.y=71;p.vy=0;p.pose='idle';return;}
   }
   const atLift=!this.customZones&&this.pilotElevator(p);
   if(edge&&atLift){
    const levels=[45,62,75,88,101,114,127,140],current=levels.indexOf(floor),next=current+(down?1:-1);
    if(next>=0&&next<levels.length){
     const target=entrance&&down?101:levels[next];
     p.liftX=p.x+7;p.inside=true;p.floor=floor;p.elevator={floor:target,y:target-14};if(target>floor)this.invincible=Math.max(this.invincible,1+dt);p.vy=0;p.pose='idle';return;
    }
   }
   const grounded=p.y>=floor-14-.01&&p.vy>=0;
   const crouch=Boolean(input.crouch)&&grounded,jump=Boolean(input.jump);
   if(jump&&!atCustomLift&&!(up&&atLift)&&!p.jumpHeld&&grounded&&!crouch){p.jumpFloor=floor;p.vy=-65*Math.sqrt(this.jumpHeightPercent/100);}
   p.jumpHeld=jump;
   const startX=p.x,dx=(input.x||0)*(crouch?0:35)*dt*this.pilotSpeedPercent/100,steps=Math.max(1,Math.ceil(Math.abs(dx)));
   if(Math.abs(input.x||0)>.01)p.facing=input.x<0?-1:1;
   for(let i=0;i<steps;i++){
    const x=Math.max(0,Math.min(812,p.x+dx/steps)),scene=Math.floor(x/280)+1;
    const type=crouch?(p.facing>0?15:14):(p.facing>0?12:13);
    if((this.customZones||!p.inside||x>=415&&x<=686)&&!this.pilotHitsWall(p,x))p.x=x;
   }
   const surface=this.pilotFloor(p);
   p.vy=Math.min(70,p.vy+160*dt);
   let nextY=p.y+p.vy*dt;
   p.y=Math.min(surface-14,nextY);
   if(p.y>=surface-14){p.vy=0;delete p.jumpFloor;}
   const pose=p.vy!==0?'jump':crouch?'crouch':Math.abs(p.x-startX)>.001?'run':'idle';
   p.animation=pose==='run'?(p.pose==='run'?p.animation+dt:0):0;p.pose=pose;
  }
  step(input={},dt=1/60){
   if(this.paused||this.ended||(this.completed&&!this.continuous))return;
   if(this.respawnRemaining>0){
    this.respawnRemaining=Math.max(0,this.respawnRemaining-dt);input={};
    if(this.respawnRemaining===0){this.pilot=this.respawnPilot;this.respawnPilot=null;this.invincible=2;this.notice='Vous êtes de retour';}
   }
   this.stepMission(input,dt);
   if(this.ended)return;
   // Resolve movement before contact damage so a jump starts on the input frame.
   const movedPilot=this.pilot;
   if(movedPilot)this.stepPilot(input,dt);
   this.stepEnemies(dt);this.stepCombat(dt);
   if(this.ended)return;
   this.tick++;this.time=Math.max(0,this.time-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.invincible=Math.max(0,this.invincible-dt);
   if(input.cockpit&&!this.previous.cockpit)this.cockpit();
   if(this.respawnRemaining>0)return;
   if(this.pilot){
    if(this.pilot!==movedPilot)this.stepPilot(input,dt);
    if(!this.pilot.elevator&&input.fire&&Math.abs(input.x||0)<.01&&['idle','crouch'].includes(this.pilot.pose)){
     const p=this.pilot;
     if(p.pose==='idle')p.pose='shoot';if(Math.abs(input.aimX||0)>.01)p.facing=input.aimX<0?-1:1;
     if(this.cooldown===0){const right=p.facing>0;this.shots.push({x:p.x+(right?20:-4),y:p.y+2+(p.pose==='crouch'?10:6),v:right?360:-360});this.cooldown=.22;this.emit('fire');}
    }
    this.shots=this.shots.filter(p=>this.advanceShot(p,dt));
    this.previous={cockpit:Boolean(input.cockpit)};
    if(this.time===0&&(!this.infiniteLives||!this.continuous)){this.ended=true;this.notice='Fin de partie — temps écoulé';}
    return;
   }
   if(this.landed){
    if(input.y<0){this.landed=false;this.notice='Décollage';}
        else{this.previous={cockpit:Boolean(input.cockpit)};if(this.time===0&&(!this.infiniteLives||!this.continuous))this.ended=true;return;}
   }
   const both=input.fire&&input.turn,drop=Boolean(input.drop||both);
   const ax=input.aimX??input.x??0,ay=input.aimY??input.y??0;
   if(Math.hypot(ax,ay)>.01){
    const ratio=Math.abs(ax)/(Math.abs(ay)||.000001);
    this.orientation=ratio<.5?2:ratio<1.5?(ax<0?1:3):(ax<0?0:4);
   }
   if(drop&&!this.previous.drop)this.drop();
   if(input.fire&&!both&&!drop&&this.orientation!==2&&this.cooldown===0){const right=this.orientation>=2;this.shots.push({x:(this.continuous?this.worldPosition().x:this.x)+(right?37:0),y:(this.continuous?this.worldPosition().y:this.y)+8,v:right?360:-360});this.cooldown=.22;this.emit('fire');}
   // Provisional cadence: logical pixels, fixed step, no DOM/frame-time physics.
   const rate=this.speedPercent/100;
   this.move((input.x||0)*FLIGHT_SPEED.x*dt*rate,(input.y||0)*FLIGHT_SPEED.y*dt*rate);
   this.pickup();
   this.updateLanding(input);
   this.shots=this.shots.filter(p=>this.advanceShot(p,dt));
   for(const p of this.falls)p.y+=45*dt;this.falls=this.falls.filter(p=>p.y<(this.continuous?262:192));
   if(this.time===0&&(!this.infiniteLives||!this.continuous)){this.ended=true;this.notice='Fin de partie — temps écoulé';this.emit('end');}
   this.previous={turn:Boolean(input.turn),drop,cockpit:Boolean(input.cockpit)};
  }
 }
 const api={Game,rowAddress,triple,pixelX,FLIGHT_SPEED};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MinitCore=api;
})(typeof window!=='undefined'?window:globalThis);
