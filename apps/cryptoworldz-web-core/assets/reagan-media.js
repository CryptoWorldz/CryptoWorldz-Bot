(() => {
  const hero = document.querySelector('#reagan-hero-media');
  const real = document.querySelector('#reagan-real-media');
  const smiles = document.querySelector('#reagan-smiles-media');

  if (hero && window.REAGAN_HERO) hero.src = window.REAGAN_HERO;
  if (real && window.REAGAN_REAL) real.src = window.REAGAN_REAL;
  if (smiles && window.REAGAN_SMILES) smiles.src = window.REAGAN_SMILES;
})();
