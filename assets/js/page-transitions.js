// Simple page transitions: fade out on link click, fade in on load
const DURATION = 400; // ms, must match CSS --pt-duration

function isLocalLink(a) {
  try {
    const url = new URL(a.href, location.href);
    return url.origin === location.origin;
  } catch (e) {
    return false;
  }
}

document.documentElement.classList.add('pt-enter');

window.addEventListener('DOMContentLoaded', () => {
  // Trigger enter animation (remove class to transition from hidden -> visible)
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('pt-enter');
  });

  // Delegate link clicks
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    // ignore links that explicitly opt-out
    if (a.dataset.noTransition !== undefined) return;
    // ignore links that open in new tab or have download attribute
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    // only handle same-origin navigations
    if (!isLocalLink(a)) return;
    // also ignore hash / anchor links within same page
    if (a.hash && (a.pathname === location.pathname)) return;

    // prevent default navigation and play exit animation
    ev.preventDefault();
    document.documentElement.classList.add('pt-exit');

    // Delay navigation until animation completes
    setTimeout(() => {
      window.location.href = a.href;
    }, DURATION);
  }, { passive: false });
});

// For history navigation (back/forward) we still want the enter effect
window.addEventListener('pageshow', (ev) => {
  if (ev.persisted) {
    // page was restored from bfcache
    document.documentElement.classList.remove('pt-exit');
  }
});

export default {};
