const services = Object.freeze({
  'endereco-fiscal': 'Endereço fiscal',
  'assessoria-regulatoria': 'Assessoria regulatória',
  'venda-de-cnpjs': 'Venda de CNPJs com licenças sanitárias'
});
const policy = 'Contato Orbyen • 2026-11-26';
const encoder = new TextEncoder();
const brasiliaDateTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone:'America/Sao_Paulo', dateStyle:'short', timeStyle:'medium', hourCycle:'h23'
});

function json(status, body) {
  return Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function saveContact(env, contact) {
  const {CONTACT_SCRIPT_URL, CONTACT_SCRIPT_SECRET} = env;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(CONTACT_SCRIPT_URL)) {
    throw new Error('contact_script_url_invalid');
  }
  const timestamp = Date.now();
  const payload = JSON.stringify([
    brasiliaDateTime.format(contact.receivedAt), contact.name, contact.phone, contact.email,
    contact.service, 'Sim', policy, contact.id
  ]);
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(CONTACT_SCRIPT_SECRET),
    {name:'HMAC', hash:'SHA-256'}, false, ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp + '.' + payload));
  const signature = base64url(new Uint8Array(digest));
  const response = await fetch(CONTACT_SCRIPT_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({timestamp, payload, signature}),
    signal:AbortSignal.timeout(15000)
  });
  const result = response.ok && await response.json();
  if (result?.ok !== true || result.id !== contact.id) {
    throw new Error('contact_script_save_unconfirmed');
  }
}

async function notifyByEmail(env, contact) {
  const {CONTACT_EMAIL_ACCOUNT, CONTACT_EMAIL_TOKEN, CONTACT_EMAIL_FROM, CONTACT_EMAIL_TO:recipient} = env;
  if (!CONTACT_EMAIL_ACCOUNT || !CONTACT_EMAIL_TOKEN || !CONTACT_EMAIL_FROM || !recipient) return false;
  const message = [
    'Nova solicitação pelo site da Orbyen', '', 'Nome e sobrenome: ' + contact.name,
    'Celular (WhatsApp): ' + contact.phone, 'E-mail: ' + contact.email,
    'Serviço de interesse: ' + contact.service, '',
    'Autorização para retorno por WhatsApp ou e-mail: sim',
    'Aviso de privacidade: ' + policy,
    'Recebido em (Brasília): ' + brasiliaDateTime.format(contact.receivedAt),
    'Referência do cadastro: ' + contact.id
  ].join('\n');
  const response = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(CONTACT_EMAIL_ACCOUNT) + '/email/sending/send',
    {
      method:'POST',
      headers:{Authorization:'Bearer ' + CONTACT_EMAIL_TOKEN, 'Content-Type':'application/json'},
      body:JSON.stringify({to:recipient, from:CONTACT_EMAIL_FROM, subject:'Novo contato pelo site da Orbyen', text:message}),
      signal:AbortSignal.timeout(8000)
    }
  );
  const result = response.ok && await response.json();
  return Boolean(result?.success && [result.result?.delivered, result.result?.queued].some(list => list?.includes(recipient)));
}

export async function onRequestPost({request, env}) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return json(403, {error:'Origem não autorizada.'});
  }
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
    return json(415, {error:'Formato inválido.'});
  }

  const reader = request.body?.getReader();
  if (!reader) return json(400, {error:'Solicitação vazia.'});
  const decoder = new TextDecoder();
  let length = 0, body = '';
  for (;;) {
    const {value, done} = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 4096) {
      await reader.cancel();
      return json(413, {error:'Solicitação muito grande.'});
    }
    body += decoder.decode(value, {stream:true});
  }
  const fields = new URLSearchParams(body + decoder.decode());
  const name = fields.get('nome')?.trim();
  const phone = fields.get('celular')?.trim() || '';
  const digits = phone.replace(/\D/g, '');
  const email = fields.get('email')?.trim() || '';
  const service = fields.get('frente');
  if (!name || name.length > 120 || /[\r\n]/.test(name) ||
      phone.length > 28 || !/^\+?[\d\s().-]+$/.test(phone) || /[\r\n]/.test(phone) ||
      digits.length < 8 || digits.length > 15 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !Object.hasOwn(services, service) || fields.get('consentimento') !== 'contato') {
    return json(400, {error:'Revise os campos e a autorização para retorno.'});
  }

  if (!env.CONTACT_SCRIPT_URL || !env.CONTACT_SCRIPT_SECRET) {
    return json(503, {error:'O recebimento pelo formulário ainda está indisponível.'});
  }
  const contact = {
    id:crypto.randomUUID(), receivedAt:new Date(), name, phone, email, service:services[service]
  };
  try {
    await saveContact(env, contact);
  } catch {
    console.warn('orbyen_contact_save_unconfirmed');
    return json(502, {error:'Não foi possível confirmar o cadastro. Tente novamente em instantes.'});
  }

  // O cadastro já está salvo. Uma falha no aviso não deve provocar novo envio do formulário.
  const notified = await notifyByEmail(env, contact).catch(() => false);
  if (!notified) console.warn('orbyen_contact_email_unconfirmed');
  return json(200, {ok:true});
}
