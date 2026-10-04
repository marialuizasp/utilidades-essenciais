import { notFound } from 'next/navigation';
import { getProducts } from '@/lib/googleSheets';
import RedirectClient from './RedirectClient';

export const metadata = {
  title: 'Abrindo produto | Utilidades Essenciais',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GoToProduct({ params }) {
  const products = await getProducts();
  const product = products.find((item) => String(item.id) === String(params.productId));

  if (!product?.affiliateLink) {
    notFound();
  }

  return <RedirectClient url={product.affiliateLink} title={product.title} />;
}
