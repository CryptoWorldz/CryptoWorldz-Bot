(() => {
  for (const footer of document.querySelectorAll("footer.site-footer.vision-footer")) {
    const strong = footer.querySelector("strong");
    const span = footer.querySelector("span");
    if (strong && span && strong.nextSibling === span) span.before(document.createTextNode("\n"));
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
