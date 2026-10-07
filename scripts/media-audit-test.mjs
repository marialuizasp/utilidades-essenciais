import {
  expectedMediaPrefix,
  hasOpenMediaIncident,
  prepareMediaAudit,
  safeMediaUrl,
} from '../lib/mediaAudit.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  safeMediaUrl('https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/feed/a.jpg'),
  'R2 deve ser permitido',
);
assert(
  safeMediaUrl('https://bjdcjttjwsmbbytqwvzm.supabase.co/storage/v1/object/public/videos/a.mp4'),
  'Supabase legado deve ser permitido',
);
assert(
  safeMediaUrl('https://res.cloudinary.com/demo/image/upload/a.jpg'),
  'Cloudinary deve ser permitido',
);
assert(
  safeMediaUrl('https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev.evil.example/a.jpg') === null,
  'host parecido malicioso deve ser rejeitado',
);
assert(
  safeMediaUrl('http://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/a.jpg') === null,
  'HTTP deve ser rejeitado',
);
assert(expectedMediaPrefix('REEL') === 'video/', 'REEL deve esperar vídeo');
assert(expectedMediaPrefix('STORY') === 'image/', 'STORY deve esperar imagem');
assert(expectedMediaPrefix('FEED') === 'image/', 'FEED deve esperar imagem');

const values = [
  ['ID mídia','Tipo','ID origem / produto','Nome','URL pública','Ativa?'],
  ['STORY_01','STORY','UE_STORY_01','Story 01','https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/stories/01.jpg','SIM'],
  ['FEED_01','FEED','prod_1','Feed 01','https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/feed/01.jpg','SIM'],
  ['REEL_01','REEL','prod_1','Reel 01','https://pub-603881db00f042c08f8b4dc6d9731239.r2.dev/reels/01.mp4','SIM'],
  ['REEL_02','REEL','prod_2','Reel 02','https://evil.example/02.mp4','SIM'],
  ['OFF_01','REEL','prod_3','Off','https://evil.example/off.mp4','NÃO'],
];

const shards = [0,1,2,3].map(shard => prepareMediaAudit(values, shard, 4));
const allIds = shards.flatMap(result => result.candidates.map(item => item.id));
assert(new Set(allIds).size === allIds.length, 'mídia não pode aparecer em dois shards');
assert(allIds.includes('STORY_01'), 'Story ativo permitido deve entrar');
assert(allIds.includes('FEED_01'), 'Feed ativo permitido deve entrar');
assert(allIds.includes('REEL_01'), 'Reel ativo permitido deve entrar');
assert(!allIds.includes('REEL_02'), 'host não permitido não deve ser sondado');
assert(!allIds.includes('OFF_01'), 'mídia inativa não deve ser sondada');
assert(
  shards.some(result => result.warnings.some(warning => warning.id === 'REEL_02' && warning.code === 'untrusted_media_url')),
  'URL ativa não confiável deve gerar aviso de inventário',
);

console.log('Media health audit regression OK.');


const incidentRows = [
  ['Data/Hora','Evento','Severidade','Origem','ID','Linha','Status Antes','Status Depois','Tentativa','Resultado','Detalhes'],
  ['07/10/2026','MEDIA_HEALTH_AUDIT_FAILED','AVISO','MEDIA/R2','','','FALHA','SEM BLOQUEIO AUTOMATICO',1,'media-health-audit','media_audit_key=2026-10-07:s3:abc123 | failed=1'],
  ['07/10/2026','MEDIA_HEALTH_AUDIT_FAILED','AVISO','MEDIA/R2','','','FALHA','RESOLVIDO',1,'media-health-audit','media_issue_key=s2:resolved123 | failed=1'],
];

assert(
  hasOpenMediaIncident(incidentRows, 3, 'abc123') === true,
  'incidente legado ainda aberto deve ser reutilizado',
);
assert(
  hasOpenMediaIncident(incidentRows, 2, 'resolved123') === false,
  'incidente resolvido deve permitir um novo alerta se a falha voltar',
);

incidentRows.push([
  '08/10/2026','MEDIA_HEALTH_AUDIT_FAILED','AVISO','MEDIA/R2','','','FALHA',
  'SEM BLOQUEIO AUTOMATICO',1,'media-health-audit',
  'media_issue_key=s1:stable456 | failed=1',
]);

assert(
  hasOpenMediaIncident(incidentRows, 1, 'stable456') === true,
  'chave estável deve deduplicar sem depender da data',
);
