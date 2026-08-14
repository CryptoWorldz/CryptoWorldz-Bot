(() => {
  const ecosystemLinks = [
    ["OneWorldz", "https://oneworldz.com"],
    ["CryptoWorldz", "https://cryptoworldz.xyz"],
    ["FoodWorldz", "https://foodworldz.com"],
    ["DonateWorldz", "https://donateworldz.com"],
    ["ImpactBased", "https://impactbased.oneworldz.com"],
    ["Learn", "https://learn.oneworldz.com"],
    ["Command Centre", "https://cryptobotz.cryptoworldz.xyz"]
  ];

  const footer = document.querySelector(".site-footer");
  if (footer && !footer.querySelector(".ecosystem-nav")) {
    const nav = document.createElement("nav");
    nav.className = "ecosystem-nav";
    nav.setAttribute("aria-label", "OneWorldz ecosystem navigation");
    for (const [label, href] of ecosystemLinks) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      if (new URL(href).host !== window.location.host) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      nav.append(link);
    }
    footer.append(nav);
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
