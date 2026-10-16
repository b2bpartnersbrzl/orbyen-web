# orbyen-web
Página web da Orbyen.

Site estático de uma página, com escritório virtual no Espinheiro, plano anual, serviços incluídos e contato pelo botão “QUERO MAIS INFORMAÇÕES”.

## Arquivos

- `index.html`: conteúdo da página.
- `styles.css` e `fundos.css`: estilos e adaptação para computador e celular.
- `app.js`: interface e medição de visitas e cliques no WhatsApp.
- `assets/`: fotografia utilizada, logo, original da logo e ícone do site.

Não há instalação de dependências ou variáveis de ambiente. Os arquivos-fonte ficam na raiz do repositório. No Cloudflare Pages, o comando abaixo reúne somente os arquivos públicos em `dist`, sem publicar este README ou os metadados do repositório:

```sh
mkdir -p dist && cp index.html styles.css fundos.css app.js dist/ && cp -R assets dist/
```

Diretório de saída: `dist`. Framework: nenhum. Ramificação de produção: `main`.

## Estado da entrega

### Medição da Meta autorizada para publicação em 16/10/2026

- Pixel: **Orbyen | Site e WhatsApp**, ID `1666659325046140`.
- Proprietário: Orbyen BR, ID `1520830406398584`.
- Conta de anúncios vinculada: Orbyen BR — Anúncios, ID `1743254010209423`.
- Por solicitação expressa do proprietário, carrega o Pixel automaticamente, sem banner ou controle de consentimento no site, seguindo o comportamento técnico adotado na DL. Isto não representa uma conclusão de conformidade legal; a política de privacidade e a base legal da medição permanecem pendentes de definição.
- Envia `PageView` na abertura e `Contact` no clique em “QUERO MAIS INFORMAÇÕES” para `https://wa.me/5581992944641`. Os parâmetros adicionais não contêm mensagens, telefone do visitante ou dados de formulário. O SDK da Meta recebe dados técnicos da visita. Não configura API de Conversões ou correspondência avançada.
- `Contact` representa clique, não conversa, lead qualificado ou venda. Repetições são limitadas a um evento por carregamento, não por pessoa. A atribuição ao anúncio depende da Meta e das condições do navegador.
- O SDK só carrega em `orbyen.com.br` e `www.orbyen.com.br`. Prévia local e `pages.dev` não enviam eventos. O WhatsApp continua disponível se a Meta falhar ou for bloqueada.
- Testes locais sem transmissão: `node --test tests/measurement.test.cjs`.
- Publicação autorizada neste chat. Confirmar produção e recebimento dos eventos após envio. Identificar todo clique técnico como teste, nunca como lead real.

A versão foi preparada localmente em 15 de outubro de 2026. O aviso de prévia e a marcação HTML `noindex,nofollow` foram retirados desta cópia. As condições comerciais e o visual aprovado foram preservados.

Em 16 de outubro de 2026, o site foi publicado e verificado em https://orbyen-web.pages.dev/, na conta Cloudflare B2B. A integração GitHub foi autorizada somente para `b2bpartnersbrzl/orbyen-web`. O commit publicado foi `6cff117b30993201b9bd7fec9e4625062743b741`.

O GitHub Desktop pode ser usado para revisar, registrar e enviar as alterações deste repositório. Novos commits enviados à ramificação `main` acionam a publicação no Cloudflare Pages.

O domínio principal é https://orbyen.com.br/. A Hostinger confirmou a troca dos nameservers para `damiete.ns.cloudflare.com` e `rafe.ns.cloudflare.com`, mantendo o registro e a renovação do domínio na Hostinger. O Cloudflare confirmou a zona ativa e o domínio principal ativo no Pages com SSL habilitado em 16 de outubro de 2026. O endereço `www.orbyen.com.br` também foi associado ao mesmo projeto.

O domínio principal respondeu HTTP 200 com certificado validado e o conteúdo correto ao testar diretamente o endereço do Cloudflare. Na verificação inicial, alguns resolvedores e o navegador ainda usavam o DNS antigo da Hostinger. A propagação pode levar até 24 a 48 horas. Isso não exige nova alteração nos nameservers.

## Pendência antes de publicação pública

A fotografia `assets/espinheiro-luz-dia.webp` é uma adaptação de “Recife - Pernambuco”, de Américo Nunes, registrada em 20 de dezembro de 2006 e disponibilizada sob CC BY-SA 2.0. A versão recebeu edição de luz, céu e cores assistida por IA em 15 de outubro de 2026. É uma imagem de acervo adaptada, não um registro atual nem uma fotografia das instalações da Orbyen.

- Fonte: <https://commons.wikimedia.org/wiki/File:Recife_-_Pernambuco.jpg>
- Licença: <https://creativecommons.org/licenses/by-sa/2.0/>

A licença disponível exige atribuição, indicação da adaptação e compartilhamento da imagem adaptada sob a mesma licença. Não se presume que esta nota no repositório resolva a atribuição na página publicada. O layout foi preservado sem créditos visíveis, conforme solicitado. Antes da publicação, é necessário confirmar autorização específica para esse uso sem crédito, incluir a atribuição exigida ou substituir a foto por uma imagem com permissão compatível.
