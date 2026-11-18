(function () {
  "use strict";

  /* ------------------------------------------------------------
     1) Images from Wikimedia Commons
     ------------------------------------------------------------ */
  var figures = document.querySelectorAll("figure[data-file]");
  Array.prototype.forEach.call(figures, function (fig) {
    var file = fig.getAttribute("data-file");
    if (!file) return;
    var caption = fig.getAttribute("data-caption") || file;
    var encoded = encodeURIComponent(file);

    var pageUrl = "https://commons.wikimedia.org/wiki/File:" + encoded;
    var imgUrl =
      "https://commons.wikimedia.org/wiki/Special:FilePath/" +
      encoded +
      "?width=900";

    var link = document.createElement("a");
    link.href = pageUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = "在 Wikimedia Commons 查看原图与授权";

    var img = document.createElement("img");
    img.src = imgUrl;
    img.alt = caption;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("error", function () {
      fig.classList.add("is-missing");
    });

    link.appendChild(img);
    fig.appendChild(link);

    var cap = document.createElement("figcaption");
    cap.textContent = caption + " · 图片来自 Wikimedia Commons";
    fig.appendChild(cap);
  });

  /* ------------------------------------------------------------
     2) Theme
     ------------------------------------------------------------ */
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme-toggle");

  function syncThemeButton() {
    if (!themeBtn) return;
    var dark = root.getAttribute("data-theme") === "dark";
    themeBtn.textContent = dark ? "☀" : "☾";
    themeBtn.setAttribute("aria-label", dark ? "切换到日间模式" : "切换到夜间模式");
  }

  syncThemeButton();

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("ng-theme", next);
      } catch (e) {}
      syncThemeButton();
    });
  }

  /* ------------------------------------------------------------
     3) Filters
     ------------------------------------------------------------ */
  var entries = Array.prototype.slice.call(document.querySelectorAll(".entry"));
  var eras = Array.prototype.slice.call(document.querySelectorAll(".era"));
  var lanes = Array.prototype.slice.call(document.querySelectorAll(".lane"));
  var regionButtons = Array.prototype.slice.call(
    document.querySelectorAll(".filters-region button, [data-region].filter-btn")
  );
  var themeButtons = Array.prototype.slice.call(
    document.querySelectorAll(".filters-theme button, [data-theme].filter-btn")
  );

  // The markup uses plain buttons inside .filter-group; pick them up by data attrs.
  if (!regionButtons.length) {
    regionButtons = Array.prototype.slice.call(
      document.querySelectorAll("button[data-region]")
    );
  }
  if (!themeButtons.length) {
    themeButtons = Array.prototype.slice.call(
      document.querySelectorAll("button[data-theme]")
    );
  }

  var searchInput = document.getElementById("search");
  var resultCount = document.getElementById("result-count");
  var expandBtn = document.getElementById("expand-all");
  var noResults = document.getElementById("no-results");

  var state = { region: "all", theme: "all", query: "" };
  var total = entries.length;
  var openSnapshot = null;

  function setActive(buttons, attribute, value) {
    buttons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute(attribute) === value);
    });
  }

  function applyFilters() {
    var query = state.query.trim().toLowerCase();
    var visible = 0;

    entries.forEach(function (entry) {
      var okRegion =
        state.region === "all" ||
        entry.getAttribute("data-region") === state.region;
      var themes = (entry.getAttribute("data-themes") || "").split(/\s+/);
      var okTheme =
        state.theme === "all" || themes.indexOf(state.theme) !== -1;
      var okQuery =
        !query || (entry.getAttribute("data-search") || "").indexOf(query) !== -1;
      var ok = okRegion && okTheme && okQuery;

      entry.classList.toggle("is-hidden", !ok);
      if (ok) visible += 1;
    });

    lanes.forEach(function (lane) {
      var count = lane.querySelectorAll(".entry:not(.is-hidden)").length;
      lane.classList.toggle("is-empty", count === 0);
      var label = lane.querySelector(".lane-count");
      if (label) label.textContent = count + " 条目";
    });

    eras.forEach(function (era) {
      var count = era.querySelectorAll(".entry:not(.is-hidden)").length;
      era.classList.toggle("is-hidden", count === 0);
      var laneWrap = era.querySelector(".lanes");
      if (laneWrap) {
        var visibleLanes = laneWrap.querySelectorAll(".lane:not(.is-empty)").length;
        laneWrap.classList.toggle("single", visibleLanes === 1);
      }
    });

    if (resultCount) {
      resultCount.textContent = visible + " / " + total + " 条目";
    }
    if (noResults) {
      noResults.hidden = visible !== 0;
    }

    if (query.length > 0) {
      if (!openSnapshot) {
        openSnapshot = entries.map(function (entry) {
          return entry.open;
        });
      }
      if (visible <= 40) {
        entries.forEach(function (entry) {
          if (!entry.classList.contains("is-hidden")) entry.open = true;
        });
      }
    } else if (openSnapshot) {
      entries.forEach(function (entry, index) {
        entry.open = openSnapshot[index];
      });
      openSnapshot = null;
    }
  }

  regionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.region = button.getAttribute("data-region") || "all";
      setActive(regionButtons, "data-region", state.region);
      applyFilters();
    });
  });

  themeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.theme = button.getAttribute("data-theme") || "all";
      setActive(themeButtons, "data-theme", state.theme);
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.query = searchInput.value;
      applyFilters();
    });
    searchInput.addEventListener("search", function () {
      state.query = searchInput.value;
      applyFilters();
    });
  }

  if (expandBtn) {
    var allOpen = false;
    expandBtn.addEventListener("click", function () {
      allOpen = !allOpen;
      entries.forEach(function (entry) {
        if (!entry.classList.contains("is-hidden")) entry.open = allOpen;
      });
      expandBtn.textContent = allOpen ? "收起全部" : "展开全部";
    });
  }

  /* ------------------------------------------------------------
     4) Era navigation highlight
     ------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".era-nav a")
  );

  if ("IntersectionObserver" in window && navLinks.length) {
    var observer = new IntersectionObserver(
      function (records) {
        records.forEach(function (record) {
          if (!record.isIntersecting) return;
          var hash = "#" + record.target.id;
          navLinks.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === hash);
          });
        });
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: 0 }
    );
    eras.forEach(function (era) {
      observer.observe(era);
    });
  }

  /* ------------------------------------------------------------
     5) Progress bar, back to top
     ------------------------------------------------------------ */
  var progressBar = document.getElementById("progress-bar");
  var toTop = document.getElementById("to-top");
  var ticking = false;

  function updateScrollUI() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var percent = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    if (progressBar) progressBar.style.width = percent + "%";
    if (toTop) toTop.classList.toggle("show", doc.scrollTop > 700);
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateScrollUI();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ------------------------------------------------------------
     6) Keyboard shortcuts
     ------------------------------------------------------------ */
  document.addEventListener("keydown", function (event) {
    var tag = (event.target && event.target.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA";

    if (event.key === "/" && !typing) {
      event.preventDefault();
      if (searchInput) searchInput.focus();
    }

    if (event.key === "Escape" && searchInput && document.activeElement === searchInput) {
      searchInput.value = "";
      state.query = "";
      applyFilters();
      searchInput.blur();
    }
  });

  /* ------------------------------------------------------------
     7) Print: open every entry so the timeline prints in full
     ------------------------------------------------------------ */
  window.addEventListener("beforeprint", function () {
    entries.forEach(function (entry) {
      entry.open = true;
    });
  });

  /* ------------------------------------------------------------
     8) Initial state
     ------------------------------------------------------------ */
  applyFilters();
})();
