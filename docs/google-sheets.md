# Cadastro de produtos no Google Sheets

Crie uma planilha com uma aba chamada **Produtos**. Cole estes cabeçalhos na primeira linha, exatamente nesta ordem:

```csv
id,title,category,price,videoUrl,affiliateLink,active,tags
```

Exemplo de produto existente:

```csv
prod_001,Lavadora de Alta Pressão Bivolt Portátil Profissional Sem Fio Recarregável Original,Casa e Cozinha,"R$ 94,05",https://bjdcjttjwsmbbytqwvzm.supabase.co/storage/v1/object/public/videos/lavadora-alta-pressao.mp4.mp4,https://s.shopee.com.br/W6plju24t,SIM,lavadora de alta pressão;portátil
```

Para publicar, escolha Arquivo > Compartilhar > Publicar na Web, selecione **somente a aba Produtos**, formato **CSV**, e copie o link gerado. ATENÇÃO: o conteúdo publicado fica acessível a qualquer pessoa com o link. Não coloque senhas, dados pessoais, custos privados ou comissões nessa aba.

Configure a mesma URL em dois lugares:
- Vercel > projeto > Settings > Environment Variables: `GOOGLE_SHEET_CSV_URL` (Production). Faça Redeploy após adicionar.
- GitHub > repositório > Settings > Secrets and variables > Actions > New repository secret: `GOOGLE_SHEET_CSV_URL`.

A coluna `active` aceita SIM para publicar e NÃO para ocultar. As alterações aparecem no site após até cerca de 60 segundos, sujeitas a cache e disponibilidade do Google. A verificação diária considera somente produtos ativos.

O Excel antigo continua no repositório como histórico; a fonte principal dos novos cadastros passa a ser o Google Sheets.
