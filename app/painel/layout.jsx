import Link from 'next/link';
import styles from './painel.module.css';

export const metadata = {
  title: {
    default: 'Painel VITRA',
    template: '%s | VITRA',
  },
  description: 'Área administrativa da plataforma VITRA.',
};

export default function PainelLayout({ children }) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link href="/painel" className={styles.logo} aria-label="VITRA - início do painel">
          <span className={styles.logoSymbol} aria-hidden="true">V</span>
          <span>VITRA</span>
          <span className={styles.logoCaption}>por AYVIO</span>
        </Link>
        <Link className={styles.storeLink} href="/">
          Ver vitrine atual <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
