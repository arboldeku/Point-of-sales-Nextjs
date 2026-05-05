import { NextResponse } from 'next/server';

// Stub — returns static shop config without Prisma
// The original template used Prisma for this; we use Supabase for all real data
export async function GET() {
  return NextResponse.json({
    data: { id: 'prisma-store', name: 'Prisma Store', tax: 0 }
  }, { status: 200 });
}

export async function PATCH() {
  return NextResponse.json({ data: null }, { status: 200 });
}
