import { NextResponse } from 'next/server';

// Placeholder webhook endpoint. Future: Stripe / email provider events.
// When implemented, verify the signature before trusting the payload.
export async function POST() {
  return NextResponse.json(
    { received: false, message: 'Webhooks no implementados todavía.' },
    { status: 501 },
  );
}

export async function GET() {
  return NextResponse.json({ message: 'Endpoint de webhooks (placeholder).' }, { status: 405 });
}
