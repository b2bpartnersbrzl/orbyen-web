const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const PIXEL = '1666659325046140';

function setup({ hostname = 'orbyen.com.br', href = 'https://wa.me/5581992944641?text=Ola', fbq } = {}) {
  const link = { href, listeners: {}, addEventListener(k, fn) { this.listeners[k] = fn; }, click(e = {}) { this.listeners.click?.(e); } };
  const scripts = [];
  const document = { querySelector() { return null; }, querySelectorAll() { return [link]; },
    createElement() { return {}; }, head: { appendChild(s) { scripts.push(s); } } };
  const window = { location: { hostname }, fbq };
  vm.runInNewContext(source, { window, document, URL });
  const calls = () => window.fbq?.queue ? Array.from(window.fbq.queue, a => Array.from(a)) : [];
  const events = () => calls().filter(a => a[0] === 'trackSingle');
  return { window, link, scripts, calls, events };
}
test('carrega automaticamente um SDK e PageView exclusivo da Orbyen', () => {
  const s = setup();
  assert.equal(s.scripts.length, 1);
  assert.equal(s.scripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  assert.equal(s.scripts[0].async, true);
  assert.deepEqual(s.events(), [['trackSingle', PIXEL, 'PageView']]);
  assert.deepEqual(s.calls()[0], ['set', 'autoConfig', false, PIXEL]);
  assert.deepEqual(s.calls()[1], ['init', PIXEL]);
});
test('clique gera Contact uma vez por página sem interceptar o link', () => {
  const s = setup(), href = s.link.href;
  const e = { button: 0, preventDefault() { assert.fail('Não bloquear navegação'); } };
  s.link.click(e); s.link.click(e);
  assert.equal(s.link.href, href);
  assert.equal(s.events().length, 2);
  assert.deepEqual(s.events()[1].slice(0, 3), ['trackSingle', PIXEL, 'Contact']);
  assert.equal(JSON.stringify(s.events()[1][3]), JSON.stringify({ contact_channel: 'whatsapp', content_name: 'Escritorio virtual Orbyen', button_location: 'oferta' }));
});
test('funciona também no domínio www', () => {
  const s = setup({ hostname: 'www.orbyen.com.br' }); s.link.click(); assert.equal(s.events().length, 2);
});
test('prévia local e pages.dev não enviam eventos', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'orbyen-web.pages.dev', 'outro.com.br']) {
    const s = setup({ hostname }); s.link.click(); assert.equal(s.scripts.length, 0); assert.equal(s.events().length, 0);
  }
});
test('ignora outro telefone, cliques cancelados e botão direito', () => {
  const other = setup({ href: 'https://wa.me/5571993081072' }); other.link.click(); assert.equal(other.events().length, 1);
  const s = setup(); s.link.click({ defaultPrevented: true }); s.link.click({ button: 2 }); assert.equal(s.events().length, 1);
});
test('clique por teclado também registra Contact', () => {
  const s = setup(); s.link.click({ detail: 0 }); assert.equal(s.events()[1][2], 'Contact');
});
test('SDK existente é reutilizado sem download duplicado', () => {
  const recorded = [], fbq = (...args) => recorded.push(args);
  const s = setup({ fbq }); s.link.click(); assert.equal(s.scripts.length, 0);
  assert.equal(recorded.at(-1)[2], 'Contact');
});
test('falha da Meta não causa erro no clique nem bloqueia navegação', () => {
  const s = setup({ fbq() { throw Error('SDK unavailable'); } });
  assert.doesNotThrow(() => s.link.click({ preventDefault() { assert.fail('Não bloquear navegação'); } }));
});
test('HTML mantém o botão correto, sem aviso ou preferências de medição', () => {
  assert.ok(html.includes('data-contact="contratar" href="https://wa.me/5581992944641?'));
  assert.ok(html.includes('>QUERO MAIS INFORMAÇÕES</a>'));
  assert.doesNotMatch(html, /measurement-notice|measurement-preferences|Aceitar medição|Recusar medição/);
  assert.doesNotMatch(source, /localStorage|trackSingleCustom|'Lead'|1586158283258875/);
});
