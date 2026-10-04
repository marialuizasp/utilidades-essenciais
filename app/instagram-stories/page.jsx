import StorefrontHome from '@/components/StorefrontHome';
import { getProducts } from '@/lib/googleSheets';

export const metadata = {
  title: 'Utilidades Essenciais',
  description: 'Achadinhos, utilidades e boas descobertas para facilitar sua rotina.',
  robots: {
    index: false,
    follow: true,
  },
};

export default async function InstagramStories() {
  const products = await getProducts();
  return <StorefrontHome products={products} />;
}
