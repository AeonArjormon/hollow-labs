/* 巡界使 — original ink-lined Hanfu character art, baked into transparent
 * 192px animation frames. Drawing space: 96px; grounded foot baseline: 88px. */
(() => {
  "use strict";
  const SIZE = 192;
  const LOGICAL_SIZE = 96;
  const animations = {
    idle: { start: 0, end: 3, frameRate: 5, repeat: -1 },
    walk: { start: 4, end: 9, frameRate: 13, repeat: -1 },
    jump: { start: 10, end: 11, frameRate: 10, repeat: 0 },
    fall: { start: 12, end: 13, frameRate: 7, repeat: -1 },
    attack: { start: 14, end: 17, frameRate: 20, repeat: 0 },
    dash: { start: 18, end: 19, frameRate: 16, repeat: -1 },
    hurt: { start: 20, end: 21, frameRate: 12, repeat: 0 },
    switch: { start: 22, end: 25, frameRate: 22, repeat: 0 }
  };
  const palettes = {
    light: { outline: "#183e42", cloak: "#e8eee1", deep: "#256c68", edge: "#9dd7bf", scarf: "#f4eedb", mask: "#f3d5bb", maskShade: "#bf947f", eyes: "#203e3c", gold: "#c6a46b", glow: "#b6ecd4" },
    shadow: { outline: "#171f2d", cloak: "#303e51", deep: "#721f31", edge: "#d6927f", scarf: "#cf695d", mask: "#f0cbb5", maskShade: "#ae7e79", eyes: "#352d36", gold: "#d2a16b", glow: "#f0b69a" }
  };
  function canvas(w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; return c;
  }
  function path(c, d, fill, stroke, width = .85) {
    const p = new Path2D(d);
    if (fill) { c.fillStyle = fill; c.fill(p); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(p); }
  }
  function ellipse(c,x,y,rx,ry,fill,stroke,width=.7) {
    c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fillStyle=fill;c.fill();
    if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  function grad(c,x,y,x2,y2,a,b) {
    const g=c.createLinearGradient(x,y,x2,y2);g.addColorStop(0,a);g.addColorStop(1,b);return g;
  }
  function cloud(c,x,y,s,color) {
    c.save();c.translate(x,y);c.scale(s,s);
    path(c,"M -7 2 Q -11 1 -9 -2 Q -7 -4 -4 -2 Q -4 -7 0 -6 Q 4 -5 3 -2 Q 8 -4 9 0 Q 9 3 5 3 L -5 3 M -4 0 Q -1 -2 2 0",null,color,.65);
    c.restore();
  }
  function hero(c,form,action,step,count) {
    const p=palettes[form], dark=form==="shadow", phase=step/Math.max(count,1)*Math.PI*2;
    const walk=action==="walk", attack=action==="attack", dash=action==="dash", jump=action==="jump", fall=action==="fall", hurt=action==="hurt";
    const bob=walk?-Math.abs(Math.cos(phase))*1.2:action==="idle"?Math.sin(phase)*.45:0;
    const wind=dash?15:walk?8:jump?7:fall?-5:1.5;
    const flutter=Math.sin(phase+.6)*1.8;
    const lean=dash?.26:walk?.1:attack?[-.09,.12,.18,.02][step]:hurt?-.12:0;
    const ink=p.outline, silk=dark?"#283b50":"#f5f1df", fold=dark?"#152735":"#a4c0b5", trim=dark?"#c16d61":"#448f81";
    const hair="#12242c", hairLight=dark?"#566172":"#395a60", skin=p.mask, shade=p.maskShade;
    const stride=walk?Math.sin(phase)*11:0;
    let far=[43-stride*.22,73,42-stride,88-Math.max(0,Math.sin(phase))*6];
    let near=[53+stride*.2,74,54+stride,88-Math.max(0,-Math.sin(phase))*6];
    if(!walk){far=[43,74,42,88];near=[53,74,54,88];}
    if(jump){far=[37,70,36,80];near=[57,67,61,79];}
    if(fall){far=[41,73,39,85];near=[54,75,56,88];}
    if(dash){far=[36,69,26,78];near=[57,72,64,84];}
    if(hurt){far=[39,72,35,85];near=[54,75,56,88];}
    function leg(hip,kx,ky,fx,fy,rear) {
      path(c,`M ${hip-3} 60 Q ${kx-4} 67 ${kx-3} ${ky} L ${fx-2.5} ${fy-4} L ${fx+3} ${fy-4} L ${kx+3.5} ${ky} L ${hip+4} 60 Z`,rear?fold:silk,ink,.7);
      path(c,`M ${kx-2} ${ky+1} L ${fx-2.5} ${fy-5} L ${fx+3} ${fy-5} L ${kx+2} ${ky} Z`,hair);
      path(c,`M ${fx-2.5} ${fy-6} L ${fx+3} ${fy-6} L ${fx+4} ${fy-2.8} Q ${fx+7} ${fy-3} ${fx+8} ${fy-1} L ${fx+7} ${fy} L ${fx-4} ${fy} Z`,rear?"#172c32":"#263f44",ink,.7);
      path(c,`M ${fx-3} ${fy-1} L ${fx+6.5} ${fy-1} M ${fx-1.6} ${fy-5} L ${fx+2.3} ${fy-5}`,null,p.gold,.6);
    }
    leg(44,...far,true);
    leg(51,...near,false);
    c.save();c.translate(48,60+bob);c.rotate(lean);c.translate(-48,-60);
    // Black ponytail, jade hair tie and long strands move separately from silk.
    path(c,`M 43 16 Q 34 18 34 31 Q 32 44 ${25-wind*.35} ${48-wind*.3+flutter} Q 36 48 40 35 Q 37 53 ${28-wind*.4} ${61-wind*.5} Q 44 52 46 31 Z`,hair,ink,.85);
    path(c,`M 40 22 Q 36 35 36 43 Q 33 51 ${30-wind*.3} ${55-wind*.3} M 42 26 Q 42 43 36 48`,null,hairLight,.65);
    // Rear sleeve is a broad hanging Hanfu sleeve, never a shoulder cape.
    path(c,`M 43 32 Q 36 31 33 39 L ${25-wind*.3} ${51-wind*.35} Q ${23-wind*.2} ${57-wind*.25} 32 62 L 40 51 L 47 38 Z`,grad(c,31,33,39,61,silk,fold),ink,1);
    path(c,`M ${25-wind*.3} ${50-wind*.35} Q 30 52 34 56 L 32 61 Q 25 60 ${24-wind*.2} ${56-wind*.25} Z`,trim,ink,.6);
    path(c,"M 36 37 Q 32 45 32 51 M 38 39 L 36 48",null,fold,.8);
    ellipse(c,32,58,2.2,2.8,shade,ink,.5);
    // Rear robe panel follows the planted legs; woven borders frame long folds.
    path(c,`M 42 48 L 51 52 Q 46 65 43 78 L ${30-wind*.5} ${80-wind*.35+flutter} Q 38 64 37 56 Z`,grad(c,36,50,43,80,p.deep,fold),ink,1);
    path(c,`M 39 57 Q 38 70 ${33-wind*.35} ${77-wind*.2} L 43 74`,null,p.gold,.8);
    // Ivory cross-collar outer robe; long underrobe is visible through the split.
    path(c,"M 43 29 Q 49 28 55 32 L 58 45 L 54 53 Q 57 64 62 76 L 54 81 L 47 72 L 43 78 L 35 76 Q 39 65 40 53 L 38 39 Z",grad(c,39,30,57,79,silk,fold),ink,1);
    path(c,"M 48 47 L 53 50 L 56 76 L 50 74 L 46 64 L 41 76 L 37 74 Q 42 59 42 50 Z",p.deep,ink,.6);
    path(c,"M 44 30 L 48 34 L 53 31 L 54 35 L 47 43 L 40 35 Z",dark?"#eee2cb":"#fff9e9",ink,.65);
    path(c,"M 43 30 L 48 36 L 53 32 L 54 35 L 46 44 L 39 35 L 40 33 L 46 39 L 48 37",null,trim,1.8);
    path(c,"M 47 42 L 45 50 M 40 39 Q 42 43 41 48 M 54 38 L 53 47",null,fold,.65);
    path(c,"M 40 51 Q 39 64 36 73 L 41 75 L 47 61 M 54 53 L 60 74 L 55 77 L 49 66",null,trim,1.1);
    path(c,"M 38 72 L 41 73 M 55 74 L 57 73",null,p.gold,1);
    cloud(c,42,65,.45,p.gold);cloud(c,55,69,.45,p.gold);
    // Wide silk waist sash, knotted belt, jade ring and two fine tassels.
    path(c,"M 40 48 Q 47 51 55 47 L 55 52 Q 47 55 40 52 Z",dark?"#963c40":"#326e68",ink,.7);
    path(c,"M 41 49 Q 47 52 53 49",null,p.gold,.7);
    path(c,`M 52 50 Q 60 47 ${67+wind*.25} ${54-wind*.25} L ${62+wind*.25} ${55-wind*.25} Q 58 51 53 53 Z`,trim,ink,.55);
    path(c,`M 52 52 Q 59 57 ${67+wind*.2} ${65-wind*.55+flutter} L ${63+wind*.2} ${68-wind*.55+flutter} Q 56 60 50 54 Z`,p.deep,ink,.6);
    path(c,`M 54 54 Q 60 62 ${64+wind*.2} ${65-wind*.55+flutter}`,null,p.gold,.6);
    ellipse(c,48,52,2.3,1.7,p.gold,ink,.5);
    path(c,"M 48 54 L 47.5 61",null,p.gold,.6);
    ellipse(c,47.4,61.5,2,2.4,dark?"#bb7567":"#87c8af",p.gold,.6);
    ellipse(c,47.4,61.5,.75,1,fold);
    path(c,"M 47.3 64 L 46.3 70 M 48.2 64 L 48.9 68",null,trim,.7);
    // Neck, human face in three-quarter profile and swept black fringe.
    path(c,"M 46 25 L 46 31 L 50 34 L 53 30 L 52 25 Z",skin,ink,.6);
    path(c,"M 47 26 L 52 26 L 51 30 L 48 29 Z",shade);
    path(c,"M 43 15 Q 46 11 52 14 Q 56 16 55 21 L 57 23 L 55 24 L 54 28 L 50 30 L 44 26 L 42 21 Z",grad(c,44,14,55,29,"#ffe4ca",skin),ink,.7);
    path(c,"M 52 16 Q 54 19 53.5 22 L 55 23 L 53.2 24 M 51.4 26 L 53.5 26",null,shade,.55);
    path(c,"M 47.2 20.6 Q 49.5 19.3 52 20.4",null,hair,.75);
    if(hurt || (action==="idle"&&step===3)) path(c,"M 48 22 L 51.8 22",null,hair,.65);
    else {path(c,"M 47.7 22 Q 49.5 23 52 21.7",null,hair,.8);ellipse(c,50.4,22,.55,.8,hair);}
    ellipse(c,44.1,22.2,1.3,2.1,skin,shade,.5);
    path(c,"M 43.7 22.2 L 44.5 21.5",null,shade,.45);
    path(c,"M 41 23 Q 38 17 43 12 Q 47 9 52 12 Q 57 14 56 19 Q 52 17 48 15 Q 47 21 44 24 L 44 18 Q 42 22 42 27 L 40 29 Z",hair,ink,.8);
    path(c,"M 42 15 Q 47 11 52 14 M 43 17 L 42 21 M 49 14 L 54 17",null,hairLight,.6);
    // A single high topknot and horizontal hairpin, clearly unlike animal ears.
    path(c,"M 44 13 Q 41 9 44 6 Q 49 4 51 9 L 49 13 Z",hair,ink,.7);
    path(c,"M 44 10 Q 47 7 49 9",null,hairLight,.6);
    path(c,"M 43 12 L 50 11 L 50 13 L 43 14 Z",p.gold,ink,.4);
    path(c,"M 39 10.5 L 55 9.5",null,p.gold,1.2);
    ellipse(c,54.7,9.5,1.7,1.35,dark?"#d67863":"#9fd7b7",p.gold,.5);
    path(c,`M 43 13 Q 37 15 ${30-wind*.15} ${13-flutter} L ${31-wind*.2} ${16-flutter} Q 37 17 44 15`,trim,ink,.45);
    // Leading sleeve bends at the elbow; hand stays bare, with fingers on hilt.
    const hand=attack?[[57,39],[61,47],[58,51],[61,50]][step]:dash?[58,50]:[61,49];
    const elbow=attack&&step===0?[58,38]:[57,43];
    path(c,`M 53 32 Q 60 32 ${elbow[0]+3} ${elbow[1]} L ${hand[0]+1} ${hand[1]-2} L ${hand[0]-3} ${hand[1]+4} Q 51 55 49 45 L 49 38 Z`,grad(c,52,33,59,53,silk,fold),ink,.9);
    path(c,`M ${hand[0]-4} ${hand[1]-5} L ${hand[0]+1} ${hand[1]-2} L ${hand[0]-3} ${hand[1]+4} L ${hand[0]-7} ${hand[1]+1} Z`,trim,ink,.55);
    path(c,`M ${hand[0]-4} ${hand[1]-3} L ${hand[0]-1} ${hand[1]-1} L ${hand[0]-4} ${hand[1]+2}`,null,p.gold,.65);
    path(c,`M 54 37 Q 54 42 ${hand[0]-7} ${hand[1]-3}`,null,fold,.75);
    // Double-edged jian: long straight blade, symmetric jade guard, red tassel.
    c.save();c.translate(hand[0],hand[1]);
    const angle=attack?[-.65,.98,1.67,.33][step]:dash?1.12:.24;c.rotate(angle);
    path(c,"M -1.6 0 L -1.6 -29 L .4 -35 L 2.4 -29 L 2.4 0 Z",grad(c,-1,-32,2,0,"#fffbe5",dark?"#aec2c8":"#a5cfc6"),ink,.6);
    path(c,"M .4 -32 L .4 -1",null,"#ffffff",.6);
    path(c,"M .8 -27 L 1.8 -28 L 1.8 -4 L .8 -2 Z",dark?"#6a828d":"#6a9b98");
    if(dark)path(c,"M -.5 -19 L .8 -17 L -.4 -15 L 1 -13 M -.5 -11 L .8 -9",null,"#c1615b",.6);
    path(c,"M -6 0 Q -4 -3 -.3 -1 L 1 -1 Q 4 -3 6 0 L 5 2 Q 3 .8 1 1.5 L -.3 1.5 Q -3 1 -5 2 Z",p.gold,ink,.6);
    path(c,"M -.7 1 L 1.4 1 L 1.4 8 L -.7 8 Z",p.deep,ink,.45);
    path(c,"M -.5 3 L 1.3 4 M -.5 5 L 1.3 6",null,p.gold,.6);
    ellipse(c,.3,8.4,1.6,1.1,p.gold);
    path(c,`M .3 9 Q -2 14 ${-6-wind*.12} ${14+flutter*.3} M ${-6-wind*.12} ${14+flutter*.3} L ${-10-wind*.12} ${17+flutter*.3}`,null,dark?"#d37b66":"#508c80",1.2);
    c.restore();
    ellipse(c,hand[0],hand[1],2.3,2.1,skin,ink,.55);
    path(c,`M ${hand[0]-.9} ${hand[1]-.5} L ${hand[0]+1.5} ${hand[1]+.2}`,null,shade,.55);
    c.restore();
    if(attack&&step>0&&step<3){
      c.save();c.globalAlpha=step===1?.55:.25;
      path(c,"M 65 18 Q 93 29 89 55 Q 86 68 72 73 Q 87 54 79 35 Z",p.edge);
      path(c,"M 70 23 Q 92 40 80 65",null,"#fff3d7",.8);c.restore();
    }
    if(action==="switch"){
      c.save();c.globalAlpha=.7-step*.13;c.strokeStyle=p.gold;c.lineWidth=.65;
      c.beginPath();c.ellipse(48,51,23+step*2,35,0,Math.PI*.18,Math.PI*1.88);c.stroke();
      cloud(c,30,32+step*4,.65,p.edge);cloud(c,68,66-step*4,.65,p.edge);c.restore();
    }
  }
  function installHero(scene,form){
    const sheet=canvas(SIZE*6,SIZE*5),c=sheet.getContext("2d");
    for(const[action,spec]of Object.entries(animations))for(let i=spec.start;i<=spec.end;i++){
      c.save();c.translate(i%6*SIZE,Math.floor(i/6)*SIZE);c.beginPath();c.rect(0,0,SIZE,SIZE);c.clip();c.scale(2,2);
      hero(c,form,action,i-spec.start,spec.end-spec.start+1);c.restore();
    }
    const key=`hero-${form}`;if(scene.textures.exists(key))scene.textures.remove(key);
    scene.textures.addSpriteSheet(key,sheet,{frameWidth:SIZE,frameHeight:SIZE,endFrame:25});
  }
  function feather(form){
    const img=canvas(80,32),c=img.getContext("2d"),p=palettes[form];
    const glow=c.createRadialGradient(43,16,2,43,16,35);glow.addColorStop(0,form==="light"?"#8bd7b680":"#da796780");glow.addColorStop(1,"#00000000");
    ellipse(c,42,16,36,14,glow);
    path(c,"M 21 13 L 62 13 L 73 16 L 62 19 L 21 19 Z",grad(c,23,12,60,20,"#fff9df",p.edge),p.outline,.7);
    path(c,"M 24 16 L 69 16",null,"#ffffff",.85);
    path(c,"M 22 9 Q 19 13 21 16 Q 19 19 22 23 L 17 22 L 18 17 L 8 17 L 8 15 L 18 15 L 17 10 Z",p.gold,p.outline,.7);
    path(c,"M 8 16 Q 2 10 1 15 M 8 17 Q 4 23 1 20",null,form==="light"?"#70b2a0":"#d46b5b",1.4);
    return img;
  }
  function install(scene){
    for(const form of["light","shadow"]){installHero(scene,form);const key=`feather-${form}`;
      if(scene.textures.exists(key))scene.textures.remove(key);scene.textures.addCanvas(key,feather(form));}
  }
  window.ShadowJumpArt=Object.freeze({install,animations,frameSize:SIZE,footBaseline:176,palettes,renderHero:hero});
})();
