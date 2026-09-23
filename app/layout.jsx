import './globals.css';

export const metadata = {
  title: 'Utilidades Essenciais',
  description: 'Os melhores achadinhos e utilidades.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white antialiased m-0 p-0 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
