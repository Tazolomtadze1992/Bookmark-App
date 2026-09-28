// Runs before styles paint; no account data or remote calls are involved.
(() => {
  const key = 'reference-library-theme';
  const choices = ['system', 'light', 'dark'];
  const system = matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => choices.includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = normalize(localStorage.getItem(key)); } catch {}
  function apply() {
    document.documentElement.dataset.theme = preference === 'system'
      ? (system.matches ? 'dark' : 'light') : preference;
    const select = document.getElementById('theme-choice');
    if (select) select.value = preference;
  }
  apply();
  system.addEventListener('change', apply);
  addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = normalize(event.newValue);
      apply();
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-choice')?.addEventListener('change', event => {
      preference = normalize(event.target.value);
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
  });
})();
