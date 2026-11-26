// Medição da Orbyen na Meta. O link do WhatsApp funciona mesmo se a Meta falhar ou for bloqueada.
(() => {
  const PIXEL_ID = '1666659325046140';
  const WHATSAPP = '/5581992944641';
  // Cada botão de WhatsApp tem um identificador próprio (data-cta) para separar os resultados.
  const buttons = {
    'menu': {content_name:'geral', button_location:'menu'},
    'endereco-fiscal': {content_name:'endereco-fiscal', button_location:'secao-servico'},
    'assessoria-regulatoria': {content_name:'assessoria-regulatoria', button_location:'secao-servico'},
    'venda-de-cnpjs': {content_name:'venda-de-cnpjs', button_location:'secao-servico'},
    'flutuante': {content_name:'geral', button_location:'botao-flutuante'}
  };
  const production = ['orbyen.com.br', 'www.orbyen.com.br'].includes(window.location.hostname);
  // Modo de teste (?medicao=teste): mostra os eventos no console e nunca os envia à Meta.
  const testing = new URLSearchParams(window.location.search).get('medicao') === 'teste';
  let send;

  if (testing) {
    send = (event, data) => console.info('[medição Orbyen] teste, não enviado:', event, data ?? '');
  } else if (production) {
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
    send = (event, data) => data
      ? window.fbq('trackSingle', PIXEL_ID, event, data)
      : window.fbq('trackSingle', PIXEL_ID, event);
    try {
      window.fbq('set', 'autoConfig', false, PIXEL_ID);
      window.fbq('init', PIXEL_ID);
    } catch (_) { /* A indisponibilidade da medição não impede o atendimento. */ }
  } else {
    return;
  }

  try { send('PageView'); } catch (_) { /* Idem. */ }

  // Um Contact por botão a cada carregamento da página: cliques repetidos no mesmo botão não somam.
  const sent = new Set();
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-cta]');
    if (!link || event.defaultPrevented || (event.button !== undefined && event.button !== 0)) return;
    const button = buttons[link.dataset.cta];
    let destination;
    try { destination = new URL(link.href); } catch (_) { return; }
    if (!button || destination.origin !== 'https://wa.me' || destination.pathname !== WHATSAPP) return;
    if (sent.has(link.dataset.cta)) return;
    try {
      send('Contact', {contact_channel:'whatsapp', ...button});
      sent.add(link.dataset.cta);
    } catch (_) { /* Não interceptar a navegação se a Meta estiver indisponível. */ }
  }, true);
})();
