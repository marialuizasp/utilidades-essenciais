import VerticalFeed from '@/components/VerticalFeed';
import productsData from '@/data/products.json';

export default function Page() {
  return (
    <main className="w-full h-screen bg-black overflow-hidden">
      <VerticalFeed products={productsData} />
    </main>
  );
}
