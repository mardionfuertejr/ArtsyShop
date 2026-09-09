import Link from 'next/link';
import BottomNav from '@/components/customer/BottomNav';
import { getMockProductBySlug } from '@/lib/mockData';
import CustomRequestClient from './CustomRequestClient';

export default async function RequestSimilarPage({ params }) {
  const resolvedParams = await params;
  const product = getMockProductBySlug(resolvedParams.productSlug);

  return (
    <div className="customer-shell">
      <header className="top-bar">
        <Link href={`/shop/${resolvedParams.productSlug}`} className="top-bar-action" aria-label="Back">
          <i className="fa-solid fa-arrow-left"></i>
        </Link>
        <span className="top-bar-title" style={{ flex: 1, margin: 0 }}>Custom Request</span>
        <div style={{ width: 40 }} />
      </header>

      <main className="page-content page-enter">
        <CustomRequestClient product={product} />
      </main>

      <BottomNav />
    </div>
  );
}
