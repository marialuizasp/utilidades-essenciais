import VerticalFeed from '@/components/VerticalFeed';
import { getProducts } from '@/lib/googleSheets';

export default async function Home() {
  const products = await getProducts();
  return <VerticalFeed products={products} />;
}
