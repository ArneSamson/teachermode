import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const supabase = await createClient();

  // 1. Controleer of er daadwerkelijk een actieve gebruiker is
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 2. Meld de gebruiker af bij Supabase (dit wist de sessie aan de server-kant)
    await supabase.auth.signOut();
  }

  // 3. Stuur de gebruiker via een veilige redirect terug naar de loginpagina
  const url = new URL(request.url);
  return NextResponse.redirect(new URL('/login', url.origin), {
    status: 303, // 303 'See Other' is de webstandaard voor een redirect na een POST-formulier
  });
}