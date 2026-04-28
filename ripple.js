// ============================================================
// 水波纹物理模拟 — 连续水面效果（独立模块）
// 在页面中添加 <canvas id="ripple-canvas"></canvas> 即可启用
// ============================================================

(function () {
  'use strict';

  const canvas = document.getElementById('ripple-canvas');
  const ctx = canvas && canvas.getContext('2d');

  if (!canvas || !ctx) return;

  // ---- 物理参数 ----
  const DAMPING = 0.988;    // 更大阻尼，波纹消退更快

  // ---- 网格分辨率（根据屏幕自适应） ----
  // 注意：canvas 尺寸 = window.innerWidth（CSS 像素），
  // getBoundingClientRect 返回 CSS 像素尺寸，坐标映射 1:1。
  // 无需换算 devicePixelRatio。
  let RES = 8;
  function updateRes() {
    RES = window.innerWidth < 768 ? 12 : 8;
  }

  let cols, rows;
  // 三缓冲 Verlet 方案：
  // prev = h(t-1), cur = h(t), next = h(t+1)
  let prev, cur, next;

  // ---- 点击涟漪光晕数组 ----
  let clickRipples = [];

  // ---- 自适应尺寸 ----
  function resize() {
    updateRes();
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / RES) + 2;
    rows = Math.floor(canvas.height / RES) + 2;
    const total = cols * rows;
    prev = new Float32Array(total);
    cur  = new Float32Array(total);
    next = new Float32Array(total);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- 在鼠标/触摸位置产生涟漪 ----
  function splashAt(x, y, strength, radiusMultiplier) {
    if (radiusMultiplier === undefined) radiusMultiplier = 1;
    const col = Math.round(x / RES);
    const row = Math.round(y / RES);
    const radius = Math.round(4 * radiusMultiplier);
    for (let di = -radius; di <= radius; di++) {
      for (let dj = -radius; dj <= radius; dj++) {
        const ci = col + di;
        const rj = row + dj;
        if (ci >= 1 && ci < cols - 1 && rj >= 1 && rj < rows - 1) {
          const dist = Math.sqrt(di * di + dj * dj);
          if (dist <= radius) {
            const factor = 1 - dist / radius;
            // 写入 cur 缓冲区，作为当前高度位移
            cur[ci + rj * cols] += strength * factor * factor;
          }
        }
      }
    }
  }

  // ---- 统一指针事件（Pointer Events） ----
  // canvas 保持 pointer-events: none，事件绑在 document 上
  let lastPointerX = -9999, lastPointerY = -9999;

  function getCanvasXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  document.addEventListener('pointerdown', function (e) {
    const xy = getCanvasXY(e.clientX, e.clientY);
    splashAt(xy.x, xy.y, 1.5, 1.2);
    clickRipples.push({
      x: xy.x, y: xy.y,
      radius: 0,
      maxRadius: 30 + Math.random() * 15,
      life: 0.8
    });
    lastPointerX = xy.x;
    lastPointerY = xy.y;
  });

  document.addEventListener('pointermove', function (e) {
    const xy = getCanvasXY(e.clientX, e.clientY);
    lastPointerX = xy.x;
    lastPointerY = xy.y;
    // 只有鼠标按住拖动（左键）才产生波纹
    if (e.buttons !== 1) return;
    splashAt(xy.x, xy.y, 0.4, 0.8);
  });

  document.addEventListener('pointerup', function () {
    lastPointerX = -9999;
    lastPointerY = -9999;
  });

  document.addEventListener('pointerleave', function () {
    lastPointerX = -9999;
    lastPointerY = -9999;
  });

  document.addEventListener('pointercancel', function () {
    lastPointerX = -9999;
    lastPointerY = -9999;
  });

  // ---- 自动涟漪（让水面始终有波动） ----
  let autoTimer = 0;
  function autoSplash() {
    var x = Math.random() * canvas.width;
    var y = Math.random() * canvas.height;
    splashAt(x, y, 0.3 + Math.random() * 0.3);
  }

  // ---- 波动传播（标准 Verlet 二维水波） ----
  // 正确公式：newValue = (邻居和 × 0.5 - oldValue) × damping
  // prev = h(t-1), cur = h(t), next = h(t+1)
  function updateWaves() {
    for (var i = 1; i < cols - 1; i++) {
      for (var j = 1; j < rows - 1; j++) {
        var idx = i + j * cols;
        // 从 cur(t) 取邻居，从 prev(t-1) 取旧值
        var val = (
          cur[(i - 1) + j * cols] +
          cur[(i + 1) + j * cols] +
          cur[i + (j - 1) * cols] +
          cur[i + (j + 1) * cols]
        ) * 0.5 - prev[idx];
        next[idx] = val * DAMPING;
      }
    }
    // 旋转缓冲区：prev ← cur, cur ← next, next 复用旧的 prev（已被清理）
    var tmp = prev;
    prev = cur;
    cur  = next;
    next = tmp;
    // 清理「新的 next」边界行，确保不会残留异常值
    for (var i = 0; i < cols; i++) {
      next[i] = 0;                                          // 上边界
      next[i + (rows - 1) * cols] = 0;                     // 下边界
    }
    for (var j = 1; j < rows - 1; j++) {
      next[0 + j * cols] = 0;                               // 左边界
      next[(cols - 1) + j * cols] = 0;                      // 右边界
    }
  }

  // ---- 渲染 ----
  function draw() {
    var isMobile = window.innerWidth < 768;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景渐变（深邃的水底感）
    var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#b0e4f8');
    grad.addColorStop(0.4, '#78c8e8');
    grad.addColorStop(1, '#4080b0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ---- 绘制连续水面（网格四边形） ----
    for (var i = 0; i < cols - 1; i++) {
      for (var j = 0; j < rows - 1; j++) {
        var h00 = cur[i + j * cols];
        var h10 = cur[(i + 1) + j * cols];
        var h01 = cur[i + (j + 1) * cols];
        var h11 = cur[(i + 1) + (j + 1) * cols];

        var avgH = (h00 + h10 + h01 + h11) * 0.25;
        var norm = Math.max(-1, Math.min(1, avgH));

        // === 增强色彩映射 ===
        // 波峰 → 亮白；波谷 → 深蓝
        var lightness, sat;
        if (norm > 0) {
          lightness = 55 + norm * 40;    // 55% → 95%
          sat = 75 - norm * 50;          // 75% → 25%（偏白）
        } else {
          lightness = 55 + norm * 30;    // 55% → 25%（变暗）
          sat = 75 + Math.abs(norm) * 15; // 75% → 90%（更饱和）
        }

        ctx.fillStyle = 'hsl(198, ' + sat + '%, ' + lightness + '%)';
        ctx.globalAlpha = 0.5 + Math.abs(norm) * 0.4;

        // 折射偏移（波高扭曲顶点，模拟水面起伏）
        var shiftScale = 1.5;
        var shift00 = h00 * shiftScale;
        var shift10 = h10 * shiftScale;
        var shift01 = h01 * shiftScale;
        var shift11 = h11 * shiftScale;

        var x = i * RES;
        var y = j * RES;

        ctx.beginPath();
        ctx.moveTo(x + shift00, y + shift00);
        ctx.lineTo(x + RES + shift10, y + shift10);
        ctx.lineTo(x + RES + shift11, y + RES + shift11);
        ctx.lineTo(x + shift01, y + RES + shift01);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ---- 波峰白色高光线 ----
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1.5;
    for (var j = 1; j < rows; j += 2) {
      ctx.beginPath();
      for (var i = 0; i < cols; i++) {
        var h = cur[i + j * cols];
        var sx = i * RES;
        var sy = j * RES + h * 4;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // ---- 镜面高光（波峰光点） ----
    // 移动端步进更大，绘制更少高光
    var step = isMobile ? 3 : 2;
    for (var i = step; i < cols - step; i += step) {
      for (var j = step; j < rows - step; j += step) {
        var h = cur[i + j * cols];
        if (h > 0.25) {
          var intensity = Math.min(1, h * 0.5);
          var sx = i * RES + h * 3;
          var sy = j * RES + h * 3;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 + intensity * 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (intensity * 0.4) + ')';
          ctx.fill();
        }
      }
    }

    // ---- 点击涟漪光晕（扩散动画） ----
    for (var r = clickRipples.length - 1; r >= 0; r--) {
      var rip = clickRipples[r];
      rip.radius += (rip.maxRadius - rip.radius) * 0.06;
      rip.life -= 0.015;

      if (rip.life <= 0) {
        clickRipples.splice(r, 1);
        continue;
      }

      // 外圈光晕
      var g = ctx.createRadialGradient(
        rip.x, rip.y, 0,
        rip.x, rip.y, rip.radius
      );
      g.addColorStop(0, 'rgba(255, 255, 255, ' + (rip.life * 0.2) + ')');
      g.addColorStop(0.4, 'rgba(200, 230, 255, ' + (rip.life * 0.08) + ')');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.fill();

      // 内圈亮斑
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + (rip.life * 0.25) + ')';
      ctx.fill();
    }

    // ---- 指针位置微弱光晕 ----
    if (lastPointerX >= 0 && lastPointerY >= 0) {
      var pr = 16;
      var pg = ctx.createRadialGradient(
        lastPointerX, lastPointerY, 0,
        lastPointerX, lastPointerY, pr
      );
      pg.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      pg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(lastPointerX, lastPointerY, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- 主循环 ----
  function animate(time) {
    updateWaves();

    if (!autoTimer || time - autoTimer > 1500) {
      autoSplash();
      autoTimer = time;
    }

    draw();
    requestAnimationFrame(animate);
  }

  animate(0);
})();
