/* Right-button steering towards a target in native 280x192 coordinates. */
(function(root){
 class MouseJoystick {
  constructor(){this.enabled=true;this.reset();}
  reset(){this.targetX=0;this.targetY=0;this.mask=0;this.inside=false;}
  move(clientX,clientY,rect){
   if(!this.enabled)return;
   this.inside=true;
   this.width=this.world?840:280;
   this.targetX=(clientX-rect.left)/rect.width*this.width;
   this.targetY=(clientY-rect.top)/rect.height*(this.world?262:192);
  }
  buttons(mask,carrying=false){
   if(!this.enabled||!this.inside)return {};
   const old=this.mask;this.mask=mask&3;
   const both=this.mask===3&&Boolean(carrying);
   return {fire:!both&&Boolean((this.mask&1)&&!(old&1)),drop:both&&old!==3};
  }
  sample(heli={x:0,y:0},carrying=heli.carrying){
   if(!this.enabled||!this.inside)return {x:0,y:0,aimX:0,aimY:0,fire:false,drop:false};
   const dx=this.targetX-(heli.x+21),dy=this.targetY-(heli.y+7);
   const distance=Math.hypot(dx,dy),placing=this.mask===3&&Boolean(carrying),moving=Boolean(this.mask&2)&&!placing;
   const gain=distance<=3?0:Math.min(1,(distance-3)/60)/distance;
   return {x:moving?dx*gain:0,y:moving?dy*gain:0,aimX:distance>3?dx:0,aimY:distance>3?dy:0,fire:Boolean(this.mask&1)&&!placing,drop:placing};
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=MouseJoystick;else root.MouseJoystick=MouseJoystick;
})(typeof window!=='undefined'?window:globalThis);
