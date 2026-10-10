const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Game}=require('../web/core.js'),FpsRoom=require('../web/fps.js');
const data=vm.runInNewContext(fs.readFileSync('web/assets.js','utf8')+';MINIT_ASSETS');
function fixture(){const game=new Game(data);game.continuous=true;game.enemySpawnRemaining=9999;game.pilot={x:519,y:48,floor:62,inside:true,vy:0,pose:'idle'};const room=new FpsRoom(game);room.sync();return {game,room};}
const {game,room}=fixture();assert.equal(room.active,true);room.move(room.player,-100,0);assert.ok(room.player.x>.2);assert.equal(room.clear(6.5,7.5),false);assert.ok(room.ray(11,3,0,1).d>10);
room.player.x=11;room.player.z=3;room.player.yaw=Math.PI/2;
game.enemies=[{x:668,y:126,state:1,hits:0,animation:0,action:'base',phase:'inside',fps:{x:11,z:6},canShoot:false}];for(let i=0;i<3;i++){room.cooldown=0;room.shoot();}assert.equal(game.enemies.length,0);assert.equal(game.mines.length,1);assert.equal(game.mines[0].fps.z,6);
const objective=fixture();objective.game.enemies=[{x:668,y:126,state:1,hits:0,animation:0,action:'base',phase:'inside',canShoot:false}];for(let i=0;i<3600&&objective.game.enemies.length;i++)objective.room.step({},1/60);assert.equal(objective.game.computerHits,1);assert.equal(objective.game.enemies.length,0);
const cover=fixture();cover.room.bullets=[{x:5.8,z:7.5,vx:6,vz:0}];cover.room.step({},.2);assert.equal(cover.room.bullets.length,0);
const launch=fixture();launch.room.player.x=11;launch.room.player.z=15;launch.game.missileSlots[0]='loaded';launch.room.step({interact:true},1/60);assert.equal(launch.game.launchedMissiles,1);launch.room.player.z=2;launch.room.step({},1/60);launch.room.step({interact:true},1/60);assert.equal(launch.room.active,false);assert.equal(launch.game.pilot.inside,false);assert.equal(launch.game.pilot.y,31);
console.log('PASS: FPS walls/cover, three-hit robot and mine, computer attack, missile launch and roof exit');
