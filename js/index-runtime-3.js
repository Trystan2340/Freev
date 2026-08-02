// --- 1. Background Animation (Constellation Effect) ---
        const canvas = document.getElementById('hero-canvas');
        if (canvas && canvas.parentElement !== document.body) {
            canvas.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(canvas, document.body.firstChild);
        }
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let hubs = [];
        let nebulaBlobs = [];
        let sparks = [];
        let dataPulses = [];
        let canvasFrameId = null;
        let canvasIsVisible = true;
        let frameCount = 0;
        let hueShift = 0;
        let pulseTimer = 0;
        let supernovaTimer = 0;
        let lightningBolts = [];
        let lightningTimer = 0;
        let flashIntensity = 0;
        let sphereMorph = 0;
        let sphereTargetMorph = 0;
        let lastCanvasTime = 0;
        let canvasFrameDelta = 16;
        let cursorRingAngle = 0;
        let cursorTrail = [];
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isLowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
            || (navigator.deviceMemory && navigator.deviceMemory <= 4)
            || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        let scrollOffset = window.scrollY || 0;
        window.addEventListener('scroll', updateScrollState, { passive: true });
        const LINK_DISTANCE = 190;
        const MOUSE_LINK_DISTANCE = 230;
        const mouse = { x: -9999, y: -9999, active: false };
        let shootingStars = [];
        let shootingStarTimer = 0;

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function smoothstep(value) {
            const t = clamp(value, 0, 1);
            return t * t * (3 - 2 * t);
        }

        function updateScrollState() {
            scrollOffset = window.scrollY || 0;
            const viewportHeight = height || window.innerHeight || 1;
            const start = Math.max(90, viewportHeight * 0.16);
            const end = Math.max(start + 260, viewportHeight * 0.9);
            const rawProgress = (scrollOffset - start) / (end - start);
            const nextTarget = smoothstep(rawProgress);
            sphereTargetMorph = prefersReducedMotion ? (nextTarget > 0.15 ? 1 : 0) : nextTarget;
        }

        function getSphereVisualState() {
            const shortSide = Math.min(width, height);
            const radius = Math.min(
                shortSide * (width < 640 ? 0.34 : 0.3),
                width * (width < 900 ? 0.36 : 0.18),
                330
            );
            const centerX = width * (width < 900 ? 0.5 : 0.72) + Math.sin(frameCount * 0.006) * 14 * sphereMorph;
            const centerY = height * (width < 640 ? 0.46 : 0.52) + Math.cos(frameCount * 0.005) * 10 * sphereMorph;
            return { x: centerX, y: centerY, radius };
        }

        function assignSphereTargets() {
            const total = Math.max(1, particles.length);
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            particles.forEach((particle, index) => {
                const y = 1 - ((index + 0.5) / total) * 2;
                const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
                const theta = index * goldenAngle;
                particle.sphereX = Math.cos(theta) * ringRadius;
                particle.sphereY = y;
                particle.sphereZ = Math.sin(theta) * ringRadius;
                particle.spherePhase = Math.random() * Math.PI * 2;
            });
        }

        function projectParticleOnSphere(particle) {
            const sphere = getSphereVisualState();
            const rotationY = frameCount * (prefersReducedMotion ? 0.0015 : 0.008);
            const rotationX = -0.32 + Math.sin(frameCount * 0.003) * 0.12;
            const wobble = prefersReducedMotion ? 0 : Math.sin(frameCount * 0.014 + particle.spherePhase) * 0.018;
            const sx = particle.sphereX * (1 + wobble);
            const sy = particle.sphereY;
            const sz = particle.sphereZ * (1 - wobble);

            const cosX = Math.cos(rotationX);
            const sinX = Math.sin(rotationX);
            const yTilt = sy * cosX - sz * sinX;
            const zTilt = sy * sinX + sz * cosX;

            const cosY = Math.cos(rotationY);
            const sinY = Math.sin(rotationY);
            const xRot = sx * cosY + zTilt * sinY;
            const zRot = -sx * sinY + zTilt * cosY;

            const zPx = zRot * sphere.radius;
            const perspective = 900 / (900 - zPx * 0.55);
            const light = clamp((zRot + 1) / 2, 0, 1);

            return {
                x: sphere.x + xRot * sphere.radius * perspective,
                y: sphere.y + yTilt * sphere.radius * perspective,
                scale: 0.78 + perspective * 0.22,
                light
            };
        }

        function projectParticleAtHome(particle) {
            if (prefersReducedMotion) {
                return { x: particle.homeX, y: particle.homeY, scale: 1, light: 0.5 };
            }
            const driftX = Math.sin(frameCount * 0.004 + particle.homePhase) * particle.homeDrift;
            const driftY = Math.cos(frameCount * 0.003 + particle.homePhase * 0.7) * particle.homeDrift * 0.7;
            return {
                x: particle.homeX + driftX,
                y: particle.homeY + driftY,
                scale: 1,
                light: 0.5
            };
        }

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            initParticles();
            initNebula();
            updateScrollState();
        }
        window.addEventListener('resize', resize);

        window.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
            mouse.active = mouse.x >= 0 && mouse.x <= width && mouse.y >= 0 && mouse.y <= height;
        });
        document.addEventListener('mouseleave', () => { mouse.active = false; });
        window.addEventListener('blur', () => { mouse.active = false; });
        window.addEventListener('pointerdown', (e) => {
            if (prefersReducedMotion) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            if (x < 0 || x > width || y < 0 || y > height) return;
            spawnBurst(x, y);
        });

        const PARTICLE_COLORS = ['#22d3ee', '#a855f7', '#818cf8'];
        const HUB_HUES = [192, 271, 234]; // cyan, violet, indigo — couleurs de marque en teinte HSL

        function hslToRgb(h, s, l) {
            h = ((h % 360) + 360) % 360;
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;
            let r = 0, g = 0, b = 0;
            if (h < 60) { r = c; g = x; b = 0; }
            else if (h < 120) { r = x; g = c; b = 0; }
            else if (h < 180) { r = 0; g = c; b = x; }
            else if (h < 240) { r = 0; g = x; b = c; }
            else if (h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }
            return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
        }

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.homeX = this.x;
                this.homeY = this.y;
                this.homePhase = Math.random() * Math.PI * 2;
                this.homeDrift = 8 + Math.random() * 20;
                // Profondeur : 0.55 (lointain, petit, discret) à 1.65 (proche, gros, lumineux).
                this.depth = 0.55 + Math.random() * 1.1;
                const speed = (prefersReducedMotion ? 0.15 : 0.45) * this.depth;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = (Math.random() - 0.5) * speed;
                this.baseSize = (Math.random() * 1.3 + 0.9) * this.depth;
                this.size = this.baseSize;
                this.baseHue = HUB_HUES[Math.floor(Math.random() * HUB_HUES.length)] + (Math.random() * 10 - 5);
                this.currentColor = { r: 255, g: 255, b: 255 };
                this.twinklePhase = Math.random() * Math.PI * 2;
                this.twinkleSpeed = 0.015 + Math.random() * 0.02;
                this.baseAlpha = Math.min(1, 0.35 + this.depth * 0.4);
                this.alpha = this.baseAlpha;
                this.isHub = false;
                this.spawnFrame = frameCount;
                this.introDuration = 70 + Math.random() * 40;
                this.introEase = 0;
                this.impactBoost = 0;
                this.sphereX = 0;
                this.sphereY = 0;
                this.sphereZ = 0;
                this.spherePhase = 0;
                this.sphereScale = 1;
                this.sphereLight = 0.5;
            }
            update() {
                const freeWeight = 1 - sphereMorph * 0.92;
                this.x += this.vx * freeWeight;
                this.y += this.vy * freeWeight;
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Douce répulsion autour du curseur, plus marquée pour les particules "proches".
                if (mouse.active && sphereMorph < 0.95) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 110 && dist > 0.01) {
                        const force = (110 - dist) / 110 * 0.6 * this.depth * (1 - sphereMorph * 0.7);
                        this.x += (dx / dist) * force;
                        this.y += (dy / dist) * force;
                    }
                }

                // Légère attraction vers l'étoile-hub la plus proche : le nuage se structure
                // naturellement en petits amas au lieu d'une marche aléatoire pure.
                if (!this.isHub && hubs.length && sphereMorph < 0.85) {
                    let nearestHub = null, nearestDist = Infinity;
                    for (let i = 0; i < hubs.length; i++) {
                        const d = Math.hypot(this.x - hubs[i].x, this.y - hubs[i].y);
                        if (d < nearestDist) { nearestDist = d; nearestHub = hubs[i]; }
                    }
                    if (nearestHub && nearestDist > 40 && nearestDist < 260) {
                        const pull = 0.012 * (1 - sphereMorph);
                        this.x += (nearestHub.x - this.x) / nearestDist * pull;
                        this.y += (nearestHub.y - this.y) / nearestDist * pull;
                    }
                }

                if (sphereMorph > 0.001 || sphereTargetMorph > 0.001) {
                    const sphereTarget = projectParticleOnSphere(this);
                    const homeTarget = projectParticleAtHome(this);
                    const blend = smoothstep(sphereMorph);
                    const targetX = homeTarget.x + (sphereTarget.x - homeTarget.x) * blend;
                    const targetY = homeTarget.y + (sphereTarget.y - homeTarget.y) * blend;
                    const morphEase = prefersReducedMotion ? 0.58 : 1 - Math.exp(-canvasFrameDelta / (sphereTargetMorph > sphereMorph ? 180 : 130));
                    this.x += (targetX - this.x) * morphEase;
                    this.y += (targetY - this.y) * morphEase;
                    this.sphereScale = homeTarget.scale + (sphereTarget.scale - homeTarget.scale) * blend;
                    this.sphereLight = homeTarget.light + (sphereTarget.light - homeTarget.light) * blend;
                } else {
                    this.sphereScale += (1 - this.sphereScale) * 0.08;
                    this.sphereLight += (0.5 - this.sphereLight) * 0.08;
                }

                this.twinklePhase += this.twinkleSpeed;
                const sphereSizeBoost = 1 + sphereMorph * (0.35 + this.sphereLight * 0.25);
                this.size = (this.baseSize + Math.sin(this.twinklePhase) * 0.5 * this.depth) * this.sphereScale * sphereSizeBoost;
                this.currentColor = hslToRgb(this.baseHue + hueShift, 0.82, 0.62);
                this.alpha = Math.min(1, this.baseAlpha + sphereMorph * (0.16 + this.sphereLight * 0.22));

                // Apparition en fondu/zoom à la création (chargement de page ou redimensionnement).
                const introT = Math.min(1, (frameCount - this.spawnFrame) / this.introDuration);
                this.introEase = 1 - Math.pow(1 - introT, 3);

                if (this.impactBoost > 0) this.impactBoost = Math.max(0, this.impactBoost - 0.03);
            }
            draw() {
                const rgb = this.currentColor;
                const colorStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                const boost = this.impactBoost || 0;
                const displaySize = (Math.max(0.4, this.size) + boost * 1.6) * this.introEase;
                ctx.save();
                ctx.globalAlpha = Math.min(1, this.alpha + boost * 0.35) * this.introEase;
                ctx.shadowColor = colorStr;
                ctx.shadowBlur = (this.isHub ? (12 + Math.sin(frameCount * 0.05 + this.twinklePhase) * 4) : (4 + this.depth * 5)) + boost * 10;
                if (this.isHub) {
                    const flare = this.size * 4.4 * this.introEase;
                    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.45 * this.alpha})`;
                    ctx.lineWidth = 0.7;
                    ctx.beginPath();
                    ctx.moveTo(this.x - flare, this.y); ctx.lineTo(this.x + flare, this.y);
                    ctx.moveTo(this.x, this.y - flare); ctx.lineTo(this.x, this.y + flare);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(this.x, this.y, displaySize, 0, Math.PI * 2);
                ctx.fillStyle = colorStr;
                ctx.fill();
                ctx.restore();
            }
        }

        function initParticles() {
            particles = [];
            const baseCount = window.innerWidth < 640 ? 42 : 74;
            const count = isLowPower ? Math.round(baseCount * 0.6) : baseCount;
            for (let i = 0; i < count; i++) particles.push(new Particle());
            particles.sort((a, b) => a.depth - b.depth); // lointain dessiné en premier
            [...particles].sort((a, b) => b.depth - a.depth).slice(0, Math.min(7, particles.length)).forEach((p) => { p.isHub = true; });
            hubs = particles.filter((p) => p.isHub);
            assignSphereTargets();
        }

        function initNebula() {
            const span = Math.max(width, height);
            nebulaBlobs = [
                { x: width * 0.18, y: height * 0.28, r: span * 0.4, hue: 192, vx: 0.04, vy: 0.025 },
                { x: width * 0.82, y: height * 0.62, r: span * 0.44, hue: 271, vx: -0.035, vy: 0.02 },
                { x: width * 0.48, y: height * 0.88, r: span * 0.32, hue: 234, vx: 0.025, vy: -0.035 }
            ];
        }

        function drawNebula() {
            if (prefersReducedMotion) return;
            const parallaxX = mouse.active ? (mouse.x - width / 2) * 0.02 : 0;
            const parallaxY = (mouse.active ? (mouse.y - height / 2) * 0.02 : 0) - Math.min(scrollOffset, height) * 0.04 * (1 - sphereMorph);
            nebulaBlobs.forEach((b) => {
                b.x += b.vx; b.y += b.vy;
                if (b.x < -b.r * 0.4 || b.x > width + b.r * 0.4) b.vx *= -1;
                if (b.y < -b.r * 0.4 || b.y > height + b.r * 0.4) b.vy *= -1;
                const cx = b.x + parallaxX, cy = b.y + parallaxY;
                const rgb = hslToRgb(b.hue + hueShift * 0.6, 0.85, 0.55);
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
                grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`);
                grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        function drawSphereGuides() {
            if (sphereMorph <= 0.02) return;
            const sphere = getSphereVisualState();
            const alpha = sphereMorph * (prefersReducedMotion ? 0.16 : 0.28);
            const rotation = frameCount * (prefersReducedMotion ? 0.0008 : 0.006);

            ctx.save();
            ctx.translate(sphere.x, sphere.y);
            ctx.globalAlpha = alpha;

            const glow = ctx.createRadialGradient(0, 0, sphere.radius * 0.12, 0, 0, sphere.radius * 1.18);
            glow.addColorStop(0, 'rgba(34, 211, 238, 0.12)');
            glow.addColorStop(0.55, 'rgba(168, 85, 247, 0.07)');
            glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, sphere.radius * 1.18, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, sphere.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(34, 211, 238, 0.34)';
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate(rotation + i * Math.PI / 4);
                ctx.beginPath();
                ctx.ellipse(0, 0, sphere.radius * 0.96, sphere.radius * 0.22, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.strokeStyle = 'rgba(168, 85, 247, 0.28)';
            [-0.46, -0.22, 0.22, 0.46].forEach((offset) => {
                const latitudeRadius = sphere.radius * Math.sqrt(Math.max(0, 1 - offset * offset));
                ctx.beginPath();
                ctx.ellipse(0, sphere.radius * offset, latitudeRadius, latitudeRadius * 0.16, 0, 0, Math.PI * 2);
                ctx.stroke();
            });

            ctx.restore();
        }

        function spawnBurst(x, y) {
            const count = 18;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
                const speed = 2 + Math.random() * 3.2;
                sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)] });
            }
            sparks.push({ ring: true, x, y, r: 2, life: 1 });
            sparks.push({ ring: true, x, y, r: 2, life: 1, delay: 8 });
            // Les points existants proches du clic reçoivent un net regain d'éclat.
            particles.forEach((p) => {
                if (Math.hypot(p.x - x, p.y - y) < 220) p.impactBoost = 1;
            });
        }

        function updateDrawSparks() {
            if (!sparks.length) return;
            sparks = sparks.filter((s) => s.life > 0);
            sparks.forEach((s) => {
                if (s.ring) {
                    if (s.delay && s.delay > 0) { s.delay--; return; }
                    s.r += 4;
                    s.life -= 0.03;
                    ctx.save();
                    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, s.life) * 0.7})`;
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    return;
                }
                s.x += s.vx; s.y += s.vy;
                s.vx *= 0.96; s.vy *= 0.96;
                s.life -= 0.02;
                const c = hexToRgb(s.color);
                ctx.save();
                ctx.shadowColor = s.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(s.x, s.y, Math.max(0, 1.6 * s.life), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0, s.life)})`;
                ctx.fill();
                ctx.restore();
            });
        }

        function hexToRgb(hex) {
            const v = parseInt(hex.slice(1), 16);
            return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
        }

        function drawLink(x1, y1, x2, y2, alpha, c1, c2, lineWidth) {
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${alpha})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Impulsions lumineuses qui voyagent occasionnellement le long d'une connexion active,
        // pour évoquer une donnée qui circule dans le réseau.
        function maybeSpawnDataPulse() {
            if (prefersReducedMotion) return;
            pulseTimer++;
            if (pulseTimer < 35 || Math.random() > 0.12) return;
            pulseTimer = 0;
            const candidates = [];
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i], b = particles[j];
                    if (Math.hypot(a.x - b.x, a.y - b.y) < LINK_DISTANCE * 0.85) candidates.push([a, b]);
                }
            }
            if (!candidates.length) return;
            const [a, b] = candidates[Math.floor(Math.random() * candidates.length)];
            dataPulses.push({ a, b, t: 0 });
            if (dataPulses.length > 12) dataPulses.shift();
        }

        function drawDataPulses() {
            if (!dataPulses.length) return;
            dataPulses.forEach((p) => {
                if (p.t >= 1 && !p.flashed) {
                    p.flashed = true;
                    sparks.push({ ring: true, x: p.b.x, y: p.b.y, r: 1, life: 0.6 });
                }
            });
            dataPulses = dataPulses.filter((p) => p.t <= 1);
            dataPulses.forEach((p) => {
                const x = p.a.x + (p.b.x - p.a.x) * p.t;
                const y = p.a.y + (p.b.y - p.a.y) * p.t;
                ctx.save();
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(x, y, 1.8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fill();
                ctx.restore();
                p.t += 0.025;
            });
        }

        function buildLightningPath(x1, y1, x2, y2) {
            // Déplacement du milieu (midpoint displacement) pour un tracé en zigzag crédible.
            let points = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
            for (let pass = 0; pass < 4; pass++) {
                const next = [points[0]];
                for (let i = 0; i < points.length - 1; i++) {
                    const a = points[i], b = points[i + 1];
                    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                    const dist = Math.hypot(b.x - a.x, b.y - a.y);
                    const offset = (Math.random() - 0.5) * dist * 0.35;
                    const nx = -(b.y - a.y), ny = (b.x - a.x);
                    const len = Math.hypot(nx, ny) || 1;
                    next.push({ x: mx + (nx / len) * offset, y: my + (ny / len) * offset });
                    next.push(b);
                }
                points = next;
            }
            return points;
        }

        function maybeSpawnLightning() {
            if (prefersReducedMotion || isLowPower || hubs.length < 2) return;
            lightningTimer++;
            if (lightningTimer > 200 && Math.random() < 0.015) {
                lightningTimer = 0;
                const a = hubs[Math.floor(Math.random() * hubs.length)];
                let b = hubs[Math.floor(Math.random() * hubs.length)];
                if (b === a) b = hubs[(hubs.indexOf(a) + 1) % hubs.length];
                lightningBolts.push({ path: buildLightningPath(a.x, a.y, b.x, b.y), life: 1 });
                flashIntensity = Math.min(1, flashIntensity + 0.25);
            }
        }

        function drawLightning() {
            if (!lightningBolts.length) return;
            lightningBolts = lightningBolts.filter((l) => l.life > 0);
            lightningBolts.forEach((l) => {
                l.life -= 0.06;
                ctx.save();
                ctx.shadowColor = '#e0f2fe';
                ctx.shadowBlur = 16;
                ctx.strokeStyle = `rgba(224, 242, 254, ${Math.max(0, l.life)})`;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                l.path.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
                ctx.stroke();
                ctx.restore();
            });
        }

        function maybeSpawnAutoSupernova() {
            if (prefersReducedMotion || isLowPower || !hubs.length) return;
            supernovaTimer++;
            if (supernovaTimer > 240 && Math.random() < 0.012) {
                supernovaTimer = 0;
                const hub = hubs[Math.floor(Math.random() * hubs.length)];
                spawnBurst(hub.x, hub.y);
                flashIntensity = Math.min(1, flashIntensity + 0.35);
            }
        }

        function maybeSpawnShootingStar() {
            if (prefersReducedMotion || isLowPower || shootingStars.length >= 5) return;
            shootingStarTimer++;
            if (shootingStarTimer > 90 && Math.random() < 0.025) {
                shootingStarTimer = 0;
                const isShower = Math.random() < 0.25;
                const count = isShower ? 3 : 1;
                for (let i = 0; i < count; i++) {
                    const startX = Math.random() * width * 0.7;
                    shootingStars.push({
                        x: startX, y: -10 - i * 40,
                        vx: 4.5 + Math.random() * 4, vy: 5.5 + Math.random() * 3,
                        life: 1
                    });
                }
            }
        }

        function drawShootingStar() {
            if (!shootingStars.length) return;
            shootingStars = shootingStars.filter((s) => s.life > 0 && s.y <= height + 20);
            shootingStars.forEach((s) => {
                s.x += s.vx;
                s.y += s.vy;
                s.life -= 0.01;
                const tailX = s.x - s.vx * 11;
                const tailY = s.y - s.vy * 11;
                const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
                grad.addColorStop(0, `rgba(255, 255, 255, ${s.life})`);
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.save();
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 12;
                ctx.strokeStyle = grad;
                ctx.lineWidth = 2.1;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(tailX, tailY);
                ctx.stroke();
                ctx.restore();
            });
        }

        function drawVignette() {
            const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.32, width / 2, height / 2, Math.max(width, height) * 0.78);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(1, 'rgba(2, 6, 23, 0.4)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        }

        function animateCanvas() {
            if (!canvasIsVisible || document.hidden) {
                canvasFrameId = null;
                return;
            }

            frameCount++;
            const now = performance.now();
            const frameDelta = lastCanvasTime ? Math.min(500, now - lastCanvasTime) : 16;
            lastCanvasTime = now;
            canvasFrameDelta = frameDelta;
            hueShift = Math.sin(frameCount * 0.004) * 26;
            updateScrollState();
            const morphDuration = prefersReducedMotion ? 90 : (sphereTargetMorph > sphereMorph ? 260 : 220);
            const morphStep = 1 - Math.exp(-frameDelta / morphDuration);
            sphereMorph += (sphereTargetMorph - sphereMorph) * morphStep;

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
            drawNebula();
            ctx.globalCompositeOperation = isLowPower ? 'source-over' : 'lighter';
            drawSphereGuides();

            // Liens entre particules proches : dégradé de couleur + épaisseur selon la proximité et la profondeur.
            const activeLinkDistance = LINK_DISTANCE - sphereMorph * 42;
            particles.forEach((p, index) => {
                p.update();
                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < activeLinkDistance) {
                        const proximity = 1 - dist / activeLinkDistance;
                        const avgDepth = (p.depth + p2.depth) / 2;
                        const sphereAlpha = 0.7 + sphereMorph * 0.22;
                        drawLink(p.x, p.y, p2.x, p2.y, proximity * sphereAlpha * avgDepth, p.currentColor, p2.currentColor, 0.5 + proximity * (1.35 + sphereMorph * 0.5) * avgDepth);
                    }
                }
                // Lien vers le curseur : la toile réagit à la souris.
                if (mouse.active && sphereMorph < 0.9) {
                    const distMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                    if (distMouse < MOUSE_LINK_DISTANCE) {
                        const proximity = 1 - distMouse / MOUSE_LINK_DISTANCE;
                        drawLink(p.x, p.y, mouse.x, mouse.y, proximity * 0.5 * (1 - sphereMorph), p.currentColor, { r: 255, g: 255, b: 255 }, 0.4 + proximity * 1.1);
                    }
                }
            });
            particles.forEach((p) => p.draw());
            updateDrawSparks();
            maybeSpawnDataPulse();
            maybeSpawnAutoSupernova();
            maybeSpawnLightning();
            drawLightning();
            drawDataPulses();

            if (mouse.active) {
                cursorTrail.push({ x: mouse.x, y: mouse.y });
                if (cursorTrail.length > 10) cursorTrail.shift();
            } else if (cursorTrail.length) {
                cursorTrail.shift();
            }
            if (cursorTrail.length > 1) {
                for (let i = 1; i < cursorTrail.length; i++) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${(i / cursorTrail.length) * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(cursorTrail[i - 1].x, cursorTrail[i - 1].y);
                    ctx.lineTo(cursorTrail[i].x, cursorTrail[i].y);
                    ctx.stroke();
                }
            }

            if (mouse.active) {
                cursorRingAngle += 0.015;
                ctx.save();
                ctx.translate(mouse.x, mouse.y);
                ctx.rotate(cursorRingAngle);
                ctx.setLineDash([3, 5]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                ctx.save();
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fill();
                ctx.restore();
            }

            maybeSpawnShootingStar();
            drawShootingStar();
            ctx.globalCompositeOperation = 'source-over';
            if (flashIntensity > 0.001) {
                ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.16})`;
                ctx.fillRect(0, 0, width, height);
                flashIntensity *= 0.88;
            } else {
                flashIntensity = 0;
            }
            drawVignette();

            canvasFrameId = requestAnimationFrame(animateCanvas);
        }

        function startCanvasAnimation() {
            if (canvasFrameId === null) {
                canvasFrameId = requestAnimationFrame(animateCanvas);
            }
        }

        function stopCanvasAnimation() {
            if (canvasFrameId !== null) {
                cancelAnimationFrame(canvasFrameId);
                canvasFrameId = null;
            }
        }

        resize();
        startCanvasAnimation();

        // Le canvas reste actif sur toutes les sections pour garder la sphere visible pendant la navigation.
        canvasIsVisible = true;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stopCanvasAnimation();
            else if (canvasIsVisible) startCanvasAnimation();
        });

        // --- 2. Scroll Reveal Animation ---
        const observerOptions = { threshold: 0.1 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        const revealElements = Array.from(document.querySelectorAll('.reveal'));
        let revealTicking = false;

        function activateVisibleReveals() {
            const activationLine = window.innerHeight * 0.92;
            revealElements.forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.top < activationLine && rect.bottom > -80) {
                    el.classList.add('active');
                }
            });
        }

        function scheduleRevealCheck() {
            if (revealTicking) return;
            revealTicking = true;
            requestAnimationFrame(() => {
                revealTicking = false;
                activateVisibleReveals();
            });
        }

        function activateHashTargetReveals() {
            if (!location.hash || location.hash === '#home') return;
            let target = null;
            try {
                target = document.querySelector(location.hash);
            } catch (error) {
                target = null;
            }
            target?.querySelectorAll('.reveal').forEach((el) => el.classList.add('active'));
        }

        revealElements.forEach(el => observer.observe(el));
        activateVisibleReveals();
        window.addEventListener('load', () => {
            scheduleRevealCheck();
            activateHashTargetReveals();
            setTimeout(activateVisibleReveals, 250);
            setTimeout(activateHashTargetReveals, 450);
        });
        window.addEventListener('hashchange', () => {
            scheduleRevealCheck();
            setTimeout(activateHashTargetReveals, 250);
        });
        window.addEventListener('scroll', scheduleRevealCheck, { passive: true });

        // --- 3. Navbar Interaction (Updated for Floating Pill) ---
        // Mobile Menu
        const btn = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        let mobileMenuCloseTimer = null;
        
        function openMobileMenu() {
            if (!btn || !menu) return;
            if (mobileMenuCloseTimer) {
                clearTimeout(mobileMenuCloseTimer);
                mobileMenuCloseTimer = null;
            }
            menu.classList.remove('hidden');
            btn.setAttribute('aria-expanded', 'true');
            menu.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => {
                menu.classList.remove('opacity-0', 'scale-95', 'translate-y-4');
            });
        }

        function closeMobileMenu() {
            if (!btn || !menu) return;
            menu.classList.add('opacity-0', 'scale-95', 'translate-y-4');
            btn.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
            if (mobileMenuCloseTimer) clearTimeout(mobileMenuCloseTimer);
            mobileMenuCloseTimer = setTimeout(() => {
                menu.classList.add('hidden');
                mobileMenuCloseTimer = null;
            }, 250);
        }

        btn?.addEventListener('click', () => {
            if (menu.classList.contains('hidden')) openMobileMenu();
            else closeMobileMenu();
        });

        // Close menu when clicking a link
        document.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        document.addEventListener('click', (event) => {
            if (!btn || !menu || menu.classList.contains('hidden')) return;
            const target = event.target instanceof Element ? event.target : event.target?.parentElement;
            if (!target) return;
            if (!target.closest('#mobile-menu') && !target.closest('#mobile-menu-btn')) {
                closeMobileMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && menu && !menu.classList.contains('hidden')) {
                closeMobileMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768 && menu && !menu.classList.contains('hidden')) {
                closeMobileMenu();
            }
        });

        // --- 4. FREEV BRAIN V7 : CONVERSATION ÉCRITE ET VOCALE ---
        const FREEV_V7_SERVER = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
            ? 'http://127.0.0.1:10000'
            : 'https://freev-iies.onrender.com';
        window.FreevV7Server = FREEV_V7_SERVER;
        const freevV7State = { online: false, sending: false, mode: 'freev' };

        function setFreevV7Status(label, tone) {
            const status = document.getElementById('freev-v7-status');
            const dot = document.getElementById('freev-v7-status-dot');
            const send = document.getElementById('freev-v7-send');
            if (!status || !dot) return;
            const tones = {
                ok: ['bg-emerald-400', 'text-emerald-200', 'En ligne'],
                wait: ['bg-amber-400', 'text-amber-200', 'Connexion…'],
                error: ['bg-red-400', 'text-red-200', 'Indisponible']
            };
            const selected = tones[tone] || tones.wait;
            dot.className = 'h-2 w-2 rounded-full ' + selected[0]
                + (tone === 'wait' ? ' freev-status-thinking-dot' : '');
            status.className = 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] ' + selected[1];
            status.lastChild.textContent = ' ' + (label || selected[2]);
            if (send) {
                send.disabled = freevV7State.sending
                    || (freevV7State.mode === 'freev' && !freevV7State.online);
            }
        }

        function appendFreevV7Message(role, text, assistantLabel) {
            const output = document.getElementById('freev-v7-output');
            if (!output) return;
            const box = document.createElement('div');
            const title = document.createElement('p');
            const body = document.createElement('p');
            const isUser = role === 'user';
            box.className = isUser
                ? 'ml-6 rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/5 p-3 text-gray-200'
                : 'mr-6 rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3 text-gray-300';
            title.className = isUser ? 'font-bold text-fuchsia-200' : 'font-bold text-cyan-200';
            title.textContent = isUser ? 'Toi' : (assistantLabel || 'Freev V7');
            body.className = 'mt-1 whitespace-pre-wrap leading-relaxed';
            body.textContent = String(text || '');
            box.append(title, body);
            output.appendChild(box);
            output.scrollTop = output.scrollHeight;
            return box;
        }

        function startFreevThinking(box, options = {}) {
            const body = box?.querySelector('p:last-child');
            const output = document.getElementById('freev-v7-output');
            if (!body) return box;

            const headline = String(options.headline || 'Le modèle réfléchit');
            const detail = String(options.detail || 'Préparation de la réponse');
            box.classList.add('freev-thinking-message');
            box.dataset.freevThinking = 'true';
            box.setAttribute('role', 'status');
            box.setAttribute('aria-label', `${headline}. ${detail}`);
            output?.setAttribute('aria-busy', 'true');

            body.className = 'freev-thinking-body mt-2';
            body.replaceChildren();

            const orb = document.createElement('span');
            orb.className = 'freev-thinking-orb';
            orb.setAttribute('aria-hidden', 'true');
            const ringOne = document.createElement('span');
            const ringTwo = document.createElement('span');
            const core = document.createElement('span');
            ringOne.className = 'freev-thinking-ring';
            ringTwo.className = 'freev-thinking-ring';
            core.className = 'freev-thinking-core';
            orb.append(ringOne, ringTwo, core);

            const copy = document.createElement('span');
            copy.className = 'freev-thinking-copy';
            const headlineRow = document.createElement('span');
            headlineRow.className = 'freev-thinking-headline';
            const headlineText = document.createElement('span');
            headlineText.textContent = headline;
            const dots = document.createElement('span');
            dots.className = 'freev-thinking-dots';
            dots.setAttribute('aria-hidden', 'true');
            for (let index = 0; index < 3; index += 1) {
                const dot = document.createElement('span');
                dot.className = 'freev-thinking-dot';
                dots.appendChild(dot);
            }
            headlineRow.append(headlineText, dots);

            const detailText = document.createElement('span');
            detailText.className = 'freev-thinking-detail';
            detailText.textContent = detail;
            copy.append(headlineRow, detailText);
            body.append(orb, copy);
            if (output) output.scrollTop = output.scrollHeight;
            window.dispatchEvent(new CustomEvent('freev:thinking-start', {
                detail: { headline, detail }
            }));
            return box;
        }

        function finishFreevThinking(box, text) {
            const body = box?.querySelector('p:last-child');
            const output = document.getElementById('freev-v7-output');
            if (!body) return;
            box.classList.remove('freev-thinking-message');
            delete box.dataset.freevThinking;
            box.removeAttribute('role');
            box.removeAttribute('aria-label');
            body.className = 'mt-1 whitespace-pre-wrap leading-relaxed';
            body.textContent = String(text || 'Réponse vide.');
            output?.setAttribute('aria-busy', 'false');
            if (output) output.scrollTop = output.scrollHeight;
            window.dispatchEvent(new CustomEvent('freev:assistant-response', {
                detail: { text: String(text || 'Réponse vide.') }
            }));
        }

        async function checkFreevV7() {
            setFreevV7Status('Connexion…', 'wait');
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 20000);
                const response = await fetch(FREEV_V7_SERVER + '/status', {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                    cache: 'no-store'
                });
                clearTimeout(timer);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const status = await response.json();
                const isPublicV7 = status.ok && String(status.version || '').startsWith('7')
                    && status.mode === 'conversation-texte'
                    && status.ollama === false
                    && status.code_mode === true
                    && status.html_mode === true
                    && status.full_runtime === true
                    && Number(status.full_runtime_files || 0) >= 248
                    && status.voice === true
                    && status.voice_runtime === 'browser-immersive';
                if (!isPublicV7) throw new Error('service V7 public non vérifié');
                freevV7State.online = true;
                if (freevV7State.mode === 'freev') setFreevV7Status('En ligne', 'ok');
            } catch (error) {
                freevV7State.online = false;
                if (freevV7State.mode === 'freev') setFreevV7Status('Migration V7 en cours', 'error');
            }
        }

        async function sendFreevV7Message(message) {
            const prompt = String(message || '').trim();
            if (!prompt || freevV7State.sending || !freevV7State.online || freevV7State.mode !== 'freev') return;
            appendFreevV7Message('user', prompt);
            const waiting = appendFreevV7Message('assistant', 'Préparation de la réponse…');
            startFreevThinking(waiting, {
                headline: 'Freev V7 réfléchit',
                detail: 'Recherche dans la base native Freev'
            });
            freevV7State.sending = true;
            setFreevV7Status('Réponse en cours…', 'wait');
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 45000);
                const response = await fetch(FREEV_V7_SERVER + '/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ message: prompt }),
                    signal: controller.signal
                });
                clearTimeout(timer);
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.ok || data.version !== '7.0') {
                    throw new Error(data.error || 'réponse V7 invalide');
                }
                finishFreevThinking(waiting, data.response || 'Réponse vide.');
                window.FreevAiOptions?.saveHistory?.({
                    mode: 'freev',
                    model: 'Freev Brain V7',
                    question: prompt,
                    response: data.response || ''
                });
                freevV7State.online = true;
                setFreevV7Status('En ligne', 'ok');
            } catch (error) {
                finishFreevThinking(waiting, 'Freev V7 est momentanément indisponible. Réessaie dans quelques instants.');
                freevV7State.online = false;
                setFreevV7Status('Indisponible', 'error');
            } finally {
                freevV7State.sending = false;
                const send = document.getElementById('freev-v7-send');
                if (send) send.disabled = !freevV7State.online;
            }
        }

        async function submitFreevV7Prompt(message) {
            const prompt = String(message || '').trim();
            if (!prompt || freevV7State.sending) return false;
            if (freevV7State.mode === 'custom') {
                if (!window.FreevAiOptions?.sendCustomMessage) return false;
                await window.FreevAiOptions.sendCustomMessage(prompt);
                return true;
            }
            if (!freevV7State.online) return false;
            await sendFreevV7Message(prompt);
            return true;
        }

        const freevV7Form = document.getElementById('freev-v7-form');
        const freevV7Input = document.getElementById('freev-v7-input');
        freevV7Form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const prompt = (freevV7Input?.value || '').trim();
            if (!prompt) return;
            if (freevV7Input) freevV7Input.value = '';
            void submitFreevV7Prompt(prompt);
        });
        freevV7Input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                freevV7Form?.requestSubmit();
            }
        });
        window.FreevV7Chat = Object.freeze({
            state: freevV7State,
            setStatus: setFreevV7Status,
            appendMessage: appendFreevV7Message,
            startThinking: startFreevThinking,
            finishThinking: finishFreevThinking,
            submitPrompt: submitFreevV7Prompt,
            checkNative: checkFreevV7
        });
        checkFreevV7();
