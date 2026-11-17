/* Chinese fantasy creatures, painted once into 2× walk sheets.
 * Logical drawing space: 96×96. Ground contact: y=88. */
(() => {
  "use strict";
  const frameSize = 192;
  const footBaseline = 176;
  const species = Object.freeze({
    scarab: Object.freeze({ texture: "enemy-scarab", animation: "enemy-scarab-walk", displaySize: 98, frameRate: 10 }),
    warden: Object.freeze({ texture: "enemy-warden", animation: "enemy-warden-walk", displaySize: 108, frameRate: 8 }),
    sentinel: Object.freeze({ texture: "enemy-sentinel", animation: "enemy-sentinel-walk", displaySize: 98, frameRate: 8 }),
    hunter: Object.freeze({ texture: "enemy-hunter", animation: "enemy-hunter-walk", displaySize: 112, frameRate: 12 })
  });
  const ink = "#203b40";

  function shape(ctx, data, fill, stroke = ink, width = .95) {
    const p = new Path2D(data);
    if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(p); }
  }
  function line(ctx, data, color, width = .85) { shape(ctx, data, null, color, width); }
  function oval(ctx, x, y, rx, ry, fill, stroke = null, width = .8) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function shade(ctx, x, y, w, h, light, middle, dark) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, light); g.addColorStop(.45, middle); g.addColorStop(1, dark);
    return g;
  }
  function cloud(ctx, x, y, scale, color) {
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
    line(ctx, "M-10 2Q-13-3-8-5Q-3-7-2-2Q0-8 5-6Q10-4 6 0Q3 2 1-1M-9 3Q-4 6 2 3L11 3", color, .85);
    ctx.restore();
  }
  function fire(ctx, x, y, size, phase) {
    ctx.save();ctx.translate(x,y);
    const sway=Math.sin(phase)*size*.15;
    shape(ctx, `M0 ${size*.45}Q${-size*.8} ${size*.15} ${-size*.35} ${-size*.45}Q${-size*.1} ${-size*.1} ${sway} ${-size}Q${size*.8} ${-size*.25} ${size*.45} ${size*.2}Q${size*.2} ${size*.6} 0 ${size*.45}Z`, "rgba(121,225,199,.26)",null);
    shape(ctx, `M0 ${size*.3}Q${-size*.35} 0 0 ${-size*.52}Q${size*.5} 0 0 ${size*.3}Z`, "#b6f0d5",null);
    ctx.restore();
  }

  // An ivory origami crane animated by a vermilion talisman.
  function scarab(ctx, step) {
    const phase=step*Math.PI/3, bob=-Math.abs(Math.sin(phase))*2;
    const flap=Math.sin(phase)*5;
    oval(ctx,48,88,25,2.7,"rgba(18,42,44,.14)");
    for(let i=0;i<2;i++) {
      const swing=Math.sin(phase+i*Math.PI)*5;
      const lift=Math.max(0,Math.cos(phase+i*Math.PI))*4;
      line(ctx,`M${44+i*10} ${66+bob}L${43+i*10+swing*.4} 78L${40+i*10+swing} ${88-lift}`,"#384c46",1.7);
      line(ctx,`M${40+i*10+swing} ${88-lift}L${47+i*10+swing} ${88-lift}M${41+i*10+swing} ${87-lift}L${37+i*10+swing} ${88-lift}`,"#ae7653",1.4);
    }
    ctx.save();ctx.translate(0,bob);
    // Rear folded wing and a long narrow crane tail.
    shape(ctx,`M43 51L${22-flap*.3} ${13-flap*.35}L35 55L48 63Z`,shade(ctx,24,20,24,42,"#f3e7c8","#b7cab8","#648e80"));
    line(ctx,`M${23-flap*.3} ${17-flap*.35}L40 53`,"#d6b476",.8);
    shape(ctx,"M37 59L7 44L28 67L44 70Z","#e8e1c9");
    shape(ctx,"M8 45L34 58L29 65Z","#b9c7b2",null);
    // Central paper body is angular, with gold fold lines.
    shape(ctx,"M30 51L54 43L69 55L58 69L40 70L25 62Z",shade(ctx,28,46,33,25,"#fff9e4","#e3e0c8","#a2b9a6"));
    shape(ctx,"M30 51L48 60L58 69L40 69L26 62Z","#ccd4bd",null);
    line(ctx,"M30 51L48 60L65 55M48 60L42 69","#a9905e",.85);
    // Near wing fans across the silhouette, showing individual folded panels.
    shape(ctx,`M45 59L${12-flap*.15} ${27-flap}L${22-flap*.1} ${51-flap*.35}L33 63L45 67L54 57Z`,shade(ctx,17,29,34,35,"#fff7dc","#e5e8d2","#9eb7a4"),ink,1.1);
    shape(ctx,`M${13-flap*.15} ${29-flap}L39 56L47 60L34 59Z`,"#f9f4df",null);
    line(ctx,`M${14-flap*.15} ${30-flap}L45 59L33 63M${23-flap*.1} ${51-flap*.35}L41 60`,"#b8a16d",.75);
    line(ctx,`M${16-flap*.15} ${33-flap}L${22-flap*.1} ${47-flap*.35}L33 57`,"#bd4e3a",1.5);
    cloud(ctx,31,48-flap*.4,.44,"#c5a269");
    // Long bent neck and unmistakable needle-shaped beak.
    shape(ctx,"M57 57L64 45L62 29L70 22L78 27L75 35L71 37L72 49L64 62Z",shade(ctx,63,23,10,40,"#fff9e9","#e5e5cf","#b2c7b3"));
    shape(ctx,"M70 23L78 27L75 31L65 30Z","#b74837",null);
    shape(ctx,"M76 29L92 34L76 36L72 33Z","#c9a46b",ink,.8);
    line(ctx,"M77 32L91 34","#fff0c5",.65);
    oval(ctx,73,30,1.25,1.15,"#293d39");
    oval(ctx,73.4,29.7,.35,.35,"#fff7dd");
    line(ctx,"M68 34L69 46L62 57","#f8f4df",1);
    // Red hanging talisman and paper tassels.
    shape(ctx,`M51 59L58 61L${57+Math.sin(phase)*2} 77L${49+Math.sin(phase)*2} 75Z`,"#a83f31","#d9b474",.7);
    line(ctx,`M53 64L55 64L52 67L55 69L51 71M52 73L54 73`,"#ffe3a3",.75);
    ctx.restore();
  }

  // Underworld bailiff in a high official hat, carrying a soul lantern.
  function warden(ctx, step) {
    const phase=step*Math.PI/3,bob=-Math.abs(Math.sin(phase))*1.2;
    const stride=Math.sin(phase)*3.5,cloth=Math.sin(phase-.4)*2.5;
    oval(ctx,48,88,24,2.7,"rgba(11,25,31,.17)");
    shape(ctx,`M37 78L44 78L${43-stride} 85L${49-stride} 87L${36-stride} 88Z`,"#131e29");
    shape(ctx,`M51 78L58 78L${57+stride} 85L${64+stride} 87L${51+stride} 88Z`,"#273944");
    ctx.save();ctx.translate(0,bob);
    // Hair, trailing sash and draped rear sleeve.
    shape(ctx,`M38 23Q29 37 31 55L${23+cloth} 73L35 68L${33+cloth} 81L45 68L48 32Z`,"#162733");
    shape(ctx,`M44 50Q26 56 ${17+cloth} 71L${25+cloth} 70L22 77Q37 70 49 55Z`,"#7e3638",null);
    shape(ctx,`M36 34Q24 37 24 51L${18+cloth} 66Q25 70 35 64L42 44Z`,shade(ctx,24,36,16,34,"#425c65","#2b434e","#162c38"));
    line(ctx,`M28 43L${23+cloth} 63L31 64`,"#748c8a",.7);
    // Long blue-black court robe, broad crossed lapels and embroidered hem.
    shape(ctx,`M38 32L55 31L61 47L58 60L${66+cloth} 81Q53 86 43 80L${29+cloth} 84L34 61L33 44Z`,shade(ctx,34,34,28,49,"#47616b","#293e4d","#152c38"),ink,1.15);
    shape(ctx,`M40 51L46 59L43 79L${32+cloth} 82L38 64Z`,"#38545d",null);
    line(ctx,`M45 61L44 78M53 61L${60+cloth} 80M35 73L${33+cloth} 79`,"#77918d",.7);
    shape(ctx,"M37 31L43 32L49 43L55 32L60 36L49 50L41 42Z","#b1c3b5",null);
    shape(ctx,"M43 32L49 43L47 47L39 34Z","#e3deca",null);
    shape(ctx,"M35 51Q47 55 59 50L59 56Q47 61 35 56Z","#803d3c","#d1ac72",.7);
    oval(ctx,48,55,3,2.4,"#d3b47c",ink,.7);
    oval(ctx,48,55,1.5,1.25,"#91ba9c");
    cloud(ctx,40,72,.48,"#b69d70");cloud(ctx,55,76,.42,"#b69d70");
    // Right sleeve and pale, narrow fingers holding the bamboo handle.
    shape(ctx,"M56 34Q66 35 69 47L67 58L58 61L52 49Z",shade(ctx,56,35,12,26,"#4c6970","#304b57","#1b303b"));
    line(ctx,"M60 43L64 55L59 57","#a8b6a5",.9);
    shape(ctx,"M65 48L71 48L74 51L72 55L66 54Z","#d3d7be",ink,.7);
    line(ctx,"M69 50L72 52M68 52L71 54","#82988c",.6);
    // Exposed ghostly human face, thin eyes and tied queue.
    shape(ctx,"M39 18L51 17L56 22L55 29L50 34L42 31L38 25Z",shade(ctx,40,18,13,16,"#f0e5cd","#c9d7bc","#91aa9a"),ink,.8);
    shape(ctx,"M39 19L42 17L43 26L40 29L38 25Z","#172b34",null);
    line(ctx,"M44 23L47 22M51 22L54 22","#314640",.85);
    line(ctx,"M45 24L47 24M51 24L53 23.5","#a03f36",.8);
    line(ctx,"M50 25L51 28L49 28M46 30L51 30","#657e70",.65);
    // Tall, flat official hat with gold edging, no horns or mask.
    shape(ctx,"M36 19L37 8Q45 4 52 7L55 18L59 20L56 23L35 23L32 20Z",shade(ctx,36,6,21,16,"#3c5059","#20333f","#101f2b"),ink,1.05);
    line(ctx,"M38 10Q45 7 51 9M35 20L56 20","#bda57b",.8);
    shape(ctx,"M43 9L48 9L49 18L43 18Z","#d4ba7e",null);
    line(ctx,"M44 11L47 11M44 13L47 13M45.5 10L45.5 16M44 16L47 16","#684b3a",.55);
    // Lantern swings independently from a wooden handle.
    const swing=Math.sin(phase-.8)*.07;
    ctx.save();ctx.translate(74,51);ctx.rotate(swing);ctx.translate(-74,-51);
    line(ctx,"M72 51Q77 43 82 52L82 58","#c8b284",1.3);
    line(ctx,"M81 57L81 61","#9a754d",1);
    shape(ctx,"M73 62L89 62L91 65L71 65Z","#564334","#d2b17c",.7);
    shape(ctx,"M73 65Q68 72 73 78L88 78Q93 72 88 65Z",shade(ctx,73,65,17,13,"#dff4cf","#8cc5a4","#447866"),"#9b7c51",.8);
    for(let i=0;i<4;i++)line(ctx,`M${74+i*4} 65Q${72+i*5} 71 ${74+i*4} 78`,"#56785f",.55);
    shape(ctx,"M72 78L90 78L88 81L74 81Z","#654b37","#d2b17c",.7);
    line(ctx,"M81 81L81 86M78 84L78 88M84 84L84 88","#ae4d39",1.2);
    fire(ctx,81,72,6,phase);
    ctx.restore();ctx.restore();
  }

  // Heavenly gate guard: lamellar armor, cloud shield and red-tasselled spear.
  function sentinel(ctx, step) {
    const phase=step*Math.PI/3,stride=Math.sin(phase)*3.5,bob=-Math.abs(Math.sin(phase))*1.2;
    const gold="#c5a269",pale="#eee1ad",jade="#4b7b71";
    oval(ctx,48,88,27,2.8,"rgba(18,39,40,.17)");
    for(let i=0;i<2;i++){
      const x=39+i*17+(i?stride:-stride),lift=Math.max(0,Math.cos(phase+i*Math.PI))*2.5;
      shape(ctx,`M${x-4} 70L${x+4} 70L${x+3} ${83-lift}Q${x+11} ${84-lift} ${x+10} ${88-lift}L${x-5} ${88-lift}Z`,i?"#345653":"#263e40");
      line(ctx,`M${x-3} ${84-lift}L${x+4} ${84-lift}M${x-2} 72L${x-2} 80`,gold,.8);
    }
    ctx.save();ctx.translate(0,bob);
    // Standard Chinese spear silhouette: narrow leaf blade and horsehair tassel.
    line(ctx,"M79 24L80 87","#3b4034",3.4);
    line(ctx,"M79 24L80 87","#aa7950",1.7);
    shape(ctx,"M79 3L75 17L79 27L84 17Z",shade(ctx,76,4,7,22,"#f6efd3","#b5cebd","#557b70"),ink,.85);
    line(ctx,"M79 5L79 25","#fff7dd",.65);
    const tassel=Math.sin(phase)*2;
    shape(ctx,`M78 24Q69 26 ${69+tassel} 39L75 34L73 42L80 34L84 38Q85 28 80 24Z`,"#9d4137",null);
    line(ctx,`M78 27Q73 31 ${72+tassel} 36M80 28L81 35`,"#dc7f56",.7);
    // A narrow silk tabard shows between protective lamellae.
    shape(ctx,"M35 50L60 51L66 76L56 81L48 73L38 80L28 74Z","#e5dfc6");
    shape(ctx,"M41 56L54 56L57 79L48 75L39 80Z","#365e59",gold,.8);
    cloud(ctx,47,70,.55,"#c5b17a");
    for(let i=0;i<2;i++){
      const x=31+i*23;
      shape(ctx,`M${x} 54L${x+11} 56L${x+12} 73L${x+2} 76L${x-3} 72Z`,shade(ctx,x,55,13,21,pale,"#b5a770","#637a5c"),ink,.85);
      for(let j=0;j<4;j++)line(ctx,`M${x-1} ${59+j*4}L${x+10} ${61+j*3.4}`,"#f1df9e",.65);
    }
    // Overlapping gold lamellar cuirass rather than European plate armor.
    shape(ctx,"M34 31L49 29L62 34L63 52L56 60L39 59L31 50Z",shade(ctx,34,32,27,28,pale,"#c0a670","#738165"),ink,1.1);
    shape(ctx,"M39 31L47 40L54 30L59 34L49 45L38 39Z","#e5e9cf",null);
    for(let row=0;row<3;row++){
      line(ctx,`M35 ${43+row*5}Q47 ${47+row*5} 60 ${42+row*5}`,"#7b7754",.7);
      for(let col=0;col<5;col++){
        const x=37+col*4.5,y=43+row*5+Math.sin(col/4*Math.PI)*2;
        line(ctx,`M${x} ${y}L${x} ${y+3}`,"#f4e2ac",.65);
        oval(ctx,x+1.3,y+1,.45,.45,"#77805d");
      }
    }
    shape(ctx,"M32 52Q47 57 63 51L63 56Q48 63 33 57Z","#37645f",gold,.8);
    oval(ctx,48,57,3.1,2.6,pale,ink,.7);
    oval(ctx,48,57,1.6,1.4,"#76af95");
    // Rounded shoulder guards have cloud scroll motifs.
    shape(ctx,"M30 32Q23 32 22 43L29 48L39 42L39 34Z",shade(ctx,25,33,14,14,pale,gold,"#687b5e"));
    cloud(ctx,31,39,.45,"#667858");
    shape(ctx,"M59 33Q68 30 71 42L65 48L56 42Z",shade(ctx,58,34,13,13,pale,gold,"#687b5e"));
    shape(ctx,"M64 45L70 44L71 56L77 55L80 58L78 63L67 63L63 57Z",jade);
    line(ctx,"M66 47L70 47M66 51L70 51M67 55L70 55",pale,.8);
    shape(ctx,"M75 55L81 55L83 58L81 62L76 61Z","#e6c5a3",ink,.7);
    // Human face, rounded Chinese helmet, brim and single sweeping red plume.
    shape(ctx,"M37 18L53 16L58 22L55 31L48 35L40 30Z","#e8c8a8",ink,.85);
    line(ctx,"M44 24L47 23.5M51 23L55 22.5","#38423a",.85);
    line(ctx,"M50 24L51 28L49 28M46 30L51 30","#947558",.65);
    shape(ctx,"M33 21Q32 8 45 7Q58 7 60 20L63 23L55 25L46 21L35 25L30 23Z",shade(ctx,34,8,26,16,pale,"#bba36b","#688466"),ink,1.1);
    shape(ctx,"M36 23L40 23L41 33L36 31Z",gold,ink,.65);
    shape(ctx,"M55 24L59 22L57 32L53 34Z",gold,ink,.65);
    line(ctx,"M35 20Q46 14 58 20M39 11Q45 8 50 10",pale,.8);
    oval(ctx,47,17,2.3,2.3,"#8ba88a",pale,.7);
    shape(ctx,`M45 9Q35 3 25 ${9+Math.sin(phase)*2}Q28 1 40 2Q49 3 49 9Z`,"#a64b3d",ink,.65);
    line(ctx,`M45 7Q35 3 29 ${7+Math.sin(phase)}`,"#df9767",.7);
    // Jade ceremonial shield, with a cloud-and-sun emblem and gold studs.
    shape(ctx,"M21 45Q30 39 39 45L43 57Q43 72 32 80Q18 73 16 59Z",shade(ctx,19,43,24,35,"#f1dfac",gold,"#768567"),ink,1.2);
    shape(ctx,"M23 48Q30 44 37 48L39 58Q39 69 31 75Q21 70 20 59Z",shade(ctx,22,47,15,28,"#83ab91","#46796c","#294e4c"),pale,.8);
    oval(ctx,30,57,5.2,5.2,"#d5bc7c",ink,.7);
    oval(ctx,30,57,2.7,2.7,"#f2df9c");
    cloud(ctx,30,65,.65,"#d6c18c");
    line(ctx,"M24 52Q26 48 31 48M35 50L37 57M24 68L30 73",pale,.7);
    for(const[x,y]of[[22,47],[39,52],[41,64],[31,77],[19,63]])oval(ctx,x,y,1,1,"#f5e8b9");
    ctx.restore();
  }

  // A three-tailed fox spirit, with cinnabar markings and jade ghostfire.
  function hunter(ctx, step) {
    const phase=step*Math.PI/3,bob=-Math.abs(Math.sin(phase))*1.3;
    oval(ctx,48,88,29,2.7,"rgba(18,36,40,.15)");
    ctx.save();ctx.translate(0,bob);
    const tail=Math.sin(phase-.6)*3;
    // Individual tails have different arcs, creating a fan instead of a wolf silhouette.
    shape(ctx,`M36 60Q17 58 12 ${40+tail}Q8 ${27+tail} 14 13Q17 ${27+tail} 24 ${34+tail}Q34 42 43 52Z`,shade(ctx,12,16,27,43,"#f0ead8","#b7c8bd","#718f87"),ink,1);
    shape(ctx,`M15 17Q16 ${29+tail} 23 ${35+tail}Q18 ${35+tail} 15 ${29+tail}Z`,"#faf2dd",null);
    line(ctx,`M17 ${35+tail}Q24 48 37 54`,"#e9e5cd",.75);
    shape(ctx,`M39 61Q17 68 7 ${53-tail}Q1 ${40-tail} 5 31Q13 ${45-tail} 27 47L44 50Z`,shade(ctx,5,34,34,29,"#f5edda","#d5d9c9","#8ba59a"),ink,1);
    shape(ctx,`M5 34Q10 ${44-tail} 16 ${48-tail}L10 ${48-tail}Q5 ${43-tail} 5 34Z`,"#fff3dc",null);
    shape(ctx,`M41 65Q19 80 8 ${68+tail*.4}Q3 ${62+tail*.4} 4 55Q15 ${65+tail*.4} 27 58L41 54Z`,shade(ctx,6,57,34,18,"#eee7d0","#b9c8b7","#748f85"),ink,1);
    line(ctx,`M10 ${64+tail*.4}Q22 73 38 62`,"#f9ecd2",.8);
    // Far legs and delicate paws; the alternating gait reads clearly in motion.
    for(let i=0;i<2;i++){
      const x=36+i*26,swing=Math.sin(phase+i*Math.PI)*4,lift=Math.max(0,Math.cos(phase+i*Math.PI))*3;
      const foot=86-lift-bob;
      shape(ctx,`M${x-3} 59L${x+4} 62L${x+1+swing} 76L${x+3+swing} ${foot-2}L${x+8+swing} ${foot}L${x-1+swing} ${foot}L${x-4+swing} 76Z`,"#6f8f86",ink,.8);
    }
    shape(ctx,"M26 52Q37 45 49 48L62 46L72 54L67 68Q58 75 47 68L34 69Q24 63 26 52Z",shade(ctx,29,47,38,24,"#f1ecd8","#c4d3c4","#6c978b"),ink,1.1);
    shape(ctx,"M29 54Q45 52 61 57L65 64Q49 59 38 64Z","#eff0dd",null);
    line(ctx,"M31 51Q43 49 51 52M34 64L40 64","#fcf4de",.8);
    // Near hind leg, angular hock and near front leg.
    const rear=Math.sin(phase+Math.PI)*5,front=Math.sin(phase)*4;
    const rearLift=Math.max(0,Math.cos(phase+Math.PI))*3,frontLift=Math.max(0,Math.cos(phase))*3;
    // Cancel the torso's vertical bob at each paw; lifted feet retain their gait.
    const rearFoot=88-rearLift-bob,frontFoot=88-frontLift-bob;
    shape(ctx,`M31 59Q39 57 41 65L${35+rear} 75L${36+rear} ${rearFoot-4}Q${42+rear} ${rearFoot-4} ${43+rear} ${rearFoot}L${32+rear} ${rearFoot}L${29+rear} 76L29 68Z`,shade(ctx,30,60,12,28,"#e8e8d2","#a9c1b1","#6f9387"),ink,.9);
    shape(ctx,`M60 59L68 59L${65+front} 78L${67+front} ${frontFoot-4}Q${72+front} ${frontFoot-3} ${72+front} ${frontFoot}L${61+front} ${frontFoot}L${59+front} 78Z`,shade(ctx,60,61,12,27,"#f5ead5","#c8d7c4","#82a395"),ink,.9);
    line(ctx,`M${32+rear} ${rearFoot-6}L${37+rear} ${rearFoot-6}M${61+front} ${frontFoot-6}L${67+front} ${frontFoot-6}`,"#aa493a",1.4);
    // High shoulder ruff, long fox muzzle and two slim ears.
    shape(ctx,"M59 42L62 32L70 29L81 36L81 43L91 47L86 53L75 54L72 65L67 61L65 68L61 60L56 63L59 53L54 50Z",shade(ctx,60,31,25,32,"#fff0db","#e6e7d2","#9bb4a4"),ink,1.05);
    shape(ctx,"M63 35L58 20L69 29Z","#f2e4cb",ink,.9);
    shape(ctx,"M76 32L78 19L84 36Z","#f3e6ce",ink,.9);
    shape(ctx,"M63 30L61 24L66 29Z","#b65d48",null);
    shape(ctx,"M79 25L78 31L81 32Z","#b65d48",null);
    shape(ctx,"M63 36Q74 30 82 38L81 44L91 47L81 49L72 45Z","#f9f1da",null);
    shape(ctx,"M69 36L75 40L70 42L65 39Z","#b94b3b",null);
    shape(ctx,"M80 38L82 41L78 43L77 40Z","#b94b3b",null);
    line(ctx,"M68 39L73 40M78 41L81 40","#263e39",1);
    oval(ctx,72,39.6,.65,.7,"#eeac5f");
    shape(ctx,"M88 46L92 47L89 49L87 48Z","#274339",null);
    line(ctx,"M88 51L81 52L76 50M64 46L69 48M62 49L67 51","#8aa895",.7);
    // Vermilion ribbon, bronze bell, forehead cinnabar mark.
    shape(ctx,"M61 51Q68 57 75 53L74 58L68 60L61 56Z","#963e35",null);
    oval(ctx,70,59,2.2,2.5,"#d3b276",ink,.65);
    line(ctx,"M69 60L71 60","#695a3d",.6);
    shape(ctx,"M73 33L75 36L73 38L72 36Z","#ab4335",null);
    shape(ctx,`M62 54Q51 59 ${49+tail} 68L56 64L53 72Q64 65 66 58Z`,"#af4b3b",null);
    ctx.restore();
    fire(ctx,12,25+Math.sin(phase)*2,5.2,phase);
    fire(ctx,28,31+Math.cos(phase)*2,3.6,phase+1);
  }

  const renderers = Object.freeze({scarab,warden,sentinel,hunter});
  function render(ctx,type,step=0) {
    const draw=renderers[type];
    if(!draw)throw new Error(`Unknown enemy species: ${type}`);
    ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    draw(ctx,((step%6)+6)%6);ctx.restore();
  }
  function install(scene) {
    for(const[type,spec]of Object.entries(species)) {
      const sheet=document.createElement("canvas");
      sheet.width=frameSize*6;sheet.height=frameSize;
      const ctx=sheet.getContext("2d");
      for(let frame=0;frame<6;frame++) {
        ctx.save();ctx.translate(frame*frameSize,0);ctx.scale(2,2);
        ctx.beginPath();ctx.rect(0,0,96,96);ctx.clip();
        render(ctx,type,frame);ctx.restore();
      }
      if(scene.anims.exists(spec.animation))scene.anims.remove(spec.animation);
      if(scene.textures.exists(spec.texture))scene.textures.remove(spec.texture);
      scene.textures.addSpriteSheet(spec.texture,sheet,{frameWidth:frameSize,frameHeight:frameSize,endFrame:5});
      scene.anims.create({key:spec.animation,frames:scene.anims.generateFrameNumbers(spec.texture,{start:0,end:5}),frameRate:spec.frameRate,repeat:-1});
    }
  }
  window.ShadowJumpEnemyArt=Object.freeze({install,species,frameSize,footBaseline,render});
})();
