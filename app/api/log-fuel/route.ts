import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateReturnSchedule } from '@/lib/schedule';

export async function POST(req: NextRequest) {
  const { plateNumber, plateImageUrl, vehicleType, fuelType, pumpStationId, operatorId } =
    await req.json();

  if (!plateNumber) {
    return NextResponse.json({ error: 'Plate number required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const schedule = generateReturnSchedule(now);

  const { data, error } = await supabase
    .from('fuel_transactions')
    .insert({
      plate_number: plateNumber.toUpperCase(),
      plate_image_url: plateImageUrl ?? null,
      vehicle_type: vehicleType ?? 'other',
      fuel_type: fuelType ?? 'petrol',
      pump_station_id: pumpStationId ?? null,
      operator_id: operatorId ?? null,
      fueled_at: now.toISOString(),
      next_allowed_at: schedule.nextAllowedAt.toISOString(),
      scheduled_slot: schedule.slotLabel,
      scheduled_date: schedule.returnDate.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    transaction: data,
    schedule: {
      returnDate: schedule.returnDate.toISOString(),
      slot: schedule.slot,
      slotLabel: schedule.slotLabel,
      nextAllowedAt: schedule.nextAllowedAt.toISOString(),
    },
  });
}
