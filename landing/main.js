/* ═══════════════════════════════════════════════════════
   Carbon Landing — main.js
   Count-up stats, mobile menu, support modal
   ═══════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Count-up animation ── */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCount(el, target, decimals, suffix, duration, startOffset) {
    let started = false;

    function run() {
      if (started) return;
      started = true;

      const start = performance.now() + startOffset;

      function tick(now) {
        const elapsed = now - start;
        if (elapsed < 0) {
          requestAnimationFrame(tick);
          return;
        }

        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        const current = eased * target;

        el.textContent = current.toFixed(decimals) + suffix;

        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      }

      requestAnimationFrame(tick);
    }

    return run;
  }

  // Set up stat counters with IntersectionObserver
  const statEls = document.querySelectorAll(".stat");
  const runners = [];

  statEls.forEach(function (stat, i) {
    const valueEl = stat.querySelector(".stat-value");
    const target = parseFloat(stat.dataset.target);
    const suffix = stat.dataset.suffix || "";
    const decimals = parseInt(stat.dataset.decimals, 10) || 0;
    const duration = 1500 + i * 80;
    const startOffset = 480 + i * 90;

    // Set initial display
    valueEl.textContent = (0).toFixed(decimals) + suffix;

    runners.push(animateCount(valueEl, target, decimals, suffix, duration, startOffset));
  });

  // Use IntersectionObserver to trigger count when stats are visible
  if ("IntersectionObserver" in window) {
    const statsContainer = document.getElementById("stats");
    let triggered = false;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            runners.forEach(function (run) {
              run();
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    if (statsContainer) {
      observer.observe(statsContainer);
    }
  } else {
    // Fallback: run immediately
    runners.forEach(function (run) {
      run();
    });
  }

  /* ── Mobile menu ── */
  const burger = document.querySelector(".burger");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-sign-in");
  const overlayBg = document.querySelector(".mobile-overlay-bg");

  function openMenu() {
    burger.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    mobileMenu.removeAttribute("hidden");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("hidden", "");
    document.body.classList.remove("menu-open");
  }

  if (burger) {
    burger.addEventListener("click", function () {
      var isOpen = burger.classList.contains("open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  // Close on overlay background click
  if (overlayBg) {
    overlayBg.addEventListener("click", closeMenu);
  }

  // Close on mobile link click
  mobileLinks.forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  // Close on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (mobileMenu && !mobileMenu.hasAttribute("hidden")) {
        closeMenu();
      }
      // Also close support modal
      var modal = document.getElementById("support-modal");
      if (modal && !modal.hasAttribute("hidden")) {
        closeSupportModal();
      }
    }
  });

  // Close on resize above 720px
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth > 720 && mobileMenu && !mobileMenu.hasAttribute("hidden")) {
        closeMenu();
      }
    }, 100);
  });

  /* ── Support modal ── */
  var supportTrigger = document.getElementById("support-trigger");
  var supportModal = document.getElementById("support-modal");
  var supportClose = document.querySelector(".support-close");
  var supportBackdrop = document.querySelector(".support-backdrop");

  function openSupportModal() {
    if (supportModal) {
      supportModal.removeAttribute("hidden");
    }
  }

  function closeSupportModal() {
    if (supportModal) {
      supportModal.setAttribute("hidden", "");
    }
  }

  if (supportTrigger) {
    supportTrigger.addEventListener("click", openSupportModal);
  }

  if (supportClose) {
    supportClose.addEventListener("click", closeSupportModal);
  }

  if (supportBackdrop) {
    supportBackdrop.addEventListener("click", closeSupportModal);
  }
})();
