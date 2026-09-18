/**
 * Pinloop.ai Dithered Lamp Cell Field Animation
 * Adapted from Pinloop's authentic hero canvas engine
 */
(function (global) {
  function initHeroField() {
    const cv = document.getElementById('plane');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    const FIELD_DESIGN_W = 1440;
    const FIELD_DESIGN_H = 880;
    const FIELD_REAL_TO_DESIGN_REF = 1300;
    const FIELD_PHONE_MAX = 639;

    let XD = 1, YD = 1, VS = 1, WD = FIELD_DESIGN_W, TZ0 = 60, TZ1 = 380, TZW = 0.45, TZC = 0.92;
    let TZX = 1, TZC_H = 0.92, TZR = 40;
    let YB0 = 555, YBS = 270, YBA = 80, YBF = 95, YBJ = 48, YBG = 22, YT = 1;
    let SR0 = 0.25, SR1 = 0.75;
    let CELL = 9;
    let lastCanvasW = -1, lastCanvasH = -1;
    let rafId = null;

    // Permutation table for 3D gradient noise
    const P = new Uint8Array(512);
    (function () {
      const p = [];
      for (let i = 0; i < 256; i++) p[i] = i;
      let s = 1337;
      for (let i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
      for (let i = 0; i < 512; i++) P[i] = p[i & 255];
    })();

    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);

    function grad(h, x, y, z) {
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }

    function noise(x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
      return lerp(
        lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u),
             lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
        lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u),
             lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v),
        w
      );
    }

    function fbm(x, y, z) {
      return 0.55 * noise(x, y, z) + 0.28 * noise(x * 2.1, y * 2.1, z * 1.3) + 0.17 * noise(x * 4.3, y * 4.3, z * 1.7);
    }

    function hash(i, j) {
      let h = (i * 374761393 + j * 668265263) | 0;
      h = (h ^ (h >>> 13)) * 1274126177 | 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    // Pinloop authentic color spectrum (cobalt, royal, azure, indigo, violet, purple, orchid)
    const HUES = [
      [10, 30, 255],
      [20, 80, 255],
      [0, 130, 255],
      [90, 60, 255],
      [140, 60, 255],
      [185, 80, 255],
      [220, 110, 255]
    ];

    function mix(a, b, u) {
      return [
        (a[0] + (b[0] - a[0]) * u) | 0,
        (a[1] + (b[1] - a[1]) * u) | 0,
        (a[2] + (b[2] - a[2]) * u) | 0
      ];
    }

    function hueAt(h) {
      const f = h * (HUES.length - 1);
      const i = Math.min(HUES.length - 2, Math.floor(f));
      return mix(HUES[i], HUES[i + 1], f - i);
    }

    function ramp(v, hue) {
      if (v < 0.45) {
        const u = v / 0.45;
        return mix([2, 6, 30], hue, u * u);
      }
      const u = (v - 0.45) / 0.55;
      return mix(hue, [200, 225, 255], u * u * u);
    }

    function resize() {
      const trueDpr = window.devicePixelRatio || 1;
      const box = cv.getBoundingClientRect();
      const phone = window.innerWidth <= FIELD_PHONE_MAX;
      const real = phone ? 1 : window.innerWidth / FIELD_REAL_TO_DESIGN_REF;

      W = phone ? Math.round(box.width) : FIELD_DESIGN_W;
      H = Math.round(box.height / real);

      if (phone) {
        VS = 0.9;
        XD = FIELD_DESIGN_W / W;
        YD = FIELD_DESIGN_H / H;
        WD = FIELD_DESIGN_W;
        TZ0 = 40;
        TZ1 = 280;
        TZW = 0.9;
        TZC = 0.95;
        TZX = 0;
        TZC_H = 0.85;
        TZR = 50;
        YB0 = 420;
        YBS = 0;
        YBA = 40;
        YBF = 80;
        YBJ = 24;
        YBG = 18;
        YT = 1.2;
        SR0 = 0.9;
        SR1 = 0.1;
        CELL = 7;
      } else {
        XD = 1;
        YD = 1;
        VS = 1;
        WD = W;
        TZ0 = 60;
        TZ1 = 380;
        TZW = 0.42;
        TZC = 0.92;
        TZX = 1;
        TZC_H = 0.92;
        TZR = 40;
        YB0 = 540;
        YBS = 260;
        YBA = 75;
        YBF = 90;
        YBJ = 42;
        YBG = 22;
        YT = 1;
        CELL = 9;
        SR0 = 0.25;
        SR1 = 0.75;
      }

      const dpr = Math.min(trueDpr * real, 2);
      const cw = Math.round(W * dpr);
      const ch = Math.round(H * dpr);

      if (cw === lastCanvasW && ch === lastCanvasH) return false;
      lastCanvasW = cw;
      lastCanvasH = ch;
      cv.width = cw;
      cv.height = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function draw(timeSec) {
      ctx.clearRect(0, 0, W, H);
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);
      const cx = W / 2;
      const R = CELL * 0.36;

      const ybCol = new Float32Array(cols);
      for (let i = 0; i < cols; i++) {
        const x = i * CELL + CELL / 2;
        const dxc = Math.abs((x - cx) / (W / 2));
        const px = YB0 + YBS * Math.pow(dxc, 1.5)
                 + YBA * fbm(x / YBF + 3.3, 8.1, timeSec * 0.02)
                 + YBJ * noise(x / YBG, 2.2, timeSec * 0.03);
        ybCol[i] = px * VS / H;
      }

      ctx.globalCompositeOperation = 'lighter';

      for (let j = 0; j < rows; j++) {
        const y = j * CELL + CELL / 2;
        const vy = y / H;
        if (vy > 1) break;

        for (let i = 0; i < cols; i++) {
          const yb = ybCol[i];
          if (vy > yb) continue;

          const down = vy / yb;
          const ease = Math.min(1, (1 - down) / 0.5);
          const topFall = Math.pow(Math.max(0, 1 - down), 0.45) * ease * ease * (3 - 2 * ease);

          const x = i * CELL + CELL / 2;
          const dx = (x - cx) / (W / 2);
          const xd = x * XD;
          const yd = y * YD;
          const sideRise = Math.pow(Math.abs(dx), 1.3);

          let mask = Math.min(1, topFall * (SR0 + SR1 * sideRise) * 1.3 + Math.pow(Math.max(0, 1 - vy / 0.2), 2) * 0.4);
          mask *= Math.min(1, Math.max(0.06, (890 - yd * YT) / 495));

          // Headline & pitch clear zone
          const tz = (TZX ? Math.exp(-Math.pow(dx / TZW, 2)) : 1)
                   * Math.min(1, Math.max(0, (yd - TZ0) / TZR))
                   * Math.min(1, Math.max(0, (TZ1 - yd) / TZR));
          mask *= 1 - TZC_H * tz;

          if (mask < 0.02) continue;

          const tk = Math.floor(timeSec * 20) / 20;
          const n = fbm(x / 290 + tk * 0.06, y / 290 + tk * 0.018, tk * 0.13);
          const jit = (hash(i, j) - 0.5) * 0.34;
          let v = (n + 0.05 + jit) * 2.4 * mask;

          if (down > 0.34 && hash(j * 7, i * 3) > topFall * 1.3) v = 0;

          if (v <= 0) {
            if (mask > 0.6 && n + jit > -0.08 && hash(j, i) < topFall * 1.2) {
              const g = CELL / 9;
              ctx.fillStyle = 'rgba(2, 6, 30, 0.45)';
              ctx.fillRect(i * CELL, j * CELL + g, CELL - 0.6 * g, CELL - 2 * g);
            }
            continue;
          }

          if (v > 1) v = 1;
          v = Math.ceil(v * 6) / 6;

          let hv = (fbm(x / 190 + 11.7, y / 190 + 3.9, tk * 0.06) + 1) / 2;
          hv = Math.min(1, Math.max(0, (hv - 0.5) * 1.9 + 0.5));
          hv = Math.floor(hv * 7) / 6;

          const c = ramp(v, hueAt(hv));

          // Blooming hot lamps
          if (v > 0.5) {
            const h = R * (1.6 + 1.2 * (v - 0.5));
            const ha = 0.12 + 0.4 * (v - 0.5);
            ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${ha.toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(x, y, h, 0, Math.PI * 2);
            ctx.fill();
          }

          // Sharp core lamp
          ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
          const coreR = R * (0.45 + 0.55 * v);
          ctx.beginPath();
          ctx.arc(x, y, coreR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function loop(now) {
      if (document.hidden) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      draw(now / 1000);
      rafId = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => {
      resize();
    });

    resize();
    rafId = requestAnimationFrame(loop);
  }

  global.initHeroField = initHeroField;
})(window);
