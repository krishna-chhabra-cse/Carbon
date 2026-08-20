// ============================================================
//  src/components/CosmicCanvas.jsx
//
//  Ultra-performant 60 FPS Canvas space engine.
//  Renders layered starfields, depth-based parallax, glowing
//  nebula dust clouds, and occasional shooting stars.
//  Zero DOM overhead — single GPU-accelerated canvas.
//  Respects prefers-reduced-motion and tab visibility.
// ============================================================

import { useEffect, useRef } from 'react';

export default function CosmicCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse coordinates for subtle parallax
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // ── Generate Stars & Nebulas ─────────────────────────────
    const NUM_STARS = Math.min(Math.floor((width * height) / 3500), 500);
    let stars = [];
    let nebulas = [];
    let shootingStars = [];

    const STAR_COLORS = [
      '#ffffff', // Pure white
      '#e0f2fe', // Soft cyan
      '#ede9fe', // Light lavender
      '#fbcfe8', // Pale pink
      '#bae6fd', // Sky blue
      '#fef08a'  // Pale gold
    ];

    function initStars() {
      stars = [];
      for (let i = 0; i < NUM_STARS; i++) {
        const depth = Math.random() * 3 + 1; // 1 (far) to 4 (near)
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: (Math.random() * 1.2 + 0.3) * (depth / 2.5),
          color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
          alpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
          depth: depth,
          isSpiked: depth > 3.2 && Math.random() > 0.7 // Bright foreground stars have spikes
        });
      }

      // 4 Ambient Nebula Clusters
      nebulas = [
        {
          x: width * 0.15,
          y: height * 0.25,
          radius: Math.max(width, height) * 0.35,
          color: 'rgba(99, 102, 241, 0.07)', // Indigo nebula
          pulse: 0
        },
        {
          x: width * 0.85,
          y: height * 0.35,
          radius: Math.max(width, height) * 0.4,
          color: 'rgba(168, 85, 247, 0.06)', // Violet nebula
          pulse: Math.PI / 2
        },
        {
          x: width * 0.4,
          y: height * 0.8,
          radius: Math.max(width, height) * 0.38,
          color: 'rgba(56, 189, 248, 0.05)', // Cyan cosmic dust
          pulse: Math.PI
        },
        {
          x: width * 0.75,
          y: height * 0.85,
          radius: Math.max(width, height) * 0.3,
          color: 'rgba(244, 63, 94, 0.04)', // Rose supernova remnant
          pulse: (3 * Math.PI) / 2
        }
      ];
    }

    initStars();

    // ── Shooting Stars Spawner ───────────────────────────────
    function spawnShootingStar() {
      if (prefersReducedMotion || shootingStars.length >= 2) return;
      if (Math.random() < 0.008) {
        shootingStars.push({
          x: Math.random() * width * 0.8 + width * 0.1,
          y: Math.random() * height * 0.4,
          length: Math.random() * 80 + 60,
          speed: Math.random() * 12 + 10,
          angle: (Math.PI / 4) + (Math.random() * 0.2 - 0.1),
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015
        });
      }
    }

    // ── Render Loop ──────────────────────────────────────────
    let lastTime = performance.now();

    function render(currentTime) {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const parallaxOffsetX = (mouseX - width / 2) * 0.02;
      const parallaxOffsetY = (mouseY - height / 2) * 0.02;

      // Clear with deep space canvas gradient
      ctx.clearRect(0, 0, width, height);

      // Deep space base
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);

      // ── Draw Nebulas ───────────────────────────────────────
      for (const neb of nebulas) {
        if (!prefersReducedMotion) {
          neb.pulse += delta * 0.2;
        }
        const pulseScale = 1 + Math.sin(neb.pulse) * 0.05;
        const gradient = ctx.createRadialGradient(
          neb.x - parallaxOffsetX * 0.5,
          neb.y - parallaxOffsetY * 0.5,
          0,
          neb.x - parallaxOffsetX * 0.5,
          neb.y - parallaxOffsetY * 0.5,
          neb.radius * pulseScale
        );
        gradient.addColorStop(0, neb.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          neb.x - parallaxOffsetX * 0.5,
          neb.y - parallaxOffsetY * 0.5,
          neb.radius * pulseScale,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // ── Draw Stars ─────────────────────────────────────────
      for (const star of stars) {
        if (!prefersReducedMotion) {
          star.alpha += star.twinkleSpeed;
          if (star.alpha > 0.95 || star.alpha < 0.25) {
            star.twinkleSpeed = -star.twinkleSpeed;
          }
        }

        // Apply depth-dependent parallax offset
        const drawX = star.x - parallaxOffsetX * star.depth;
        const drawY = star.y - parallaxOffsetY * star.depth;

        // Wrap around screen boundaries
        const finalX = ((drawX % width) + width) % width;
        const finalY = ((drawY % height) + height) % height;

        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));

        ctx.beginPath();
        ctx.arc(finalX, finalY, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // 4-point diffraction spike for prominent stars
        if (star.isSpiked && star.alpha > 0.6) {
          ctx.strokeStyle = star.color;
          ctx.lineWidth = 0.5;
          const spikeLen = star.radius * 3.5;

          ctx.beginPath();
          ctx.moveTo(finalX - spikeLen, finalY);
          ctx.lineTo(finalX + spikeLen, finalY);
          ctx.moveTo(finalX, finalY - spikeLen);
          ctx.lineTo(finalX, finalY + spikeLen);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1.0;

      // ── Draw Shooting Stars ────────────────────────────────
      spawnShootingStar();

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const meteor = shootingStars[i];
        meteor.x += Math.cos(meteor.angle) * meteor.speed;
        meteor.y += Math.sin(meteor.angle) * meteor.speed;
        meteor.alpha -= meteor.decay;

        if (meteor.alpha <= 0 || meteor.x > width + 100 || meteor.y > height + 100) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = meteor.x - Math.cos(meteor.angle) * meteor.length;
        const tailY = meteor.y - Math.sin(meteor.angle) * meteor.length;

        const meteorGrad = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        meteorGrad.addColorStop(0, 'transparent');
        meteorGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.4)');
        meteorGrad.addColorStop(1, `rgba(255, 255, 255, ${meteor.alpha})`);

        ctx.strokeStyle = meteorGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    // Auto-pause when tab is backgrounded
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'block'
      }}
      aria-hidden="true"
    />
  );
}
