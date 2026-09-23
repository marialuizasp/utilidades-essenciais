import VerticalFeed from '@/components/VerticalFeed';
import productsData from '@/data/products.json';

export default function Home() {
  return <VerticalFeed products={productsData} />;
}
