import Link from 'next/link';
import styles from './painel.module.css';

export default function PainelHome() {
  return (
    <main className={styles.main}>
      <div className={styles.eyebrow}>VITRA · ÁREA ADMINISTRATIVA</div>
      <h1 className={styles.title}>Sua vitrine, em um só lugar.</h1>
      <p className={styles.lead}>
        Estamos construindo o espaço onde cada criador poderá administrar seus próprios produtos e vídeos.
        Esta é a estrutura visual inicial; ainda não há acesso a contas ou dados de clientes.
      </p>
      <div className={styles.notice} role="status">
        <span aria-hidden="true">🔒</span>
        <span>Prévia da estrutura. O cadastro, o login e a proteção dos dados serão conectados na próxima etapa.</span>
      </div>
      <div className={styles.grid}>
        <Link className={styles.card} href="/painel/entrar">
          <span className={styles.cardIcon} aria-hidden="true">↗</span>
          <h2>Entrar</h2>
          <p>Área reservada para acessar sua própria conta VITRA.</p>
          <span className={styles.cardLink}>Ver tela de login →</span>
        </Link>
        <Link className={styles.card} href="/painel/cadastro">
          <span className={styles.cardIcon} aria-hidden="true">＋</span>
          <h2>Criar conta</h2>
          <p>Futuro cadastro de afiliados, criadores e lojistas.</p>
          <span className={styles.cardLink}>Ver tela de cadastro →</span>
        </Link>
        <Link className={styles.card} href="/painel/produtos">
          <span className={styles.cardIcon} aria-hidden="true">▦</span>
          <h2>Meus produtos</h2>
          <p>Estrutura da área que permitirá cadastrar e gerenciar os produtos de cada vitrine.</p>
          <span className={styles.cardLink}>Ver estrutura →</span>
        </Link>
      </div>
      <p className={styles.footnote}>A vitrine Utilidades Essenciais continua funcionando normalmente na página inicial.</p>
    </main>
  );
}
