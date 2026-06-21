import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'evefit-method',
    time: new Date().toISOString(),
  });
}
