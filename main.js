/* ═══════════════════════════════════════════════════════════════════
   Carbon — Intelligence Designed To Evolve
   JavaScript Logic: Counter, Mobile Navigation & Payment Gateway
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── 1. Count-Up Animation System ── */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCount(el, target, decimals, suffix, duration, startOffset) {
    let started = false;

    function run() {
      if (started) return;
      started = true;

      const startTime = performance.now() + startOffset;

      function tick(now) {
        const elapsed = now - startTime;
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

  const statEls = document.querySelectorAll(".stat");
  const runners = [];

  statEls.forEach((stat, i) => {
    const valueEl = stat.querySelector(".stat-value");
    const target = parseFloat(stat.dataset.target);
    const suffix = stat.dataset.suffix || "";
    const decimals = parseInt(stat.dataset.decimals, 10) || 0;
    const duration = 1500 + i * 80;
    const startOffset = 480 + i * 90;

    valueEl.textContent = (0).toFixed(decimals) + suffix;
    runners.push(animateCount(valueEl, target, decimals, suffix, duration, startOffset));
  });

  if ("IntersectionObserver" in window) {
    const statsContainer = document.getElementById("stats");
    let triggered = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            runners.forEach((run) => run());
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
    runners.forEach((run) => run());
  }

  /* ── 2. Mobile Navigation System ── */
  const burger = document.querySelector(".burger");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileOverlayBg = document.querySelector(".mobile-overlay-bg");
  const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-sign-in");

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
    burger.addEventListener("click", () => {
      const isOpen = burger.classList.contains("open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (mobileOverlayBg) {
    mobileOverlayBg.addEventListener("click", closeMenu);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Close on Escape or Window Resize > 720px
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 720 && mobileMenu && !mobileMenu.hasAttribute("hidden")) {
        closeMenu();
      }
    }, 100);
  });

  /* ── 3. Creator Payment Gateway System ── */
  const supportTrigger = document.getElementById("support-trigger");
  const mobileSupportTrigger = document.getElementById("mobile-support-trigger");
  const supportModal = document.getElementById("support-modal");
  const supportClose = document.getElementById("support-close");
  const supportBackdrop = document.getElementById("support-backdrop");
  const tierCards = document.querySelectorAll(".tier-card");
  const payMethods = document.querySelectorAll(".pay-method");
  const checkoutBtn = document.getElementById("pay-checkout-btn");
  const checkoutAmount = document.getElementById("checkout-amount");

  let selectedAmount = 10;
  let selectedMethod = "card";

  function openSupportModal() {
    if (mobileMenu && !mobileMenu.hasAttribute("hidden")) {
      closeMenu();
    }
    if (supportModal) {
      supportModal.removeAttribute("hidden");
    }
  }

  function closeSupportModal() {
    if (supportModal) {
      supportModal.setAttribute("hidden", "");
    }
  }

  if (supportTrigger) supportTrigger.addEventListener("click", openSupportModal);
  if (mobileSupportTrigger) mobileSupportTrigger.addEventListener("click", openSupportModal);
  if (supportClose) supportClose.addEventListener("click", closeSupportModal);
  if (supportBackdrop) supportBackdrop.addEventListener("click", closeSupportModal);

  // Keyboard Escape Handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (mobileMenu && !mobileMenu.hasAttribute("hidden")) closeMenu();
      if (supportModal && !supportModal.hasAttribute("hidden")) closeSupportModal();
    }
  });

  // Tier Selection
  tierCards.forEach((card) => {
    card.addEventListener("click", () => {
      tierCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      selectedAmount = parseInt(card.dataset.amount, 10);
      updateCheckoutButton();
    });
  });

  // Payment Method Selection
  payMethods.forEach((btn) => {
    btn.addEventListener("click", () => {
      payMethods.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMethod = btn.dataset.method;
      updateCheckoutButton();
    });
  });

  function updateCheckoutButton() {
    if (!checkoutAmount || !checkoutBtn) return;
    checkoutAmount.textContent = `$${selectedAmount}`;
    const methodName = selectedMethod === "card" ? "Card / Stripe" : selectedMethod === "bmac" ? "Buy Me a Coffee" : "UPI / QR";
    checkoutBtn.querySelector("span").innerHTML = `Support <strong id="checkout-amount">$${selectedAmount}</strong> via ${methodName}`;
  }

  // Checkout Execution
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (selectedMethod === "bmac") {
        window.open(`https://buymeacoffee.com?amount=${selectedAmount}`, "_blank");
      } else {
        checkoutBtn.innerHTML = `<span><i class="fa-solid fa-circle-notch fa-spin"></i> Processing $${selectedAmount}...</span>`;
        setTimeout(() => {
          checkoutBtn.innerHTML = `<span><i class="fa-solid fa-check"></i> Thank you for your support! ❤️</span>`;
          checkoutBtn.style.background = "#22c55e";
          checkoutBtn.style.color = "#ffffff";
          setTimeout(() => {
            closeSupportModal();
            updateCheckoutButton();
            checkoutBtn.style.background = "#ffffff";
            checkoutBtn.style.color = "#000000";
          }, 1800);
        }, 1200);
      }
    });
  }
})();
