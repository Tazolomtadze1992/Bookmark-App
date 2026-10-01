// Runs before styles paint; no account data or remote calls are involved.
(() => {
  const key = 'reference-library-theme';
  const choices = ['system', 'light', 'dark'];
  const system = matchMedia('(prefers-color-scheme: dark)');
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
    const orbit = button.querySelector('.theme-orbit');
    if (!orbit) return;
    let state = iconStates.get(button);
    if (!state) {
      state = {theme, angle: theme === 'dark' ? 180 : 0};
      iconStates.set(button, state);
      button.dataset.themeMotion = 'instant';
    } else if (state.theme !== theme) {
      // Continue clockwise after settling. If reversed in flight, retrace the
      // existing arc instead of making the icons take another full revolution.
      const moving = orbit.getAnimations?.().some(animation => animation.playState === 'running');
      const angle = moving && state.fromTheme === theme ? state.fromAngle : state.angle + 180;
      Object.assign(state, {fromAngle: state.angle, fromTheme: state.theme, angle, theme});
      button.dataset.themeMotion = animate ? 'orbit' : 'instant';
    } else return;
    orbit.style.transform = `rotate(${state.angle}deg)`;
    for (const body of button.querySelectorAll('.theme-body')) body.style.transform = `rotate(${-state.angle}deg)`;
  }
  function apply({animate = false} = {}) {
    commitTheme(preference === 'system'
      ? (system.matches ? 'dark' : 'light') : preference);
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      if ('themeToggle' in button.dataset) {
        updateIcon(button, document.documentElement.dataset.theme, animate);
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
    for (const button of document.querySelectorAll('[data-theme-choice]')) button.addEventListener('click', event => {
      preference = normalize(button.dataset.themeChoice);
      try { localStorage.setItem(key, preference); } catch {}
      apply({animate: event?.detail > 0});
    });
  });
})();
