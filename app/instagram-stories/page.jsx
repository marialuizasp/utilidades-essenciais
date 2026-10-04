import VerticalFeed from '@/components/VerticalFeed';
import { getProducts } from '@/lib/googleSheets';

export const metadata = {
  title: 'Utilidades Essenciais',
  description: 'Os melhores achadinhos e utilidades.',
  robots: {
    index: false,
    follow: true,
  },
};

export default async function InstagramStories() {
  const products = await getProducts();
  return <VerticalFeed products={products} />;
}
