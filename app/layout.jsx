import './globals.css';

export const metadata = {
  title: 'Achadinhos | Links de Afiliada',
  description: 'Os melhores achadinhos e utilidades.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
