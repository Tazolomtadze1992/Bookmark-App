// Runs before styles paint; no account data or remote calls are involved.
(() => {
  const key = 'reference-library-theme';
  const choices = ['system', 'light', 'dark'];
  const system = matchMedia('(prefers-color-scheme: dark)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const normalize = value => choices.includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = normalize(localStorage.getItem(key)); } catch {}
  const iconStates = new WeakMap();
  let colorFrame;
  function commitTheme(theme) {
    const root = document.documentElement;
    if (!root.dataset.theme || root.dataset.theme === theme) {
      root.dataset.theme = theme;
      return;
    }
    // Commit every theme color together, without disabling transform/opacity
    // motion. Keep the guard through the next paint, then restore hover fades.
    cancelAnimationFrame(colorFrame);
    root.dataset.themeChanging = '';
    root.dataset.theme = theme;
    void root.offsetWidth;
    colorFrame = requestAnimationFrame(() => {
      colorFrame = requestAnimationFrame(() => {
        delete root.dataset.themeChanging;
        colorFrame = undefined;
      });
    });
  }
  function updateIcon(button, theme, animate) {
    if (!globalThis.createThemeIconMotion) return;
    let controller = iconStates.get(button);
    if (!controller) {
      controller = globalThis.createThemeIconMotion(button,{reducedMotion:()=>reduced.matches});
      iconStates.set(button,controller);
    }
    controller.setTheme(theme,{animate});
  }
  function apply({animate = false} = {}) {
    commitTheme(preference === 'system'
      ? (system.matches ? 'dark' : 'light') : preference);
    for (const button of document.querySelectorAll('[data-theme-choice],[data-theme-toggle]')) {
      if ('themeToggle' in button.dataset) {
        updateIcon(button, document.documentElement.dataset.theme, animate);
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        button.dataset.themeChoice = next;
        button.setAttribute('aria-label', `Switch to ${next} mode`);
        button.removeAttribute?.('title');
      } else {
        button.setAttribute('aria-pressed', String(button.dataset.themeChoice === (button.dataset.themeEffective ? document.documentElement.dataset.theme : preference)));
      }
    }
  }
  globalThis.libraryTheme = {
    refresh: apply,
    toggle({animate = false} = {}) {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch {}
      apply({animate});
    }
  };
  apply();
  system.addEventListener('change', apply);
  reduced.addEventListener('change', apply);
  addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = normalize(event.newValue);
      apply();
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    for (const button of document.querySelectorAll('[data-theme-choice]')) button.addEventListener('click', event => {
      preference = normalize(button.dataset.themeChoice);
      try { localStorage.setItem(key, preference); } catch {}
      apply({animate: event?.detail > 0});
    });
  });
})();
