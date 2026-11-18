/* Twelve original Chinese zodiac guardians. Drawings use 128px coordinates,
 * baked at 2× into six-frame atlases; every grounded silhouette ends at y=116.
 * Decorative motions are local to each creature, so anatomy stays readable. */
(() => {
  "use strict";
  const frameSize = 256, footBaseline = 232, FRAMES = 6;
  const INK = "#162a2c", IVORY = "#f9edce", GOLD = "#cfad6b", RED = "#a74b3c";
  const sizes = { rat: 178, ox: 206, tiger: 200, rabbit: 190, dragon: 222, snake: 194, horse: 212, goat: 204, monkey: 198, rooster: 198, dog: 204, pig: 212 };
  const bosses = Object.freeze(Object.fromEntries(Object.entries(sizes).map(([id, displaySize]) => [id, Object.freeze({
    texture: `zodiac-${id}`, animation: `zodiac-${id}-idle`, displaySize,
    frameRate: ["rat", "rabbit", "monkey"].includes(id) ? 8 : 6
  })])));

  function shape(c, d, fill, stroke = INK, width = 1.25) {
    const p = new Path2D(d);
    if (fill) { c.fillStyle = fill; c.fill(p); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(p); }
  }
  function line(c, d, color = IVORY, width = 1) { shape(c, d, null, color, width); }
  function oval(c, x, y, rx, ry, fill, stroke = null, width = 1) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  function grad(c, x, y, w, h, a, b, dark) {
    const g = c.createLinearGradient(x, y, x+w, y+h);
    g.addColorStop(0, a); if (dark) { g.addColorStop(.52, b); g.addColorStop(1, dark); } else g.addColorStop(1, b);
    return g;
  }
  function cloud(c, x, y, scale = 1, color = GOLD) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    line(c, "M-12 5Q-17-2-9-5Q-7-13 2-9Q9-12 12-5Q20-4 18 3Q15 8 8 6L-4 6Q-10 6-8 1Q-7-3-2-1Q1 1-2 3M8 1Q12-4 14 0",color,.9);
    c.restore();
  }
  function seal(c, x, y, r = 4, color = GOLD) {
    shape(c, `M${x-r} ${y-r}H${x+r}V${y+r}H${x-r}Z`,color,INK,.6);
    line(c,`M${x-2} ${y-2}V${y+2}M${x+1} ${y-2}V${y+2}M${x-2} ${y}H${x+2}`,RED,.7);
  }
  function eye(c, x, y, dir = 1, iris = "#ecbd62") {
    shape(c,`M${x-4*dir} ${y-2}Q${x} ${y-4} ${x+4*dir} ${y-1}Q${x+1*dir} ${y+2} ${x-3*dir} ${y+1}Z`,IVORY,INK,.7);
    oval(c,x+dir,y-1,1.5,2,iris); oval(c,x+dir*1.5,y-1,.6,1.3,INK); oval(c,x+dir*.5,y-1.7,.5,.5,"#fff9df");
    line(c,`M${x-5*dir} ${y-3}Q${x} ${y-5} ${x+4*dir} ${y-2}`,INK,1.4);
  }
  function tassel(c, x, y, sway, color = RED, len = 14) {
    line(c,`M${x} ${y}Q${x+sway} ${y+5} ${x+sway*.7} ${y+len}`,color,2);
    for(let i=-1;i<=1;i++) line(c,`M${x+sway*.7} ${y+len-3}L${x+sway*.7+i*2} ${y+len+3}`,color,.7);
    oval(c,x,y+2,1.6,2,GOLD);
  }
  function hoof(c, x, y, color, width=10) {
    shape(c,`M${x-width*.4} ${y-8}L${x+width*.35} ${y-8}L${x+width*.65} ${y-2}L${x+width*.6} ${y}H${x-width*.6}L${x-width*.7} ${y-2}Z`,color,INK,1);
    line(c,`M${x} ${y-5}V${y-1}`,GOLD,.7); line(c,`M${x-width*.5} ${y-1}H${x+width*.5}`,IVORY,.65);
  }
  function paw(c,x,y,fill,width=12) {
    shape(c,`M${x-width*.4} ${y-8}Q${x+width*.4} ${y-10} ${x+width*.4} ${y-4}Q${x+width*.8} ${y-3} ${x+width*.7} ${y}H${x-width*.6}Q${x-width*.8} ${y-3} ${x-width*.4} ${y-8}Z`,fill,INK,1);
    for(let i=0;i<3;i++) line(c,`M${x-3+i*4} ${y-3}L${x-2+i*4} ${y-.5}`,IVORY,.8);
  }
  function shadow(c, x=65, radius=35) { oval(c,x,116,radius,3,"rgba(8,18,26,.24)"); }

  function rat(c, phase) {
    const sway=Math.sin(phase)*2, bob=Math.sin(phase)*.8;
    shadow(c,65,27);
    // A long bare tail curls behind the scholar's brocade robe.
    line(c,`M49 97Q24 117 16 99Q9 83 20 80Q29 78 25 89`,INK,6);
    line(c,`M49 97Q24 117 16 99Q9 83 20 80Q29 78 25 89`,"#9d7870",3.4);
    line(c,"M17 94L20 94M16 89L20 89M17 84L20 85", "#d7b1a0",.65);
    paw(c,58,116,"#677e79",11); paw(c,77,116,"#9eaaa0",12);
    c.save(); c.translate(0,bob);
    shape(c,"M41 56L68 50L86 67L88 99L79 110L60 105L45 109L37 96Z",grad(c,40,57,49,49,"#769b83","#3e6c66","#203e44"));
    shape(c,"M43 61L56 66L51 102L43 105L40 94Z","#2b5153");
    shape(c,"M63 60L72 57L81 97L74 106L62 103Z",grad(c,62,60,15,43,"#d9c796","#9b946e"));
    line(c,"M44 103L50 99L60 101L72 105L82 98",GOLD,1.4);
    cloud(c,62,86,.57,"#c4bd8c");
    shape(c,"M45 69L76 67L80 75L48 79Z",RED); line(c,"M48 72L77 70",GOLD,.8); seal(c,64,73,4);
    shape(c,"M42 59Q30 64 31 82L43 91L54 77L51 65Z",grad(c,31,60,20,28,"#779e85","#2b5352"));
    line(c,"M34 80L42 85L49 77",GOLD,1.2);
    shape(c,"M34 79Q27 77 27 84L33 89L40 86L40 81Z","#aaa995");
    // Distinct round ears and a pointed mouse muzzle.
    oval(c,48,33,12,14,"#748f85",INK,1.2); oval(c,48,33,7.7,9.5,"#b99c88");
    oval(c,73,28,11,13,"#a9b7a2",INK,1.2); oval(c,73,28,6.7,8.5,"#cfb098");
    shape(c,"M49 30Q60 21 75 32L81 43L94 50L91 57L78 61L65 59L54 52L47 40Z",grad(c,49,29,37,28,"#c4c9b0","#80988b","#4c6d68"));
    shape(c,"M66 48Q73 41 80 46L94 50L90 57L77 59L68 56Z","#e1d9b8",INK,.8);
    oval(c,92,50,3,2.5,"#263b3d"); eye(c,74,41,1,"#dba85d");
    line(c,"M80 54Q84 56 88 54",INK,.7);
    line(c,`M82 52L104 ${47+sway}M83 54L106 54M81 56L100 ${61-sway}`,"#eee1bf",.75);
    shape(c,"M48 24Q60 17 72 24L76 30L48 33Z",RED); line(c,"M50 27L72 25",GOLD,1); seal(c,63,25,3);
    shape(c,"M51 54L62 60L75 59L72 66L59 68L49 61Z",IVORY,INK,.9);
    // The hand suspends a real paper lantern, with a swaying tassel.
    shape(c,"M78 66Q88 62 92 71L91 77L81 76L74 70Z","#9ca995");
    line(c,"M91 72L104 60",GOLD,2); line(c,`M104 60L${104+sway} 75`,GOLD,.8);
    c.save();c.translate(sway,0);
    shape(c,"M96 76Q103 71 112 77L114 92Q105 99 95 92Z",grad(c,95,76,17,19,"#ffe4a4","#e0a163","#9e5a45"));
    line(c,"M99 76L98 94M104 74V96M109 76L111 94", "#a76549",.7);
    line(c,"M97 76L111 76M96 93L112 93",GOLD,2); seal(c,104,85,3.5,IVORY);
    tassel(c,104,96,sway,RED,10);c.restore();c.restore();
  }

  function ox(c, phase) {
    const breath=Math.sin(phase)*.9, sway=Math.sin(phase)*2;
    shadow(c,65,44);
    line(c,`M33 70Q13 72 14 ${91+sway}`,INK,4);line(c,`M33 70Q13 72 14 ${91+sway}`,"#5c8079",2);
    shape(c,`M14 ${87+sway}L9 ${98+sway}L15 ${95+sway}L19 ${100+sway}L18 ${89+sway}Z`,"#324e4b");
    shape(c,"M35 78L48 80L46 106L35 109L32 96Z","#456760");hoof(c,39,115,"#243f40",13);
    shape(c,"M79 79L91 81L92 108L81 108Z","#52756c");hoof(c,86,115,"#294846",13);
    c.save();c.translate(0,breath);
    shape(c,"M25 53Q41 35 66 42Q80 43 93 55L99 77Q87 94 58 93L31 87L22 72Z",grad(c,24,43,65,48,"#789d8b","#4a786b","#294c4b"),INK,1.6);
    shape(c,"M32 45Q50 34 69 41L79 55L71 73L44 75L30 60Z",grad(c,31,40,45,36,"#dfc994","#9c9567","#65734e"),INK,1.3);
    line(c,"M34 47Q51 39 66 45L73 56L67 68L44 70L36 59Z",IVORY,.9);cloud(c,53,56,.75,"#59694f");
    line(c,"M39 76Q53 81 72 76",GOLD,3);seal(c,58,79,5);
    for(let i=0;i<4;i++) shape(c,`M${35+i*10} 82L${44+i*10} 82L${43+i*10} 91L${38+i*10} 94L${34+i*10} 90Z`,"#668675",GOLD,.6);
    shape(c,"M78 47L101 47L111 61L108 84L100 94L85 93L76 80L73 61Z",grad(c,77,48,30,44,"#98afa0","#53776c","#2d514e"),INK,1.4);
    // Broad, deeply curled bovine horns stay distinct from the ram's spirals.
    shape(c,"M83 51Q64 43 65 24Q68 18 71 17Q66 35 88 37Z",grad(c,65,18,24,34,IVORY,"#b5a16e","#627256"));
    shape(c,"M99 43Q111 28 106 16Q122 22 118 37Q114 49 103 54Z",grad(c,104,16,14,34,IVORY,"#c6af78","#75805f"));
    line(c,"M69 22Q68 37 83 43M110 22Q118 34 105 46",GOLD,.9);
    shape(c,"M77 52L65 51L67 62L80 65Z","#67887a");shape(c,"M106 55L122 50L119 62L108 65Z","#a2b298");
    shape(c,"M82 41L96 38L106 47L102 59L86 60L78 51Z",grad(c,80,40,25,20,"#ead7a6",GOLD,"#8d895d"));
    cloud(c,92,49,.37,"#5f6b4f");
    eye(c,86,67,1,"#d2aa5e");eye(c,105,65,-1,"#d2aa5e");
    shape(c,"M86 76Q99 72 110 80L111 88Q101 97 87 90L82 83Z",grad(c,83,76,28,17,"#b3bba1","#7a9382"));
    oval(c,91,83,2,3,INK);oval(c,105,82,2,3,INK);line(c,"M91 89Q98 92 105 88",INK,.8);
    c.beginPath();c.ellipse(100,89,5,6,0,0,Math.PI*2);c.strokeStyle=GOLD;c.lineWidth=1.8;c.stroke();
    tassel(c,79,72,sway,RED,20);c.restore();
    shape(c,"M28 82L43 86L40 106L26 107L24 96Z",grad(c,25,85,17,22,"#7b9b86","#355c54"));hoof(c,32,116,"#2b4644",15);
    shape(c,"M70 87L84 88L82 108L68 108Z",grad(c,68,87,16,21,"#94ad96","#416b5d"));hoof(c,75,116,"#2b4644",15);
    line(c,"M28 98L39 99M70 100L82 100",GOLD,2);
  }

  function tiger(c, phase) {
    const sway=Math.sin(phase)*3,bob=Math.sin(phase)*.8;
    shadow(c,66,42);
    line(c,`M36 78Q9 85 14 ${57+sway}Q17 ${44+sway} 25 ${48+sway}`,INK,8);
    line(c,`M36 78Q9 85 14 ${57+sway}Q17 ${44+sway} 25 ${48+sway}`,"#c7834f",5.4);
    line(c,"M14 67L19 67M17 79L21 75M16 55L21 55",INK,2);
    shape(c,"M36 80L49 81L47 106L34 109L30 97Z","#85563e");paw(c,40,115,"#a26a49",15);
    shape(c,"M81 82L94 83L97 108L84 110Z","#a5724b");paw(c,90,115,"#cc9a66",15);
    c.save();c.translate(0,bob);
    shape(c,"M24 61Q31 43 57 44Q76 42 90 59L96 80L83 95L49 94L28 86Z",grad(c,25,46,61,46,"#e4b877","#c48146","#805039"),INK,1.5);
    shape(c,"M29 57L40 49L39 66L34 74Z M48 47L56 45L58 69L53 65Z M63 49L72 51L68 72L64 65Z M28 79L42 83L43 89L29 85Z",INK,null);
    shape(c,"M68 51L81 44L98 48L109 65L106 86L96 96L77 93L65 79Z",grad(c,68,47,36,45,"#f2ce91","#cb884b","#895938"));
    // Two round ears, a white muzzle and the forehead stripes read at game size.
    oval(c,77,40,9,11,INK);oval(c,77,41,5,7,"#e2b681");oval(c,105,39,9,10,INK);oval(c,105,40,5,6,"#e7bc80");
    shape(c,"M74 42Q87 31 103 41L113 57L109 75L101 85L82 85L71 72L68 55Z",grad(c,70,39,40,43,"#f3d099","#cd8a4b","#9b663d"),INK,1.4);
    shape(c,"M73 58L64 64L71 69L67 74L78 78L83 72L79 61Z M107 56L119 61L113 67L117 72L106 78L102 69Z",IVORY,INK,.9);
    line(c,"M88 39V53M80 43L98 43M80 49L99 49",INK,2.5);
    shape(c,"M72 51L82 55L79 59L69 56Z M108 48L99 54L103 56L111 53Z M72 67L81 65L80 69L75 73Z M110 64L101 64L103 69L109 69Z",INK,null);
    eye(c,81,59,1,"#e6bb4e");eye(c,102,58,-1,"#e6bb4e");
    oval(c,87,73,9,7,IVORY);oval(c,99,72,8,7,IVORY);
    shape(c,"M87 66L98 65L95 71L91 72Z","#483d32",INK,.8);
    line(c,"M94 71V76M94 76L89 78M94 76L100 77",INK,.8);
    for(const [x,y] of [[84,71],[86,75],[102,70],[103,74]])oval(c,x,y,.7,.7,INK);
    line(c,`M82 73L66 ${71+sway}M83 76L67 ${80+sway}M104 71L122 ${68-sway}M104 74L121 ${77-sway}`,IVORY,.6);
    shape(c,"M71 83L83 87L101 86L107 80L106 90L91 98L76 93Z",RED);line(c,"M74 88L91 94L104 87",GOLD,1.2);seal(c,92,94,4);
    c.restore();
    shape(c,"M27 86L42 86L44 106L30 110L25 99Z",grad(c,26,86,17,23,"#d7995d","#9c623c"));paw(c,36,116,IVORY,16);
    shape(c,"M69 87L82 89L84 108L70 108Z",grad(c,69,87,15,24,"#e1ad6f","#ae713f"));paw(c,77,116,IVORY,16);
    line(c,"M29 93L39 95M71 96L80 97",INK,3);
  }

  function rabbit(c, phase) {
    const sway=Math.sin(phase)*2,bob=Math.sin(phase)*1.2;
    shadow(c,64,30);paw(c,55,116,"#c1c4ae",13);paw(c,76,116,IVORY,15);
    c.save();c.translate(0,bob);
    // A moon disk and long silk streamers frame an unmistakable long-eared head.
    c.beginPath();c.arc(64,41,31,0,Math.PI*2);c.strokeStyle="#cfc492";c.lineWidth=1.5;c.stroke();
    c.beginPath();c.arc(64,41,28,-1.6,1.7);c.strokeStyle="#f4e9bc";c.lineWidth=.6;c.stroke();
    shape(c,`M47 54Q21 60 24 ${80+sway}Q25 91 15 99Q37 93 34 ${79+sway}Q34 67 52 66Z`,grad(c,22,57,24,40,"#afd5c5","#5c9e99"));
    line(c,`M45 59Q28 64 30 ${81+sway}Q31 91 20 96`,GOLD,.9);
    shape(c,"M48 57L72 54L85 74L84 104L72 112L60 106L44 109L38 91Z",grad(c,43,57,39,51,"#f7edd3","#c3ccb8","#8eaca2"));
    shape(c,"M49 60L60 68L76 57L72 75L56 81L45 73Z","#a8cabc",INK,.8);
    line(c,"M51 62L60 71L74 60",GOLD,1.2);
    shape(c,"M44 78L77 74L80 81L47 86Z","#588c83");seal(c,64,81,4);
    line(c,"M51 87L49 103M62 86L60 103M72 85L76 105", "#6c9c90",.7);
    cloud(c,65,98,.52,"#b3a36d");
    oval(c,40,89,7,8,"#e2e3cc",INK,.7);
    shape(c,"M45 39Q35 19 43 7Q49 3 52 11L56 34Z",grad(c,40,6,15,35,IVORY,"#afc5b4"));
    shape(c,"M48 31Q42 14 45 10Q49 13 51 31Z","#d7a49b",null);
    shape(c,"M59 33Q57 13 67 5Q74 3 75 11L69 35Z",grad(c,59,5,16,30,"#fff3d8","#bacbb4"));
    shape(c,"M64 29Q64 13 70 9L69 27Z","#d8b4a8",null);
    shape(c,"M44 36Q57 28 72 37L78 49L86 55L82 63L72 67L59 64L47 58L41 47Z",grad(c,43,34,38,31,"#fff6dd","#d9ddc2","#a7c0ad"),INK,1.1);
    eye(c,69,47,1,"#be6c67"); oval(c,82,55,2.5,2,"#a76566");
    line(c,"M75 59Q79 61 81 59M76 58L91 56M75 61L89 64", "#6f8b80",.65);
    shape(c,"M45 35L53 29L65 31L69 36L56 39Z",GOLD,INK,.7);seal(c,57,34,3,"#e9d49a");
    shape(c,"M72 68Q84 64 89 74L86 82L77 79L69 73Z",IVORY);
    // Jade pestle with a carved ring; the sleeve visibly wraps around it.
    line(c,"M91 48L93 106",INK,6);line(c,"M91 48L93 106","#8fbdb0",4);
    oval(c,91,47,5,8,"#bcd8bd",INK,.8);line(c,"M90 42L92 52",IVORY,.8);
    shape(c,"M85 75Q94 71 96 76L94 81L86 82Z","#e6e5cb");tassel(c,94,88,sway,RED,17);
    shape(c,"M73 65Q92 69 105 61L111 64Q101 78 78 75Z","#79aaa0",GOLD,.7);
    c.restore();
  }

  function dragon(c, phase) {
    const sway=Math.sin(phase)*2.4,breath=Math.sin(phase)*.7;
    shadow(c,66,43);
    // A long, scaled body coils under the dragon; Chinese dragons have no wings.
    shape(c,`M47 97Q10 105 16 80Q19 64 38 68L55 78Q28 76 30 87Q33 96 50 88L72 82L100 87L112 100L105 108L70 113L39 108Q21 113 12 ${104+sway}L25 ${104+sway}Q18 99 24 95L36 101Z`,grad(c,15,69,93,42,"#86bda9","#438776","#234d4b"),INK,1.5);
    line(c,"M30 100Q50 111 79 104L102 98",GOLD,2.3);
    shape(c,"M38 77L32 66L43 69L48 77L54 70L59 80L66 73L72 84L81 78L85 89L94 84L101 94", "#d8c79c",INK,.8);
    // The serpentine neck follows an S, rather than a humanoid torso.
    c.save();c.translate(0,breath);
    shape(c,"M59 98Q91 100 96 80Q100 63 84 57Q71 54 65 45L73 33L67 21L49 29L45 45Q43 62 61 71L75 77Q79 83 67 86L53 86Z",grad(c,43,24,52,73,"#b1d2b5","#4e9b86","#285b55"),INK,1.6);
    shape(c,"M53 39Q49 59 70 66Q91 75 85 86Q82 96 66 96L57 91Q81 88 77 79Q75 75 62 70Q42 61 47 44Z",grad(c,47,41,39,54,"#eddbad","#b3b184","#658b73"),INK,.8);
    for(let i=0;i<5;i++)line(c,`M${49+i*4} ${52+i*6}Q${55+i*4} ${53+i*6} ${58+i*4} ${48+i*6}`,"#789777",.8);
    for(const [x,y] of [[60,39],[66,46],[70,53],[80,61],[89,69],[91,79],[84,88],[66,101],[49,102],[32,88]]){
      line(c,`M${x-3} ${y-2}Q${x} ${y+3} ${x+3} ${y-2}M${x} ${y+2}Q${x+3} ${y+7} ${x+6} ${y+2}`,"#b1c797",.65);
    }
    // Antlers, crown and the streaming mane belong to the same jade dragon.
    shape(c,`M56 37L42 36L45 30L32 ${30-sway}L40 25L29 ${20-sway}L45 20L46 11L55 21L64 20L68 32Z`,grad(c,33,15,31,24,"#bacfb3","#5b9d8c"));
    shape(c,"M59 25L52 15L53 6L57 13L61 16L62 7L65 8L66 17L70 22Z",IVORY,INK,.8);
    shape(c,"M78 25L84 16L84 7L88 11L88 19L94 14L96 17L90 24L84 29Z",IVORY,INK,.8);
    line(c,"M56 10L56 17L63 23M87 12L87 21L82 26",GOLD,.8);
    shape(c,"M58 25L73 20L88 28L90 37L106 40L111 47L104 54L90 54L82 61L70 54L60 44L52 37Z",grad(c,54,22,53,37,"#c1d9b7","#75af94","#3f796b"),INK,1.4);
    shape(c,"M59 37L50 39L53 48L62 47L65 42Z","#a0c7a5");
    shape(c,"M72 20L81 22L85 28L76 31L67 27Z",GOLD,INK,.8);seal(c,76,25,3,IVORY);
    eye(c,84,35,1,"#cf9e4a");
    line(c,"M74 31L84 30L91 34",INK,1.8);
    shape(c,"M93 41L107 40L112 46L108 51L95 51L86 48Z","#cbd9b5",INK,.8);
    oval(c,105,44,2,1.8,INK);line(c,"M92 49Q101 53 108 48",INK,1);
    shape(c,"M96 51L98 57L100 51M103 50L105 55L107 50",IVORY,INK,.6);
    shape(c,`M83 53Q91 59 84 ${69+sway}L88 65L84 77Q78 68 74 61L78 55Z`,grad(c,75,53,13,24,"#f0e2b6","#83b7a0"),INK,.8);
    line(c,`M100 47Q117 41 119 ${29+sway}Q120 ${21+sway} 115 22M99 51Q116 59 118 ${69-sway}`,IVORY,1.2);
    // Two visible clawed forelimbs and a luminous pearl.
    shape(c,"M62 64L48 72L40 66L34 71L43 82L54 80L70 72Z","#6da28b");
    shape(c,"M42 68L32 62L28 65L33 68L27 69L29 73L35 72L34 76L39 75L45 72Z","#bdd3aa",INK,.8);
    shape(c,"M87 72L101 77L108 68L113 71L110 84L100 88L85 83Z","#518d79");
    shape(c,"M107 69L105 61L108 59L111 65L113 59L117 60L116 67L121 65L123 69L116 75L110 75Z","#a8c7a1",INK,.8);
    oval(c,24,56,8.3,8.3,"rgba(214,193,123,.19)");oval(c,24,56,5.5,5.5,grad(c,19,51,10,10,"#fff3cc","#d5ab60"),GOLD,.8);line(c,"M20 55Q22 51 26 53",IVORY,1.1);
    c.restore();
    shape(c,"M60 98L57 109L47 111L44 116L53 115L56 116L62 113L65 103Z","#8eb599",INK,1);
    shape(c,"M90 99L91 109L102 111L107 116L98 115L94 116L86 112L84 104Z","#a7c8a4",INK,1);
    line(c,"M50 112L48 115M57 112L55 115M99 112L103 115",IVORY,.8);
  }

  function snake(c, phase) {
    const sway=Math.sin(phase)*1.8,bob=Math.sin(phase)*.8;
    shadow(c,66,40);
    // The whole lower silhouette is a continuous coil, with no humanoid legs.
    shape(c,"M41 80Q17 82 18 99Q19 112 44 115L82 115Q112 112 112 96Q112 83 95 80L66 89L41 80Z",grad(c,20,82,87,31,"#b3d4b9","#729e89","#3e665f"),INK,1.4);
    shape(c,"M41 92Q28 91 30 100Q36 108 60 106L86 105Q104 104 101 96L94 92L84 96Q90 101 75 102L50 100Z","#d7ddbd",INK,.9);
    line(c,"M32 103Q57 114 97 104",GOLD,.8);
    shape(c,`M92 104Q119 107 117 ${86+sway}Q116 ${75+sway} 108 ${69+sway}Q113 82 105 87L95 88Z`,grad(c,97,70,20,33,"#b8d8b5","#6a9c82"),INK,1);
    c.save();c.translate(sway*.4,bob);
    shape(c,"M53 103Q81 108 91 91Q104 71 84 63L62 53Q49 45 58 35L68 25L64 15L51 18L40 30Q28 50 47 65L68 78Q80 85 68 90L52 88L42 93Z",grad(c,36,19,58,85,"#c1dac1","#79b39e","#3f7b70"),INK,1.5);
    shape(c,"M53 27Q36 44 49 57L73 74Q89 84 76 96L65 99L53 96Q76 94 74 84L67 79L43 62Q27 45 44 28Z",grad(c,37,29,44,70,"#f4e5bd","#c3c399","#829d80"),INK,.8);
    for(const [x,y,a] of [[42,38,10],[40,47,11],[44,56,12],[51,64,13],[61,71,12],[71,79,10],[75,88,8]])line(c,`M${x} ${y}Q${x+a*.6} ${y+1} ${x+a} ${y-3}`,"#8a9b74",.65);
    for(const [x,y] of [[61,41],[63,51],[76,63],[85,72],[89,82],[87,92],[35,95],[42,111],[82,110]]){
      shape(c,`M${x} ${y-3}L${x+3} ${y}L${x} ${y+3}L${x-3} ${y}Z`,"#a7c79f","#426f60",.5);
    }
    // Flat serpent brow, slit pupil, smooth jaw and a forked tongue.
    shape(c,"M42 27L47 16L62 13L76 19L85 27L91 31L89 39L78 44L65 41L51 38L41 33Z",grad(c,43,15,44,29,"#d3e0c5","#91baa0","#528e78"),INK,1.2);
    shape(c,"M53 35L66 38L86 34L89 39L78 44L64 41Z","#e0dfb8",INK,.6);
    eye(c,73,28,1,"#d4a864");line(c,"M65 24L76 24L81 28",INK,1.3);
    oval(c,87,32,1.2,1,INK);line(c,"M65 36Q76 40 88 35",INK,.7);
    line(c,`M89 37L${100+sway} 40L${105+sway} 37M${100+sway} 40L${104+sway} 43`,RED,1);
    shape(c,"M48 20L45 9L53 13L57 5L63 14L71 11L69 21L58 24Z",GOLD,INK,.9);
    line(c,"M49 17L58 20L67 18",IVORY,.8);oval(c,58,16,2.5,3.5,"#ae6650",INK,.5);
    shape(c,`M47 51Q25 60 23 76Q20 90 9 ${94+sway}Q31 91 34 77Q36 65 54 62Z`,grad(c,20,52,29,39,"#bf6e5c","#803e3d"),GOLD,.75);
    shape(c,"M63 66Q84 57 102 65L111 62L107 73Q87 66 72 76Z",RED,GOLD,.75);
    tassel(c,34,77,sway,RED,17);cloud(c,65,86,.42,"#d9cb9b");
    c.restore();
  }

  function horse(c, phase) {
    const sway=Math.sin(phase)*2.6,bob=Math.sin(phase)*.8;
    shadow(c,65,43);
    // The tail and high neck preserve the long-legged equine silhouette.
    shape(c,`M36 61Q17 48 13 ${70+sway}L9 ${95+sway}L15 90L16 103L22 96L26 100L25 81L36 74Z`,grad(c,12,58,22,42,"#b65e43","#693f37","#2f3233"),INK,1.2);
    line(c,`M24 67Q17 76 19 ${94+sway}M21 66Q14 76 13 ${87+sway}`,"#dc9567",.8);
    shape(c,"M39 76L50 78L46 94L51 110L43 112L36 96Z","#785844");hoof(c,46,116,"#393c37",11);
    shape(c,"M76 76L86 76L87 94L98 110L90 112L78 97Z","#8c6a4c");hoof(c,95,116,"#3c443c",11);
    c.save();c.translate(0,bob);
    shape(c,"M28 58Q39 45 58 51L78 56L87 47L94 34L104 38L103 56L91 80Q83 91 62 88L36 86L26 74Z",grad(c,27,49,66,38,"#e1b981","#b88351","#79543e"),INK,1.4);
    shape(c,"M71 58L77 38L84 25L95 24L105 37L101 59L88 78L80 80Z",grad(c,73,28,31,50,"#eaca92","#b98859","#856044"));
    shape(c,`M83 27L74 29L77 21L67 27L68 39L62 ${47+sway}L69 46L65 58L74 54L72 65L82 59L88 39Z`,grad(c,65,24,21,40,"#d4895b","#954e3c","#553730"),INK,1);
    line(c,"M80 31L73 42M80 39L73 51M80 48L77 57",GOLD,.8);
    // Two ears, a long nasal bridge and a broad muzzle read as a horse.
    shape(c,"M85 27L82 11L88 15L93 28Z","#cfa371");shape(c,"M96 27L98 10L104 14L103 29Z","#ecd0a0");
    line(c,"M86 16L89 25M100 15L100 25","#785445",1.2);
    shape(c,"M85 26L98 23L107 32L109 44L119 58L116 66L107 69L97 63L94 50L84 42Z",grad(c,86,25,32,41,"#f1d3a0","#c59660","#9c704b"),INK,1.3);
    shape(c,"M107 51L118 57L118 64L110 69L101 62L101 56Z","#a18d70",INK,.8);
    oval(c,113,59,2,2.7,INK);line(c,"M109 65L115 63",INK,.7);eye(c,99,37,1,"#a97e42");
    shape(c,"M96 25L99 25L105 47L112 52L109 56L101 49Z","#4e8379",GOLD,.7);
    line(c,"M89 40L100 45L108 61",GOLD,1.5);oval(c,100,46,2,2,GOLD,INK,.5);
    line(c,"M100 46Q90 58 75 69","#5f7062",1);
    // Brocade saddle, jade breastplate and a ceremonial red tassel.
    shape(c,"M40 51L66 51L72 64L65 79L42 76L36 65Z",grad(c,38,52,32,27,"#829d7e","#496c61"),GOLD,1.3);
    shape(c,"M43 55L62 55L66 65L61 74L45 71L40 64Z",null,GOLD,.7);cloud(c,53,64,.5,"#d6c58e");
    shape(c,"M36 51L65 51L66 55L35 55Z",RED,GOLD,.6);
    shape(c,"M76 63L85 68L81 83L73 81Z","#466f66",GOLD,1.2);seal(c,80,73,3.5);tassel(c,80,80,sway,RED,13);
    c.restore();
    shape(c,"M29 78L40 81L35 96L31 110L23 110L27 94Z",grad(c,27,79,13,31,"#c49361","#8d6146"));hoof(c,27,116,"#3a443e",12);
    shape(c,"M65 82L76 83L72 97L74 111L65 111L64 97Z",grad(c,65,84,12,27,"#e3b786","#ac7b54"));hoof(c,69,116,"#3a443e",12);
    line(c,"M25 106L33 107M65 106L73 106",GOLD,1.5);
  }

  function goat(c, phase) {
    const sway=Math.sin(phase)*1.7,bob=Math.sin(phase)*.8;
    shadow(c,65,42);
    shape(c,"M26 66L16 60L13 68L24 77Z","#d1ccb0");
    shape(c,"M34 81L47 83L44 108L33 109Z","#a39f82");hoof(c,38,116,"#3d4a44",12);
    shape(c,"M80 80L92 81L96 108L84 110Z","#aba88b");hoof(c,90,116,"#465348",12);
    c.save();c.translate(0,bob);
    shape(c,"M24 55Q34 39 58 42L79 48L92 61L94 83L82 95L45 95L29 88L23 75Z",grad(c,24,43,65,50,"#eee5c4","#c8c9ab","#8b9d86"),INK,1.3);
    // Dense wool is drawn as overlapping curls, rather than a smooth cow body.
    for(const [x,y,r] of [[31,56,6],[42,48,6],[55,48,7],[66,52,6],[34,69,7],[46,60,6],[59,63,7],[73,65,6],[30,81,6],[44,80,7],[58,85,7],[74,84,7],[84,75,6]]) {
      line(c,`M${x-r} ${y}Q${x-r} ${y-r} ${x} ${y-r}Q${x+r} ${y-r} ${x+r} ${y}Q${x+r} ${y+r} ${x} ${y+r}Q${x-3} ${y+4} ${x-2} ${y+1}Q${x} ${y-1} ${x+2} ${y+1}`,"#8eaa91",.8);
    }
    shape(c,"M39 44L66 43L76 55L73 74L62 80L44 73L36 59Z",grad(c,37,44,37,34,"#77947c","#425f56"),GOLD,1.1);
    line(c,"M42 49L63 48L70 58L67 70L61 74L47 69L41 58Z",GOLD,.75);cloud(c,55,60,.6,"#c7bc88");
    tassel(c,43,72,sway,RED,15);tassel(c,69,74,-sway,RED,15);
    // The ram has full spiral horns, not the bovine's open crescents.
    shape(c,"M83 45Q65 39 66 24Q68 9 82 10Q97 10 100 27L92 37L84 36Q91 30 88 23Q85 17 79 21Q74 26 81 30L87 32Z",grad(c,66,10,34,35,"#e2d2a5","#a5976a","#64765b"),INK,1.3);
    line(c,"M81 40Q69 33 71 24Q73 15 81 15Q91 16 94 27L89 33M70 24L76 25M74 15L77 21M85 15L83 21M91 21L86 25", "#6f7654",.75);
    shape(c,"M98 43Q115 40 116 25Q116 12 105 11Q97 10 94 19L98 28L101 25Q101 18 106 20Q111 24 107 30L100 31Z",grad(c,96,12,20,32,IVORY,"#bca575","#6f7959"),INK,1);
    shape(c,"M80 32L95 28L105 38L110 57L104 70L94 77L80 68L75 52Z",grad(c,77,29,32,47,"#f2e9ca","#cad0b2","#94aa91"),INK,1.3);
    shape(c,"M78 39L64 41L67 51L79 51Z","#b8c4a4");shape(c,"M106 41L123 43L117 52L107 50Z","#e1dbb8");
    eye(c,88,48,1,"#b2a064");eye(c,103,48,-1,"#b2a064");
    shape(c,"M86 59L98 55L109 61L104 70L93 74L84 68Z","#c3c9a8",INK,.7);
    shape(c,"M94 61L101 61L98 65Z",INK,null);line(c,"M98 65V68L94 70M98 68L103 69",INK,.7);
    shape(c,`M89 72L103 71L101 84L96 ${94+sway}L93 88L88 87Z`,grad(c,90,73,10,20,IVORY,"#b9c9ad"),INK,.8);
    line(c,`M93 76L95 ${87+sway}M98 75L97 ${88+sway}`,"#8ea58c",.7);
    shape(c,"M83 31L89 25L99 25L105 32L97 37L88 36Z",GOLD,INK,.8);seal(c,94,31,3.4,IVORY);
    shape(c,"M81 73L91 78L105 72L105 79L93 85L81 80Z",RED,GOLD,.7);
    c.restore();
    shape(c,"M25 84L39 87L36 108L24 109Z","#d8d5b4");hoof(c,30,116,"#48584b",13);
    shape(c,"M65 87L78 88L79 109L66 109Z","#e7e0be");hoof(c,72,116,"#48584b",13);
    line(c,"M25 103L37 104M67 104L77 104",GOLD,1.4);
  }

  function monkey(c, phase) {
    const sway=Math.sin(phase)*2.2,bob=Math.sin(phase)*.8;
    shadow(c,65,34);
    // A long prehensile tail and crouched limbs distinguish the simian posture.
    line(c,`M48 85Q20 91 13 75Q7 60 19 ${52+sway}Q28 ${48+sway} 30 57Q29 64 24 63`,INK,7);
    line(c,`M48 85Q20 91 13 75Q7 60 19 ${52+sway}Q28 ${48+sway} 30 57Q29 64 24 63`,"#a4764d",4.5);
    line(c,`M15 70Q12 58 21 ${55+sway}`,"#d8ac73",1);
    shape(c,"M44 82L59 85L52 99L44 109L33 109L38 97Z","#9b6849",INK,1.3);
    shape(c,"M70 81L83 80L93 93L88 107L78 107L79 97L68 93Z","#b88557",INK,1.3);
    paw(c,38,116,"#ba9970",14);paw(c,83,116,"#d7b588",16);
    c.save();c.translate(0,bob);
    shape(c,"M43 48L64 45L79 55L83 78L73 88L49 85L40 72L38 58Z",grad(c,39,47,43,38,"#d7ad73","#aa774c","#744e3d"),INK,1.3);
    shape(c,"M48 49L62 47L73 59L70 77L58 81L46 72Z",grad(c,45,49,26,31,"#ecd1a0","#bd9b6c"),INK,.8);
    // Short lamellar skirt and diagonal chest sash, with cloud-scroll plates.
    shape(c,"M43 71L77 68L83 81L75 94L57 89L43 93L35 83Z",grad(c,38,72,43,21,"#7d9880","#42685e"),GOLD,1);
    for(let i=0;i<4;i++)shape(c,`M${43+i*8} 77L${49+i*8} 76L${50+i*8} 86L${45+i*8} 89L${41+i*8} 86Z`,"#587b6a",GOLD,.55);
    shape(c,"M45 48L52 46L76 71L70 78Z",RED,GOLD,.7);seal(c,60,62,4);
    shape(c,"M43 51Q34 50 31 61L29 78L37 84L44 75L40 65L50 58Z",grad(c,30,50,18,31,"#bc8c59","#84583e"));
    shape(c,"M29 75L24 81L28 89L36 88L40 82L36 76Z","#d3af7d");
    line(c,"M28 81L31 86M31 79L34 85M34 79L36 83",INK,.65);
    shape(c,"M72 54Q83 48 89 56L96 68L104 66L107 73L96 80L88 77L78 66L68 64Z",grad(c,71,52,32,25,"#d8ad71","#966542"));
    // The cloud-pattern staff is held in the front hand, not glued behind it.
    line(c,"M110 27L101 111",INK,5.5);line(c,"M110 27L101 111","#927b52",3.4);
    line(c,"M109 28L108 40M102 99L101 111",GOLD,4.2);line(c,"M108 32L110 32M107 37L109 37M101 103L104 103",IVORY,.6);
    shape(c,"M100 68Q106 64 110 68L109 75L103 78L98 74Z","#e4c497",INK,.9);line(c,"M104 69L109 70M103 72L109 73",INK,.65);
    tassel(c,108,40,sway,RED,13);
    // A heart-shaped bare face, rounded ears and muzzle give the head character.
    oval(c,40,36,8,10,"#ad7e52",INK,1);oval(c,40,37,4.5,6,"#d8b487");
    oval(c,77,35,8,10,"#c2915e",INK,1);oval(c,77,36,4.5,6,"#e0bd8e");
    shape(c,"M41 27L47 16L52 20L59 12L64 18L73 17L79 28L77 45L68 54L49 52L39 42Z",grad(c,40,18,39,35,"#d2a264","#ac7749","#775039"),INK,1.3);
    shape(c,"M45 29Q49 23 58 30Q65 22 73 29L75 41L69 49L59 53L47 47L42 38Z",grad(c,43,28,31,24,"#f3d6a5","#c49a6d"),INK,.8);
    eye(c,51,35,1,"#9c763d");eye(c,67,34,-1,"#9c763d");
    shape(c,"M53 41Q60 36 67 41L71 47L65 52L56 52L50 47Z","#dcc093",INK,.7);
    shape(c,"M57 41L64 41L61 44Z",INK,null);line(c,"M55 47Q62 50 68 45",INK,.8);
    line(c,"M44 29L53 31M64 30L73 27",INK,1.5);
    shape(c,"M41 24L76 23L77 28L42 29Z",GOLD,INK,.7);seal(c,59,26,3.3,IVORY);
    shape(c,`M42 25Q29 17 25 ${21+sway}L34 28L26 34L42 30Z`,RED,GOLD,.6);
    c.restore();
  }

  function rooster(c, phase) {
    const sway=Math.sin(phase)*2,bob=Math.sin(phase)*.8;
    shadow(c,65,35);
    // Layered sickle feathers build a wide, unmistakable rooster tail.
    c.save();c.translate(0,bob);
    const tail=[
      ["M55 73Q11 67 10 30Q9 12 24 10Q9 39 45 45L61 64Z","#345f60","#94b5a0"],
      ["M52 75Q17 75 16 46Q12 24 30 20Q18 44 48 53L61 68Z","#4b8275","#bdd0a0"],
      [`M54 79Q20 90 10 ${68+sway}Q3 51 16 43Q10 66 42 63L63 71Z`,"#2c5055","#b8c59a"],
      ["M56 72Q31 48 36 27Q40 14 49 16Q38 33 59 50L65 67Z","#83a68b","#e0d9ad"],
      [`M58 80Q30 96 15 ${88+sway}Q8 85 9 76Q22 86 50 69Z`,"#628e7b","#c0cba0"]
    ];
    for(const [d,fill,edge] of tail)shape(c,d,fill,INK,1.1);
    line(c,"M20 18Q18 47 52 62M28 27Q25 51 54 68M14 52Q15 76 49 72M45 22Q43 38 58 57M13 81Q29 91 52 76",GOLD,.75);
    shape(c,"M44 56Q59 44 76 48L91 62L90 80L78 96L57 96L43 84L37 69Z",grad(c,40,48,49,46,"#cdbb7e","#8d9d71","#44665e"),INK,1.4);
    shape(c,"M54 57Q73 55 80 70L72 87L57 91L45 80L44 67Z",grad(c,46,59,32,29,"#91b2a0","#4e867e","#2c585e"),GOLD,.9);
    for(let i=0;i<5;i++)line(c,`M${49+i*4} ${63+i*1.5}Q${57+i*4} 76 ${52+i*4} ${84-i}`,"#c9d3a9",.7);
    shape(c,"M67 59L72 41L78 32L92 32L101 44L94 62L85 73L75 69Z",grad(c,69,34,29,37,"#edd3a0","#c49a5b","#927044"),INK,1.1);
    // Individual gold hackles overlap the breast like ceremonial armor.
    for(const [x,y] of [[73,45],[79,46],[85,47],[91,46],[72,54],[79,55],[86,55],[91,54],[77,64],[84,64]])shape(c,`M${x} ${y-6}L${x+3} ${y+5}L${x-3} ${y+3}Z`,"#e6c886","#8d7a4c",.6);
    shape(c,"M77 32L76 22L80 15L85 22L89 12L94 21L100 16L102 25L97 33Z",grad(c,77,15,23,17,"#dc8a6b","#a9473b"),INK,1);
    shape(c,"M78 31Q89 25 100 33L105 42L100 52L88 53L80 46L75 39Z",grad(c,77,30,28,23,"#e8c792","#c28f57"),INK,1.1);
    shape(c,"M98 38L114 42L102 48L99 44Z",grad(c,100,39,13,8,"#f4dbaa","#b78c50"),INK,.8);line(c,"M102 43L112 42",INK,.6);
    eye(c,92,37,1,"#dd8f4d");
    shape(c,`M96 47Q102 55 97 ${62+sway}Q92 64 91 55L90 49Z`,RED,INK,.7);
    shape(c,"M82 32L91 29L97 32L95 35L84 36Z",GOLD,INK,.6);seal(c,88,33,2.4,IVORY);
    shape(c,"M72 66L86 72L94 61L95 68L85 79L72 73Z",RED,GOLD,.6);seal(c,84,75,3);tassel(c,85,79,sway,RED,13);
    c.restore();
    // Three toes and a raised rear spur ground the avian legs.
    shape(c,"M57 91L64 93L63 106L68 111L64 113L58 108Z","#c6a06a",INK,.8);
    shape(c,"M77 91L83 90L82 106L86 112L80 113L76 106Z","#dbc08a",INK,.8);
    line(c,"M61 106L53 114L46 116M61 109L62 116L69 116M59 110L55 116M80 107L73 114L70 116M80 109L83 116L92 116M81 109L92 111M60 103L54 102",GOLD,2.1);
    line(c,"M48 115L45 116M69 116L72 116M91 115L95 116M70 115L68 116",IVORY,1);
  }

  function dog(c, phase) {
    const sway=Math.sin(phase)*2.8,bob=Math.sin(phase)*.7;
    shadow(c,64,43);
    // A curled tail, deep muzzle and four clear paws form the guardian hound.
    shape(c,`M34 64Q13 66 12 ${45+sway}Q11 ${28+sway} 28 30Q40 33 34 ${45+sway}L28 44Q30 38 24 38Q18 39 22 48L39 54Z`,grad(c,13,31,24,34,"#9fb8ac","#587e7b","#2e5058"),INK,1.3);
    line(c,`M19 ${35+sway}Q14 47 27 56`,"#e1e0c2",.9);
    shape(c,"M34 81L46 82L44 108L32 109Z","#42636a");paw(c,37,115,"#708d8b",15);
    shape(c,"M82 80L93 78L98 108L84 109Z","#52757a");paw(c,90,115,"#9db2a4",15);
    c.save();c.translate(0,bob);
    shape(c,"M26 57Q38 43 57 47L76 49L89 60L95 82L84 95L53 92L30 86L22 73Z",grad(c,25,47,64,45,"#849f96","#527b7a","#294c59"),INK,1.4);
    line(c,"M29 62L36 59L34 67L41 65M32 74L39 73L36 80M48 48L51 56L56 52", "#abc1ad",.8);
    // A layered shoulder mane makes the head and neck feel weighty.
    shape(c,"M75 45L85 41L103 51L108 66L105 80L111 83L102 88L101 97L91 92L84 99L81 90L70 91L73 80L64 78L69 68L64 60L73 57Z",grad(c,66,43,42,51,"#e3dfc0","#9cb8a6","#5f8e86"),INK,1.3);
    line(c,"M72 58L78 66L75 74M78 77L81 86L85 80M97 78L96 89L101 84", "#4b7a72",.8);
    // Erect ears, broad cheek fur, a black nose and warm alert eyes.
    shape(c,"M74 39L71 15L78 20L88 37Z",grad(c,73,18,15,20,"#78978e","#3a6268"),INK,1.1);
    shape(c,"M94 37L100 13L108 19L106 44Z",grad(c,99,15,9,27,"#a0b6a3","#5a8278"),INK,1.1);
    shape(c,"M76 23L76 34L82 35Z M102 22L99 35L104 34Z","#b0a98c",null);
    shape(c,"M77 35L93 29L105 37L111 50L108 68L97 78L82 73L72 59L71 46Z",grad(c,73,32,37,43,"#a9c1ad","#71978b","#3c6766"),INK,1.3);
    shape(c,"M73 47L65 53L72 60L67 64L80 69L85 62L81 51Z M106 46L118 51L113 57L119 61L107 68L102 60Z","#d5dbc0",INK,.8);
    eye(c,82,48,1,"#d7a35e");eye(c,102,47,-1,"#d7a35e");
    shape(c,"M85 53L98 51L108 60L104 71L94 77L82 69L80 61Z",grad(c,81,53,26,23,"#eae4c6","#b8c5ad"),INK,.8);
    shape(c,"M88 56L100 55L103 60L96 65L89 62Z","#263e45",INK,.7);
    line(c,"M96 64V68M96 68Q91 73 85 68M96 68Q102 72 105 66",INK,.8);
    oval(c,91,58,2,.7,"#9bb2a4");line(c,"M82 65L72 65M105 63L116 62",IVORY,.6);
    shape(c,"M72 76L84 81L103 78L107 71L110 78L101 87L85 90L73 84Z",RED,GOLD,1);
    // The jade bell and cloud-collar identify the gate's night guardian.
    oval(c,92,88,5,6,grad(c,88,83,9,11,"#e6d59f","#9e9769"),INK,.8);line(c,"M88 90L97 90M92 90V93",INK,.7);
    shape(c,"M79 34L88 28L98 30L103 35L91 39Z",GOLD,INK,.8);seal(c,91,34,3.2,IVORY);
    c.restore();
    shape(c,"M25 83L40 87L37 109L24 109Z",grad(c,25,83,14,25,"#86a99a","#426c69"));paw(c,31,116,"#cbd7bd",16);
    shape(c,"M66 87L79 88L80 109L66 109Z",grad(c,66,87,13,22,"#adc3ac","#6a9285"));paw(c,73,116,"#e1dfc3",16);
    line(c,"M26 101L37 102M67 101L78 102",GOLD,1.5);
  }

  function pig(c, phase) {
    const sway=Math.sin(phase)*2,bob=Math.sin(phase)*.8;
    shadow(c,64,45);
    line(c,`M28 73Q10 74 11 ${61+sway}Q14 ${53+sway} 20 59Q25 67 17 68`,INK,5);
    line(c,`M28 73Q10 74 11 ${61+sway}Q14 ${53+sway} 20 59Q25 67 17 68`,"#8b8270",2.8);
    shape(c,"M33 83L47 84L45 106L32 108Z","#5e6458");hoof(c,38,115,"#2d3e3d",14);
    shape(c,"M84 82L97 82L101 107L87 109Z","#6b7462");hoof(c,94,115,"#34483f",14);
    c.save();c.translate(0,bob);
    // A low, heavy boar torso; the bristles form a jagged ridge along its back.
    shape(c,"M27 49L32 35L38 40L43 29L50 37L57 27L63 37L69 31L76 43L87 47L97 65L95 85L83 99L48 96L29 89L20 72Z",grad(c,22,38,71,58,"#a1a18a","#707e6b","#3c584e"),INK,1.5);
    line(c,"M35 41L40 48M47 37L51 47M59 35L62 47M71 39L74 49", "#c4bc93",.9);
    // Bronze ritual armor follows the curved back and flank.
    shape(c,"M32 47L62 41L80 50L84 68L72 83L45 84L30 70Z",grad(c,31,43,52,40,"#c4b079","#8d9064","#596e55"),INK,1.2);
    shape(c,"M37 51L61 47L75 54L78 67L68 77L46 78L36 67Z",null,GOLD,1);cloud(c,56,63,.83,"#455f4e");
    for(const [x,y] of [[35,51],[64,45],[77,54],[79,69],[68,80],[44,80],[32,69]])oval(c,x,y,1.5,1.5,GOLD,INK,.5);
    shape(c,"M35 84L75 83L81 91L69 98L43 96L31 89Z",RED,GOLD,.8);seal(c,57,91,4);
    // Small eyes above a huge snout, two sweeping tusks and folded ears.
    shape(c,"M76 51L71 32L83 35L91 49Z",grad(c,73,34,15,18,"#a7a58a","#657c67"),INK,1);
    shape(c,"M96 48L106 31L116 35L110 54Z",grad(c,103,32,11,22,"#b9b391","#79866c"),INK,1);
    shape(c,"M77 39L80 48L86 48Z M108 37L103 47L110 46Z","#aa9580",null);
    shape(c,"M78 44L97 40L110 49L116 68L110 88L98 99L82 94L73 81L69 62Z",grad(c,72,42,42,55,"#b7b69b","#88957c","#4e6c5b"),INK,1.4);
    shape(c,"M76 46L91 39L104 44L107 53L96 58L81 55Z",grad(c,77,42,29,15,"#d5bd83","#9b9669"),INK,.9);cloud(c,92,49,.35,"#546a50");
    eye(c,82,62,1,"#c79b55");eye(c,106,61,-1,"#c79b55");
    line(c,"M75 58L85 57M100 57L110 56",INK,1.4);
    shape(c,"M84 69Q99 62 115 71L121 82L115 93L102 98L86 92L80 80Z",grad(c,83,69,36,27,"#bdb49a","#968d76","#6e7760"),INK,1.2);
    shape(c,"M91 74Q105 68 117 76L119 85Q111 94 98 90L89 84Z",grad(c,89,74,30,18,"#c9b69c","#a28d77"),INK,.9);
    oval(c,98,81,3,4.5,"#4a5147",INK,.6);oval(c,111,80,2.7,4.2,"#4a5147",INK,.6);
    line(c,"M87 88Q99 99 113 91",INK,.9);
    shape(c,"M84 88Q70 84 71 66L76 70Q77 79 88 79Z",grad(c,71,67,17,21,IVORY,"#c6bd94"),INK,1);
    shape(c,"M111 89Q125 82 122 65L118 71Q119 78 109 81Z",grad(c,110,66,12,24,IVORY,"#bfb98f"),INK,1);
    line(c,"M74 72Q76 80 82 82M120 72L116 80",GOLD,.7);
    line(c,"M75 77L71 80M79 83L75 88", "#d2ccab",.7);
    tassel(c,72,85,sway,RED,18);c.restore();
    shape(c,"M24 86L40 89L37 108L23 108Z",grad(c,24,86,16,22,"#99a186","#546f5b"));hoof(c,30,116,"#35483e",16);
    shape(c,"M66 91L81 91L83 109L68 109Z",grad(c,68,91,15,18,"#afaf91","#75876b"));hoof(c,75,116,"#35483e",16);
    line(c,"M25 102L37 103M69 104L81 104",GOLD,1.7);
  }

  // Every spirit has an independent silhouette and limb layout.
  const painters = { rat, ox, tiger, rabbit, dragon, snake, horse, goat, monkey, rooster, dog, pig };
  function render(ctx, id, step = 0) {
    const paint = painters[id];
    if (!paint) throw new Error(`Unknown zodiac guardian: ${id}`);
    ctx.save(); paint(ctx, (step % FRAMES) / FRAMES * Math.PI * 2); ctx.restore();
  }
  function install(scene) {
    for(const [id, spec] of Object.entries(bosses)) {
      const sheet=document.createElement("canvas");sheet.width=frameSize*FRAMES;sheet.height=frameSize;
      const ctx=sheet.getContext("2d");
      for(let frame=0;frame<FRAMES;frame++) {
        ctx.save();ctx.translate(frame*frameSize,0);ctx.beginPath();ctx.rect(0,0,frameSize,frameSize);ctx.clip();ctx.scale(2,2);
        render(ctx,id,frame);ctx.restore();
      }
      if(scene.anims.exists(spec.animation)) scene.anims.remove(spec.animation);
      if(scene.textures.exists(spec.texture)) scene.textures.remove(spec.texture);
      scene.textures.addSpriteSheet(spec.texture,sheet,{frameWidth:frameSize,frameHeight:frameSize,endFrame:FRAMES-1});
      scene.anims.create({key:spec.animation,frames:scene.anims.generateFrameNumbers(spec.texture,{start:0,end:FRAMES-1}),frameRate:spec.frameRate,repeat:-1});
    }
  }
  window.LiangyiZodiacArt=Object.freeze({install,frameSize,footBaseline,render,bosses});
})();
