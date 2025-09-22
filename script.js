(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const startBtn = document.getElementById("btn-start");
  const dpadButtons = Array.from(document.querySelectorAll(".btn.dir"));

  // Game configuration
  const gridCells = 20; // grid is gridCells x gridCells
  const baseSpeed = 8; // cells per second at start

  // Handle high-DPI rendering by scaling backing store
  function resizeCanvasToDisplaySize() {
    const ratio = window.devicePixelRatio || 1;
    const size = Math.min(canvas.clientWidth, canvas.clientHeight || canvas.clientWidth);
    const target = Math.max(240, size);
    canvas.width = Math.floor(target * ratio);
    canvas.height = Math.floor(target * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  const ro = new ResizeObserver(resizeCanvasToDisplaySize);
  ro.observe(canvas);
  resizeCanvasToDisplaySize();

  // Derived cell size
  function cellSize() {
    return Math.floor(canvas.width / (window.devicePixelRatio || 1) / gridCells);
  }

  // Game state
  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = { x: 10, y: 10 };
  let score = 0;
  let best = Number(localStorage.getItem("snake_best") || 0);
  bestEl.textContent = String(best);

  let running = false;
  let lastTs = 0;
  let stepIntervalMs = 1000 / baseSpeed;

  function resetGame() {
    const startX = Math.floor(gridCells / 3);
    const startY = Math.floor(gridCells / 2);
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    stepIntervalMs = 1000 / baseSpeed;
    spawnFood();
    updateUI();
  }

  function updateUI() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
    startBtn.textContent = running ? "Restart" : "Start";
  }

  function startGame() {
    resetGame();
    running = true;
    lastTs = 0;
    requestAnimationFrame(loop);
    updateUI();
  }

  function gameOver() {
    running = false;
    if (score > best) {
      best = score;
      localStorage.setItem("snake_best", String(best));
    }
    updateUI();
    flashBoard("#ef4444");
  }

  function flashBoard(color) {
    const cs = cellSize();
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, gridCells * cs, gridCells * cs);
    ctx.restore();
    setTimeout(draw, 120);
  }

  function spawnFood() {
    while (true) {
      const x = Math.floor(Math.random() * gridCells);
      const y = Math.floor(Math.random() * gridCells);
      const onSnake = snake.some((s) => s.x === x && s.y === y);
      if (!onSnake) {
        food = { x, y };
        return;
      }
    }
  }

  function loop(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const delta = ts - lastTs;
    if (delta >= stepIntervalMs) {
      step();
      lastTs = ts;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function step() {
    // update direction from input, avoiding reversal
    if (nextDirection.x !== -direction.x || nextDirection.y !== -direction.y) {
      direction = nextDirection;
    }

    const head = snake[0];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // wall collision
    if (newHead.x < 0 || newHead.y < 0 || newHead.x >= gridCells || newHead.y >= gridCells) {
      return gameOver();
    }

    // self collision
    if (snake.some((s, i) => i !== 0 && s.x === newHead.x && s.y === newHead.y)) {
      return gameOver();
    }

    snake.unshift(newHead);

    // food
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 1;
      // ramp difficulty slightly
      stepIntervalMs = Math.max(60, stepIntervalMs * 0.97);
      spawnFood();
      flashBoard("#22c55e");
    } else {
      snake.pop();
    }

    updateUI();
  }

  function draw() {
    const cs = cellSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // board background pattern is via CSS; draw logical bounds
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, gridCells * cs - 1, gridCells * cs - 1);
    ctx.restore();

    // draw food
    drawRoundedCell(food.x, food.y, cs, "#f59e0b");

    // draw snake
    for (let i = 0; i < snake.length; i++) {
      const part = snake[i];
      const isHead = i === 0;
      const color = isHead ? "#22c55e" : "#16a34a";
      drawRoundedCell(part.x, part.y, cs, color);
    }
  }

  function drawRoundedCell(x, y, cs, color) {
    const r = Math.floor(cs * 0.25);
    const px = x * cs;
    const py = y * cs;
    ctx.fillStyle = color;
    roundRect(ctx, px + 2, py + 2, cs - 4, cs - 4, r);
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Input handling
  const keyToDir = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
  };

  window.addEventListener("keydown", (e) => {
    const key = e.key;
    if (key === " ") {
      if (!running) {
        startGame();
      }
      return;
    }
    const dir = keyToDir[key];
    if (dir) {
      nextDirection = dir;
    }
  });

  // D-pad buttons
  dpadButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-dir");
      if (dir === "up") nextDirection = { x: 0, y: -1 };
      if (dir === "down") nextDirection = { x: 0, y: 1 };
      if (dir === "left") nextDirection = { x: -1, y: 0 };
      if (dir === "right") nextDirection = { x: 1, y: 0 };
    });
  });

  // Swipe controls on canvas
  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 20) return; // ignore taps
      if (absX > absY) {
        nextDirection = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      } else {
        nextDirection = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
      }
      touchStart = null;
    },
    { passive: true }
  );

  startBtn.addEventListener("click", () => {
    startGame();
  });

  // Initial draw
  resetGame();
  draw();
})();
