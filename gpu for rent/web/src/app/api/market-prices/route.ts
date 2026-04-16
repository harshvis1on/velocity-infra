import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('market_prices')
    .select('gpu_model, suggested_price_per_gpu_hr_usd, min_price_per_gpu_hr_usd, max_price_per_gpu_hr_usd')
    .order('suggested_price_per_gpu_hr_usd', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const priceMap: Record<string, { suggested: number; min: number; max: number }> = {};
  for (const row of data || []) {
    priceMap[row.gpu_model] = {
      suggested: Number(row.suggested_price_per_gpu_hr_usd),
      min: Number(row.min_price_per_gpu_hr_usd),
      max: Number(row.max_price_per_gpu_hr_usd),
    };
  }

  return NextResponse.json({ prices: priceMap });
}
