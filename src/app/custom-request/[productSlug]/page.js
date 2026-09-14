import Link from 'next/link';
import BottomNav from '@/components/customer/BottomNav';
import { getMockProductBySlug } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/server';
import CustomRequestClient from './CustomRequestClient';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  let product = getMockProductBySlug(resolvedParams?.productSlug);
  if (!product) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { data } = await supabase
          .from('products')
          .select('name')
          .eq('slug', resolvedParams?.productSlug)
          .maybeSingle();
        if (data) product = data;
      }
    } catch {}
  }
  return {
    title: product ? `Custom Request: ${product.name} | M&M's Artsy` : "Custom Order Request | M&M's Artsy",
  };
}

export default async function RequestSimilarPage({ params }) {
  const resolvedParams = await params;
  let product = getMockProductBySlug(resolvedParams.productSlug);
  if (!product) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const { data } = await supabase
          .from('products')
          .select('*, product_photos(*)')
          .eq('slug', resolvedParams.productSlug)
          .maybeSingle();
        if (data) product = data;
      }
    } catch {}
  }

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
