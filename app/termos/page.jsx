import Link from 'next/link';

export const metadata = {
  title: 'Termos de Uso | Utilidades Essenciais',
};

export default function Terms() {
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

        <h1>Termos de Uso</h1>

        <p>
          <strong>Última atualização:</strong> 5 de outubro de 2026.
        </p>

        <p>
          Estes Termos de Uso se aplicam às ferramentas e integrações da
          Utilidades Essenciais usadas para organizar, publicar, acompanhar e
          analisar conteúdo em redes sociais.
        </p>

        <h2>1. Finalidade</h2>

        <p>
          A ferramenta pode ser usada para organizar produtos, mídias,
          legendas, links, horários e publicações, além de consultar métricas
          de desempenho e registrar informações operacionais relacionadas às
          integrações autorizadas.
        </p>

        <h2>2. Integração com Instagram e Meta</h2>

        <p>
          Recursos relacionados ao Instagram dependem de uma conta
          profissional autorizada, das permissões concedidas e da
          disponibilidade das APIs da Meta. Quando habilitados, esses recursos
          podem incluir publicação de conteúdo, consulta de métricas,
          gerenciamento de comentários e outras funcionalidades permitidas
          pela plataforma.
        </p>

        <p>
          O titular da conta deve autorizar expressamente a integração e pode
          revogar o acesso pelos mecanismos disponibilizados pela Meta ou pelo
          Instagram.
        </p>

        <h2>3. Integração com TikTok</h2>

        <p>
          Criadores podem conectar voluntariamente a própria conta TikTok por
          meio da autorização oficial da plataforma. A ferramenta consulta as
          opções disponíveis para aquela conta e permite que o criador revise o
          vídeo, edite a legenda, escolha manualmente a privacidade e configure
          interações antes de confirmar o envio.
        </p>

        <p>
          A publicação somente é iniciada após confirmação explícita do
          criador. O processamento, a disponibilidade pública do conteúdo e os
          limites de publicação permanecem sujeitos às regras e decisões do
          TikTok.
        </p>

        <h2>4. Outros serviços utilizados</h2>

        <p>
          A ferramenta também pode utilizar serviços como Google Sheets,
          Google Apps Script, Cloudflare R2 e Vercel. O funcionamento de cada
          integração está sujeito às regras, limitações, permissões e
          disponibilidade do respectivo serviço.
        </p>

        <h2>5. Conteúdo, produtos e links de afiliado</h2>

        <p>
          O responsável pelo conteúdo deve possuir autorização para utilizar
          vídeos, imagens, marcas e demais materiais publicados. Também é
          responsável por conferir preços, disponibilidade, descrições e
          demais informações dos produtos.
        </p>

        <p>
          Links de afiliado, publicidade e conteúdos patrocinados devem ser
          identificados quando exigido pela legislação ou pelas regras da
          plataforma aplicável.
        </p>

        <h2>6. Comentários e interações</h2>

        <p>
          Quando o gerenciamento de comentários estiver habilitado, a
          ferramenta poderá consultar comentários, classificá-los, sugerir
          respostas e, quando expressamente configurado, publicar respostas em
          nome da conta profissional autorizada.
        </p>

        <p>
          Comentários sensíveis, reclamações, dúvidas específicas ou outros
          casos definidos pela operação podem permanecer sujeitos à revisão
          humana.
        </p>

        <h2>7. Agendamentos e disponibilidade</h2>

        <p>
          Horários programados são referências de execução. Falhas de rede,
          indisponibilidade de APIs, expiração de tokens, limitações das
          plataformas, análise de conteúdo e outros fatores externos podem
          impedir ou atrasar publicações, consultas e respostas.
        </p>

        <p>
          O uso da ferramenta não garante vendas, alcance, engajamento,
          aprovação de conteúdo ou qualquer resultado específico nas
          plataformas.
        </p>

        <h2>8. Privacidade</h2>

        <p>
          O tratamento de dados relacionado às integrações está descrito na{' '}
          <Link href="/privacidade" style={{ color: '#167347' }}>
            Política de Privacidade
          </Link>
          .
        </p>

        <h2>9. Alterações</h2>

        <p>
          Estes termos podem ser atualizados para refletir mudanças na
          ferramenta, nas integrações, nas regras das plataformas ou nos
          requisitos legais aplicáveis.
        </p>

        <h2>10. Contato</h2>

        <p>
          Dúvidas podem ser enviadas ao perfil oficial{' '}
          <a href="https://www.instagram.com/utilidadesessenciais/">
            @utilidadesessenciais
          </a>{' '}
          no Instagram.
        </p>
      </article>
    </main>
  );
}
