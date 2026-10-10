const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Game}=require('../web/core.js'),FpsRoom=require('../web/fps.js');
const data=vm.runInNewContext(fs.readFileSync('web/assets.js','utf8')+';MINIT_ASSETS');
function fixture(){const game=new Game(data);game.continuous=true;game.enemySpawnRemaining=9999;game.pilot={x:519,y:48,floor:62,inside:true,vy:0,pose:'idle'};const room=new FpsRoom(game);room.sync();return {game,room};}
const {game,room}=fixture();assert.equal(room.maps.length,7);room.move(room.player,-100,0);assert.ok(room.player.x>.2);assert.equal(room.clear(6.5,7.5),false);
room.player.x=11;room.player.z=3;room.player.yaw=Math.PI/2;
game.enemies=[{x:668,y:48,state:1,hits:0,animation:0,action:'base',phase:'inside',fps:{x:11,z:6,level:0},canShoot:false}];
room.shoot();assert.equal(room.flash,.1);assert.equal(room.recoil,1);assert.ok(room.hitMarker>0);assert.ok(game.enemies[0].hitFlash>0);
for(let i=0;i<2;i++){room.cooldown=0;room.shoot();}assert.equal(game.enemies.length,0);assert.equal(game.mines.length,1);assert.equal(game.mines[0].fps.z,6);assert.ok(room.effects.some(e=>e.kind==='explosion'));
const stairs=fixture();for(let level=0;level<6;level++){const s=stairs.room.stairs(level).find(s=>s.kind==='down');Object.assign(stairs.room.player,{x:s.x,z:s.z});delete stairs.room.player.stairLock;stairs.room.step({},1/60);assert.ok(stairs.room.transition);for(let i=0;i<37;i++)stairs.room.step({},1/60);assert.equal(stairs.room.player.level,level+1);assert.equal(stairs.room.transition,null);stairs.room.step({},1/60);assert.equal(stairs.room.transition,null);}assert.equal(stairs.room.player.level,6);
const objective=fixture();objective.room.player.x=20;objective.room.player.z=2;objective.game.enemies=[{x:668,y:48,state:1,hits:0,animation:0,action:'base',phase:'inside',canShoot:false}];for(let i=0;i<26000&&objective.game.enemies.length;i++)objective.room.step({},1/60);assert.equal(objective.game.computerHits,1);assert.equal(objective.game.enemies.length,0);
const cover=fixture();cover.room.bullets=[{x:5.8,z:7.5,vx:6,vz:0,level:0}];cover.room.step({},.2);assert.equal(cover.room.bullets.length,0);
const separate=fixture();separate.room.player.x=11;separate.room.player.z=3;separate.room.player.yaw=Math.PI/2;separate.game.enemies=[{state:1,hits:0,phase:'inside',fps:{x:11,z:6,level:1}}];separate.room.shoot();assert.equal(separate.game.enemies[0].hits,0);
const launch=fixture();Object.assign(launch.room.player,{level:6,x:19,z:14});launch.game.missileSlots[0]='loaded';launch.room.step({interact:true},1/60);assert.equal(launch.game.launchedMissiles,1);Object.assign(launch.room.player,{level:0,x:3,z:2});launch.room.step({},1/60);launch.room.step({interact:true},1/60);assert.equal(launch.room.active,false);assert.equal(launch.game.pilot.inside,false);
console.log('PASS: seven floors, alternating stairs and arrival lock, cover, combat feedback, floor isolation, robot path to computer, launch and exit');
