  (function () {
    var canvas = document.getElementById('plexus-canvas');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // UAW Accent Light: #A78BFA — rgb(167, 139, 250)
    var CR = 167, CG = 139, CB = 250;

    var PARTICLE_COUNT = 55;
    var CONNECT_DIST   = 130;
    var BASE_SPEED     = 0.35;

    var W, H, particles, raf;

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
          r:  Math.random() * 1.2 + 1.2,
          a:  Math.random() * 0.25 + 0.30
        });
      }
    }

    function step() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0)  p.x = W;
        if (p.x > W)  p.x = 0;
        if (p.y < 0)  p.y = H;
        if (p.y > H)  p.y = 0;
      }
    }

    function paint() {
      ctx.clearRect(0, 0, W, H);

      // Draw connections
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var a  = particles[i];
          var b  = particles[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            var alpha = (1 - dist / CONNECT_DIST) * 0.18;
            ctx.strokeStyle = 'rgba(' + CR + ',' + CG + ',' + CB + ',' + alpha + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.fillStyle = 'rgba(' + CR + ',' + CG + ',' + CB + ',' + p.a + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      step();
      paint();
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      resize();
      if (!reduced) loop(); else paint();
    });

    resize();
    if (reduced) paint(); else loop();
  }());
