/**
 * SwapSkills — main.js (fixed)
 * Based on eNno Bootstrap Template
 * All vendor inits wrapped in safety checks so inner pages don't crash
 */

(function () {
  "use strict";

  /* ── Scroll class on body ── */
  function toggleScrolled() {
    const selectBody = document.querySelector("body");
    const selectHeader = document.querySelector("#header");
    if (
      !selectHeader ||
      (!selectHeader.classList.contains("scroll-up-sticky") &&
        !selectHeader.classList.contains("sticky-top") &&
        !selectHeader.classList.contains("fixed-top"))
    )
      return;
    window.scrollY > 100
      ? selectBody.classList.add("scrolled")
      : selectBody.classList.remove("scrolled");
  }
  document.addEventListener("scroll", toggleScrolled);
  window.addEventListener("load", toggleScrolled);

  /* ── Mobile nav toggle (hamburger) ── */
  const mobileNavToggleBtn = document.querySelector(".mobile-nav-toggle");
  if (mobileNavToggleBtn) {
    function mobileNavToggle() {
      document.querySelector("body").classList.toggle("mobile-nav-active");
      mobileNavToggleBtn.classList.toggle("bi-list");
      mobileNavToggleBtn.classList.toggle("bi-x");
    }
    mobileNavToggleBtn.addEventListener("click", mobileNavToggle);

    // Close mobile nav when a link is clicked
    document.querySelectorAll("#navmenu a").forEach((link) => {
      link.addEventListener("click", () => {
        if (document.querySelector(".mobile-nav-active")) {
          mobileNavToggle();
        }
      });
    });
  }

  /* ── Toggle mobile nav dropdowns ── */
  document.querySelectorAll(".navmenu .toggle-dropdown").forEach((el) => {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      this.parentNode.classList.toggle("active");
      if (this.parentNode.nextElementSibling) {
        this.parentNode.nextElementSibling.classList.toggle("dropdown-active");
      }
      e.stopImmediatePropagation();
    });
  });

  /* ── Preloader ── */
  const preloader = document.querySelector("#preloader");
  if (preloader) {
    window.addEventListener("load", () => preloader.remove());
  }

  /* ── Scroll-to-top button ── */
  const scrollTop = document.querySelector(".scroll-top");
  if (scrollTop) {
    function toggleScrollTop() {
      window.scrollY > 100
        ? scrollTop.classList.add("active")
        : scrollTop.classList.remove("active");
    }
    scrollTop.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("load", toggleScrollTop);
    document.addEventListener("scroll", toggleScrollTop);
  }

  /* ── AOS (animate on scroll) ── */
  if (typeof AOS !== "undefined") {
    function aosInit() {
      AOS.init({ duration: 600, easing: "ease-in-out", once: true, mirror: false });
    }
    window.addEventListener("load", aosInit);
  }

  /* ── GLightbox (only if loaded) ── */
  if (typeof GLightbox !== "undefined") {
    try { GLightbox({ selector: ".glightbox" }); } catch (e) { /* skip */ }
  }

  /* ── PureCounter (only if loaded) ── */
  if (typeof PureCounter !== "undefined") {
    try { new PureCounter(); } catch (e) { /* skip */ }
  }

  /* ── Isotope layout (only if loaded) ── */
  if (typeof Isotope !== "undefined" && typeof imagesLoaded !== "undefined") {
    document.querySelectorAll(".isotope-layout").forEach(function (isotopeItem) {
      let layout = isotopeItem.getAttribute("data-layout") ?? "masonry";
      let filter = isotopeItem.getAttribute("data-default-filter") ?? "*";
      let sort = isotopeItem.getAttribute("data-sort") ?? "original-order";
      let initIsotope;
      imagesLoaded(isotopeItem.querySelector(".isotope-container"), function () {
        initIsotope = new Isotope(isotopeItem.querySelector(".isotope-container"), {
          itemSelector: ".isotope-item", layoutMode: layout, filter: filter, sortBy: sort,
        });
      });
      isotopeItem.querySelectorAll(".isotope-filters li").forEach(function (f) {
        f.addEventListener("click", function () {
          isotopeItem.querySelector(".isotope-filters .filter-active")?.classList.remove("filter-active");
          this.classList.add("filter-active");
          if (initIsotope) initIsotope.arrange({ filter: this.getAttribute("data-filter") });
        }, false);
      });
    });
  }

  /* ── Swiper (only if loaded) ── */
  if (typeof Swiper !== "undefined") {
    function initSwiper() {
      document.querySelectorAll(".init-swiper").forEach(function (el) {
        const configEl = el.querySelector(".swiper-config");
        if (!configEl) return;
        let config = JSON.parse(configEl.innerHTML.trim());
        new Swiper(el, config);
      });
    }
    window.addEventListener("load", initSwiper);
  }

  /* ── Hash-link scroll correction ── */
  window.addEventListener("load", function () {
    if (window.location.hash) {
      const section = document.querySelector(window.location.hash);
      if (section) {
        setTimeout(() => {
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({ top: section.offsetTop - parseInt(scrollMarginTop), behavior: "smooth" });
        }, 100);
      }
    }
  });

  /* ── Navmenu Scrollspy ── */
  let navmenulinks = document.querySelectorAll(".navmenu a");
  function navmenuScrollspy() {
    navmenulinks.forEach((navmenulink) => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= section.offsetTop + section.offsetHeight) {
        document.querySelectorAll(".navmenu a.active").forEach((l) => l.classList.remove("active"));
        navmenulink.classList.add("active");
      } else {
        navmenulink.classList.remove("active");
      }
    });
  }
  window.addEventListener("load", navmenuScrollspy);
  document.addEventListener("scroll", navmenuScrollspy);
})();