import { auditAffiliateCsv } from '../lib/affiliateAudit.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const csv = [
  'id,title,category,price,videourl,affiliatelink,active',
  'prod_ok,Produto OK,Casa,R$ 10,https://media.example/video.mp4,https://s.shopee.com.br/abc,SIM',
  'prod_dup,Produto 1,Casa,R$ 20,https://media.example/a.mp4,https://amazon.com.br/dp/abc,SIM',
  'prod_dup,Produto 2,Casa,R$ 30,https://media.example/b.mp4,https://mercadolivre.com.br/item,SIM',
  'prod_bad,Produto Ruim,Casa,R$ 40,https://media.example/c.mp4,https://shopee.com.br.evil.example/phish,SIM',
  'inactive_bad,Inativo,Casa,R$ 50,https://media.example/d.mp4,https://evil.example/x,NÃO',
].join('\n');

const result = auditAffiliateCsv(csv);

assert(result.ok === false, 'auditoria deveria detectar problemas');
assert(result.activeCount === 4, 'contagem de ativos incorreta');
assert(result.issues.some(issue => issue.code === 'duplicate_id' && issue.id === 'prod_dup'), 'ID duplicado não detectado');
assert(
  result.issues.some(issue =>
    issue.code === 'invalid_or_untrusted_affiliate_link'
    && issue.id === 'prod_bad'
    && issue.detail === 'shopee.com.br.evil.example'
  ),
  'domínio semelhante malicioso não foi rejeitado',
);
assert(
  !result.issues.some(issue => issue.id === 'inactive_bad'),
  'produto inativo não deve gerar incidente',
);

const cleanCsv = [
  'id,title,category,price,videourl,affiliatelink,active',
  'a,A,Casa,R$ 1,https://media.example/a.mp4,https://s.shopee.com.br/x,SIM',
  'b,B,Casa,R$ 2,https://media.example/b.mp4,https://amzn.to/x,true',
  'c,C,Casa,R$ 3,https://media.example/c.mp4,https://produto.mercadolivre.com.br/x,1',
].join('\n');

const clean = auditAffiliateCsv(cleanCsv);
assert(clean.ok === true, 'links permitidos deveriam passar');
assert(clean.issueCount === 0, 'auditoria limpa não deveria ter issues');

console.log('Affiliate audit regression OK.');
