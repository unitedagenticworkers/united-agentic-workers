(function () {
  var canvas = document.getElementById('mission-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Dark indigo nodes
  var NR = 30, NG = 27, NB = 75;    // #1E1B4B
  // Violet connections (muted)
  var LR = 139, LG = 92, LB = 246;  // #8B5CF6 (softer violet)

  var PARTICLE_COUNT = 50;
  var CONNECT_DIST   = 160;
  var BASE_SPEED     = 0.4;
  var MOUSE_RADIUS   = 250;
  var MOUSE_FORCE    = 0.08;

  var W, H, particles, raf;
  var mouse = { x: -9999, y: -9999, active: false };
  var visible = false;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    init();
  }

  function init() {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * BASE_SPEED * 2,
        vy: (Math.random() - 0.5) * BASE_SPEED * 2,
        r:  Math.random() * 2 + 2,
        a:  Math.random() * 0.3 + 0.45,
        // Each node has a base radius so we can pulse it
        br: Math.random() * 2 + 2
      });
    }
  }

  function step() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // Mouse attraction — stronger when closer
      if (mouse.active) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 1) {
          var strength = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
          p.vx += (dx / dist) * strength;
          p.vy += (dy / dist) * strength;
        }
      }

      // Damping
      p.vx *= 0.98;
      p.vy *= 0.98;

      // Minimum drift so particles never fully stop
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < 0.15) {
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < 0)  p.x = W;
      if (p.x > W)  p.x = 0;
      if (p.y < 0)  p.y = H;
      if (p.y > H)  p.y = 0;
    }
  }

  function paint() {
    ctx.clearRect(0, 0, W, H);

    // Connections
    ctx.lineWidth = 1;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i];
        var b = particles[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          var alpha = (1 - dist / CONNECT_DIST) * 0.22;
          ctx.strokeStyle = 'rgba(' + LR + ',' + LG + ',' + LB + ',' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Mouse glow — faint radial gradient around cursor
    if (mouse.active) {
      var grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_RADIUS);
      grad.addColorStop(0, 'rgba(' + LR + ',' + LG + ',' + LB + ',0.06)');
      grad.addColorStop(1, 'rgba(' + LR + ',' + LG + ',' + LB + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, MOUSE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // Outer glow
      ctx.fillStyle = 'rgba(' + LR + ',' + LG + ',' + LB + ',' + (p.a * 0.10) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();

      // Core node
      ctx.fillStyle = 'rgba(' + NR + ',' + NG + ',' + NB + ',' + p.a + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    if (!visible) return;
    step();
    paint();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (reduced) { paint(); return; }
    visible = true;
    loop();
  }

  function stop() {
    visible = false;
    cancelAnimationFrame(raf);
  }

  // Mouse tracking
  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });

  canvas.addEventListener('mouseleave', function () {
    mouse.active = false;
  });

  // Only animate when visible
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start();
      else stop();
    }, { threshold: 0.1 });
    observer.observe(canvas);
  }

  window.addEventListener('resize', function () {
    stop();
    resize();
    if (!reduced && visible) loop(); else paint();
  });

  resize();
  paint();
}());
