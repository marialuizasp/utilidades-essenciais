# Configurar Supabase VITRA
1. Criar projeto Supabase, habilitar autenticação por e-mail e configurar URLs de redirecionamento de produção e preview.
2. Executar supabase/migrations/20260924_vitra_initial.sql no SQL Editor.
3. Na Vercel configurar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY com a chave pública (nunca service_role). Fazer novo deploy.
4. Testar cadastro, confirmação de e-mail e login. CRUD de produtos, publicação de vitrines e cobrança ainda não estão conectados.
5. Limites provisórios de produtos: Free 5, Start 30, Pro 100, Business 300. Não comercializar até validar fluxos e limites completos.
A vitrine pública continua lendo Google Sheets sem alterações.
