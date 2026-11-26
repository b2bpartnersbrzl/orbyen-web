const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const site = path.join(__dirname, '..', 'site');
const source = readFileSync(path.join(site, 'medicao.js'), 'utf8');
const html = readFileSync(path.join(site, 'index.html'), 'utf8');
const PIXEL = '1666659325046140';

function link(cta, href = 'https://wa.me/5581992944641?text=Ola') {
  const element = { dataset: { cta }, href };
  element.closest = selector => (selector === 'a[data-cta]' ? element : null);
  return element;
}

function setup({ hostname = 'orbyen.com.br', search = '', fbq } = {}) {
  const scripts = [], logs = [];
  let onClick;
  const document = {
    createElement() { return {}; },
    head: { appendChild(s) { scripts.push(s); } },
    addEventListener(type, fn) { if (type === 'click') onClick = fn; }
  };
  const window = { location: { hostname, search }, fbq };
  const console = { info: (...args) => logs.push(args) };
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, console, Set });
  const click = (target, extra = {}) => onClick?.({ target, button: 0, defaultPrevented: false, ...extra });
  const calls = () => window.fbq?.queue ? Array.from(window.fbq.queue, a => Array.from(a)) : [];
  const events = () => calls().filter(a => a[0] === 'trackSingle');
  return { window, scripts, logs, click, calls, events };
}

test('produção carrega o SDK uma vez e envia PageView', () => {
  const s = setup();
  assert.equal(s.scripts.length, 1);
  assert.equal(s.scripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  assert.deepEqual(s.calls().slice(0, 2), [['set', 'autoConfig', false, PIXEL], ['init', PIXEL]]);
  assert.deepEqual(s.events(), [['trackSingle', PIXEL, 'PageView']]);
});

test('cada botão de WhatsApp envia seu próprio Contact', () => {
  const s = setup();
  const expected = {
    'menu': ['geral', 'menu'],
    'endereco-fiscal': ['endereco-fiscal', 'secao-servico'],
    'assessoria-regulatoria': ['assessoria-regulatoria', 'secao-servico'],
    'venda-de-cnpjs': ['venda-de-cnpjs', 'secao-servico'],
    'flutuante': ['geral', 'botao-flutuante']
  };
  for (const cta of Object.keys(expected)) s.click(link(cta));
  const contacts = s.events().filter(e => e[2] === 'Contact');
  assert.equal(contacts.length, 5);
  contacts.forEach((event, i) => {
    const [name, place] = Object.values(expected)[i];
    assert.equal(JSON.stringify(event[3]), JSON.stringify({ contact_channel: 'whatsapp', content_name: name, button_location: place }));
  });
});

test('cliques repetidos no mesmo botão contam uma vez por página', () => {
  const s = setup();
  const target = link('endereco-fiscal');
  s.click(target); s.click(target); s.click(target);
  assert.equal(s.events().filter(e => e[2] === 'Contact').length, 1);
});

test('funciona também no domínio www', () => {
  const s = setup({ hostname: 'www.orbyen.com.br' });
  s.click(link('flutuante'));
  assert.equal(s.events().length, 2);
});

test('prévias, pages.dev e outros domínios não carregam a Meta', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'orbyen-web.pages.dev', 'x.orbyen-web.pages.dev', 'outro.com.br']) {
    const s = setup({ hostname });
    s.click(link('menu'));
    assert.equal(s.scripts.length, 0);
    assert.equal(s.window.fbq, undefined);
  }
});

test('modo de teste mostra os eventos e nunca envia à Meta, inclusive em produção', () => {
  for (const hostname of ['localhost', 'orbyen.com.br']) {
    const s = setup({ hostname, search: '?medicao=teste' });
    s.click(link('venda-de-cnpjs'));
    assert.equal(s.scripts.length, 0);
    assert.equal(s.window.fbq, undefined);
    assert.deepEqual(s.logs.map(l => l[1]), ['PageView', 'Contact']);
    assert.equal(s.logs[1][2].content_name, 'venda-de-cnpjs');
  }
});

test('ignora outro telefone, botão desconhecido, clique cancelado e botão direito', () => {
  const s = setup();
  s.click(link('menu', 'https://wa.me/5571993081072'));
  s.click(link('desconhecido'));
  s.click(link('menu'), { defaultPrevented: true });
  s.click(link('menu'), { button: 2 });
  s.click({ closest: () => null });
  assert.equal(s.events().length, 1);
});

test('clique por teclado também registra Contact', () => {
  const s = setup();
  s.click(link('menu'), { button: undefined });
  assert.equal(s.events()[1][2], 'Contact');
});

test('SDK existente é reutilizado e falha da Meta não quebra o clique', () => {
  const recorded = [];
  const s = setup({ fbq: (...args) => recorded.push(args) });
  s.click(link('menu'));
  assert.equal(s.scripts.length, 0);
  assert.equal(recorded.at(-1)[2], 'Contact');
  const broken = setup({ fbq() { throw Error('SDK indisponível'); } });
  assert.doesNotThrow(() => broken.click(link('menu')));
});

test('a página marca os cinco botões de WhatsApp e carrega a medição', () => {
  const ctas = [...html.matchAll(/data-cta="([^"]+)" href="https:\/\/wa\.me\/5581992944641/g)].map(m => m[1]);
  assert.deepEqual(ctas.sort(), ['assessoria-regulatoria', 'endereco-fiscal', 'flutuante', 'menu', 'venda-de-cnpjs']);
  assert.equal((html.match(/href="https:\/\/wa\.me\//g) || []).length, 5);
  assert.ok(html.includes('<script src="./medicao.js" defer></script>'));
  assert.doesNotMatch(source, /localStorage|'Lead'|nome|celular|email/);
});
