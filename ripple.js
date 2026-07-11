// ============================================================
// 水波纹物理模拟 — 连续水面效果（独立模块）
// 在页面中添加 <canvas id="ripple-canvas"></canvas> 即可启用
// ============================================================

(function () {
  'use strict';

  const canvas = document.getElementById('ripple-canvas');
  const mainCtx = canvas && canvas.getContext('2d');

  if (!canvas || !mainCtx) return;

  // ==========================================================
  // 集中配置参数
  // ==========================================================
  const CONFIG = {
    // ---- 物理参数 ----
    damping: 0.988,

    // ---- 网格分辨率（CSS 像素单位） ----
    desktopRes: 8,
    mobileRes: 12,
    mobileBreakpoint: 768,

    // ---- 渲染 ----
    desktopRenderScale: 2,
    mobileRenderScale: 2,
    maxDpr: 1.5,

    // ---- splashAt 基础半径 ----
    splashBaseRadius: 4,

    // ---- 输入：点击 ----
    clickStrength: 1.2,
    clickRadiusMultiplier: 1.1,

    // ---- 输入：拖动 ----
    dragStrength: 0.25,
    dragRadiusMultiplier: 0.6,
    dragTimeThrottle: 30,       // ms
    dragDistThrottle: 12,       // CSS 像素

    // ---- 自动扰动 ----
    autoRippleMinInterval: 1200,    // ms
    autoRippleIntervalRange: 2600,  // ms
    autoRippleStrengthMin: 0.08,
    autoRippleStrengthMax: 0.22,
    // 移动端（覆盖）
    mobileAutoRippleMinInterval: 5000,
    mobileAutoRippleIntervalRange: 3000,
    mobileAutoRippleStrengthMin: 0.04,
    mobileAutoRippleStrengthMax: 0.12,

    // ---- 光照 ----
    lightX: 0.22,
    lightY: -0.18,
    lightZ: 0.96,
    normalStrength: 1.6,
    ambientLight: 0.40,
    diffuseStrength: 0.50,

    // ---- 水面颜色（暗/亮双色插值，替代单一基色乘法） ----
    darkWaterR: 55,
    darkWaterG: 135,
    darkWaterB: 175,

    lightWaterR: 155,
    lightWaterG: 215,
    lightWaterB: 235,

    waterAlpha: 175,

    // ---- 背景渐变 ----
    gradientTop: '#b0e4f8',
    gradientMid: '#78c8e8',
    gradientBottom: '#4080b0',

    // ---- 时间步进 ----
    fixedStep: 1 / 60,
    maxDelta: 0.1,
    maxStepsPerFrame: 6,

    // ---- resize 防抖 ----
    resizeDebounce: 150     // ms
  };

  // ---- 预计算光照方向 ----
  const lightLen = Math.sqrt(
    CONFIG.lightX * CONFIG.lightX +
    CONFIG.lightY * CONFIG.lightY +
    CONFIG.lightZ * CONFIG.lightZ
  );
  const lightNormX = CONFIG.lightX / lightLen;
  const lightNormY = CONFIG.lightY / lightLen;
  const lightNormZ = CONFIG.lightZ / lightLen;

  // ==========================================================
  // 尺寸系统（四种尺寸独立管理）
  // ==========================================================
  let cssW, cssH;          // 尺寸 1：CSS 显示尺寸
  let canvasW, canvasH;    // 尺寸 2：主 Canvas 设备像素尺寸
  let dpr;                 // 设备像素比（≤ maxDpr）
  let cols, rows;          // 尺寸 3：模拟网格尺寸（CSS 像素单位）
  let bufferW, bufferH;    // 尺寸 4：低分辨率着色缓冲尺寸
  let renderScale;         // 着色缓冲比例
  let RES;                 // 物理网格分辨率（CSS 像素单位）
  let isMobile;            // 是否移动端

  // 离屏 Canvas
  let offCanvas;
  let offCtx;

  // 模拟缓冲（三缓冲 + 梯度，仅 resize 时分配）
  let prev, cur, next;
  let gradientX, gradientY;

  // ImageData 复用
  let imageData;

  // 背景渐变缓存（仅在尺寸变化时重建）
  let backgroundGradient = null;

  // ==========================================================
  // 动画状态
  // ==========================================================
  let animationId = null;
  let lastTimestamp = 0;
  let accumulator = 0;
  let paused = false;          // visibility 暂停
  let reducedMotion = false;   // prefers-reduced-motion

  // ==========================================================
  // 输入状态
  // ==========================================================
  let activePointerId = null;    // 当前拖动指针 ID（鼠标/触控笔）
  let isDragging = false;
  let lastDragTime = 0;
  let lastDragSplashX = -1;
  let lastDragSplashY = -1;

  // ==========================================================
  // 自动扰动状态
  // ==========================================================
  let nextAutoRippleTime = 0;  // 下一次自动扰动的时间戳（ms）

  // ==========================================================
  // 尺寸初始化
  // ==========================================================
  function updateAllSizes() {
    cssW = window.innerWidth;
    cssH = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr);

    canvasW = Math.round(cssW * dpr);
    canvasH = Math.round(cssH * dpr);

    isMobile = cssW < CONFIG.mobileBreakpoint;
    RES = isMobile ? CONFIG.mobileRes : CONFIG.desktopRes;
    renderScale = isMobile ? CONFIG.mobileRenderScale : CONFIG.desktopRenderScale;

    cols = Math.floor(cssW / RES) + 2;
    rows = Math.floor(cssH / RES) + 2;

    bufferW = (cols - 2) * renderScale;
    bufferH = (rows - 2) * renderScale;
  }

  function setupCanvases() {
    updateAllSizes();

    canvas.width = canvasW;
    canvas.height = canvasH;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // 每次设置 width/height 后必须重设 transform
    mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mainCtx.imageSmoothingEnabled = true;

    if (bufferW > 0 && bufferH > 0) {
      offCanvas = document.createElement('canvas');
      offCanvas.width = bufferW;
      offCanvas.height = bufferH;
      offCtx = offCanvas.getContext('2d');
      imageData = offCtx.createImageData(bufferW, bufferH);
    }

    // 背景渐变缓存（仅在尺寸变化时重建）
    backgroundGradient = mainCtx.createLinearGradient(0, 0, 0, cssH);
    backgroundGradient.addColorStop(0, CONFIG.gradientTop);
    backgroundGradient.addColorStop(0.4, CONFIG.gradientMid);
    backgroundGradient.addColorStop(1, CONFIG.gradientBottom);
  }

  function setupSimBuffers() {
    const total = cols * rows;
    prev = new Float32Array(total);
    cur  = new Float32Array(total);
    next = new Float32Array(total);
    gradientX = new Float32Array(total);
    gradientY = new Float32Array(total);
  }

  // ---- Resize（带防抖）----
  let resizeTimeout = null;
  function onResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, CONFIG.resizeDebounce);
  }

  function handleResize() {
    setupCanvases();
    setupSimBuffers();
    resetTimestamps();
  }

  window.addEventListener('resize', onResize);
  handleResize(); // 初始设置

  // ==========================================================
  // 双线性采样
  // ==========================================================
  function sampleBilinear(arr, gx, gy) {
    let ix = Math.floor(gx);
    let iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;

    ix = Math.max(0, Math.min(cols - 2, ix));
    iy = Math.max(0, Math.min(rows - 2, iy));
    const ix1 = Math.min(ix + 1, cols - 1);
    const iy1 = Math.min(iy + 1, rows - 1);

    const a = arr[ix + iy * cols];
    const b = arr[ix1 + iy * cols];
    const c = arr[ix + iy1 * cols];
    const d = arr[ix1 + iy1 * cols];

    return (1 - fy) * ((1 - fx) * a + fx * b) +
           fy * ((1 - fx) * c + fx * d);
  }

  // ==========================================================
  // splashAt — 写入 cur 缓冲（CSS 像素坐标）
  // ==========================================================
  function splashAt(x, y, strength, radiusMultiplier) {
    if (radiusMultiplier === undefined) radiusMultiplier = 1;
    const col = Math.round(x / RES);
    const row = Math.round(y / RES);
    const radius = Math.round(CONFIG.splashBaseRadius * radiusMultiplier);
    for (let di = -radius; di <= radius; di++) {
      for (let dj = -radius; dj <= radius; dj++) {
        const ci = col + di;
        const rj = row + dj;
        if (ci >= 1 && ci < cols - 1 && rj >= 1 && rj < rows - 1) {
          const dist = Math.sqrt(di * di + dj * dj);
          if (dist <= radius) {
            const factor = 1 - dist / radius;
            cur[ci + rj * cols] += strength * factor * factor;
          }
        }
      }
    }
  }

  // ==========================================================
  // 坐标转换（client → CSS 像素）
  // ==========================================================
  function getCanvasXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // ==========================================================
  // 检查目标是否为可交互元素
  // ==========================================================
  function isInteractiveElement(target) {
    return target instanceof Element &&
      target.closest('a, button, input, textarea, select, summary, [role="button"]') !== null;
  }

  // ==========================================================
  // Pointer Events（重构版）
  // ==========================================================

  // 所有触摸点击都产生涟漪，不限手指数量
  document.addEventListener('pointerdown', function (e) {
    // 过滤可交互元素
    if (isInteractiveElement(e.target)) return;

    const xy = getCanvasXY(e.clientX, e.clientY);

    // 物理涟漪
    splashAt(xy.x, xy.y, CONFIG.clickStrength, CONFIG.clickRadiusMultiplier);

    // 触摸：只产生涟漪，不进入拖动状态
    if (e.pointerType === 'touch') return;

    // 鼠标/触控笔：进入拖动状态
    activePointerId = e.pointerId;
    isDragging = false;
    lastDragTime = performance.now();
    lastDragSplashX = e.clientX;
    lastDragSplashY = e.clientY;
  });

  // 拖动（仅鼠标/触控笔）
  window.addEventListener('pointermove', function (e) {
    if (e.pointerId !== activePointerId) return;
    if (e.pointerType === 'touch') return;   // 触摸不响应拖动
    if (e.buttons !== 1) {
      // 左键未按下，清理拖动状态
      resetPointerState();
      return;
    }

    const now = performance.now();

    // 首次移动超过 5px 才进入拖动
    if (!isDragging) {
      const dx = e.clientX - lastDragSplashX;
      const dy = e.clientY - lastDragSplashY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        isDragging = true;
      } else {
        return;
      }
    }

    // 时间节流
    if (now - lastDragTime < CONFIG.dragTimeThrottle) return;

    // 距离节流
    const dx = e.clientX - lastDragSplashX;
    const dy = e.clientY - lastDragSplashY;
    if (Math.sqrt(dx * dx + dy * dy) < CONFIG.dragDistThrottle) return;

    const xy = getCanvasXY(e.clientX, e.clientY);
    splashAt(xy.x, xy.y, CONFIG.dragStrength, CONFIG.dragRadiusMultiplier);

    lastDragTime = now;
    lastDragSplashX = e.clientX;
    lastDragSplashY = e.clientY;
  });

  function resetPointerState() {
    activePointerId = null;
    isDragging = false;
  }

  window.addEventListener('pointerup', function (e) {
    if (e.pointerId === activePointerId) resetPointerState();
  });

  window.addEventListener('pointercancel', function (e) {
    if (e.pointerId === activePointerId) resetPointerState();
  });

  // 窗口失焦时安全清理
  window.addEventListener('blur', resetPointerState);

  // ==========================================================
  // 自动扰动（随机间隔）
  // ==========================================================
  function scheduleNextAutoRipple(now) {
    if (isMobile) {
      nextAutoRippleTime = now +
        CONFIG.mobileAutoRippleMinInterval +
        Math.random() * CONFIG.mobileAutoRippleIntervalRange;
    } else {
      nextAutoRippleTime = now +
        CONFIG.autoRippleMinInterval +
        Math.random() * CONFIG.autoRippleIntervalRange;
    }
  }

  function autoSplash(now) {
    // 页面刚加载时延迟首次触发
    if (nextAutoRippleTime === 0) {
      scheduleNextAutoRipple(now);
      return;
    }

    if (now < nextAutoRippleTime) return;

    const x = Math.random() * cssW;
    const y = Math.random() * cssH;

    let strMin, strMax;
    if (isMobile) {
      strMin = CONFIG.mobileAutoRippleStrengthMin;
      strMax = CONFIG.mobileAutoRippleStrengthMax;
    } else {
      strMin = CONFIG.autoRippleStrengthMin;
      strMax = CONFIG.autoRippleStrengthMax;
    }

    splashAt(x, y, strMin + Math.random() * (strMax - strMin));

    scheduleNextAutoRipple(now);
  }

  // ==========================================================
  // 波动传播（Verlet 二维水波）
  // ==========================================================
  function updateWaves() {
    for (let i = 1; i < cols - 1; i++) {
      for (let j = 1; j < rows - 1; j++) {
        const idx = i + j * cols;
        const val = (
          cur[(i - 1) + j * cols] +
          cur[(i + 1) + j * cols] +
          cur[i + (j - 1) * cols] +
          cur[i + (j + 1) * cols]
        ) * 0.5 - prev[idx];
        next[idx] = val * CONFIG.damping;
      }
    }
    const tmp = prev;
    prev = cur;
    cur  = next;
    next = tmp;
    for (let i = 0; i < cols; i++) {
      next[i] = 0;
      next[i + (rows - 1) * cols] = 0;
    }
    for (let j = 1; j < rows - 1; j++) {
      next[0 + j * cols] = 0;
      next[(cols - 1) + j * cols] = 0;
    }
  }

  // ==========================================================
  // 梯度预计算（每帧一次，供着色采样）
  // ==========================================================
  function computeGradients() {
    for (let i = 1; i < cols - 1; i++) {
      for (let j = 1; j < rows - 1; j++) {
        const idx = i + j * cols;
        gradientX[idx] = cur[(i + 1) + j * cols] - cur[(i - 1) + j * cols];
        gradientY[idx] = cur[i + (j + 1) * cols] - cur[i + (j - 1) * cols];
      }
    }
    // 边界清零
    for (let i = 0; i < cols; i++) {
      gradientX[i] = 0;
      gradientY[i] = 0;
      const btm = i + (rows - 1) * cols;
      gradientX[btm] = 0;
      gradientY[btm] = 0;
    }
    for (let j = 1; j < rows - 1; j++) {
      gradientX[0 + j * cols] = 0;
      gradientY[0 + j * cols] = 0;
      gradientX[(cols - 1) + j * cols] = 0;
      gradientY[(cols - 1) + j * cols] = 0;
    }
  }

  // ==========================================================
  // 渲染（梯度 → 法线 → 漫反射 → ImageData → drawImage）
  // ==========================================================
  function render() {
    if (!imageData) return;

    computeGradients();

    const pixels = imageData.data;

    const darkR = CONFIG.darkWaterR;
    const darkG = CONFIG.darkWaterG;
    const darkB = CONFIG.darkWaterB;
    const lightR = CONFIG.lightWaterR;
    const lightG = CONFIG.lightWaterG;
    const lightB = CONFIG.lightWaterB;
    const nStr = CONFIG.normalStrength;
    const amb = CONFIG.ambientLight;
    const difStr = CONFIG.diffuseStrength;
    const lnx = lightNormX;
    const lny = lightNormY;
    const lnz = lightNormZ;
    const alpha = CONFIG.waterAlpha;

    for (let bj = 0; bj < bufferH; bj++) {
      for (let bi = 0; bi < bufferW; bi++) {
        const gi = bi / renderScale + 1;
        const gj = bj / renderScale + 1;

        const dx = sampleBilinear(gradientX, gi, gj);
        const dy = sampleBilinear(gradientY, gi, gj);

        const nx = -dx * nStr;
        const ny = -dy * nStr;
        const nz = 1;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const normalX = nx / nLen;
        const normalY = ny / nLen;
        const normalZ = nz / nLen;

        let diffuse = normalX * lnx + normalY * lny + normalZ * lnz;
        if (diffuse < 0) diffuse = 0;

        let brightness = amb + diffuse * difStr;

        // 微弱高度影响
        const h = sampleBilinear(cur, gi, gj);
        brightness += h * 0.05;
        if (brightness < 0) brightness = 0;
        if (brightness > 1) brightness = 1;

        const idx = (bj * bufferW + bi) * 4;
        // 双色插值：暗水色 → 亮水色，避免通道一起乘法导致发灰
        pixels[idx]     = Math.round(darkR + (lightR - darkR) * brightness);
        pixels[idx + 1] = Math.round(darkG + (lightG - darkG) * brightness);
        pixels[idx + 2] = Math.round(darkB + (lightB - darkB) * brightness);
        pixels[idx + 3] = alpha;
      }
    }

    offCtx.putImageData(imageData, 0, 0);

    // 主 Canvas 绘制
    mainCtx.clearRect(0, 0, cssW, cssH);

    if (backgroundGradient) {
      mainCtx.fillStyle = backgroundGradient;
      mainCtx.fillRect(0, 0, cssW, cssH);
    }

    mainCtx.drawImage(offCanvas, 0, 0, cssW, cssH);
  }

  // ==========================================================
  // 绘制静态背景（用于 reduced-motion 暂停时）
  // ==========================================================
  function drawStaticBackground() {
    mainCtx.clearRect(0, 0, cssW, cssH);

    if (backgroundGradient) {
      mainCtx.fillStyle = backgroundGradient;
      mainCtx.fillRect(0, 0, cssW, cssH);
    }
  }

  // ==========================================================
  // 时间戳管理
  // ==========================================================
  function resetTimestamps() {
    lastTimestamp = 0;
    accumulator = 0;
    nextAutoRippleTime = 0;
  }

  // ==========================================================
  // 动画控制
  // ==========================================================
  function startAnimation() {
    if (animationId) return;
    resetTimestamps();
    paused = false;
    animationId = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    paused = true;
  }

  // ==========================================================
  // 主循环
  // ==========================================================
  function animate(timestamp) {
    if (reducedMotion || paused) {
      animationId = null;
      return;
    }

    if (!lastTimestamp) lastTimestamp = timestamp;

    let dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (dt > CONFIG.maxDelta) dt = CONFIG.maxDelta;

    accumulator += dt;
    let steps = 0;

    while (accumulator >= CONFIG.fixedStep && steps < CONFIG.maxStepsPerFrame) {
      updateWaves();
      accumulator -= CONFIG.fixedStep;
      steps++;
    }

    if (steps >= CONFIG.maxStepsPerFrame) {
      accumulator = 0;
    }

    // 自动扰动（使用真实时间戳）
    autoSplash(timestamp);

    render();
    animationId = requestAnimationFrame(animate);
  }

  // ==========================================================
  // 页面可见性
  // ==========================================================
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopAnimation();
    } else {
      if (!reducedMotion) startAnimation();
    }
  });

  // ==========================================================
  // prefers-reduced-motion（动态监听）
  // ==========================================================
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function handleMotionChange(e) {
    reducedMotion = e.matches;
    if (reducedMotion) {
      stopAnimation();
      // 清空模拟状态
      if (cur) cur.fill(0);
      if (prev) prev.fill(0);
      if (next) next.fill(0);
      drawStaticBackground();
    } else {
      resetTimestamps();
      startAnimation();
    }
  }

  // 初始检测
  reducedMotion = motionQuery.matches;

  // 动态监听（兼容旧版 Safari）
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', handleMotionChange);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(handleMotionChange);
  }

  // ==========================================================
  // 启动
  // ==========================================================
  if (!reducedMotion) {
    startAnimation();
  } else {
    drawStaticBackground();
  }
})();