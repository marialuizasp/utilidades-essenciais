import { notFound } from 'next/navigation';
import { getProducts } from '@/lib/googleSheets';
import RedirectClient from './RedirectClient';
import { safeAffiliateUrl } from '@/lib/affiliateUrl';

export const metadata = {
  title: 'Abrindo produto | Utilidades Essenciais',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GoToProduct({ params }) {
  const { productId } = await params;
  const products = await getProducts();
  const product = products.find((item) => String(item.id) === String(productId));

  const safeUrl = safeAffiliateUrl(product?.affiliateLink);

  if (!safeUrl) {
    notFound();
  }

  return <RedirectClient url={safeUrl} title={product.title} />;
}
