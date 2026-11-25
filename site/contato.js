(() => {
  const form = document.querySelector('#form-contato');
  const phone = form.elements.celular;
  const status = document.querySelector('#form-status');
  const submit = form.querySelector('button');
  const preview = location.protocol === 'file:' || ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const copy = {
    previewNote:'Prévia local. Use dados fictícios para testar o formulário.',
    previewButton:'Testar envio',
    submit:'Enviar solicitação',
    validated:'Campos conferidos. A prévia não envia nem armazena os dados.',
    phoneError:'Informe um celular com DDD ou código do país.',
    emailError:'Informe um endereço de e-mail válido.',
    required:'Preencha este campo.',
    consentRequired:'Autorize o uso de seus dados para que possamos responder.',
    sending:'Enviando sua solicitação…',
    sent:'Solicitação recebida. A Orbyen retornará por WhatsApp ou e-mail.',
    formReview:'Revise os campos e a autorização para retorno.',
    formUnavailable:'O formulário está indisponível. Tente novamente em instantes.',
    formError:'Não foi possível confirmar o envio. Tente novamente em instantes.'
  };
  const text = key => window.orbyenIdioma?.text(key,copy[key]) ?? copy[key];
  let statusKey = preview ? 'previewNote' : null;
  function updateStatus(key) {
    statusKey = key;
    status.textContent = key ? text(key) : '';
  }
  function updateLanguage() {
    submit.textContent = text(preview ? 'previewButton' : 'submit');
    updateStatus(statusKey);
    for (const field of form.elements) field.setCustomValidity?.('');
  }
  document.addEventListener('orbyen:idioma', updateLanguage);
  form.addEventListener('input', event => event.target.setCustomValidity?.(''));
  form.addEventListener('invalid', event => {
    const field = event.target;
    if (field.validity.valueMissing) {
      field.setCustomValidity(text(field.name === 'consentimento' ? 'consentRequired' : 'required'));
    } else if (field.validity.typeMismatch && field.type === 'email') {
      field.setCustomValidity(text('emailError'));
    }
  },true);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const value = phone.value.trim();
    const digits = value.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 8 || digits.length > 15) {
      phone.setCustomValidity(text('phoneError'));
      phone.reportValidity();
      return;
    }
    if (preview) {
      updateStatus('validated');
      return;
    }

    submit.disabled = true;
    updateStatus('sending');
    try {
      const response = await fetch('/api/contato', {
        method:'POST', body:new URLSearchParams(new FormData(form))
      });
      if (response.ok && (await response.json()).ok) {
        form.reset();
        updateStatus('sent');
      } else if (response.status === 400) {
        updateStatus('formReview');
      } else if (response.status === 503) {
        updateStatus('formUnavailable');
      } else {
        updateStatus('formError');
      }
    } catch {
      updateStatus('formError');
    } finally {
      submit.disabled = false;
    }
  });
  updateLanguage();
  submit.disabled = false;
})();
