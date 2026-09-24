import Link from 'next/link';
import styles from '../painel.module.css';

export const metadata = { title: 'Meus produtos' };

export default function ProdutosPage() {
  return (
    <main className={styles.main}>
      <Link className={styles.backLink} href="/painel">← Voltar ao painel</Link>
      <div className={styles.eyebrow}>GERENCIAMENTO DE PRODUTOS</div>
      <h1 className={styles.title}>Meus produtos</h1>
      <p className={styles.lead}>
        Aqui cada usuário encontrará somente os produtos da sua própria vitrine,
        após a integração do login e do banco de dados.
      </p>
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon} aria-hidden="true">▦</span>
        <h2>Área em preparação</h2>
        <p>
          O cadastro, a edição e a exclusão de produtos ainda não estão disponíveis.
          Primeiro vamos implementar autenticação e isolamento dos dados entre usuários.
        </p>
        <Link className={styles.secondaryLink} href="/painel">Voltar ao início</Link>
      </div>
    </main>
  );
}
