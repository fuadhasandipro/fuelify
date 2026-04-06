import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const RESTRICTION_DAYS = parseInt(process.env.NEXT_PUBLIC_RESTRICTION_DAYS || '3');

export async function POST(req: NextRequest) {
  const { plateNumber } = await req.json();

  if (!plateNumber) {
    return NextResponse.json({ error: 'Plate number required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: lastTransaction, error } = await supabase
    .from('fuel_transactions')
    .select('*')
    .eq('plate_number', plateNumber.toUpperCase())
    .order('fueled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
  }

  if (!lastTransaction) {
    return NextResponse.json({
      allowed: true,
      plateNumber,
      lastFueled: null,
      message: 'প্রথমবার — অনুমোদিত',
    });
  }

  const lastFueled = new Date(lastTransaction.fueled_at);
  const now = new Date();
  const daysDiff = (now.getTime() - lastFueled.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < RESTRICTION_DAYS) {
    const nextAllowed = new Date(lastTransaction.next_allowed_at);
    const hoursRemaining = Math.ceil((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
    return NextResponse.json({
      allowed: false,
      plateNumber,
      lastFueled: lastTransaction.fueled_at,
      nextAllowedAt: lastTransaction.next_allowed_at,
      scheduledSlot: lastTransaction.scheduled_slot,
      scheduledDate: lastTransaction.scheduled_date,
      hoursRemaining: Math.max(0, hoursRemaining),
      message: `অনুমোদিত নয় — ${Math.ceil(RESTRICTION_DAYS - daysDiff)} দিন বাকি`,
    });
  }

  return NextResponse.json({
    allowed: true,
    plateNumber,
    lastFueled: lastTransaction.fueled_at,
    message: 'অনুমোদিত',
  });
}
