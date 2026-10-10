/* Seven spacious FPS floors, connected by alternating staircases. */
(function(root){
'use strict';
class FpsRoom {
 constructor(game){
  this.game=game;game.fpsInterior=true;this.active=false;this.bullets=[];this.effects=[];this.cooldown=0;this.flash=0;this.recoil=0;this.hitMarker=0;this.lookY=0;
  this.exit={x:3,z:2,level:0,label:'TOIT',world:{x:519,y:31,floor:45}};this.sideExit={x:20,z:9,level:2,label:'PLATEFORME',world:{x:670,y:71,floor:85}};this.exits=[this.exit,this.sideExit];this.computer={x:19,z:15,level:6};
  this.maps=Array.from({length:7},(_,level)=>this.makeMap(level));
 }
 makeMap(level){
  const map=Array.from({length:19},(_,z)=>Array.from({length:23},(_,x)=>x===0||x===22||z===0||z===18?1:0));
  for(const [x,z,type] of [[6,7,2],[16,11,2],[15,6,3],[7,12,3],[5,10,4],[17,8,4]]){
   const dz=level%2;map[z+dz][x]=type;if(type>=3)map[z+dz][x+1]=type;
  }
  return map;
 }
 get map(){return this.maps[this.player?.level||0];}
 stairs(level){
  const result=[];
  if(level>0)result.push({...this.downStair(level-1),level,kind:'up',to:level-1});
  if(level<6)result.push({...this.downStair(level),level,kind:'down',to:level+1});
  return result;
 }
 downStair(level){return level%2===0?{x:19,z:15}:{x:3,z:3};}
 wall(x,z,level=this.player?.level||0){return this.maps[level]?.[Math.floor(z)]?.[Math.floor(x)]??1;}
 clear(x,z,r=.23,level=this.player?.level||0){return ![[x-r,z-r],[x+r,z-r],[x-r,z+r],[x+r,z+r]].some(([a,b])=>this.wall(a,b,level));}
 move(body,dx,dz){
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
  for(let i=0;i<n;i++){if(this.clear(body.x+dx/n,body.z,.23,body.level||0))body.x+=dx/n;if(this.clear(body.x,body.z+dz/n,.23,body.level||0))body.z+=dz/n;}
 }
 ray(x,z,dx,dz,level=this.player?.level||0){
  let mx=Math.floor(x),mz=Math.floor(z),sx=dx<0?-1:1,sz=dz<0?-1:1,tx=Math.abs(1/(dx||1e-9)),tz=Math.abs(1/(dz||1e-9)),ax=(dx<0?x-mx:mx+1-x)*tx,az=(dz<0?z-mz:mz+1-z)*tz,side=0,d=0;
  for(let i=0;i<80;i++){if(ax<az){d=ax;ax+=tx;mx+=sx;side=0;}else{d=az;az+=tz;mz+=sz;side=1;}const cell=this.maps[level]?.[mz]?.[mx]??1;if(cell)return {d,side,cell,u:side?(x+dx*d)%1:(z+dz*d)%1};}
  return {d:40,side,cell:1,u:0};
 }
 enter(){
  const p=this.game.pilot;if(!p)return;
  const sideEntry=p.fpsEntry==='side'||(!p.fps&&p.x>640&&p.floor===101);
  const level=sideEntry?2:Math.max(0,Math.min(6,Math.round(((p.floor??p.y+14)-62)/13)));
  delete p.fpsEntry;
  const entry=sideEntry?{x:this.sideExit.x-1,z:this.sideExit.z}:level?this.downStair(level-1):{x:3,z:3};
  this.player=p.fps||{x:entry.x,z:entry.z,yaw:Math.atan2(9-entry.z,11-entry.x),jump:0,vy:0,level};
  this.player.level??=level;p.fps=this.player;this.active=true;this.lookY=0;this.game.fpsActive=true;this.bullets=[];this.transition=null;
  this.game.notice='Base FPS — 7 étages, escaliers alternés ; ordinateur au niveau 7';
 }
 leave(exit=this.exit){
  const g=this.game,p=g.pilot;this.active=false;g.fpsActive=false;
  if(p){delete p.fps;Object.assign(p,{...exit.world,previousX:exit.world.x,previousY:exit.world.y,inside:false,vy:0,elevator:null,pose:'idle',fallOriginY:undefined});}
  g.notice=exit===this.sideExit?'Retour sur la plateforme extérieure':'Retour sur le toit';
 }
 sync(){const p=this.game.pilot;if(!p){this.active=false;this.game.fpsActive=false;return;}if(!this.active&&!p.elevator&&p.inside&&p.y>=44)this.enter();}
 look(dx,dy){if(!this.active)return;this.player.yaw+=dx*.003;this.lookY=Math.max(-.5,Math.min(.5,this.lookY+dy*.002));}
 floorY(level){return 48+level*13;}
 projectionFrame(level){
  const target=level<6?this.downStair(level):this.computer;
  const entry=level?this.downStair(level-1):{x:3,z:3};
  const right=level<2?513:668;
  return {entry,target,from:level===0?519:level%2?421:right,to:level%2?right:421,length:Math.hypot(target.x-entry.x,target.z-entry.z)};
 }
 project(pos){
  const level=pos.level||0,f=this.projectionFrame(level),distance=Math.hypot(pos.x-f.target.x,pos.z-f.target.z);
  const progress=Math.max(0,Math.min(1,1-distance/f.length));
  return {x:f.from+(f.to-f.from)*progress,y:this.floorY(level),floor:this.floorY(level)+14,distance,progress};
 }
 unproject(x,y){
  const level=Math.max(0,Math.min(6,Math.round((y-48)/13))),f=this.projectionFrame(level);
  const progress=Math.max(0,Math.min(1,(x-f.from)/(f.to-f.from)));
  let pos={x:f.entry.x+(f.target.x-f.entry.x)*progress,z:f.entry.z+(f.target.z-f.entry.z)*progress,level};
  if(!this.clear(pos.x,pos.z,.23,level)){
   let best=Infinity;for(let z=1;z<18;z++)for(let a=1;a<22;a++)if(this.clear(a+.5,z+.5,.23,level)){const d=Math.hypot(a+.5-pos.x,z+.5-pos.z);if(d<best){best=d;pos={x:a+.5,z:z+.5,level};}}
  }
  return pos;
 }
 syncWorld(){
  for(const e of this.game.enemies)if(e.phase==='inside'&&e.fps){const w=this.project(e.fps);e.x=w.x;e.y=w.y;}
  if(this.active&&this.game.pilot){const p=this.game.pilot,w=this.project(this.player);p.previousX=p.x;p.previousY=p.y;Object.assign(p,{x:w.x,y:w.y-this.player.jump*8,floor:w.floor});}
  for(const list of [this.game.mines,this.game.bonuses])for(const item of list)if(item.fps){const w=this.project(item.fps);item.x=w.x;item.y=w.floor;}
 }
 enemyPosition(e){if(!e.fps)e.fps=this.unproject(e.x,e.y);e.fps.level??=0;return e.fps;}
 shoot(){
  if(this.cooldown>0||this.transition)return false;
  this.cooldown=.22;this.flash=.1;this.recoil=1;this.game.emit('fire');
  const p=this.player,dx=Math.cos(p.yaw),dz=Math.sin(p.yaw),wall=this.ray(p.x,p.z,dx,dz).d;
  let target=null,best=wall;
  for(const e of this.game.enemies){
   if(e.phase!=='inside')continue;
   const pos=this.enemyPosition(e);if(pos.level!==p.level)continue;
   const rx=pos.x-p.x,rz=pos.z-p.z,d=rx*dx+rz*dz,side=Math.abs(rx*dz-rz*dx);
   if(d>0&&d<best&&side<.48&&Math.abs(this.lookY)<.2){best=d;target=e;}
  }
  this.effects.push({x:p.x+dx*best,z:p.z+dz*best,level:p.level,kind:'spark',age:0});
  if(target){
   target.hits++;target.state=Math.min(3,target.hits+1);target.hitFlash=.22;target.hitStun=.16;this.hitMarker=.2;this.game.emit('hit');
   if(target.hits>=3){const pos={...target.fps};this.effects.push({...pos,kind:'explosion',age:0});this.game.destroyEnemy(target,true);this.game.mines.at(-1).fps=pos;this.syncWorld();this.game.score+=20;}
  }
  return true;
 }
 startStairs(stair){
  if(this.transition||this.player.jump>0)return;
  this.transition={remaining:.6,stair};this.game.invincible=Math.max(this.game.invincible,1.6);
  this.game.notice=(stair.kind==='down'?'Descente':'Montée')+' vers étage '+(stair.to+1)+'/7';
 }
 finishStairs(stair){
  const p=this.player;p.level=stair.to;p.x=stair.x;p.z=stair.z;p.yaw=Math.atan2(9-p.z,11-p.x);p.jump=0;p.vy=0;p.stairLock={x:p.x,z:p.z};
  Object.assign(this.game.pilot,{floor:62+p.level*13,y:48+p.level*13});
  this.game.invincible=Math.max(this.game.invincible,1);this.lookY=0;
 }
 path(body,target){
  const map=this.maps[body.level||0],start=[Math.floor(body.x),Math.floor(body.z)],goal=[Math.floor(target.x),Math.floor(target.z)],key=(x,z)=>z*23+x;
  const queue=[start],parents=new Map([[key(...start),null]]);let end=null;
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(x===goal[0]&&z===goal[1]){end=key(x,z);break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!map[nz]?.[nx]&&!parents.has(k)){parents.set(k,key(x,z));queue.push([nx,nz]);}}}
  if(end===null)return [];
  const route=[];while(parents.get(end)!==null){route.push({x:end%23+.5,z:Math.floor(end/23)+.5});end=parents.get(end);}return route.reverse().concat([{x:target.x,z:target.z}]);
 }
 killPlayer(){
  const count=this.game.bonuses.length;
  if(this.game.hurtPlayer()){if(this.game.bonuses.length>count)this.game.bonuses.at(-1).fps={x:this.player.x,z:this.player.z,level:this.player.level};return true;}return false;
 }
 step(input,dt){
  this.sync();if(this.game.paused||this.game.ended)return;
  const g=this.game,p=this.player;
  this.cooldown=Math.max(0,this.cooldown-dt);this.flash=Math.max(0,this.flash-dt);this.recoil=Math.max(0,this.recoil-dt*8);this.hitMarker=Math.max(0,this.hitMarker-dt);
  this.effects.forEach(e=>e.age+=dt);this.effects=this.effects.filter(e=>e.age<(e.kind==='explosion'?.5:.18));
  if(this.active){
  if(this.transition){this.transition.remaining-=dt;g.invincible=Math.max(g.invincible,1+dt);if(this.transition.remaining<=0){this.finishStairs(this.transition.stair);this.transition=null;}}
  else{
   p.yaw+=(input.turn||0)*dt*1.8;
   const speed=3.2*(g.pilotSpeedPercent/190)*(input.crouch?.4:1),forward=input.forward||0,strafe=input.strafe||0,n=Math.max(1,Math.hypot(forward,strafe));
   this.move(p,(Math.cos(p.yaw)*forward-Math.sin(p.yaw)*strafe)*speed*dt/n,(Math.sin(p.yaw)*forward+Math.cos(p.yaw)*strafe)*speed*dt/n);
   g.pilot.pose=input.crouch?'crouch':'idle';
   if(input.jump&&!this.jumpHeld&&p.jump===0)p.vy=3.5;this.jumpHeld=input.jump;p.vy-=9*dt;p.jump=Math.max(0,p.jump+p.vy*dt);if(p.jump===0)p.vy=0;
   p.mineGrace=p.jump>0?.18:Math.max(0,(p.mineGrace||0)-dt);
   if(p.stairLock&&Math.hypot(p.x-p.stairLock.x,p.z-p.stairLock.z)>1.5)delete p.stairLock;
   const stair=this.stairs(p.level).find(s=>Math.hypot(p.x-s.x,p.z-s.z)<(input.interact?1.6:.65));
   if(stair&&!p.stairLock)this.startStairs(stair);
   if(input.fire)this.shoot();
   if(input.interact&&!this.interactHeld){
    const exit=this.exits.find(e=>e.level===p.level&&Math.hypot(p.x-e.x,p.z-e.z)<1.6);if(exit){this.leave(exit);return;}
    if(p.level===6&&Math.hypot(p.x-this.computer.x,p.z-this.computer.z)<2){if(!g.launchMissile())g.notice='Aucun missile chargé';}
   }
   this.interactHeld=input.interact;
  }
  }
  this.syncWorld();
  for(const e of [...g.enemies]){
   if(e.phase!=='inside')continue;
   const pos=this.enemyPosition(e);e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);e.hitStun=Math.max(0,(e.hitStun||0)-dt);
   const target=pos.level<6?this.downStair(pos.level):this.computer;
   if(!e.fpsPath?.length)e.fpsPath=this.path(pos,target);
   const waypoint=e.fpsPath[0];
   if(waypoint&&e.hitStun===0){const dx=waypoint.x-pos.x,dz=waypoint.z-pos.z,d=Math.hypot(dx,dz);if(d<.08)e.fpsPath.shift();else this.move(pos,dx/d*Math.min(d,dt*.9),dz/d*Math.min(d,dt*.9));}
   if(Math.hypot(pos.x-target.x,pos.z-target.z)<.3){
    if(pos.level<6){pos.level++;e.fpsPath=null;e.y=48+pos.level*13;}
    else{this.effects.push({...pos,kind:'explosion',age:0});g.destroyEnemy(e);g.computerHits++;g.notice='Ordinateur touché — '+g.computerHits+'/'+g.computerHitLimit;if(g.computerHits>=g.computerHitLimit){g.ended=true;g.notice='Fin de partie — ordinateur détruit';}continue;}
   }
   if(!this.active||!g.pilot||pos.level!==p.level)continue;
   e.fpsFire=Math.max(0,(e.fpsFire??1.5)-dt);
   const px=p.x-pos.x,pz=p.z-pos.z,range=Math.hypot(px,pz);
   if(e.canShoot!==false&&e.fpsFire===0&&range>0&&this.ray(pos.x,pos.z,px/range,pz/range,pos.level).d>range){this.bullets.push({x:pos.x,z:pos.z,vx:px/range*6,vz:pz/range*6,level:pos.level});e.fpsFire=1.7;}
   if(range<.55&&!input.crouch&&!this.transition)this.killPlayer();
  }
  this.bullets=this.bullets.filter(b=>{
   const n=Math.max(1,Math.ceil(6*dt/.1));
   for(let i=0;i<n;i++){b.x+=b.vx*dt/n;b.z+=b.vz*dt/n;if(this.wall(b.x,b.z,b.level||0))return false;if(this.active&&g.pilot&&(b.level||0)===p.level&&Math.hypot(b.x-p.x,b.z-p.z)<.28&&p.jump<.3&&!input.crouch&&!this.transition){this.killPlayer();return false;}}return true;
  });
  g.mines=g.mines.filter(m=>{
   const pos=m.fps;if(!pos)return true;
   const e=g.enemies.find(e=>e.fps&&(e.fps.level||0)===(pos.level||0)&&Math.hypot(e.fps.x-pos.x,e.fps.z-pos.z)<.4);
   if(e){this.effects.push({...pos,kind:'explosion',age:0});g.destroyEnemy(e);return false;}
   if(this.active&&g.pilot&&(pos.level||0)===p.level&&p.jump===0&&!(p.mineGrace>0)&&!input.crouch&&!this.transition&&Math.hypot(p.x-pos.x,p.z-pos.z)<.25&&this.killPlayer())return false;
   return true;
  });
  g.bonuses=g.bonuses.filter(b=>{
   if(!b.fps)return true;const level=b.fps.level||0;
   if(this.active&&level===p.level&&Math.hypot(p.x-b.fps.x,p.z-b.fps.z)<.5&&g.pilot){g.lives++;return false;}
   const e=g.enemies.find(e=>e.fps&&(e.fps.level||0)===level&&Math.hypot(e.fps.x-b.fps.x,e.fps.z-b.fps.z)<.5);if(e){e.canShoot=false;return false;}return true;
  });this.syncWorld();this.sync();
 }
 makeArt(scenes){
  if(this.computerImage)return;
  this.computerImage=document.createElement('canvas');this.computerImage.width=14;this.computerImage.height=14;this.computerImage.getContext('2d').drawImage(scenes[1],139,128,14,14,0,0,14,14);
  this.stairImage=document.createElement('canvas');this.stairImage.width=32;this.stairImage.height=32;const c=this.stairImage.getContext('2d');
  for(let i=0;i<7;i++){c.fillStyle=i%2?'#708ca2':'#bed2df';c.fillRect(2+i*4,29-i*4,28-i*4,4);c.fillStyle='#263e52';c.fillRect(2+i*4,31-i*4,28-i*4,1);}
 }
 renderInspection(ctx,width,height,sprites,scenes){
  if(this.active)return this.render(ctx,width,height,sprites,scenes);
  const saved=this.player,look=this.lookY,level=this.game.enemies.find(e=>e.fps)?.fps.level||0;
  this.player={x:3,z:3,level,yaw:Math.atan2(6,8),jump:0};this.lookY=0;
  try{this.render(ctx,width,height,sprites,scenes);}finally{this.player=saved;this.lookY=look;}
 }
 render(ctx,width,height,sprites,scenes){
  const p=this.player;if(!p)return;const w=840,h=422;
  if(!this.buffer){this.buffer=document.createElement('canvas');this.buffer.width=w;this.buffer.height=h;this.tint=document.createElement('canvas');this.tint.width=14;this.tint.height=14;}
  this.makeArt(scenes);
  const c=this.buffer.getContext('2d'),horizon=h*(.48+this.lookY)+p.jump*35,scale=w*.64;
  c.imageSmoothingEnabled=false;c.fillStyle=['#0b121c','#12141f','#101c1c','#1c1710','#19121c','#101820','#201010'][p.level];c.fillRect(0,0,w,h);
  c.fillStyle='#202830';c.fillRect(0,horizon,w,h);
  for(let y=Math.max(0,horizon);y<h;y+=16){c.fillStyle=y%32<16?'#35404a':'#202830';c.fillRect(0,y,w,1);}
  const depth=[];
  for(let x=0;x<w;x+=2){
   const a=p.yaw+Math.atan((x-w/2)/scale),hit=this.ray(p.x,p.z,Math.cos(a),Math.sin(a)),d=hit.d*Math.cos(a-p.yaw),size=scale*2.6/Math.max(.1,d),top=horizon-size*.55;
   depth[x/2]=d;const light=Math.max(.2,1-d/30)*(hit.side?.72:1),color=hit.cell===2?[35,110,170]:hit.cell===3?[160,105,45]:hit.cell===4?[45,115,100]:[140,90,40];
   c.fillStyle=`rgb(${color.map(v=>Math.round(v*light)).join(',')})`;c.fillRect(x,top,2,size);
   c.fillStyle='#0005';for(const fraction of [.15,.3,.6,.75,.9])c.fillRect(x,top+size*fraction,2,2);
   if(hit.u<.06){c.fillStyle='#0005';c.fillRect(x,top,2,size);}if(hit.cell>=3){c.fillStyle='#b3bfaa66';c.fillRect(x,top+size*.5,2,3);}
  }
  const objects=[...this.stairs(p.level).map(s=>({...s,kind:'stair',label:s.kind==='down'?'DESCENDRE':'MONTER',to:s.to}))];
  for(const exit of this.exits)if(exit.level===p.level)objects.push({...exit,kind:'exit'});if(p.level===6)objects.push({...this.computer,kind:'computer'});
  for(const e of this.game.enemies)if(e.phase==='inside'&&this.enemyPosition(e).level===p.level)objects.push({...e.fps,kind:'enemy',enemy:e});
  for(const b of this.bullets)if((b.level||0)===p.level)objects.push({...b,kind:'bullet'});
  for(const [kind,items]of [['mine',this.game.mines],['bonus',this.game.bonuses]])for(const item of items)if(item.fps&&(item.fps.level||0)===p.level)objects.push({...item.fps,kind});
  for(const effect of this.effects)if((effect.level||0)===p.level)objects.push(effect);
  objects.sort((a,b)=>Math.hypot(b.x-p.x,b.z-p.z)-Math.hypot(a.x-p.x,a.z-p.z));
  for(const o of objects){
   const rx=o.x-p.x,rz=o.z-p.z,d=rx*Math.cos(p.yaw)+rz*Math.sin(p.yaw),side=-rx*Math.sin(p.yaw)+rz*Math.cos(p.yaw);if(d<=.1)continue;
   const screen=w/2+side/d*scale,size=scale/d*(o.kind==='bullet'?.12:o.kind==='mine'?.25:o.kind==='spark'?.18:o.kind==='enemy'?1.5:o.kind==='explosion'?1.5+o.age*2:1),bottom=horizon+scale/d*(o.kind==='enemy'||o.kind==='explosion'?.75:1.15),top=o.kind==='bullet'||o.kind==='spark'?horizon-size/2:bottom-size;
   let img=o.kind==='computer'?this.computerImage:o.kind==='stair'?this.stairImage:o.kind==='explosion'?sprites[27][Math.min(6,Math.floor(o.age*14))]:null,sourceWidth=img?.width;
   if(o.kind==='enemy'){
    const e=o.enemy,frames=e.state===1?[1,2,3,4,3,2]:e.state===2?[0,1,2,3,4,5,4,3,2,1]:[0];img=sprites[17+e.state][frames[Math.floor(e.animation*15)%frames.length]];sourceWidth=14;
    if(e.hitFlash>0){const t=this.tint.getContext('2d');t.clearRect(0,0,14,14);t.drawImage(img,0,0);t.globalCompositeOperation='source-atop';t.fillStyle=e.hitFlash>.12?'#fff':'#ff6559';t.fillRect(0,0,14,14);t.globalCompositeOperation='source-over';img=this.tint;}
   }
   for(let x=Math.max(0,Math.floor(screen-size/2));x<Math.min(w,screen+size/2);x+=2){
    if(d>depth[Math.floor(x/2)])continue;
    if(img)c.drawImage(img,Math.max(0,Math.floor((x-screen+size/2)/size*sourceWidth)),0,1,img.height,x,top,2,size);
    else{c.fillStyle={exit:'#68b7ff',bullet:'#ff6444',mine:'#ff3030',bonus:'#ffda55',spark:'#ffe48b'}[o.kind];c.fillRect(x,top,2,size);}
   }
   if(d<depth[Math.max(0,Math.min(419,Math.floor(screen/2)))]&&screen>0&&screen<w){
    c.textAlign='center';c.font='bold 12px monospace';
    if(o.kind==='enemy'&&o.enemy.hitFlash>0){c.fillStyle='#fff17b';c.fillText('TOUCHÉ · '+o.enemy.hits+'/3',screen,top-12);}
    if(['computer','exit','stair'].includes(o.kind)&&d<8){c.fillStyle='#fff';c.fillText(o.kind==='exit'?'E · SORTIE '+o.label:o.kind==='computer'?'E · ORDINATEUR':o.label+' · ÉTAGE '+(o.to+1),screen,top-10);}
   }
  }
  this.drawWeapon(c,w,h);
  c.strokeStyle=this.hitMarker?'#ffeb78':'#fff';c.lineWidth=this.hitMarker?2:1;c.beginPath();
  if(this.hitMarker){for(const [x,y]of [[-1,-1],[1,-1],[-1,1],[1,1]]){c.moveTo(w/2+x*7,h/2+y*7);c.lineTo(w/2+x*13,h/2+y*13);}}
  else{c.moveTo(w/2-7,h/2);c.lineTo(w/2+7,h/2);c.moveTo(w/2,h/2-7);c.lineTo(w/2,h/2+7);}c.stroke();
  if(this.hitMarker){c.fillStyle='#ffeb78';c.font='bold 14px monospace';c.textAlign='center';c.fillText('IMPACT',w/2,h/2-24);}
  c.fillStyle='#0b0f16e6';c.fillRect(12,12,230,74);c.font='bold 14px monospace';c.textAlign='left';c.fillStyle='#73e3b6';c.fillText('BASE · ÉTAGE '+(p.level+1)+' / 7',20,33);c.fillStyle='#fff';c.font='12px monospace';c.fillText('Ordi '+this.game.computerHits+'/'+this.game.computerHitLimit+' · objectif au niveau 7',20,54);c.fillStyle='#a6bad0';c.fillText(p.level<6?'Escalier '+(p.level%2===0?'au fond à droite':'à gauche'):'Activez l’ordinateur · E',20,74);
  c.fillStyle='#000b';c.fillRect(0,h-22,w,22);c.fillStyle='#c9d5df';c.font='11px monospace';c.textAlign='center';c.fillText('ZQSD · souris : viser · clic : tirer · escaliers : marcher / E · Espace : saut · Ctrl : accroupi',w/2,h-7);
  if(this.transition){c.fillStyle='#0009';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='bold 22px monospace';c.fillText('ESCALIER · ÉTAGE '+(this.transition.stair.to+1),w/2,h/2);}
  ctx.drawImage(this.buffer,0,0,width,height);
 }
 drawWeapon(c,w,h){
  const kick=this.recoil*22,x=w/2+24,y=h-112+kick;c.save();c.translate(x,y);c.rotate(this.recoil*.055);
  c.fillStyle='#111b25';c.fillRect(-25,10,62,95);c.fillStyle='#506777';c.fillRect(-19,17,46,77);c.fillStyle='#a0b8c7';c.fillRect(-16,17,7,66);c.fillStyle='#263944';c.fillRect(15,26,12,70);
  c.fillStyle='#1a2732';c.fillRect(-10,-20,24,48);c.fillStyle='#91a8b2';c.fillRect(-7,-17,5,43);c.fillStyle='#0b1118';c.fillRect(-13,-24,30,12);c.fillStyle='#3d5668';c.fillRect(-9,-22,22,5);
  c.fillStyle='#587380';c.fillRect(-3,-29,9,6);c.fillStyle='#22343e';c.fillRect(-32,71,74,39);c.fillStyle='#718d9e';c.fillRect(-27,74,14,30);
  if(this.flash>0){const s=15+this.flash*220;c.fillStyle='#ff862b';c.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?s*.35:s;c.lineTo(2+Math.cos(a)*r,-35+Math.sin(a)*r);}c.closePath();c.fill();c.fillStyle='#fff7c3';c.fillRect(-5,-43,14,16);c.strokeStyle='#fff0a2';c.lineWidth=2;c.beginPath();c.moveTo(2,-35);c.lineTo(-24,-h*.24);c.stroke();}
  else if(this.cooldown>.09){c.fillStyle='#d5dfed44';c.fillRect(-5,-38-(.22-this.cooldown)*120,9,17);}
  c.restore();
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports=FpsRoom;else root.FpsRoom=FpsRoom;
})(typeof window!=='undefined'?window:globalThis);
