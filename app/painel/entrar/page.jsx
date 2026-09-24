import Link from 'next/link';
import styles from '../painel.module.css';

export const metadata = { title: 'Entrar' };

export default function EntrarPage() {
  return (
    <main className={styles.formMain}>
      <Link className={styles.backLink} href="/painel">← Voltar ao painel</Link>
      <section className={styles.formCard} aria-labelledby="login-title">
        <div className={styles.eyebrow}>BEM-VINDO DE VOLTA</div>
        <h1 id="login-title" className={styles.formTitle}>Entre na VITRA</h1>
        <p className={styles.formDescription}>Prévia da tela de login. A autenticação ainda não foi ativada.</p>
        <div className={styles.fields}>
          <label className={styles.field}>
            E-mail
            <input type="email" name="email" autoComplete="email" placeholder="voce@exemplo.com" disabled />
          </label>
          <label className={styles.field}>
            Senha
            <input type="password" name="password" autoComplete="current-password" placeholder="Sua senha" disabled />
          </label>
          <button className={styles.primaryButton} type="button" disabled>Entrar · em breve</button>
        </div>
        <p className={styles.formFooter}>Ainda não tem conta? <Link href="/painel/cadastro">Ver cadastro</Link></p>
      </section>
    </main>
  );
}
