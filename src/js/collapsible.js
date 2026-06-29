/* ============================================================
   collapsible.js — Collapsible section toggle for cleavetech.com
   ============================================================ */

(function () {

  document.querySelectorAll(".collapsible__trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const panel = trigger.nextElementSibling;
      const isOpen = trigger.classList.contains("open");

      trigger.classList.toggle("open");
      panel.classList.toggle("open");
    });
  });

})();