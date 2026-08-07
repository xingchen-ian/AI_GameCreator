(function () {
  var body = document.body;

  // --- language switch ---
  var langButtons = document.querySelectorAll("[data-set-language]");
  function setLanguage(lang) {
    body.setAttribute("data-language", lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    langButtons.forEach(function (btn) {
      var active = btn.getAttribute("data-set-language") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    try { localStorage.setItem("research-survey-lang", lang); } catch (e) {}
  }
  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLanguage(btn.getAttribute("data-set-language"));
    });
  });
  try {
    var saved = localStorage.getItem("research-survey-lang");
    if (saved === "zh" || saved === "en") setLanguage(saved);
  } catch (e) {}

  // --- scroll progress ---
  var bar = document.getElementById("scrollProgressBar");
  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  // --- scrollspy for the rail ---
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll("[data-spy]"));
  var sections = spyLinks
    .map(function (link) { return document.getElementById(link.getAttribute("data-spy")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          spyLinks.forEach(function (link) {
            link.classList.toggle("is-current", link.getAttribute("data-spy") === id);
          });
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { observer.observe(s); });
  }
})();
