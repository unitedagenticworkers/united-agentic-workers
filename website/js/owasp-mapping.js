(function () {
  'use strict';

  /* ── T1–T17 definitions ─────────────────────────────────────────
     Shown in hover/focus tooltips on TID badges throughout the page.
     ─────────────────────────────────────────────────────────────── */
  var TIDS = {
    T1:  { name: 'Memory Poisoning',
           desc: 'Exploiting agent memory systems to introduce malicious data, altering decision-making and enabling unauthorised operations.' },
    T2:  { name: 'Tool Misuse',
           desc: 'Manipulating agents to abuse integrated tools through deceptive prompts or commands, including agent hijacking via prompt injection.' },
    T3:  { name: 'Privilege Compromise',
           desc: 'Exploiting permission mismanagement to gain unauthorised access or perform disallowed actions.' },
    T4:  { name: 'Resource Overload',
           desc: 'Deliberate exhaustion of computational power, memory, and service dependencies to degrade or deny agent function.' },
    T5:  { name: 'Cascading Hallucination Attacks',
           desc: "Exploiting an agent's tendency to generate plausible but false information, propagating errors through dependent systems." },
    T6:  { name: 'Intent Breaking & Goal Manipulation',
           desc: 'Exploiting planning and goal-setting vulnerabilities to redirect agent objectives via prompt injection.' },
    T7:  { name: 'Misaligned & Deceptive Behaviours',
           desc: 'Agents executing harmful or disallowed actions by exploiting deceptive reasoning or misinterpreted goals.' },
    T8:  { name: 'Repudiation & Untraceability',
           desc: "Lack of proper logging and audit trails, making the agent's actions and decisions untraceable after the fact." },
    T9:  { name: 'Identity Spoofing & Impersonation',
           desc: 'Attackers impersonating agents or stealing agent identities to gain trust or access.' },
    T10: { name: 'Overwhelming Human in the Loop',
           desc: 'Saturating human reviewers with excessive tasks and time pressure to induce errors or bypass oversight.' },
    T11: { name: 'Unexpected RCE and Code Attacks',
           desc: 'Exploiting AI-generated code execution environments to inject malicious code or trigger unintended system behaviours.' },
    T12: { name: 'Agent Communication Poisoning',
           desc: 'Manipulating inter-agent communication channels to corrupt coordination between agents.' },
    T13: { name: 'Rogue Agents in Multi-Agent Systems',
           desc: 'Malicious or compromised agents operating outside monitoring boundaries within a multi-agent system.' },
    T14: { name: 'Human Attacks on Multi-Agent Systems',
           desc: 'Adversaries exploiting inter-agent delegation and trust relationships to manipulate system behaviour.' },
    T15: { name: 'Human Manipulation',
           desc: 'Compromised agents exploiting human trust to deliver harmful, deceptive, or manipulative content.' },
    T16: { name: 'Insecure Inter-Agent Protocol Abuse',
           desc: 'Attacks on MCP, A2A, and similar protocols — context hijacking, consent bypass, tool metadata manipulation.' },
    T17: { name: 'Supply Chain Compromise',
           desc: 'Compromised upstream components (prompts, plugins, frameworks) allowing malicious logic through trusted software.' }
  };

  /* ── Tooltip ────────────────────────────────────────────────────
     Single element, repositioned on each hover/focus event.
     position: fixed so scroll offset is irrelevant.
     ─────────────────────────────────────────────────────────────── */
  var tip = null;

  function buildTooltip() {
    tip = document.createElement('div');
    tip.className = 'tid-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.setAttribute('aria-hidden', 'true');
    tip.hidden = true;
    document.body.appendChild(tip);
  }

  function positionTooltip(trigger) {
    var r   = trigger.getBoundingClientRect();
    var top = r.bottom + 8;
    var left = r.left;

    // Render off-screen first to get dimensions
    tip.style.top  = '-9999px';
    tip.style.left = '-9999px';
    tip.hidden = false;

    var tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Flip above if it would overflow the bottom
    if (top + th > vh - 16) {
      top = r.top - th - 8;
    }

    // Clamp horizontally
    if (left + tw > vw - 16) left = vw - tw - 16;
    if (left < 8)             left = 8;

    tip.style.top  = top  + 'px';
    tip.style.left = left + 'px';
  }

  function showTip(trigger, tid) {
    var def = TIDS[tid];
    if (!def) return;
    tip.innerHTML =
      '<strong class="tid-tooltip-name">' + tid + ': ' + def.name + '</strong>' +
      '<span class="tid-tooltip-desc">' + def.desc + '</span>';
    positionTooltip(trigger);
  }

  function hideTip() {
    if (tip) tip.hidden = true;
  }

  function initTooltips() {
    buildTooltip();

    var tidRe   = /^T\d{1,2}$/;
    var content = document.getElementById('main-content');
    if (!content) return;

    content.querySelectorAll('strong').forEach(function (el) {
      var text = el.textContent.trim();
      if (!tidRe.test(text) || !TIDS[text]) return;

      el.classList.add('tid-ref');
      el.tabIndex = 0;
      el.setAttribute('aria-describedby', 'tid-tooltip');

      el.addEventListener('mouseenter', function () { showTip(el, text); });
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus',      function () { showTip(el, text); });
      el.addEventListener('blur',       hideTip);
    });

    // Give the tooltip its stable id now that we know it'll be used
    tip.id = 'tid-tooltip';
  }

  /* ── Heading anchor links ────────────────────────────────────────
     h2.article-title  → links to the enclosing <article id="...">
     h3.section-heading → auto-generates a sub-section ID and links to it
     ─────────────────────────────────────────────────────────────── */
  function slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function makeAnchor(id, label) {
    var a = document.createElement('a');
    a.href      = '#' + id;
    a.className = 'heading-anchor';
    a.setAttribute('aria-label', 'Direct link to "' + label + '"');
    a.textContent = '#';
    return a;
  }

  function initAnchors() {
    document.querySelectorAll('.charter-article[id]').forEach(function (article) {
      var articleId = article.id;

      // h2 — anchor links to the article element itself
      var h2 = article.querySelector('h2.article-title');
      if (h2) {
        h2.appendChild(makeAnchor(articleId, h2.textContent.trim()));
      }

      // h3 — generate stable sub-section IDs, then anchor
      article.querySelectorAll('h3.section-heading').forEach(function (h3) {
        var label = h3.textContent.trim();
        var subId = articleId + '-' + slugify(label);
        h3.id = subId;
        h3.appendChild(makeAnchor(subId, label));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTooltips();
    initAnchors();
  });

}());
