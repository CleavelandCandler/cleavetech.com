/* ============================================================
   main.js — Portfolio homepage interaction for cleavetech.com
   ============================================================ */

(function () {

  /* ----------------------------------------------------------
     Configuration
     All layout values in one place — tweak here, not below.
  ---------------------------------------------------------- */

  const CONFIG = {
    // SVG canvas center
    cx: 320,
    cy: 258,

    // Triangle: radius from center to each discipline button
    triangleRadius: 168,

    // Discipline button radius
    discRadius: 44,

    // Project icon radius
    projRadius: 28,

    // Arc: distance from discipline button to side project icons
    arcRadiusSide: 108,

    // Arc: distance from discipline button to center project icon
    arcRadiusCenter: 145,

    // Degrees between each project icon in the arc
    arcSpread: 30,

    // Animation duration in ms
    animDuration: 380,

    // Delay between each icon animating in (stagger), in ms
    animStagger: 60,
  };

  /* ----------------------------------------------------------
     Data
  ---------------------------------------------------------- */

  const DISCIPLINES = [
    { id: 'technology', label: 'Technology', angle: -90 },
    { id: 'design',     label: 'Design',     angle: 150 },
    { id: 'music',      label: 'Music',      angle: 30  },
  ];

  const PROJECTS = {
    technology: ['Maker Portfolio', 'IT Support', 'Homelab'],
    design:     ['Project Geode',   'Motion Design', 'Projection Mapping'],
    music:      ['Radio',           'Production',    'DJ'],
  };

  /* ----------------------------------------------------------
     Geometry helpers
  ---------------------------------------------------------- */

  function toRad(deg) {
    return deg * Math.PI / 180;
  }

  /** Returns the {x, y} SVG position of a discipline button. */
  function discPos(disc) {
    return {
      x: CONFIG.cx + CONFIG.triangleRadius * Math.cos(toRad(disc.angle)),
      y: CONFIG.cy + CONFIG.triangleRadius * Math.sin(toRad(disc.angle)),
    };
  }

  /**
   * Returns an array of {label, x, y} for a discipline's project icons,
   * fanned inward toward the center of the triangle.
   */
  function projPositions(disc) {
    const dp = discPos(disc);
    const inwardAngle = Math.atan2(CONFIG.cy - dp.y, CONFIG.cx - dp.x) * 180 / Math.PI;

    return PROJECTS[disc.id].map((label, i) => {
      const offset = (i - 1) * CONFIG.arcSpread;
      const r = i === 1 ? CONFIG.arcRadiusCenter : CONFIG.arcRadiusSide;
      const a = toRad(inwardAngle + offset);
      return {
        label,
        x: dp.x + r * Math.cos(a),
        y: dp.y + r * Math.sin(a),
      };
    });
  }

  /* ----------------------------------------------------------
     SVG element factory
  ---------------------------------------------------------- */

  const NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  /* ----------------------------------------------------------
     Animation helpers
  ---------------------------------------------------------- */

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t)  { return t * t * t; }

  /**
   * Animates a single project icon wrapper:
   * - show=true:  slides out from disc center, scales up, fades in
   * - show=false: slides back to disc center, scales down, fades out
   */
  function animateIcon(entry, discCenter, show, delay) {
    const { wrapper, inner, tx, ty } = entry;
    const startTime = performance.now() + delay;

    function tick(now) {
      if (now < startTime) {
        requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - startTime;
      const raw     = Math.min(elapsed / CONFIG.animDuration, 1);
      const t       = show ? easeOutCubic(raw) : easeInCubic(raw);
      const progress = show ? t : 1 - t;

      // Move wrapper toward final position from disc center
      const x = discCenter.x + (tx - discCenter.x) * progress;
      const y = discCenter.y + (ty - discCenter.y) * progress;
      wrapper.setAttribute('transform', `translate(${x}, ${y})`);

      // Scale and fade the inner icon
      inner.setAttribute('transform', `scale(${progress})`);
      wrapper.style.opacity = progress;

      if (raw < 1) {
        requestAnimationFrame(tick);
      } else {
        wrapper.style.pointerEvents = show ? 'all' : 'none';
      }
    }

    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------
     Build the SVG
  ---------------------------------------------------------- */

  const svg       = document.querySelector('.portfolio-svg');
  const linesLayer = document.getElementById('js-lines');
  const iconsLayer = document.getElementById('js-icons');
  const discLayer  = document.getElementById('js-disciplines');

  let activeDisc = null;
  const discData = {};

  // Build project icons and connecting lines for each discipline
  DISCIPLINES.forEach(disc => {
    const dp  = discPos(disc);
    const pps = projPositions(disc);
    const wrappers = [];
    const lineEls  = [];

    pps.forEach(pp => {
      // Connecting line
      const line = svgEl('line', {
        class: 'conn-line',
        x1: dp.x, y1: dp.y,
        x2: pp.x, y2: pp.y,
      });
      linesLayer.appendChild(line);
      lineEls.push(line);

      // Outer wrapper: positioned at final destination, animated by JS
      const wrapper = document.createElementNS(NS, 'g');
      wrapper.setAttribute('class', 'proj-wrapper');
      wrapper.setAttribute('transform', `translate(${pp.x}, ${pp.y})`);
      wrapper.style.opacity = '0';
      wrapper.style.pointerEvents = 'none';

      // Inner group: handles animation scale (0 → 1), holds visual elements
      const inner = document.createElementNS(NS, 'g');
      inner.setAttribute('class', 'proj-icon');

      const circle = svgEl('circle', {
        cx: 0, cy: 0,
        r: CONFIG.projRadius,
        class: 'proj-circle',
      });

      // Placeholder initials — replace with <image> tags once logos are ready
      const initials = pp.label
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      const text = svgEl('text', {
        x: 0, y: 0,
        class: 'proj-initials',
      });
      text.textContent = initials;

      inner.appendChild(circle);
      inner.appendChild(text);
      wrapper.appendChild(inner);
      iconsLayer.appendChild(wrapper);

      wrappers.push({ wrapper, inner, tx: pp.x, ty: pp.y });
    });

    discData[disc.id] = { dp, wrappers, lineEls };
  });

  /* ----------------------------------------------------------
     Show / hide discipline projects
  ---------------------------------------------------------- */

  function showDisc(discId) {
    const { dp, wrappers, lineEls } = discData[discId];

    wrappers.forEach((entry, i) => {
      entry.wrapper.style.pointerEvents = 'none';
      animateIcon(entry, dp, true, i * CONFIG.animStagger);
    });

    // Lines fade in halfway through the icon animation
    lineEls.forEach((line, i) => {
      setTimeout(
        () => { line.style.opacity = '0.35'; },
        i * CONFIG.animStagger + CONFIG.animDuration * 0.5
      );
    });
  }

  function hideDisc(discId) {
    const { dp, wrappers, lineEls } = discData[discId];

    // Lines fade out immediately
    lineEls.forEach(line => { line.style.opacity = '0'; });

    wrappers.forEach((entry, i) => {
      entry.wrapper.style.pointerEvents = 'none';
      animateIcon(entry, dp, false, i * CONFIG.animStagger);
    });
  }

  /* ----------------------------------------------------------
     Build discipline buttons
  ---------------------------------------------------------- */

  DISCIPLINES.forEach(disc => {
    const dp = discPos(disc);

    const g = svgEl('g', {
      class: 'disc-btn',
      id: 'disc-' + disc.id,
    });

    g.appendChild(svgEl('circle', {
      cx: dp.x, cy: dp.y,
      r: CONFIG.discRadius,
      class: 'disc-circle',
    }));

    const label = svgEl('text', {
      x: dp.x, y: dp.y,
      class: 'disc-label',
    });
    label.textContent = disc.label;
    g.appendChild(label);

    g.addEventListener('click', () => {
      if (activeDisc === disc.id) {
        // Close this discipline
        hideDisc(disc.id);
        g.classList.remove('active');
        activeDisc = null;
      } else {
        // Close any currently open discipline
        if (activeDisc) {
          hideDisc(activeDisc);
          document.getElementById('disc-' + activeDisc).classList.remove('active');
        }
        // Open this discipline
        showDisc(disc.id);
        g.classList.add('active');
        activeDisc = disc.id;
      }
    });

    discLayer.appendChild(g);
  });

})();
