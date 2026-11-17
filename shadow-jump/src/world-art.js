/* Original guofeng scenery. Painted once; reused as parallax textures. */
(() => {
  const palettes = {
    light: { sky: ['#102c35', '#416d70', '#9fb2a0'], moon: '#fff0bf', mist: '#b8d6bd', far: '#315e62', rock: '#315758', wall: '#456d64', roof: '#153d40', rim: '#b4b581' },
    shadow: { sky: ['#101b26', '#243d46', '#486260'], moon: '#d8e9d4', mist: '#9ec6bb', far: '#244248', rock: '#1d373e', wall: '#354c4e', roof: '#142c32', rim: '#ab765d' }
  };
  const TAU = Math.PI * 2;
  function canvas(scene, key, width, height, paint) {
    if (scene.textures.exists(key)) return;
    const surface = document.createElement('canvas');
    surface.width = width; surface.height = height;
    paint(surface.getContext('2d'));
    scene.textures.addCanvas(key, surface);
  }
  function polygon(c, points, fill) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fillStyle = fill; c.fill();
  }
  function line(c, points, color, width = 1) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  function cloud(c, x, y, scale, color, opacity = 1) {
    c.save(); c.translate(x, y); c.scale(scale, scale); c.globalAlpha *= opacity;
    c.fillStyle = color;
    c.beginPath(); c.moveTo(-120, 18);
    c.bezierCurveTo(-107, -6, -73, 1, -63, 4); c.bezierCurveTo(-58, -23, -18, -26, -8, -6);
    c.bezierCurveTo(12, -43, 69, -35, 75, -6); c.bezierCurveTo(104, -11, 126, 1, 128, 18); c.closePath(); c.fill();
    c.strokeStyle = color; c.lineWidth = 1; c.beginPath(); c.moveTo(-97, 27); c.lineTo(83, 27); c.stroke();
    c.restore();
  }
  function roof(c, x, y, width, height, p) {
    c.beginPath(); c.moveTo(x - width / 2 - 12, y + height * .68);
    c.bezierCurveTo(x - width * .3, y + height, x - width * .19, y + 4, x, y);
    c.bezierCurveTo(x + width * .19, y + 4, x + width * .3, y + height, x + width / 2 + 12, y + height * .68);
    c.lineTo(x + width / 2, y + height); c.lineTo(x - width / 2, y + height); c.closePath(); c.fillStyle = p.roof; c.fill();
    c.strokeStyle = p.rim; c.lineWidth = 1.5; c.stroke();
    for (let j = -3; j <= 3; j++) {
      line(c, [[x + j * width * .038, y + height * .24], [x + j * width * .13, y + height * .94]], `${p.rim}50`, .7);
    }
    line(c, [[x - 6, y], [x, y - 9], [x + 6, y]], p.rim, 1.4);
  }
  function palace(c, x, base, scale, p, floors = 2) {
    c.save(); c.translate(x, base); c.scale(scale, scale);
    const width = 140;
    c.fillStyle = p.wall; c.fillRect(-width / 2, -80, width, 80);
    c.fillStyle = p.roof; c.fillRect(-80, -9, 160, 9);
    for (let j = -2; j <= 2; j++) {
      c.fillStyle = p.roof; c.fillRect(j * 24 - 7, -63, 14, 46);
      c.fillStyle = `${p.rim}70`; c.fillRect(j * 24 - 5, -59, 10, 26);
      line(c, [[j * 24, -59], [j * 24, -33]], p.wall, 1.5);
      line(c, [[j * 24 - 5, -46], [j * 24 + 5, -46]], p.wall, 1.5);
    }
    roof(c, 0, -126, 186, 50, p);
    if (floors > 1) {
      c.fillStyle = p.wall; c.fillRect(-42, -174, 84, 52);
      for (let j = -1; j <= 1; j++) { c.fillStyle = p.roof; c.fillRect(j * 24 - 5, -166, 10, 33); }
      roof(c, 0, -212, 135, 43, p);
    }
    for (let j = -4; j <= 4; j++) { c.fillStyle = p.rim; c.fillRect(j * 21 - 1, -12, 2, 17); }
    line(c, [[-90, -10], [90, -10]], p.rim, 2);
    line(c, [[-90, 5], [90, 5]], p.roof, 5);
    c.restore();
  }
  function island(c, x, y, scale, p) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    polygon(c, [[-100, 0], [-79, 30], [-60, 27], [-21, 105], [-10, 48], [28, 90], [49, 32], [74, 24], [100, 0]], p.rock);
    polygon(c, [[-100, 0], [-67, -12], [41, -14], [100, 0], [30, 10], [-60, 10]], p.wall);
    line(c, [[-70, 18], [-39, 35], [-21, 88]], `${p.rim}45`);
    line(c, [[25, 18], [27, 71]], `${p.rim}45`);
    c.restore();
  }
  function crane(c, x, y, scale, color) {
    c.save(); c.translate(x, y); c.scale(scale, scale); c.strokeStyle = color; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-30, -6); c.quadraticCurveTo(-16, -9, -2, 3); c.quadraticCurveTo(9, -15, 24, -17); c.stroke();
    c.beginPath(); c.moveTo(-3, 3); c.lineTo(8, 4); c.lineTo(12, 1); c.lineTo(17, 2); c.stroke();
    line(c, [[-2, 4], [-17, 7]], color, 1); c.restore();
  }
  function lantern(c, x, y, s, red = true) {
    c.save(); c.translate(x, y); c.scale(s, s);
    line(c, [[0, -30], [0, -11]], '#a9aaa0', 1);
    const glow = c.createRadialGradient(0, 3, 0, 0, 3, 40);
    glow.addColorStop(0, red ? '#de674c28' : '#9ad9bc24'); glow.addColorStop(1, '#00000000');
    c.fillStyle = glow; c.fillRect(-40, -37, 80, 80);
    c.fillStyle = red ? '#9b493c' : '#5a8f82'; c.beginPath(); c.ellipse(0, 2, 10, 15, 0, 0, TAU); c.fill();
    c.fillStyle = red ? '#e4ad76' : '#bdd6ad'; c.fillRect(-5, -12, 10, 2); c.fillRect(-5, 16, 10, 2);
    line(c, [[-3, -9], [-5, 2], [-3, 14]], '#e1bb6b65');
    line(c, [[3, -9], [5, 2], [3, 14]], '#e1bb6b65');
    line(c, [[0, 18], [0, 30]], '#bc8a5f', 1.3); c.restore();
  }
  function gate(c, x, base, s, p) {
    c.save(); c.translate(x, base); c.scale(s, s);
    c.fillStyle = p.wall; c.fillRect(-72, -202, 15, 202); c.fillRect(57, -202, 15, 202);
    c.fillStyle = p.roof; c.fillRect(-84, -11, 37, 11); c.fillRect(47, -11, 37, 11);
    c.fillRect(-88, -178, 176, 13); c.fillRect(-102, -127, 204, 12);
    roof(c, 0, -235, 210, 54, p);
    roof(c, -100, -158, 74, 31, p); roof(c, 100, -158, 74, 31, p);
    c.fillStyle = '#243e3f'; c.fillRect(-33, -174, 66, 28);
    c.strokeStyle = p.rim; c.strokeRect(-31, -172, 62, 24);
    c.fillStyle = '#c4ad81'; c.textAlign = 'center'; c.font = '15px "Songti SC", serif'; c.fillText('鬼 門 關', 0, -154);
    lantern(c, -46, -122, 1.05); lantern(c, 46, -122, 1.05);
    line(c, [[-65, -184], [-65, -16]], `${p.rim}70`, 2);
    line(c, [[65, -184], [65, -16]], `${p.rim}70`, 2);
    c.restore();
  }
  function bridge(c, x, y, scale, p) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.beginPath(); c.moveTo(-185, 90); c.quadraticCurveTo(0, -56, 185, 90); c.lineTo(185, 113); c.quadraticCurveTo(0, -17, -185, 113); c.closePath(); c.fillStyle = p.wall; c.fill();
    c.beginPath(); c.moveTo(-185, 70); c.quadraticCurveTo(0, -76, 185, 70); c.strokeStyle = p.rim; c.lineWidth = 3; c.stroke();
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, bx = -185 + 370 * t, by = 90 - 292 * t * (1 - t);
      c.fillStyle = p.wall; c.fillRect(bx - 3, by - 24, 6, 27);
      c.fillStyle = p.rim; c.beginPath(); c.arc(bx, by - 26, 4, 0, TAU); c.fill();
    }
    c.restore();
  }
  function lycoris(c, x, y, s, shade = '#9a5149') {
    c.save(); c.translate(x, y); c.scale(s, s); line(c, [[0, 0], [1, -35]], '#648272', 1);
    c.strokeStyle = shade; c.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU;
      c.beginPath(); c.moveTo(1, -35); c.bezierCurveTo(Math.cos(a) * 18, -35 + Math.sin(a) * 12, Math.cos(a) * 14, -47 + Math.sin(a) * 13, Math.cos(a) * 9, -48 + Math.sin(a) * 15); c.stroke();
    }
    c.restore();
  }
  function sky(c, p, mode) {
    const gradient = c.createLinearGradient(0, 0, 0, 648);
    p.sky.forEach((color, i) => gradient.addColorStop(i / 2, color));
    c.fillStyle = gradient; c.fillRect(0, 0, 1152, 648);
    const glow = c.createRadialGradient(824, 139, 10, 824, 139, 255);
    glow.addColorStop(0, `${p.moon}35`); glow.addColorStop(1, `${p.moon}00`);
    c.fillStyle = glow; c.fillRect(0, 0, 1152, 648);
    c.fillStyle = p.moon; c.beginPath(); c.arc(824, 139, mode === 'light' ? 43 : 52, 0, TAU); c.fill();
    c.strokeStyle = `${p.moon}32`; c.lineWidth = 1; c.beginPath(); c.arc(824, 139, 64, 0, TAU); c.stroke();
    for (let i = 0; i < 54; i++) {
      const x = (i * 157.73 + 32) % 1152, y = (i * 73.17 + 21) % 320;
      c.globalAlpha = .08 + i % 5 * .035; c.fillStyle = p.moon; c.beginPath(); c.arc(x, y, .8, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    // Broken mineral ridges recall ink-and-wash landscape paintings.
    for (let layer = 0; layer < 3; layer++) {
      const points = [[-30, 648]];
      for (let x = -30; x <= 1200; x += 30) points.push([x, 340 + layer * 85 + Math.sin(x * .008 + layer * 2) * 61 + Math.sin(x * .035 + layer) * 24]);
      points.push([1200, 648]); polygon(c, points, [p.far, `${p.rock}b0`, `${p.sky[0]}72`][layer]);
      cloud(c, 160 + layer * 420, 390 + layer * 65, 2.4, p.mist, .06);
    }
    if (mode === 'light') {
      c.globalAlpha = .62;
      island(c, 280, 293, .74, p); palace(c, 280, 286, .61, p, 2);
      island(c, 980, 382, .6, p); palace(c, 980, 376, .46, p, 1);
      c.globalAlpha = .29; island(c, 626, 282, .37, p); palace(c, 626, 277, .3, p, 2);
      c.globalAlpha = 1;
      cloud(c, 282, 328, 2, p.mist, .2); cloud(c, 618, 299, 1.5, p.mist, .15);
      crane(c, 685, 169, .7, '#cbd4b4'); crane(c, 720, 190, .4, '#cbd4b4'); crane(c, 669, 203, .36, '#cbd4b4');
      cloud(c, 70, 156, 1.55, '#c9cfac', .1); cloud(c, 1044, 227, 1.75, '#c9cfac', .13);
    } else {
      c.globalAlpha = .4; bridge(c, 650, 382, 1.4, p); gate(c, 275, 436, .66, p); c.globalAlpha = 1;
      for (let i = 0; i < 14; i++) lantern(c, 48 + i * 82, 277 + Math.sin(i * 1.7) * 57, .26 + i % 3 * .08, i % 3 !== 0);
      cloud(c, 250, 466, 2.8, p.mist, .13); cloud(c, 865, 493, 3.1, p.mist, .11);
      for (let i = 0; i < 28; i++) lycoris(c, i * 44, 644 + Math.sin(i * 2.3) * 14, 1.3 + i % 4 * .16, '#92514985');
    }
    const veil = c.createLinearGradient(0, 420, 0, 648); veil.addColorStop(0, '#0b232800'); veil.addColorStop(1, '#0b232890'); c.fillStyle = veil; c.fillRect(0, 420, 1152, 228);
  }
  function ruins(c, p, mode) {
    if (mode === 'light') {
      [170, 650, 1195, 1690].forEach((x, i) => {
        const y = 365 + Math.sin(i * 3) * 52, scale = .8 + i % 2 * .22;
        c.globalAlpha = .48; island(c, x, y, scale * 1.5, p); palace(c, x, y - 6, scale, p, i % 2 + 1);
        c.globalAlpha = .23; cloud(c, x, y + 57, 2.1, p.mist);
      });
      c.globalAlpha = .22;
      for (let i = 0; i < 9; i++) cloud(c, i * 270 - 40, 555 + Math.sin(i * 2.5) * 34, 2.1, p.mist);
    } else {
      c.globalAlpha = .66; gate(c, 220, 435, 1.1, p); gate(c, 1515, 472, .9, p);
      c.globalAlpha = .52; bridge(c, 835, 361, 1.8, p);
      for (let i = 0; i < 9; i++) {
        const x = 50 + i * 215, y = 445 + Math.sin(i * 2.9) * 46;
        c.globalAlpha = .55; line(c, [[x, y + 120], [x, y - 32], [x + 34, y - 32]], p.wall, 4);
        lantern(c, x + 31, y, .85, i % 3 !== 0);
      }
      c.globalAlpha = .7;
      for (let i = 0; i < 49; i++) lycoris(c, i * 40 + (i % 3) * 9, 612 + Math.sin(i * 3.1) * 25, 1 + i % 4 * .18);
      for (let i = 0; i < 7; i++) cloud(c, i * 340, 560 + Math.sin(i * 2) * 22, 2.2, p.mist, .09);
    }
    c.globalAlpha = 1;
  }
  window.ShadowJumpWorldArt = {
    install(scene) {
      Object.entries(palettes).forEach(([mode, palette]) => {
        canvas(scene, `world-${mode}`, 1152, 648, c => sky(c, palette, mode));
        canvas(scene, `ruins-${mode}`, 1920, 720, c => ruins(c, palette, mode));
      });
    }
  };
})();
