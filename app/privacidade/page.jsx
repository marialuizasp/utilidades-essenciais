import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | Utilidades Essenciais',
};

export default function Privacy() {
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

        <h1>Política de Privacidade</h1>

        <p>
          <strong>Última atualização:</strong> 5 de outubro de 2026.
        </p>

        <p>
          Esta Política de Privacidade descreve como a Utilidades Essenciais
          trata dados relacionados às integrações usadas para organizar,
          publicar e analisar conteúdo em redes sociais.
        </p>

        <h2>1. Dados tratados</h2>

        <p>
          Quando uma conta profissional do Instagram é autorizada, podemos
          tratar identificadores da conta, permissões concedidas, tokens de
          acesso, identificadores de mídias e publicações, imagens, vídeos,
          legendas, horários de publicação e informações necessárias para
          executar e acompanhar publicações.
        </p>

        <p>
          Quando as permissões correspondentes estiverem habilitadas, também
          podemos consultar métricas de desempenho, como alcance,
          visualizações, interações, curtidas, comentários,
          compartilhamentos e salvamentos. Para recursos de gerenciamento de
          comentários, podem ser tratados o identificador do comentário, nome
          de usuário, texto do comentário, data e informações relacionadas à
          resposta.
        </p>

        <p>
          Cadastros de produtos, agendamentos, registros operacionais,
          resultados de publicações e dados de desempenho podem ser
          armazenados em planilhas Google sob controle da operação.
        </p>

        <p>
          Na integração com TikTok, quando o próprio criador conecta sua conta,
          podemos tratar identificadores da conta, nome de usuário, nome exibido,
          permissões concedidas, tokens de acesso e atualização, opções de
          privacidade disponíveis, identificadores de publicação, status de
          processamento e informações técnicas necessárias para concluir e
          acompanhar o envio.
        </p>

        <p>
          Vídeos escolhidos pelo criador podem ser enviados diretamente do
          dispositivo ao TikTok após revisão e confirmação explícita. A
          Utilidades Essenciais não solicita nem recebe a senha da conta TikTok.
        </p>

        <h2>2. Finalidades</h2>

        <p>
          Os dados são usados para autenticar contas autorizadas, organizar e
          publicar conteúdo, acompanhar o processamento de publicações,
          consultar métricas de desempenho, identificar falhas, evitar
          publicações duplicadas e melhorar o planejamento de conteúdo.
        </p>

        <p>
          Quando o gerenciamento de comentários estiver autorizado, os dados
          também podem ser usados para localizar novos comentários,
          classificá-los, sugerir respostas e, quando configurado, publicar
          respostas em categorias previamente autorizadas pela operação.
        </p>

        <p>
          A Utilidades Essenciais não vende dados pessoais, dados de conta ou
          tokens de acesso.
        </p>

        <h2>3. Serviços envolvidos</h2>

        <p>
          O funcionamento da ferramenta pode envolver serviços da Meta e do
          Instagram, Google Sheets, Google Apps Script, Cloudflare R2, Vercel
          e, quando habilitado, TikTok. Cada serviço pode tratar informações
          segundo seus próprios termos e políticas de privacidade.
        </p>

        <h2>4. Segurança e conservação</h2>

        <p>
          Tokens e credenciais de integração são mantidos em ambientes de
          acesso restrito e não devem ser exibidos publicamente. Na integração
          com TikTok, as sessões de criadores são armazenadas separadamente e
          protegidas para que cada usuário opere apenas a própria conta
          autorizada. Os dados são conservados pelo período necessário para
          operar, monitorar e manter a integração, cumprir obrigações aplicáveis
          e investigar falhas operacionais.
        </p>

        <p>
          O acesso concedido às plataformas conectadas pode ser revogado pelo
          titular da conta nas configurações da própria plataforma.
        </p>

        <h2>5. Exclusão e direitos do titular</h2>

        <p>
          Você pode solicitar informações, correção ou exclusão de dados
          relacionados à integração, observadas as obrigações legais e
          técnicas aplicáveis. Também pode revogar as permissões concedidas
          diretamente nas configurações da plataforma conectada.
        </p>

        <p>
          Para solicitar exclusão ou exercer outros direitos, entre em contato
          pelo perfil oficial{' '}
          <a href="https://www.instagram.com/utilidadesessenciais/">
            @utilidadesessenciais
          </a>{' '}
          no Instagram.
        </p>

        <h2>6. Conteúdo e links de terceiros</h2>

        <p>
          A Utilidades Essenciais pode apresentar links para lojas,
          marketplaces e outros serviços de terceiros. Esses serviços possuem
          políticas próprias e são responsáveis pelo tratamento de dados
          realizado em seus respectivos ambientes.
        </p>

        <h2>7. Alterações</h2>

        <p>
          Esta política pode ser atualizada para refletir mudanças na
          ferramenta, nas integrações ou nos requisitos das plataformas. A
          data indicada no início desta página corresponde à versão vigente.
        </p>

        <p style={{ fontSize: 13, color: '#59645b' }}>
          As integrações com redes sociais dependem das permissões concedidas,
          das regras das respectivas plataformas e da disponibilidade das
          APIs utilizadas.
        </p>
      </article>
    </main>
  );
}
