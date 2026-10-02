import StorefrontHome from '@/components/StorefrontHome';
import { getProducts } from '@/lib/googleSheets';

export default async function Home() {
  const products = await getProducts();
  return <StorefrontHome products={products} />;
}
