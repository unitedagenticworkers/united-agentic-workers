(function () {
  var canvas = document.getElementById('mission-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Dark indigo nodes on white background
  var NR = 30, NG = 27, NB = 75;   // #1E1B4B
  // Violet connections
  var LR = 167, LG = 139, LB = 250; // #A78BFA

  var PARTICLE_COUNT = 30;
  var CONNECT_DIST   = 120;
  var BASE_SPEED     = 0.25;
  var MOUSE_RADIUS   = 200;
  var MOUSE_FORCE    = 0.015;

  var W, H, particles, raf;
  var mouse = { x: -9999, y: -9999 };
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
        r:  Math.random() * 1.5 + 1.5,
        a:  Math.random() * 0.25 + 0.25
      });
    }
  }

  function step() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // Mouse attraction
      var dx = mouse.x - p.x;
      var dy = mouse.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 1) {
        p.vx += (dx / dist) * MOUSE_FORCE;
        p.vy += (dy / dist) * MOUSE_FORCE;
      }

      // Damping to prevent runaway velocity
      p.vx *= 0.995;
      p.vy *= 0.995;

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
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i];
        var b = particles[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          var alpha = (1 - dist / CONNECT_DIST) * 0.10;
          ctx.strokeStyle = 'rgba(' + LR + ',' + LG + ',' + LB + ',' + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
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
  });

  canvas.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
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
  // Initial paint even if not yet visible (IntersectionObserver will start the loop)
  paint();
}());
