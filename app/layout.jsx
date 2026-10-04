import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata = {
  title: 'Utilidades Essenciais',
  description: 'Achadinhos, utilidades e boas descobertas para facilitar sua rotina.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
