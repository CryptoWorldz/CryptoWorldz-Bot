(() => {
  const openFromRoute = (event) => {
    const link = event.target.closest('a[href="#open-gpt"]');
    if (!link) return;
    event.preventDefault();
    document.querySelector('.oneworldz-gpt-launcher')?.click();
  };
  document.addEventListener('click', openFromRoute);
})();
