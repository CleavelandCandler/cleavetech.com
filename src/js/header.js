/* ============================================================
   header.js — Injects the shared site header into each page
   ============================================================ */

const depth = window.location.pathname.split("/").filter(Boolean).length;
const prefix = depth > 0 ? "../".repeat(depth) : "./";

fetch(prefix + "src/partials/header.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("site-header").outerHTML = html;
    document.body.classList.add("ready");
  });