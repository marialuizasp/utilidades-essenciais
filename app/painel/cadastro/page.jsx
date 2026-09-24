import Link from 'next/link';
import AuthForm from '../AuthForm';
import styles from '../painel.module.css';
export const metadata={title:'Criar conta'};
export default function Page(){return <main className={styles.formMain}><Link className={styles.backLink} href="/painel">← Voltar ao painel</Link><section className={styles.formCard}><div className={styles.eyebrow}>COMECE SUA VITRINE</div><h1 className={styles.formTitle}>Crie sua conta VITRA</h1><p className={styles.formDescription}>Cadastre-se para começar a configurar sua vitrine.</p><AuthForm mode="signup"/><p className={styles.formFooter}>Já tem conta? <Link href="/painel/entrar">Entrar</Link></p></section></main>}
