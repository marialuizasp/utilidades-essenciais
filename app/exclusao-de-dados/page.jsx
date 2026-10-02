import Link from 'next/link';

export const metadata = {
  title: 'Exclusão de Dados | Utilidades Essenciais',
};

export default function DataDeletion() {
  return (
    <main
      style={{
        height: '100dvh',
        overflowY: 'auto',
        background: '#fafaf8',
        color: '#17231c',
        padding: '32px 20px',
        fontFamily: 'Arial,sans-serif',
      }}
    >
      <article style={{ maxWidth: 760, margin: '0 auto', lineHeight: 1.7 }}>
        <Link href="/" style={{ color: '#167347' }}>
          ← Utilidades Essenciais
        </Link>

        <h1>Exclusão de Dados</h1>

        <p>
          <strong>Última atualização:</strong> 2 de outubro de 2026.
        </p>

        <p>
          Esta página explica como solicitar a exclusão de dados relacionados
          às integrações da Utilidades Essenciais com Instagram/Meta e outros
          serviços conectados.
        </p>

        <h2>Como solicitar</h2>

        <p>
          Para solicitar a exclusão de dados associados à integração, envie
          uma mensagem pelo perfil oficial{' '}
          <a href="https://www.instagram.com/utilidadesessenciais/">
            @utilidadesessenciais
          </a>{' '}
          informando que deseja excluir os dados vinculados à integração.
        </p>

        <p>
          A solicitação pode incluir dados operacionais armazenados pela
          ferramenta, como identificadores de conta e mídia, registros de
          publicações, métricas, comentários coletados, sugestões de resposta
          e outros registros técnicos necessários ao funcionamento da
          automação.
        </p>

        <h2>Revogação de acesso</h2>

        <p>
          Você também pode revogar diretamente as permissões concedidas ao app
          nas configurações da plataforma conectada. Após a revogação, o app
          deixa de ter acesso aos dados disponibilizados por aquela integração,
          conforme as regras da respectiva plataforma.
        </p>

        <h2>Prazo e limitações</h2>

        <p>
          Solicitações de exclusão serão tratadas dentro de prazo razoável,
          observadas eventuais obrigações legais, de segurança, prevenção a
          fraude, auditoria ou manutenção de registros estritamente
          necessários.
        </p>

        <h2>Política de Privacidade</h2>

        <p>
          Para mais informações sobre o tratamento de dados, consulte a{' '}
          <Link href="/privacidade" style={{ color: '#167347' }}>
            Política de Privacidade
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
