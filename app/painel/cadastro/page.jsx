import Link from 'next/link';
import styles from '../painel.module.css';

export const metadata = { title: 'Criar conta' };

export default function CadastroPage() {
  return (
    <main className={styles.formMain}>
      <Link className={styles.backLink} href="/painel">← Voltar ao painel</Link>
      <section className={styles.formCard} aria-labelledby="signup-title">
        <div className={styles.eyebrow}>COMECE SUA VITRINE</div>
        <h1 id="signup-title" className={styles.formTitle}>Crie sua conta VITRA</h1>
        <p className={styles.formDescription}>
          Prévia do cadastro. Nesta etapa nenhum dado é enviado ou armazenado.
        </p>
        <div className={styles.fields}>
          <label className={styles.field}>
            Seu nome
            <input type="text" name="name" autoComplete="name" placeholder="Como podemos chamar você?" disabled />
          </label>
          <label className={styles.field}>
            E-mail
            <input type="email" name="email" autoComplete="email" placeholder="voce@exemplo.com" disabled />
          </label>
          <label className={styles.field}>
            Senha
            <input type="password" name="password" autoComplete="new-password" placeholder="Crie uma senha" disabled />
          </label>
          <button className={styles.primaryButton} type="button" disabled>Criar conta · em breve</button>
        </div>
        <p className={styles.formFooter}>Já possui conta? <Link href="/painel/entrar">Ver login</Link></p>
      </section>
    </main>
  );
}
