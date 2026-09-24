import Link from 'next/link';
import AuthForm from '../AuthForm';
import styles from '../painel.module.css';
export const metadata={title:'Entrar'};
export default function Page(){return <main className={styles.formMain}><Link className={styles.backLink} href="/painel">← Voltar ao painel</Link><section className={styles.formCard}><div className={styles.eyebrow}>BEM-VINDO DE VOLTA</div><h1 className={styles.formTitle}>Entre na VITRA</h1><p className={styles.formDescription}>Acesse sua conta para gerenciar sua vitrine.</p><AuthForm mode="login"/><p className={styles.formFooter}>Ainda não tem conta? <Link href="/painel/cadastro">Criar conta</Link></p></section></main>}
