# Painel administrativo de produtos

Página: `/admin/produtos` (a página é pública, mas as operações de leitura e gravação exigem senha). A senha é enviada apenas ao servidor via HTTPS e mantida somente na memória da aba do navegador.

## Configuração inicial (necessária antes de usar)

1. No Google Cloud Console, crie ou escolha um projeto, habilite **Google Sheets API**, crie uma **conta de serviço** e gere uma chave JSON. Mantenha a chave privada em segurança e nunca a envie ao GitHub.
2. Compartilhe a planilha **Utilidades Essenciais — Automação Instagram** com o `client_email` da conta de serviço, como **Editor**. ID da planilha: `19xpC1aQRDEhqHK6e1fRR3fDteX6OA6U6MfqiTcPQ7Yk`.
3. Na Vercel, projeto **utilidades-essenciais**, vá em **Settings → Environment Variables** e configure as variáveis abaixo para Production (e Preview, se desejar):
   - `ADMIN_PASSWORD`: senha longa, exclusiva e difícil de adivinhar (não compartilhe).
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: valor `client_email` do JSON.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: valor `private_key` do JSON, com BEGIN/END PRIVATE KEY. Pode colar com quebras de linha ou usar `\n`.
4. Faça um **Redeploy** na Vercel após configurar as variáveis. Acesse `https://utilidades-essenciais-kappa.vercel.app/admin/produtos` e use a senha para conectar.

## Como cadastrar

- Preencha um ou mais cartões de produto; nome, link de afiliado HTTPS e URL pública HTTPS do vídeo são obrigatórios.
- Ou cole vários produtos na caixa de importação. Cada linha deve ter colunas separadas por TAB: **nome, link de afiliado, URL pública do vídeo, preço, categoria, preço anterior real, URL da imagem**. Copiar células de Google Sheets funciona diretamente.
- O painel verifica links duplicados (URLs Shopee de produto com o mesmo vendedor e ID, ou a mesma URL curta) e combinações idênticas de nome+vídeo; registros repetidos são ignorados e relatados. Links curtos distintos que levam ao mesmo produto podem não ser identificados como duplicados sem resolver redirecionamentos.
- A API gera IDs `prod_NNN`, marca `Ativo? = SIM` e adiciona à aba `Produtos`, sem alterar os agendamentos existentes.
- A vitrine lê a aba `Exportação Site` via CSV publicado e atualiza o cache em até ~60 segundos após o Google atualizar a publicação.
- Preços só são cadastrados quando informados; **não inventa preço anterior ou desconto**. Vídeos devem estar em URL HTTPS pública e diretamente acessível ao Instagram.

## Observações

- Esta versão não extrai automaticamente nome, preço ou vídeo de links da Shopee; o anúncio pode exigir login e não há garantia de API pública. O cadastro em lote é feito com dados fornecidos pela usuária.
- O agendamento de Instagram é independente: novos produtos não entram automaticamente na aba `Publicações`.
- Para evitar colisões, não envie dois lotes simultaneamente. A verificação de duplicatas ocorre antes de cada inserção, mas a API do Google Sheets não oferece transação atômica de verificação+append. Para vários administradores simultâneos, adicione um serviço com trava transacional.
- Caso um vídeo esteja hospedado em URLs GitHub que redirecionam ou não sejam aceitas pelo Instagram, migre-o para um host de mídia pública antes de agendar.
