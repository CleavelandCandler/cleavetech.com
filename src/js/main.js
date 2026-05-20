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
    cy: 240,

    // Triangle: radius from center to each discipline button
    triangleRadius: 168,

    // Discipline button radius
    discRadius: 50,

    // Project icon radius
    projRadius: 28,

    // Degrees between each project icon in the arc
    arcSpread: 30,

    // Animation duration in ms
    animDurationOpen: 420,

    // Animation duration in ms
    animDurationClose: 320,

    // Delay between each icon animating in (stagger), in ms
    animStagger: 60,

    // How far the inner background lines extend in both directions
    bgExtendInner: 320,
  };

  /* ----------------------------------------------------------
     Data
  ---------------------------------------------------------- */

  const DISCIPLINES = [
    {
      id: 'technology',
      label: 'Technology',
      angle: -90,
      labelArcTop: false,   // labels arc along bottom of tile
      labelR: CONFIG.projRadius + 12,
    },
    {
      id: 'design',
      label: 'Design',
      angle: 150,
      labelArcTop: true,    // labels arc along top of tile
      labelR: CONFIG.projRadius + 6,
    },
    {
      id: 'music',
      label: 'Music',
      angle: 30,
      labelArcTop: true,    // labels arc along top of tile
      labelR: CONFIG.projRadius + 6,
    },
  ];

  const PROJECTS = {
    technology: ['Makerspace',    'IT Support',    'Homelab'       ],
    design:     ['Project Geode', 'Motion Design', 'Projection Art'],
    music:      ['Radio',         'Production',    'Disk Jockey'   ],
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
   * Returns the three {origin, dir} lines radiating inward from
   * a discipline button — one per project icon direction.
   */
  function discLines(disc) {
    const dp = discPos(disc);
    const inwardAngle = Math.atan2(CONFIG.cy - dp.y, CONFIG.cx - dp.x) * 180 / Math.PI;
    return [-1, 0, 1].map(offset => {
      const a = toRad(inwardAngle + offset * CONFIG.arcSpread);
      return { origin: dp, dir: { x: Math.cos(a), y: Math.sin(a) } };
    });
  }

  /**
   * Returns the intersection point of two lines,
   * each defined by a point and a direction vector.
   * Returns null if lines are parallel.
   */
  function intersect(p1, d1, p2, d2) {
    const denom = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(denom) < 1e-10) return null;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const t = (dx * d2.y - dy * d2.x) / denom;
    return { x: p1.x + t * d1.x, y: p1.y + t * d1.y };
  }

  // Pre-compute all discipline lines so we can intersect them
  const ALL_LINES = {};
  DISCIPLINES.forEach(disc => { ALL_LINES[disc.id] = discLines(disc); });

  /**
   * Returns an array of {label, x, y} for a discipline's project icons,
   * snapped to the intersections of the background geometry lines.
   *
   * - Center icon (i=1): sits at the convergence of all three center lines
   * - Side icons (i=0,2): sit at the outer triangle vertices where
   *   neighboring side lines cross
   */
  function projPositions(disc) {
    const otherDiscs = DISCIPLINES.filter(d => d.id !== disc.id);
    const myLines = ALL_LINES[disc.id];

    return PROJECTS[disc.id].map((label, i) => {
      let pos;

      if (i === 1) {
        // Center icon: average of intersections between my center line
        // and the center lines of the other two disciplines
        const l1 = myLines[1];
        const l2 = ALL_LINES[otherDiscs[0].id][1];
        const l3 = ALL_LINES[otherDiscs[1].id][1];
        const p1 = intersect(l1.origin, l1.dir, l2.origin, l2.dir);
        const p2 = intersect(l1.origin, l1.dir, l3.origin, l3.dir);
        pos = p1 && p2
          ? { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
          : p1 || p2;
      } else {
        // Side icons: find the nearest intersection of my side line
        // with any line from the other disciplines (in the inward direction)
        const myLine = myLines[i];
        let best = null;
        let bestDist = Infinity;

        otherDiscs.forEach(other => {
          [0, 1, 2].forEach(j => {
            const otherLine = ALL_LINES[other.id][j];
            const p = intersect(myLine.origin, myLine.dir, otherLine.origin, otherLine.dir);
            if (!p) return;
            // Must be in the inward direction (positive t from disc origin)
            const t = (p.x - myLine.origin.x) / myLine.dir.x;
            if (t < 20) return; // skip intersections too close to the disc button
            const dist = Math.hypot(p.x - CONFIG.cx, p.y - CONFIG.cy);
            if (dist < bestDist) { bestDist = dist; best = p; }
          });
        });

        pos = best;
      }

      return { label, x: pos.x, y: pos.y };
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
     Arc label builder
     Creates a <path> in <defs> and returns a <text> using it.

     labelArcTop=true  → arc over the top of the tile (Design, Music)
     labelArcTop=false → arc under the bottom of the tile (Technology)
     r                 → radius from tile center to text baseline
  ---------------------------------------------------------- */

  const defs = document.getElementById('js-defs');
  let pathCounter = 0;

  function makeArcLabel(label, labelArcTop, r) {
    const id = 'arcpath-' + (pathCounter++);

    // Clockwise sweep (0) = bottom arc; counter-clockwise (1) = top arc
    const sweep = labelArcTop ? 1 : 0;
    const d = `M ${-r} 0 A ${r} ${r} 0 0 ${sweep} ${r} 0`;

    const path = svgEl('path', { id, d, fill: 'none' });
    defs.appendChild(path);

    const txt = document.createElementNS(NS, 'text');
    txt.setAttribute('class', 'arc-label');
    txt.style.opacity = '0';

    const tp = document.createElementNS(NS, 'textPath');
    tp.setAttribute('href', '#' + id);
    tp.setAttribute('startOffset', '50%');
    tp.setAttribute('text-anchor', 'middle');
    tp.textContent = label;

    txt.appendChild(tp);
    return txt;
  }

  /* ----------------------------------------------------------
     Animation helpers
  ---------------------------------------------------------- */

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t)  { return t * t * t; }

  /**
   * Animates a single project icon:
   * - show=true:  slides out from disc center, scales up, fades in
   * - show=false: slides back to disc center, scales down, fades out
   */
  function animateIcon(entry, discCenter, show, delay, duration) {
    const { wrapper, inner, tx, ty } = entry;
    const startTime = performance.now() + delay;

    function tick(now) {
      if (now < startTime) {
        requestAnimationFrame(tick);
        return;
      }

      const elapsed  = now - startTime;
      const raw      = Math.min(elapsed / duration, 1);
      const t        = show ? easeOutCubic(raw) : easeInCubic(raw);
      const progress = show ? t : 1 - t;

      const x = discCenter.x + (tx - discCenter.x) * progress;
      const y = discCenter.y + (ty - discCenter.y) * progress;
      wrapper.setAttribute('transform', `translate(${x}, ${y})`);
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
     Layer references
  ---------------------------------------------------------- */

  const bgRayLayer = document.getElementById('js-bg-rays');
  const bgLineLayer = document.getElementById('js-bg-lines');
  const linesLayer  = document.getElementById('js-lines');
  const iconsLayer  = document.getElementById('js-icons');
  const discLayer   = document.getElementById('js-disciplines');

  let activeDisc = null;
  const discData      = {};
  const bgLinesByDisc = {};

  /* ----------------------------------------------------------
     Build background geometry
  ---------------------------------------------------------- */

  DISCIPLINES.forEach(disc => {
    const dp    = discPos(disc);
    const lines = ALL_LINES[disc.id];
    const bgLines = [];

lines.forEach((line, lineIndex) => {
  // Center line only (index 1) — the three crossing bisectors
  if (lineIndex === 1) {
    const ix1 = dp.x - line.dir.x * CONFIG.bgExtendInner;
    const iy1 = dp.y - line.dir.y * CONFIG.bgExtendInner;
    const ix2 = dp.x + line.dir.x * CONFIG.bgExtendInner;
    const iy2 = dp.y + line.dir.y * CONFIG.bgExtendInner;
    const innerLine = svgEl('line', {
      class: 'bg-line',
      x1: ix1, y1: iy1, x2: ix2, y2: iy2,
    });
    bgLineLayer.appendChild(innerLine);
    bgLines.push(innerLine);
  }
});

    bgLinesByDisc[disc.id] = bgLines;
  });

  /* ----------------------------------------------------------
     Build project icons and connecting lines
  ---------------------------------------------------------- */

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

      // Outer wrapper: sits at final position, animated by JS
      const wrapper = document.createElementNS(NS, 'g');
      wrapper.setAttribute('class', 'proj-wrapper');
      wrapper.setAttribute('transform', `translate(${pp.x}, ${pp.y})`);
      wrapper.style.opacity = '0';
      wrapper.style.pointerEvents = 'none';

      // Inner group: handles animation scale (0 → 1)
      const inner = document.createElementNS(NS, 'g');

      // Icon group: holds visual elements and hover events
      const icon = document.createElementNS(NS, 'g');
      icon.setAttribute('class', 'proj-icon');

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

      icon.appendChild(circle);
      icon.appendChild(text);

      // Arc label — hidden by default, shown on hover
      const arcLabel = makeArcLabel(pp.label, disc.labelArcTop, disc.labelR);
      icon.addEventListener('mouseenter', () => { arcLabel.style.opacity = '1'; });
      icon.addEventListener('mouseleave', () => { arcLabel.style.opacity = '0'; });

      inner.appendChild(icon);
      inner.appendChild(arcLabel);
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
      animateIcon(entry, dp, true, i * CONFIG.animStagger, CONFIG.animDurationOpen);
    });

    // Lines fade in halfway through the icon animation
    lineEls.forEach((line, i) => {
      setTimeout(
        () => { line.style.opacity = '0.8'; },
        i * CONFIG.animStagger + CONFIG.animDurationOpen * 0.5
      );
    });

    // Background geometry brightens
    bgLinesByDisc[discId].forEach(l => l.classList.add('active'));
  }

  function hideDisc(discId) {
    const { dp, wrappers, lineEls } = discData[discId];

    lineEls.forEach(line => { line.style.opacity = '0'; });

    wrappers.forEach((entry, i) => {
      entry.wrapper.style.pointerEvents = 'none';
      animateIcon(entry, dp, false, (wrappers.length - 1 - i) * CONFIG.animStagger, CONFIG.animDurationClose);
    });

    // Background geometry dims
    bgLinesByDisc[discId].forEach(l => l.classList.remove('active'));
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
