# VITRA — primeira etapa técnica: estrutura do painel

## O que esta etapa implementa

- Rotas isoladas: `/painel`, `/painel/entrar`, `/painel/cadastro` e `/painel/produtos`.
- Identidade visual preliminar do painel, com estilos limitados ao módulo CSS.
- Telas demonstrativas de entrada e cadastro **desabilitadas**, pois ainda não existe autenticação configurada.
- Área de produtos com estado vazio explicativo. **Não acessa produtos privados ou de outros clientes.**
- Nenhuma mudança em `/`, no `VerticalFeed`, na leitura do Google Sheets ou no fallback `products.json`.

## Decisões para a próxima etapa

Antes de liberar formulários reais ou permitir acesso a produtos de clientes:

1. Configurar autenticação no servidor (proposta: Supabase Auth) e sessões seguras.
2. Criar estrutura multiusuário no banco (proposta: PostgreSQL/Supabase), com entidades `profiles`, `workspaces`, `workspace_members` e `products`. Um produto pertence a **um workspace**, nunca a uma lista global compartilhada.
3. Habilitar Row-Level Security (RLS) e testar que um usuário **não** consegue consultar ou alterar produtos de outra vitrine. Não usar apenas filtragem no frontend como proteção.
4. Proteger `/painel` e `/painel/produtos` no servidor. Apenas então habilitar login, cadastro e operações CRUD.
5. Migrar a Utilidades Essenciais como primeira vitrine de demonstração, mantendo a leitura atual do Google Sheets enquanto a migração não for validada.

## Preços e descontos — correção obrigatória antes do lançamento

O `VerticalFeed.jsx` atual calcula preços de referência artificiais quando falta `originalPrice`. Isso precisa ser **removido antes do lançamento público do SaaS**. O desconto deve aparecer apenas quando o preço anterior é verificável e maior que o atual; sem comprovação, mostrar só o preço atual. Na futura área de cadastro, prever informação sobre fonte e data da verificação, e nunca inventar um valor de referência.

## Fora do escopo desta primeira etapa

Autenticação funcional, banco de dados, CRUD real, cobrança dos planos Free/Start/Pro/Business, teste grátis de 30 dias, aplicativo e marketplace de vídeos.
