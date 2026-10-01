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
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      if ('themeToggle' in button.dataset) {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        button.dataset.themeChoice = next;
        button.setAttribute('aria-label', `Switch to ${next} mode`);
        button.title = `Switch to ${next} mode`;
      } else {
        button.setAttribute('aria-pressed', String(button.dataset.themeChoice === (button.dataset.themeEffective ? document.documentElement.dataset.theme : preference)));
      }
    }
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
    for (const button of document.querySelectorAll('[data-theme-choice]')) button.addEventListener('click', () => {
      preference = normalize(button.dataset.themeChoice);
      try { localStorage.setItem(key, preference); } catch {}
      apply();
    });
  });
})();
