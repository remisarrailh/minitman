/* Meaningful native-core checks against recovered original coordinates. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {Game,FLIGHT_SPEED}=require('../web/core.js');
const MouseJoystick=require('../web/mouse.js');
const data=vm.runInNewContext(fs.readFileSync('web/assets.js','utf8')+';MINIT_ASSETS');
assert.deepEqual(new Game(data).stock,[10,20,10]);
const speedBase=new Game(data),speedTuned=new Game(data);
speedTuned.setSpeedPercent(175.5);speedBase.step({x:1});speedTuned.step({x:1});
assert.ok(Math.abs((speedTuned.x-112)/(speedBase.x-112)-1.755)<1e-10);
speedTuned.reset();assert.equal(speedTuned.speedPercent,175.5);speedTuned.setSpeedPercent(NaN);assert.equal(speedTuned.speedPercent,175.5);
assert.equal(speedTuned.setSpeedPercent(1000),400);assert.equal(speedTuned.setSpeedPercent(-5),10);
// A solid HGR page blocks movement without killing or dropping the load.
const solidData={...data,backgrounds:data.backgrounds.map(b=>b.map(()=>255))};
for(const scene of [1,2,3]){
 const free=new Game(data),solid=new Game(solidData);
 for(const g of [free,solid])Object.assign(g,{scene,x:100,y:60,carrying:'truss'});
 for(let i=0;i<30;i++){free.step({x:1,y:1});solid.step({x:1,y:1});}
 assert.equal(solid.x,100);assert.equal(solid.y,60);assert.equal(solid.lives,5);assert.equal(solid.carrying,'truss');assert.equal(solid.events.includes('crash'),false);
}
// Approach a wall from clear space, keep pushing, then slide along it.
const wall=new Array(8192).fill(0);
const {rowAddress}=require('../web/core.js');
for(let y=0;y<192;y++)wall[rowAddress(y)+20]=127;
const contact=new Game({...data,backgrounds:[wall,wall,wall]});Object.assign(contact,{x:100,y:40,carrying:'truss'});
for(let i=0;i<120;i++)contact.step({x:1});
const stoppedX=contact.x;assert.ok(stoppedX>100&&stoppedX<140);assert.equal(contact.collidesAt(1,contact.x,contact.y),false);
for(let i=0;i<60;i++)contact.step({x:1,y:1,aimX:1,aimY:0});
assert.equal(contact.x,stoppedX);assert.ok(contact.y>40);assert.equal(contact.lives,5);assert.equal(contact.carrying,'truss');
const fastContact=new Game({...data,backgrounds:[wall,wall,wall]});Object.assign(fastContact,{x:100,y:40});fastContact.setSpeedPercent(400);
for(let i=0;i<60;i++)fastContact.step({x:1});assert.ok(fastContact.x<140);assert.equal(fastContact.collidesAt(1,fastContact.x,fastContact.y),false);assert.equal(fastContact.lives,5);
console.log('PASS: speed percentage, reset persistence, invalid input, bounds and blocking at 400%');
console.log('PASS: scenery blocks movement and allows sliding, without life or load loss');
// Returning from supplies at antenna height must not hit off-screen decoration.
for(const speed of [100,233,400]){
 const returnFlight=new Game(data);Object.assign(returnFlight,{scene:3,x:3,y:10,carrying:'truss'});returnFlight.setSpeedPercent(speed);
 for(let i=0;i<20;i++)returnFlight.step({x:-1,aimX:-60});
 assert.equal(returnFlight.scene,2);assert.ok(returnFlight.x<250);assert.equal(returnFlight.lives,5);assert.equal(returnFlight.carrying,'truss');
}
const antennaFlight=new Game(data);Object.assign(antennaFlight,{scene:2,x:240,y:18,orientation:0});
antennaFlight.move(0,12);assert.equal(antennaFlight.y,30);assert.equal(antennaFlight.collidesAt(2,240,30),false);
antennaFlight.move(0,30);assert.ok(antennaFlight.y<60);assert.equal(antennaFlight.collidesAt(2,antennaFlight.x,antennaFlight.y),false);
console.log('PASS: decorative antenna does not trap or block screen entry; roof remains solid');
// Both transported shapes stop at the roof before the helicopter reaches it.
for(const kind of ['truss','beam'])for(const speed of [100,400]){
 const loadedRoof=new Game(data),emptyRoof=new Game(data);
 for(const g of [loadedRoof,emptyRoof]){Object.assign(g,{scene:2,x:180,y:1});g.setSpeedPercent(speed);}
 loadedRoof.carrying=kind;
 for(let i=0;i<120;i++){loadedRoof.step({y:1,aimX:1,aimY:0});emptyRoof.step({y:1,aimX:1,aimY:0});}
 assert.ok(loadedRoof.y<emptyRoof.y);assert.equal(loadedRoof.collidesAt(2,loadedRoof.x,loadedRoof.y),false);
 assert.equal(loadedRoof.carrying,kind);assert.equal(loadedRoof.lives,5);
 const stopped=loadedRoof.y;loadedRoof.step({y:-1,aimX:1,aimY:0});assert.ok(loadedRoof.y<stopped);
}
console.log('PASS: truss/beam and winch collide with roof, preserve load/lives, and can retreat at 100/400%');
// Cargo hits bridge cliffs outside the narrow active placement alignment.
for(const kind of ['truss','beam'])for(const speed of [100,400]){
 const cliff=new Game(data);Object.assign(cliff,{scene:1,x:220,y:1,carrying:kind});cliff.setSpeedPercent(speed);
 for(let i=0;i<120;i++)cliff.step({y:1,aimX:1,aimY:0});
 assert.equal(cliff.collidesAt(1,cliff.x,cliff.y),false);assert.ok(cliff.y<60);
 const stopped=cliff.y;cliff.step({y:-1,aimX:1,aimY:0});assert.ok(cliff.y<stopped);
 assert.equal(cliff.lives,5);assert.equal(cliff.carrying,kind);
}
console.log('PASS: carried pieces block against bridge cliffs outside active docking alignment');

const mouse=new MouseJoystick(),rect={left:10,top:20,width:560,height:384};
const pilot={x:119,y:89};
mouse.move(570,212,rect);assert.equal(mouse.sample(pilot).x,0);mouse.buttons(2);assert.equal(mouse.sample(pilot).x,1);
mouse.move(310,212,rect);const near=mouse.sample(pilot).x;assert.ok(near>0&&near<1);
mouse.move(290,212,rect);assert.equal(mouse.sample(pilot).x,0);
mouse.move(10,212,rect);assert.equal(mouse.sample(pilot).x,-1);
// Direction and speed depend only on the cursor relative to the helicopter.
mouse.move(410,212,rect);assert.equal(mouse.sample({x:10,y:89}).x,1);assert.ok(mouse.sample({x:240,y:89}).x<0);
mouse.move(290,212,rect);assert.equal(mouse.sample({x:10,y:89}).x,1);
mouse.move(570,212,rect);assert.equal(mouse.sample({x:255,y:89}).x,1/60);
mouse.move(330,212,rect);const midSpeed=mouse.sample(pilot).x;assert.ok(midSpeed>near&&midSpeed<1);
mouse.move(410,252,rect);const vertical=mouse.sample({x:10,y:89}),dist=Math.hypot(169,20);
assert.ok(Math.abs(vertical.y-20*Math.min(1,(dist-3)/60)/dist)<1e-12);
mouse.buttons(0);assert.equal(mouse.sample(pilot).x,0);
assert.equal(mouse.buttons(1).fire,true);assert.equal(mouse.buttons(3,true).drop,true);assert.equal(mouse.buttons(3,true).drop,false);
const mousePose=new Game(data);Object.assign(mousePose,{x:156,y:79,carrying:'truss'});mousePose.step(mouse.sample(mousePose));assert.equal(mousePose.score,10);assert.equal(mousePose.shots.length,0);
mouse.buttons(0);mouse.buttons(2);assert.equal(mouse.buttons(3,true).drop,true);
mouse.reset();assert.equal(mouse.sample().x,0);mouse.enabled=false;mouse.move(570,404,rect);mouse.buttons(3);assert.equal(mouse.sample().x,0);assert.equal(mouse.mask,0);
const unladenMouse=new MouseJoystick();unladenMouse.move(250,100,{left:0,top:0,width:280,height:192});
assert.equal(unladenMouse.buttons(3,false).fire,true);
const unladenInput=unladenMouse.sample({x:100,y:50});assert.equal(unladenInput.fire,true);assert.equal(unladenInput.drop,false);assert.ok(unladenInput.x>0);
const firingGame=new Game(data);firingGame.step(unladenInput);assert.equal(firingGame.shots.length,1);
unladenMouse.buttons(0);assert.equal(unladenMouse.buttons(3,true).drop,true);
const ladenInput=unladenMouse.sample({x:100,y:50},true);assert.equal(ladenInput.fire,false);assert.equal(ladenInput.drop,true);assert.equal(ladenInput.x,0);
console.log('PASS: both mouse buttons fire/move without cargo and place/stop with cargo');
const facing=new Game(data);facing.step({aimX:-20});assert.equal(facing.orientation,0);facing.step({aimX:20});assert.equal(facing.orientation,4);
console.log('PASS: right-held movement, cursor-relative direction and distance-based speed on both axes, arrival dead zone, release stop, both-button placement and automatic facing');
function at(scene,x,y){const g=new Game(data);Object.assign(g,{scene,x,y,invincible:100});return g;}
const pickup=at(3,142,78);assert.equal(pickup.pickup(),true);assert.equal(pickup.carrying,'truss');assert.equal(pickup.stock[0],9);
const approach=at(3,142,60);assert.equal(approach.winchVisible(),true);approach.y=1;assert.equal(approach.winchVisible(),false);approach.scene=1;approach.carrying='truss';assert.equal(approach.winchVisible(),true);approach.carrying=null;assert.equal(approach.winchVisible(),false);
const unloaded=at(1,112,1),loaded=at(1,112,1);loaded.carrying='truss';unloaded.step({x:1,y:1});loaded.step({x:1,y:1});assert.equal(loaded.x,unloaded.x);assert.equal(loaded.y,unloaded.y);
assert.deepEqual(pickup.piecePosition(),[20,5,91]); // settled carrying capture is y79 after one pixel of movement
const good=at(1,156,79);good.carrying='truss';assert.deepEqual(good.piecePosition(),[22,5,92]);assert.equal(good.drop(),true);assert.equal(good.trusses,7);assert.equal(good.score,10);
const bad=at(1,155,79);bad.carrying='truss';assert.equal(bad.drop(),false);assert.equal(bad.score,0);assert.equal(bad.falls.length,1);
const order=at(1,122,78);order.carrying='beam';order.beams=5;order.trusses=6;assert.equal(order.drop(),false);
const paused=at(1,112,1);paused.paused=true;paused.step({x:1,fire:true});assert.equal(paused.x,112);assert.equal(paused.time,300);assert.equal(paused.shots.length,0);
const crossing=at(1,250,1);crossing.step({x:1});assert.equal(crossing.scene,2);assert.equal(crossing.y,68);
crossing.x=0;crossing.step({x:-1});assert.equal(crossing.scene,1);assert.equal(crossing.y,1);
const combo=at(1,156,79);combo.carrying='truss';combo.step({fire:true,turn:true});combo.step({fire:true,turn:true});assert.equal(combo.score,10);assert.equal(combo.shots.length,0);assert.equal(combo.orientation,2);
const clock=at(1,112,1);clock.time=.001;clock.step();assert.equal(clock.ended,true);
const a=at(1,112,1),b=at(1,112,1);a.enemySpawnRemaining=b.enemySpawnRemaining=30;for(let i=0;i<60;i++){a.step({x:.1});b.step({x:.1});}assert.equal(JSON.stringify(a),JSON.stringify(b));
// All seven missing pieces can complete the prototype using original targets.
const complete=at(1,0,1);for(let i=6;i<9;i++){const t=data.trusses[i];complete.x=t[0]*7+t[1]-3;complete.y=t[2]-13;complete.carrying='truss';assert.equal(complete.drop(),true);}
for(let i=4;i<8;i++){const t=data.beams[i];complete.x=t[0]*7+t[1]-3;complete.y=t[2]-13;complete.carrying='beam';assert.equal(complete.drop(),true);}
assert.equal(complete.completed,true);assert.equal(complete.score,70);
// End-to-end native journey with inputs only: no coordinate or stock pokes.
const journey=new Game(data);journey.continuous=true;journey.enemySpawnRemaining=9999;
function driveUntil(condition,control){let steps=0;while(!condition()){assert.ok(!journey.ended,'Journey ended before repair: '+journey.notice+' '+JSON.stringify({scene:journey.scene,x:journey.x,y:journey.y,trusses:journey.trusses,beams:journey.beams}));journey.step(control());assert.ok(++steps<20000,'Navigation stalled');}}
function flyTo(x,y){driveUntil(()=>Math.abs(journey.x-x)<.001&&Math.abs(journey.y-y)<.001,()=>({x:Math.max(-1,Math.min(1,(x-journey.x)/(FLIGHT_SPEED.x/60))),y:Math.max(-1,Math.min(1,(y-journey.y)/(FLIGHT_SPEED.y/60)))}));}
for(let turn=0;turn<7;turn++){
 const kind=turn<3?'truss':'beam',pile=kind==='truss'?0:1;
 if(journey.scene===1)flyTo(journey.x,1);
 driveUntil(()=>journey.scene===3,()=>({x:1,y:journey.y>1?-1:0}));
 flyTo(pile===0?142:174,1);
 flyTo(pile===0?142:174,journey.heights[pile]-11);
 assert.equal(journey.carrying,kind,'Pickup during natural native journey');
 flyTo(journey.x,1); // Lift the whole load clear of the roof before flying left.
 driveUntil(()=>journey.scene===1,()=>({x:-1,y:journey.y>1?-1:0}));
 const target=journey.nextTarget(kind);flyTo(target[0]*7+target[1]-3,target[2]-13);
 journey.step({drop:true});journey.step({});assert.equal(journey.score,(turn+1)*10);
}
assert.equal(journey.completed,true);assert.equal(journey.lives,5);
console.log('PASS: end-to-end seven-piece journey using only movement/drop inputs; remaining time '+journey.time.toFixed(2)+' seconds');
console.log('PASS: native pickup, exact placement, rejection, order, pause, transitions, simultaneous actions, timer, deterministic simulation, seven-piece completion');

const seamless=new Game({...data,backgrounds:data.backgrounds.map(()=>new Array(8192).fill(0))});seamless.continuous=true;
for(const start of [279,559]){
 seamless.scene=Math.floor(start/280)+1;seamless.x=start%280;seamless.y=80-(seamless.scene===1?70:0);
 seamless.move(4,0);assert.ok(Math.abs(seamless.worldPosition().x-(start+4))<1e-10);assert.equal(seamless.worldPosition().y,80);
 seamless.move(-4,0);assert.ok(Math.abs(seamless.worldPosition().x-start)<1e-10);assert.equal(seamless.worldPosition().y,80);
}
const worldMouse=new MouseJoystick();worldMouse.world=true;worldMouse.move(700,100,{left:0,top:0,width:840,height:262});worldMouse.buttons(2);
const globalCommand=worldMouse.sample({x:200,y:80});assert.ok(globalCommand.x>0);
assert.ok(worldMouse.sample({x:500,y:80}).x<globalCommand.x);
console.log('PASS: world-space seams preserve X/Y both ways and mouse target uses world coordinates and follows helicopter position');

// A perforated wall blocks shots except through its empty opening, in either direction.
const perforated=new Array(8192).fill(0);
for(let y=0;y<192;y++)if(y<50||y>54)perforated[rowAddress(y)+20]=1;
for(const continuous of [false,true])for(const direction of [-1,1]){
 const bullets=new Game({...data,backgrounds:[perforated,perforated,perforated]});bullets.continuous=continuous;bullets.scene=2;
 const origin=continuous?280:0;
 for(const y of [40,52]){
  bullets.shots=[{x:origin+(direction>0?120:160),y,v:direction*360}];
  bullets.step({},1/6);assert.equal(bullets.shots.length,y===52?1:0);
 }
}
console.log('PASS: swept four-pixel shots stop on solids, pass through holes, both directions and across world coordinates');

const frontalFire=new Game(data);frontalFire.step({fire:true,aimX:0,aimY:-1});
assert.equal(frontalFire.orientation,2);assert.equal(frontalFire.shots.length,0);assert.equal(frontalFire.events.includes('fire'),false);assert.equal(frontalFire.cooldown,0);
for(const aimX of [-1,1]){const lateralFire=new Game(data);lateralFire.step({fire:true,aimX});assert.equal(lateralFire.shots.length,1);}
console.log('PASS: frontal orientation cannot shoot or start cooldown; left/right orientations can shoot');

for(const [scene,x] of [[2,180],[3,50]]){
 const landing=new Game(data);landing.continuous=true;Object.assign(landing,{scene,x,y:1});
 for(let i=0;i<180&&!landing.landed;i++)landing.step({y:1});
 assert.equal(landing.landed,true);const parked=landing.worldPosition();
 assert.equal(landing.cockpit(),true);assert.ok(landing.pilot);
 landing.step({x:1});assert.ok(landing.pilot.x>parked.x+21);assert.deepEqual(landing.worldPosition(),parked);
 assert.equal(landing.cockpit(),true);assert.equal(landing.pilot,null);
 landing.step({y:-1});assert.equal(landing.landed,false);assert.ok(landing.worldPosition().y<parked.y);
}
const airborne=new Game(data);airborne.continuous=true;assert.equal(airborne.cockpit(),false);assert.equal(airborne.pilot,null);
const loadedLanding=new Game(data);loadedLanding.continuous=true;Object.assign(loadedLanding,{scene:2,x:180,y:1,carrying:'truss'});
for(let i=0;i<180;i++)loadedLanding.step({y:1});assert.equal(loadedLanding.landed,false);assert.equal(loadedLanding.cockpit(),false);
const repairedFlight=new Game(data);repairedFlight.continuous=true;repairedFlight.completed=true;repairedFlight.step({x:1});assert.ok(repairedFlight.x>112);
console.log('PASS: both landing sites, disembark/walk/reboard/takeoff, airborne/load rejection, flight after bridge repair');

// Animation transitions must follow movement, landing and held controls.
const animated=new Game(data);animated.continuous=true;
animated.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};
assert.equal(animated.pilotVisual().type,11);assert.equal(animated.pilotVisual().frame,4);
const frames=new Set();for(let i=0;i<30;i++){animated.step({x:1});assert.equal(animated.pilot.pose,'run');frames.add(animated.pilotVisual().frame);}
assert.equal(frames.size,5);
animated.step({});assert.equal(animated.pilotVisual().type,11);assert.equal(animated.pilotVisual().frame,4);
animated.step({x:-1});assert.equal(animated.pilotVisual().type,11);assert.equal(animated.pilotVisual().mirror,true);
animated.step({});assert.equal(animated.pilotVisual().type,11);assert.equal(animated.pilotVisual().mirror,true);
const beforeCrouch=animated.pilot.x;animated.step({x:-1,crouch:true});assert.equal(animated.pilotVisual().type,14);assert.equal(animated.pilot.x,beforeCrouch);
animated.step({jump:true,crouch:true});assert.equal(animated.pilot.pose,'crouch');
animated.step({});const groundY=animated.pilot.y;animated.step({jump:true});assert.equal(animated.pilotVisual().type,16);assert.ok(animated.pilot.y<groundY);
for(let i=0;i<100;i++)animated.step({jump:true});assert.equal(animated.pilot.y,groundY);assert.equal(animated.pilot.pose,'idle');
animated.step({});animated.step({jump:true,x:1});assert.equal(animated.pilotVisual().type,17);
const frozen=JSON.stringify(animated.pilot);animated.paused=true;animated.step({x:1});assert.equal(JSON.stringify(animated.pilot),frozen);
console.log('PASS: five-frame directional run, idle, crouch speed, jump direction, landing, no held auto-jump, animation pause');

const parkedControls=new Game(data);parkedControls.continuous=true;Object.assign(parkedControls,{scene:2,x:180,y:30,landed:true});
parkedControls.step({x:1});assert.equal(parkedControls.pilot,null);assert.equal(parkedControls.x,180);
parkedControls.step({cockpit:true});assert.ok(parkedControls.pilot);
parkedControls.step({fire:true,aimX:-1});assert.equal(parkedControls.shots.length,1);assert.equal(parkedControls.pilot.facing,-1);assert.equal(parkedControls.shots[0].v,-360);
const bulletX=parkedControls.shots[0].x;parkedControls.step({});assert.ok(parkedControls.shots[0].x<bulletX);
console.log('PASS: landing requires explicit cockpit action; pilot fires and updates projectiles toward cursor');

const sequence=new Game(data);sequence.pilot={facing:1,pose:'run',animation:0};
assert.deepEqual([0,1,2,3,4,5,6,7,8].map(i=>{sequence.pilot.animation=(i+.01)/15;return sequence.pilotVisual().frame;}),[0,2,5,6,1,6,5,2,0]);
sequence.pilot.facing=-1;assert.equal(sequence.pilotVisual().mirror,true);assert.equal(sequence.pilotVisual().type,11);
console.log('PASS: ping-pong B sequence without duplicate endpoints and software mirror');

const fireRules=new Game(data);fireRules.continuous=true;fireRules.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};
fireRules.step({x:1,fire:true});assert.equal(fireRules.shots.length,0);assert.equal(fireRules.pilot.pose,'run');
fireRules.step({fire:true});assert.equal(fireRules.shots.length,1);assert.equal(fireRules.pilot.pose,'shoot');assert.equal(fireRules.pilotVisual().type,13);
fireRules.step({});assert.equal(fireRules.pilotVisual().frame,4);
fireRules.cooldown=0;fireRules.step({jump:true,fire:true});assert.equal(fireRules.shots.length,1);
console.log('PASS: B-4 idle, stationary-only shooting pose, no shot while running or jumping, crouch locks movement');

fireRules.pilot.pose="shoot";fireRules.pilot.facing=-1;assert.equal(fireRules.pilotVisual().type,12);

function jumpRise(percent){const g=new Game(data);g.continuous=true;g.setJumpHeightPercent(percent);g.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};let top=31;for(let i=0;i<180;i++){g.step({jump:i===0});top=Math.min(top,g.pilot.y);}assert.equal(g.pilot.y,31);return 31-top;}
assert.ok(jumpRise(200)>jumpRise(100)*1.9);
const heightSetting=new Game(data);heightSetting.setJumpHeightPercent(180);heightSetting.reset();assert.equal(heightSetting.jumpHeightPercent,180);assert.equal(heightSetting.setJumpHeightPercent(NaN),180);assert.equal(heightSetting.setJumpHeightPercent(999),400);
console.log('PASS: jump-height scaling, landing, persistence across reset, invalid values and bounds');

const lift=new Game(data);lift.continuous=true;lift.pilot={x:527,y:31,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};
lift.step({down:true});assert.ok(lift.pilot.elevator);for(let i=0;i<60;i++)lift.step({});assert.equal(lift.pilot.floor,62);assert.equal(lift.pilot.y,48);
lift.pilot.x=421;lift.step({});lift.step({up:true,jump:true});assert.ok(lift.pilot.elevator);for(let i=0;i<60;i++)lift.step({});assert.equal(lift.pilot.floor,45);assert.equal(lift.pilot.inside,false);
const door=new Game(data);door.continuous=true;door.pilot={x:679,y:71,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};door.step({down:true});assert.equal(door.pilot.floor,101);assert.equal(door.pilot.elevator,undefined);door.step({});door.step({up:true});assert.equal(door.pilot.inside,false);assert.equal(door.pilot.y,71);
console.log('PASS: roof elevator, interior floor travel, held input prevents repeated travel, exit to roof, supply entrance');

const roundTrip=new Game(data);roundTrip.continuous=true;roundTrip.pilot={x:527,y:31,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};
roundTrip.step({down:true});for(let i=0;i<60;i++)roundTrip.step({});assert.equal(roundTrip.pilot.floor,62);
roundTrip.step({up:true,jump:true});assert.ok(roundTrip.pilot.elevator,'Must be able to ascend at the arrival position without walking to another blue bar');for(let i=0;i<60;i++)roundTrip.step({});assert.equal(roundTrip.pilot.floor,45);assert.equal(roundTrip.pilot.y,31);
console.log('PASS: elevator descent and ascent at the same arrival position');

for(const rate of [100,190,400]){
 const walls=new Game(data);walls.continuous=true;walls.setPilotSpeedPercent(rate);walls.pilot={x:665,y:101-14,floor:101,inside:true,vy:0,facing:1,pose:'idle',animation:0,jumpHeld:false};
 for(let i=0;i<120;i++)walls.step({x:1});assert.ok(walls.pilot.x+11<687,'Body must stay inside the supply-side wall');
 const blocked=walls.pilot.x;walls.step({x:-1});assert.ok(walls.pilot.x<blocked,'Can retreat from wall');
}
console.log('PASS: interior solid wall blocks full pilot body at 100/190/400 percent and allows retreat');

const roofEdge=new Game(data);roofEdge.continuous=true;roofEdge.pilot={x:537,y:48,floor:62,inside:true,liftX:544,vy:0,facing:1,pose:'idle',animation:0};roofEdge.step({up:true});for(let i=0;i<90;i++)roofEdge.step({});assert.equal(roofEdge.pilot.y,31);assert.equal(roofEdge.pilot.inside,false);
const reachableDoor=new Game(data);reachableDoor.continuous=true;reachableDoor.pilot={x:650,y:71,vy:0,facing:1,pose:'idle',animation:0};for(let i=0;i<100;i++)reachableDoor.step({x:1});reachableDoor.step({down:true});assert.equal(reachableDoor.pilot.inside,true);assert.equal(reachableDoor.pilot.floor,101);
console.log('PASS: ascent remains on roof and supply door reachable through movement with wall collisions active');

const custom=new Game(data);custom.continuous=true;custom.customZones={collisions:[{x:505,y:0,w:5,h:100},{x:480,y:45,w:25,h:3},{x:580,y:101,w:80,h:3}],teleports:[{x:480,y:20,w:20,h:30,trigger:'up',toX:600,toY:87,floor:101}]};custom.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0};for(let i=0;i<60;i++)custom.step({x:1});assert.ok(custom.pilot.x+11<=505);
custom.pilot.x=490;custom.step({up:true,jump:true});assert.equal(custom.pilot.x,600);assert.equal(custom.pilot.y,87);assert.equal(custom.pilot.floor,101);custom.step({up:true});assert.equal(custom.pilot.y,87);
console.log('PASS: editable collision rectangles and explicit teleport destination/floor');

const gravityTest=new Game(data);gravityTest.continuous=true;gravityTest.customZones={collisions:[{x:560,y:140,w:100,h:3}],teleports:[]};gravityTest.pilot={x:590,y:80,inside:true,vy:0,facing:1,pose:'idle',animation:0};gravityTest.step({});assert.ok(gravityTest.pilot.y>80);for(let i=0;i<120;i++)gravityTest.step({});assert.equal(gravityTest.pilot.y,126);assert.equal(gravityTest.pilot.vy,0);
console.log('PASS: custom-zone gravity falls onto drawn platforms');

const verticalTeleport=new Game(data);verticalTeleport.continuous=true;verticalTeleport.customZones={teleportDistance:13,collisions:[],teleports:[{x:480,y:20,w:30,h:40,trigger:'down'}]};verticalTeleport.pilot={x:490,y:31,vy:0,pose:'idle',facing:1,animation:0};verticalTeleport.step({down:true});assert.equal(verticalTeleport.pilot.x,490);assert.equal(verticalTeleport.pilot.y,44);verticalTeleport.customZones.teleports[0].trigger='up';verticalTeleport.step({});const yBefore=verticalTeleport.pilot.y;verticalTeleport.step({up:true});assert.equal(verticalTeleport.pilot.x,490);assert.equal(verticalTeleport.pilot.y,yBefore-13);
console.log('PASS: shared verticalTeleport teleport distance preserves X in both directions');

for(const trigger of ['up','down','both'])for(const command of ['up','down']){
 const g=new Game(data);g.continuous=true;g.customZones={teleportDistance:13,collisions:[],teleports:[{x:480,y:10,w:40,h:90,trigger}]};g.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0};g.step({[command]:true});const allowed=trigger==='both'||trigger===command;
 assert.equal(g.pilot.x,490);if(allowed)assert.equal(g.pilot.y,31+(command==='up'?-13:13));else assert.ok(Math.abs(g.pilot.y-31)<1);
}
console.log('PASS: up/down/bidirectional teleports accept only their configured commands');

const noImplicitRoof=new Game(data);noImplicitRoof.continuous=true;noImplicitRoof.customZones={collisions:[],teleports:[]};noImplicitRoof.pilot={x:490,y:31,inside:true,vy:0,facing:1,pose:'idle',animation:0};for(let i=0;i<30;i++)noImplicitRoof.step({});assert.ok(noImplicitRoof.pilot.y>45,'Undrawn roof must not support the pilot');assert.equal(noImplicitRoof.pilotHitsWall(noImplicitRoof.pilot,414),false);
console.log('PASS: custom zones disable implicit roof and scenery walls');

const ceiling=new Game(data);ceiling.continuous=true;ceiling.customZones={collisions:[{x:480,y:45,w:50,h:2},{x:480,y:25,w:50,h:3}],teleports:[]};ceiling.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0};let minHead=33;for(let i=0;i<120;i++){ceiling.step({jump:i===0});minHead=Math.min(minHead,ceiling.pilot.y+2);}assert.ok(minHead<28);assert.equal(ceiling.pilot.y,31);
console.log('PASS: custom ceiling does not block jump ascent; pilot returns to floor');

const jumpingUnder=new Game(data);jumpingUnder.continuous=true;jumpingUnder.customZones={collisions:[{x:470,y:45,w:100,h:2},{x:470,y:25,w:100,h:3}],teleports:[]};jumpingUnder.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0};jumpingUnder.setJumpHeightPercent(10);for(let i=0;i<12;i++)jumpingUnder.step({jump:i===0,x:1});assert.ok(jumpingUnder.pilot.x>496,'Ceiling must not stop horizontal movement during a jump');
console.log('PASS: movement during jump ignores overhead platforms');

const robotHits=new Game({...data,backgrounds:data.backgrounds.map(()=>new Array(8192).fill(0))});robotHits.continuous=true;robotHits.enemies=[{x:480,y:100,state:1,hits:0,animation:0}];
for(const state of [2,3]){robotHits.shots=[{x:450,y:106,v:360}];robotHits.step({},.15);assert.equal(robotHits.enemies[0].state,state);assert.equal(robotHits.shots.length,0);}
robotHits.shots=[{x:450,y:106,v:360}];robotHits.step({},.15);assert.equal(robotHits.enemies.length,0);assert.equal(robotHits.mines.length,1);
console.log('PASS: swept projectile hits one robot once, consumes shot and advances state');

const arrivals=new Game(data);arrivals.continuous=true;arrivals.random=()=>.5;arrivals.setEnemyBridgeChance(0);arrivals.setEnemySpawnSeconds(30);assert.equal(arrivals.enemySpawnRemaining,30);arrivals.enemySafetyRadius=0;arrivals.worldPosition=()=>({x:0,y:200});arrivals.stepEnemies(30);assert.equal(arrivals.enemies.length,1);assert.ok(arrivals.enemies[0].y<=70);for(let i=0;i<5000;i++)arrivals.stepEnemies(1/60);assert.ok(arrivals.computerHits>0||arrivals.enemies.some(e=>e.phase==='inside')); 
const safeSpawn=new Game(data);safeSpawn.continuous=true;safeSpawn.random=()=>.5;safeSpawn.setEnemySafetyRadius(100);safeSpawn.spawnEnemy();assert.ok(Math.abs(safeSpawn.enemies[0].x+7-(safeSpawn.worldPosition().x+21))>=121);
console.log('PASS: 30-second mean spawn, safe horizontal arrival and base descent');

const descent=new Game(data);descent.continuous=true;descent.enemySpawnRemaining=999;descent.enemySafetyRadius=0;descent.customZones={teleportDistance:13,collisions:[{x:420,y:45,w:120,h:2},{x:420,y:62,w:120,h:2}],teleports:[{x:520,y:29,w:20,h:15,trigger:'down'},{x:420,y:46,w:20,h:15,trigger:'both'}]};descent.enemies=[{x:519,y:31,state:1,hits:0,animation:0,action:'base',phase:'landing'}];for(let i=0;i<1000&&descent.enemies[0]?.phase!=='inside';i++)descent.stepEnemies(1/60);assert.equal(descent.enemies[0].phase,'inside');assert.equal(descent.enemies[0].routeIndex,2);assert.equal(descent.enemies[0].y,61);
console.log('PASS: robot follows successive custom descent zones instead of stopping at first floor');

const combat=new Game(data);combat.infiniteLives=false;combat.continuous=true;combat.enemySpawnRemaining=9999;const cw=combat.worldPosition();combat.enemies=[{x:cw.x+5,y:cw.y,state:1,hits:0,animation:0,phase:'inside'}];combat.step({});assert.equal(combat.lives,4);assert.equal(combat.enemies.length,0);assert.ok(combat.explosions.length);
combat.invincible=0;combat.respawnRemaining=0;combat.pilot={x:490,y:100,vy:0,pose:'idle',facing:1,animation:0};combat.hurtPlayer();assert.equal(combat.bonuses.length,1);combat.pilot={x:490,y:100,vy:0,pose:'idle',facing:1,animation:0};const livesBefore=combat.lives;combat.stepCombat(1/60);assert.equal(combat.lives,livesBefore+1);assert.equal(combat.bonuses.length,0);
combat.pilot=null;combat.bonuses=[{x:480,y:114}];combat.enemies=[{x:480,y:100,state:1,hits:0,animation:0,phase:'inside'}];combat.stepCombat(1/60);assert.equal(combat.enemies[0].canShoot,false);assert.equal(combat.bonuses.length,0);
console.log('PASS: enemy contact destroys helicopter, three-hit death/mine, pilot death bonus, life gain and enemy disarm');

const enemyFire=new Game({...data,backgrounds:data.backgrounds.map(()=>new Array(8192).fill(0))});enemyFire.continuous=true;enemyFire.infiniteLives=false;enemyFire.enemySpawnRemaining=9999;Object.assign(enemyFire,{scene:2,x:180,y:30});enemyFire.enemies=[{x:400,y:30,state:1,hits:0,animation:0,phase:'inside'}];for(let i=0;i<60;i++)enemyFire.step({});assert.equal(enemyFire.lives,4);
const disabledFire=new Game(data);disabledFire.continuous=true;disabledFire.enemies=[{x:10,y:1,state:1,hits:0,animation:0,phase:'inside',canShoot:false}];disabledFire.stepCombat(.5);assert.equal(disabledFire.enemyShots.length,0);
console.log('PASS: aligned enemy fires and projectile costs a life; disarmed enemy cannot fire');

const directArrival=new Game(data);directArrival.continuous=true;directArrival.enemySpawnRemaining=9999;directArrival.random=()=>.5;directArrival.setEnemyBridgeChance(0);Object.assign(directArrival,{scene:2,x:180,y:40});directArrival.spawnEnemy();const spawnX=directArrival.enemies[0].x;directArrival.stepEnemies(.25);assert.equal(directArrival.enemies[0].x,spawnX);assert.ok(directArrival.enemies[0].y>-14);for(let i=0;i<160;i++)directArrival.stepEnemies(1/60);assert.equal(directArrival.enemies[0].y,0);
console.log('PASS: enemy entry descends only its sprite height before approaching base');

const fastEntry=new Game(data);fastEntry.continuous=true;fastEntry.enemySpawnRemaining=9999;fastEntry.random=()=>.5;fastEntry.spawnEnemy();fastEntry.stepEnemies(.1);assert.ok(fastEntry.enemies[0].y>=-2);fastEntry.stepEnemies(.05);assert.ok(fastEntry.enemies[0].y>=0);
console.log('PASS: rapid entry from off-screen before normal descent');

const mandatoryRoof=new Game(data);mandatoryRoof.continuous=true;mandatoryRoof.enemySpawnRemaining=9999;mandatoryRoof.enemySafetyRadius=0;mandatoryRoof.customZones={teleportDistance:13,collisions:[],teleports:[{x:450,y:60,w:20,h:15,trigger:'down'}]};mandatoryRoof.enemies=[{x:490,y:0,state:1,hits:0,animation:0,action:'base',phase:'approach',arrivalY:0}];for(let i=0;i<110;i++)mandatoryRoof.stepEnemies(1/60);assert.equal(mandatoryRoof.enemies[0].x,519);assert.ok(mandatoryRoof.enemies[0].y<31);
console.log('PASS: mandatory roof entrance precedes custom interior access');

const mission=new Game(data);mission.continuous=true;assert.equal(mission.startTrain(),false);mission.forceTrain();assert.equal(mission.trusses,9);assert.equal(mission.beams,8);assert.ok(mission.train.cargo);
for(let i=0;i<800;i++)mission.stepMission({},1/60);assert.equal(mission.missileSlots[0],'loaded');assert.equal(mission.train.cargo,false);assert.equal(mission.launchedMissiles,0);
mission.pilot={x:421,y:126};mission.stepMission({interact:true},1/60);assert.equal(mission.launchedMissiles,1);mission.stepMission({interact:true},1/60);assert.equal(mission.launchedMissiles,1);
mission.launchMissile(true);mission.launchMissile(true);assert.equal(mission.launchedMissiles,3);for(let i=0;i<150;i++)mission.stepMission({},1/60);assert.equal(mission.won,true);assert.equal(mission.ended,true);
console.log('PASS: train requires repaired bridge, cargo unloads at arrow, computer launches once per press, three launches win');

const bridgeAttack=new Game(data);bridgeAttack.continuous=true;bridgeAttack.random=()=>.5;bridgeAttack.enemySpawnRemaining=9999;bridgeAttack.spawnEnemy(true);assert.equal(bridgeAttack.enemies[0].action,'bridge');const chosen=bridgeAttack.enemies[0].bridgeTarget;for(let i=0;i<1000;i++)bridgeAttack.stepEnemies(1/60);assert.equal(bridgeAttack.enemies.length,0);assert.ok(bridgeAttack.bridgeDamage[chosen.kind].includes(chosen.index));assert.equal(bridgeAttack.completed,false);
const repairTarget=bridgeAttack.nextTarget(chosen.kind);bridgeAttack.scene=1;bridgeAttack.x=repairTarget[0]*7+repairTarget[1]-3;bridgeAttack.y=repairTarget[2]-13;bridgeAttack.carrying=chosen.kind;assert.equal(bridgeAttack.drop(),true);assert.equal(bridgeAttack.bridgeDamage[chosen.kind].length,0);
console.log('PASS: forced bridge attack destroys a random installed piece, explodes and allows repair');

const infinite=new Game(data);infinite.continuous=true;infinite.enemySpawnRemaining=9999;infinite.hurtPlayer();assert.equal(infinite.lives,5);assert.equal(infinite.respawnRemaining,3);for(let i=0;i<181;i++)infinite.step({x:1});assert.equal(infinite.respawnRemaining,0);assert.equal(infinite.ended,false);
const computer=new Game(data);computer.continuous=true;computer.enemySpawnRemaining=9999;for(let i=0;i<3;i++){computer.enemies=[{x:421,y:126,state:1,hits:0,animation:0,action:'base',phase:'inside'}];computer.stepEnemies(1/60);}assert.equal(computer.computerHits,3);assert.equal(computer.ended,true);
const destroyedBridge=new Game(data);for(const target of destroyedBridge.bridgeTargets())destroyedBridge.damageBridge(target);assert.equal(destroyedBridge.ended,true);assert.equal(destroyedBridge.bridgeTargets().length,0);
console.log('PASS: infinite lives with delayed respawn, computer defeat threshold, fully destroyed bridge defeat');

const enemyWall=new Game({...data,backgrounds:[wall,wall,wall]});enemyWall.continuous=true;const mover={x:110,y:100,phase:'approach'};enemyWall.moveEnemy(mover,160,100);assert.ok(mover.x+12<140);const blockedX=mover.x;enemyWall.moveEnemy(mover,mover.x-10,100);assert.ok(mover.x<blockedX);
console.log('PASS: swept enemy movement blocks scenery wall and permits retreat');

const bottomLift=new Game(data);bottomLift.continuous=true;bottomLift.enemySpawnRemaining=9999;bottomLift.customZones={teleportDistance:13,collisions:[{x:640,y:140,w:60,h:2},{x:640,y:127,w:60,h:2}],teleports:[{x:666,y:140,w:18,h:2,trigger:'up'}]};bottomLift.pilot={x:668,y:126,vy:0,facing:1,pose:'idle',animation:0};bottomLift.step({up:true,jump:true});assert.equal(bottomLift.pilot.y,113);bottomLift.step({up:true,jump:true});assert.equal(bottomLift.pilot.vy,0);assert.equal(bottomLift.pilot.y,113);
const mineBounds=new Game(data);mineBounds.continuous=true;mineBounds.enemySpawnRemaining=9999;mineBounds.pilot={x:509,y:126,vy:0,facing:1,pose:'idle',animation:0,inside:true,floor:140};mineBounds.mines=[{x:500,y:140}];mineBounds.stepCombat(1/60);assert.equal(mineBounds.mines.length,1);assert.equal(mineBounds.respawnRemaining,0);mineBounds.pilot.x=494;mineBounds.stepCombat(1/60);assert.equal(mineBounds.mines.length,0);assert.ok(mineBounds.respawnRemaining>0);
console.log('PASS: floor-boundary lift overrides jump and held Z stays latched; mines use sprite-sized contact');

for(const samePlace of [false,true]){
 const g=new Game(data);g.continuous=true;g.enemySpawnRemaining=9999;g.scene=2;g.x=210;g.y=30;g.landed=true;g.respawnInBase=samePlace;g.pilot={x:430,y:126,inside:true,floor:140,vy:0,facing:-1,pose:'idle',animation:0};g.hurtPlayer();assert.equal(g.respawnPilot.x,samePlace?430:480);assert.equal(g.respawnPilot.y,samePlace?126:31);assert.equal(Boolean(g.respawnPilot.inside),samePlace);g.step({},3);assert.equal(g.pilot.x,samePlace?430:480);g.reset();assert.equal(g.respawnInBase,samePlace);
}
console.log('PASS: base death respawns beside helicopter by default, optional same-location respawn survives reset');

const crouchSafe=new Game(data);crouchSafe.continuous=true;crouchSafe.infiniteLives=false;crouchSafe.enemySpawnRemaining=9999;crouchSafe.customZones={collisions:[{x:420,y:140,w:120,h:2}],teleports:[]};crouchSafe.pilot={x:490,y:126,vy:0,inside:true,floor:140,facing:1,pose:'idle',animation:0};crouchSafe.mines=[{x:495,y:140}];crouchSafe.enemyShots=[{x:490,y:134,v:180}];crouchSafe.enemies=[{x:490,y:120,state:1,hits:0,animation:0,phase:'inside',canShoot:false}];crouchSafe.step({crouch:true});assert.ok(crouchSafe.pilot);assert.equal(crouchSafe.pilot.pose,'crouch');assert.equal(crouchSafe.lives,5);assert.equal(crouchSafe.mines.length,1);assert.equal(crouchSafe.bonuses.length,0);assert.equal(crouchSafe.hurtPlayer(),false);crouchSafe.step({});assert.equal(crouchSafe.pilot,null);assert.equal(crouchSafe.lives,4);
console.log('PASS: crouching protects from enemy contact, shots and mines immediately; releasing restores damage');

const jumpMine=new Game(data);jumpMine.continuous=true;jumpMine.enemySpawnRemaining=9999;jumpMine.setJumpHeightPercent(10);jumpMine.setPilotSpeedPercent(190);jumpMine.customZones={collisions:[{x:470,y:140,w:100,h:2}],teleports:[]};jumpMine.pilot={x:490,y:126,vy:0,facing:1,pose:'idle',animation:0};jumpMine.mines=[{x:499,y:140}];jumpMine.step({up:true,jump:true,x:1});assert.ok(jumpMine.pilot);assert.ok(jumpMine.pilot.vy<0);assert.equal(jumpMine.mines.length,1);for(let i=0;i<40;i++)jumpMine.step({x:1});assert.ok(jumpMine.pilot);assert.equal(jumpMine.mines.length,1);
console.log('PASS: jumping moves before mine contact and clears a mine at 10 percent height');

const mineEnemy=new Game(data);mineEnemy.continuous=true;mineEnemy.mines=[{x:500,y:140}];mineEnemy.enemies=[{x:494,y:126,phase:'inside',state:1,hits:0,animation:0,canShoot:false}];mineEnemy.stepCombat(1/60);assert.equal(mineEnemy.enemies.length,0);assert.equal(mineEnemy.mines.length,0);
const mineLift=new Game(data);mineLift.customZones={collisions:[{x:470,y:140,w:80,h:2}],teleports:[{x:490,y:138,w:15,h:3,trigger:'both'}]};const shifted={x:495,y:140};mineLift.clearMineFromTeleport(shifted);assert.ok(shifted.x+3<=482||shifted.x>=513);assert.equal(shifted.y,140);
const forgivingMine=new Game(data);forgivingMine.continuous=true;forgivingMine.pilot={x:494,y:125,vy:-2,pose:'jump'};forgivingMine.mines=[{x:500,y:140}];forgivingMine.stepCombat(1/60);forgivingMine.pilot.y=126;forgivingMine.pilot.vy=0;forgivingMine.stepCombat(1/60);assert.ok(forgivingMine.pilot);assert.equal(forgivingMine.mines.length,1);forgivingMine.stepCombat(.2);assert.equal(forgivingMine.pilot,null);
console.log('PASS: mines kill enemies without leaving another mine, clear teleport entrances, and allow landing grace');

const protectedLift=new Game(data);protectedLift.continuous=true;protectedLift.enemySpawnRemaining=9999;protectedLift.pilot={x:527,y:31,vy:0,inside:true,floor:45,pose:'idle',facing:1,animation:0};protectedLift.step({down:true});assert.ok(protectedLift.pilot.elevator);assert.equal(protectedLift.hurtPlayer(),false);while(protectedLift.pilot.elevator){protectedLift.step({});assert.equal(protectedLift.hurtPlayer(),false);}assert.ok(protectedLift.invincible>=.999);for(let i=0;i<59;i++)protectedLift.step({});assert.equal(protectedLift.hurtPlayer(),false);for(let i=0;i<3;i++)protectedLift.step({});assert.equal(protectedLift.hurtPlayer(),true);
const safeCustomLift=new Game(data);safeCustomLift.continuous=true;safeCustomLift.customZones={teleportDistance:13,collisions:[],teleports:[{x:480,y:20,w:40,h:30,trigger:'both'}]};safeCustomLift.pilot={x:490,y:31,vy:0,pose:'idle',facing:1,animation:0};safeCustomLift.step({down:true});assert.equal(safeCustomLift.pilot.y,44);assert.ok(safeCustomLift.invincible>=.999);assert.equal(safeCustomLift.hurtPlayer(),false);
console.log('PASS: elevator descent protects throughout travel and one second after arrival, including custom lifts');

const heldLift=new Game(data);heldLift.continuous=true;heldLift.enemySpawnRemaining=9999;heldLift.pilot={x:527,y:31,vy:0,facing:1,pose:'idle',animation:0};for(let i=0;i<180;i++)heldLift.step({down:true});assert.equal(heldLift.pilot.floor,62);assert.equal(heldLift.pilot.y,48);assert.equal(heldLift.pilot.elevator,null);heldLift.step({});for(let i=0;i<180;i++)heldLift.step({up:true,jump:true});assert.equal(heldLift.pilot.floor,45);assert.equal(heldLift.pilot.y,31);assert.equal(heldLift.pilot.vy,0);
const heldCustom=new Game(data);heldCustom.continuous=true;heldCustom.enemySpawnRemaining=9999;heldCustom.customZones={teleportDistance:13,collisions:[{x:470,y:45,w:70,h:2},{x:470,y:58,w:70,h:2},{x:470,y:71,w:70,h:2}],teleports:[{x:480,y:45,w:30,h:1,trigger:'both'},{x:480,y:58,w:30,h:1,trigger:'both'}]};heldCustom.pilot={x:490,y:31,vy:0,facing:1,pose:'idle',animation:0};for(let i=0;i<180;i++)heldCustom.step({down:true});assert.equal(heldCustom.pilot.y,44);heldCustom.step({});for(let i=0;i<180;i++)heldCustom.step({up:true,jump:true});assert.equal(heldCustom.pilot.y,31);
console.log('PASS: holding S/Z cannot chain elevator floors or jump after arrival; release required for next trip');
