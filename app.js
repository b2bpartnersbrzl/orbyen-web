(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (!toggle || !nav) return;
  const close = () => { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); toggle.textContent = 'Menu'; };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    toggle.textContent = open ? 'Fechar menu' : 'Menu';
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { close(); toggle.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) close(); });
  window.matchMedia('(min-width: 761px)').addEventListener('change', close);
})();

// Medição exclusiva da Orbyen. O link nativo do WhatsApp não depende da Meta.
(() => {
  const PIXEL_ID = '1666659325046140';
  if (!['orbyen.com.br', 'www.orbyen.com.br'].includes(window.location.hostname)) return;
  if (!window.fbq) {
    const fbq = window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  try {
    window.fbq('set', 'autoConfig', false, PIXEL_ID);
    window.fbq('init', PIXEL_ID);
    window.fbq('trackSingle', PIXEL_ID, 'PageView');
  } catch (_) { /* A indisponibilidade da medição não impede o atendimento. */ }
  let contactSent = false;
  document.querySelectorAll('a[data-contact]').forEach(link => {
    const destination = new URL(link.href);
    if (destination.origin !== 'https://wa.me' || destination.pathname !== '/5581992944641') return;
    link.addEventListener('click', event => {
      if (event.defaultPrevented || (event.button !== undefined && event.button !== 0) ||
          contactSent || typeof window.fbq !== 'function') return;
      try {
        window.fbq('trackSingle', PIXEL_ID, 'Contact', {
          contact_channel: 'whatsapp',
          content_name: 'Escritorio virtual Orbyen',
          button_location: 'oferta'
        });
        contactSent = true;
      } catch (_) { /* Não interceptar a navegação se a Meta estiver indisponível. */ }
    });
  });
})();
