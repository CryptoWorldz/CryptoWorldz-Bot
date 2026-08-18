(() => {
  const footerLine1 = "Created with the Vision";
  const footerLine2 = "When Someone say's You can't Change the World 🌐 just Say “Why can't I?”";

  const enforceVisionFooter = (footer) => {
    const strong = footer.querySelector("strong");
    const span = footer.querySelector("span");
    if (strong && span && strong.nextSibling === span) span.before(document.createTextNode("\n"));

    const links = [...footer.querySelectorAll("a[href]")];
    if (links.length) {
      let nav = footer.previousElementSibling;
      if (!nav || !nav.classList.contains("footer-nav")) {
        nav = document.createElement("nav");
        nav.className = "footer-nav";
        nav.setAttribute("aria-label", "Footer navigation");
        footer.before(nav);
      }
      for (const link of links) nav.append(link);

      for (const child of [...footer.children]) {
        if (child === strong?.parentElement || child.contains(strong) || child.contains(span)) continue;
        if (!(child.textContent || "").trim()) child.remove();
      }
    }

    if (strong && strong.textContent !== footerLine1) strong.textContent = footerLine1;
    if (span && span.textContent !== footerLine2) span.textContent = footerLine2;
  };

  for (const footer of document.querySelectorAll("footer.site-footer.vision-footer")) {
    enforceVisionFooter(footer);
    const observer = new MutationObserver(() => enforceVisionFooter(footer));
    observer.observe(footer, { childList: true, subtree: true, characterData: true });
  }

  const header = document.querySelector(".site-header");
  const button = document.querySelector(".menu-button");
  const menu = document.querySelector(".site-menu");
  const backdrop = document.querySelector(".menu-backdrop");
  if (!header || !button || !menu || !backdrop) return;

  const closeMenu = (restoreFocus = false) => {
    header.classList.remove("menu-open");
    button.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("menu-locked");
    if (restoreFocus) button.focus();
  };

  const openMenu = () => {
    header.classList.add("menu-open");
    button.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("menu-locked");
    menu.querySelector("a")?.focus();
  };

  button.addEventListener("click", () => {
    if (button.getAttribute("aria-expanded") === "true") closeMenu(true);
    else openMenu();
  });
  backdrop.addEventListener("click", () => closeMenu(true));
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("menu-open")) closeMenu(true);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeMenu(false);
  });
})();
