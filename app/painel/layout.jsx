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
          <svg className={styles.logoSymbol} viewBox="0 0 64 64" role="img" aria-label="Símbolo VITRA"><path d="M9 12 Q9 3 20 9 L55 29 Q63 34 55 40 L20 59 Q9 65 9 52 Z" fill="#D5F971"/><path d="M20 19 Q20 13 27 17 L48 29 Q55 33 48 38 L27 49 Q20 53 20 46 Z" fill="#FF8676"/><path d="M28 25 Q28 22 32 24 L43 30 Q48 33 43 36 L32 42 Q28 44 28 40 Z" fill="#243CE6"/></svg>
          <span>vitra<span className={styles.logoDot}>.</span></span>
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
