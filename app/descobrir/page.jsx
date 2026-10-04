import VerticalFeed from '@/components/VerticalFeed';
import { getProducts } from '@/lib/googleSheets';

export const metadata = {
  title: 'Descobrir | Utilidades Essenciais',
  description: 'Descubra achadinhos em vídeo.'
};

export default async function DiscoverPage() {
  const products = await getProducts();
  return <VerticalFeed products={products} />;
}
