(() => {
  const select = document.querySelector('#package');
  const selection = document.querySelector('#selection');
  const quote = document.querySelector('#quote');
  const receipt = document.querySelector('#receipt');
  const labels = { trial: 'Trial · 0.05 SOL / 7 days', rent: 'Rent · 0.3 SOL / 31 days', rent_to_own: 'Rent to Own · 0.5 SOL / month × 12', own: 'Own · 4.5 SOL one time' };
  let chosen = 'trial';
  function render() {
    selection.textContent = labels[chosen] + ' · ' + select.selectedOptions[0].textContent;
    quote.textContent = chosen === 'trial' ? '/suiteprice' : '/suitequote ' + chosen;
    receipt.textContent = '/suitereceipt ' + chosen + ' ' + select.value + ' SOL_SIGNATURE';
  }
  document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => {
    chosen = button.dataset.plan;
    document.querySelectorAll('[data-plan]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render(); document.querySelector('#payment').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  select.addEventListener('change', render);
  render();
})();
