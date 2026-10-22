(() => {
  const media = window.MEDIA || [];
  const track = document.getElementById("track");
  const columnsEl = document.getElementById("columns");

  // Pulley setup: neighbouring columns run in opposite directions,
  // and each column gets a different length so they travel at different speeds.
  const COLUMN_CONFIG = [
    { dir: 1,  length: 1.0 },
    { dir: -1, length: 1.6 },
    { dir: 1,  length: 1.3 },
    { dir: -1, length: 0.8 },
  ];
  const BASE_ITEMS = Math.max(6, Math.ceil(media.length / 2));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 720px)");

  let columns = [];

  function makeTile(item) {
    const tile = document.createElement("div");
    tile.className = "tile";
    let el;
    if (item.type === "video") {
      el = document.createElement("video");
      el.src = item.src;
      if (item.poster) el.poster = item.poster;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = "metadata";
      videoObserver.observe(el);
    } else {
      el = document.createElement("img");
      el.src = item.src;
      el.alt = item.alt || "";
      el.loading = "lazy";
      el.decoding = "async";
    }
    el.addEventListener("load", measure);
    el.addEventListener("loadedmetadata", measure);
    tile.appendChild(el);
    return tile;
  }

  // Only play videos while they're on screen.
  const videoObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.play().catch(() => {});
      else e.target.pause();
    }
  });

  function build() {
    columnsEl.innerHTML = "";
    const config = mobile.matches ? COLUMN_CONFIG.slice(0, 2) : COLUMN_CONFIG;
    let cursor = 0;
    columns = config.map((cfg, i) => {
      const col = document.createElement("div");
      col.className = "column";
      const count = Math.round(BASE_ITEMS * cfg.length);
      // Offset each column's starting point so neighbours don't show the same image.
      cursor = (i * Math.ceil(media.length / config.length)) % Math.max(media.length, 1);
      for (let n = 0; n < count && media.length; n++) {
        col.appendChild(makeTile(media[(cursor + n) % media.length]));
      }
      columnsEl.appendChild(col);
      return { el: col, dir: cfg.dir, travel: 0, current: 0 };
    });
    measure();
  }

  let scrollLength = 0;

  function measure() {
    const vh = window.innerHeight;
    let maxTravel = 0;
    for (const c of columns) {
      c.travel = Math.max(0, c.el.scrollHeight - vh);
      maxTravel = Math.max(maxTravel, c.travel);
    }
    scrollLength = maxTravel;
    if (reduceMotion) return;
    track.style.height = `${scrollLength + vh}px`;
    // Layout changed (media loaded / resize): jump straight to the right spot.
    const progress = scrollLength ? Math.min(1, Math.max(0, window.scrollY / scrollLength)) : 0;
    for (const c of columns) {
      c.current = targetFor(c, progress);
      c.el.style.transform = `translate3d(0, ${c.current.toFixed(2)}px, 0)`;
    }
  }

  function targetFor(c, progress) {
    // dir  1: starts at the top, rope pulls it up.
    // dir -1: starts at the bottom, rope lets it down.
    return c.dir === 1 ? -c.travel * progress : -c.travel * (1 - progress);
  }

  let ticking = false;
  function targetFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  function update() {
    ticking = false;
    if (reduceMotion) return;
    const progress = scrollLength ? Math.min(1, Math.max(0, window.scrollY / scrollLength)) : 0;
    let moving = false;
    for (const c of columns) {
      const target = targetFor(c, progress);
      // Ease toward the target for a slightly weighted, pulley-like feel.
      c.current += (target - c.current) * 0.12;
      if (Math.abs(target - c.current) < 0.1) c.current = target;
      else moving = true;
      c.el.style.transform = `translate3d(0, ${c.current.toFixed(2)}px, 0)`;
    }
    if (moving) targetFrame();
  }

  window.addEventListener("scroll", targetFrame, { passive: true });
  window.addEventListener("resize", measure);
  mobile.addEventListener("change", build);

  build();
})();
