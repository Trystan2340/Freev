(() => {
  "use strict";

  if (document.getElementById("hero-canvas") || document.querySelector("canvas[data-freev-constellation]")) return;

  const canvas = document.createElement("canvas");
  canvas.className = "freev-constellation-canvas";
  canvas.dataset.freevConstellation = "";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  document.body.classList.add("freev-constellation-enabled");

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const lowPower = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const pointer = { x: -10_000, y: -10_000, active: false };
  let width = 0;
  let height = 0;
  let ratio = 1;
  let particles = [];
  let frame = 0;

  function particleCount() {
    const areaCount = Math.round((width * height) / 19_000);
    return Math.max(32, Math.min(lowPower ? 58 : 92, areaCount));
  }

  function createParticle() {
    const depth = .55 + Math.random() * 1.05;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * (reducedMotion ? .04 : .22) * depth,
      vy: (Math.random() - .5) * (reducedMotion ? .04 : .22) * depth,
      size: (.75 + Math.random() * 1.35) * depth,
      alpha: .24 + Math.random() * .48,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > .68 ? "168,85,247" : "34,211,238",
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: particleCount() }, createParticle);
    draw();
  }

  function drawLink(first, second, distance, maximum) {
    const strength = (1 - distance / maximum) * .22;
    const gradient = context.createLinearGradient(first.x, first.y, second.x, second.y);
    gradient.addColorStop(0, `rgba(${first.color},${strength})`);
    gradient.addColorStop(1, `rgba(${second.color},${strength})`);
    context.strokeStyle = gradient;
    context.lineWidth = .65;
    context.beginPath();
    context.moveTo(first.x, first.y);
    context.lineTo(second.x, second.y);
    context.stroke();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    frame += 1;
    const maximum = width < 640 ? 116 : 148;

    particles.forEach((particle, index) => {
      if (!reducedMotion) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -8 || particle.x > width + 8) particle.vx *= -1;
        if (particle.y < -8 || particle.y > height + 8) particle.vy *= -1;
      }

      for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
        const other = particles[otherIndex];
        const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
        if (distance < maximum) drawLink(particle, other, distance, maximum);
      }

      if (pointer.active && !reducedMotion) {
        const pointerDistance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
        if (pointerDistance < 178) {
          drawLink(particle, { ...pointer, color: "125,211,252" }, pointerDistance, 178);
        }
      }

      const pulse = reducedMotion ? 1 : .78 + Math.sin(frame * .018 + particle.phase) * .22;
      context.fillStyle = `rgba(${particle.color},${particle.alpha * pulse})`;
      context.shadowBlur = particle.size > 1.7 ? 9 : 0;
      context.shadowColor = `rgba(${particle.color},.65)`;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    });
  }

  function animate() {
    draw();
    if (!reducedMotion && document.visibilityState === "visible") requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerout", () => { pointer.active = false; });
  document.addEventListener("visibilitychange", () => {
    if (!reducedMotion && document.visibilityState === "visible") requestAnimationFrame(animate);
  });

  resize();
  if (!reducedMotion) requestAnimationFrame(animate);
})();
