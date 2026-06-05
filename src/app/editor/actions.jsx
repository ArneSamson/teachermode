'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache'; // 1. Voeg deze import toe!

export async function slaVoortgangOp(opdrachtId, isSucces) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Niet ingelogd' };

  const { data: bestaand } = await supabase
    .from('voortgang')
    .select('id')
    .eq('profiel_id', user.id)
    .eq('opdracht_id', opdrachtId)
    .single();

  if (bestaand) {
    await supabase.from('voortgang').update({
      status: isSucces ? 'voltooid' : 'bezig',
      eind_tijdstip: isSucces ? new Date().toISOString() : null
    }).eq('id', bestaand.id);
  } else {
    await supabase.from('voortgang').insert({
      profiel_id: user.id,
      opdracht_id: opdrachtId,
      status: isSucces ? 'voltooid' : 'bezig',
      eind_tijdstip: isSucces ? new Date().toISOString() : null
    });
  }

  // 2. Vertel Next.js dat de cache van deze pagina's in de prullenbak mag
  revalidatePath('/dashboard');
  revalidatePath(`/editor/${opdrachtId}`);

  return { success: true };
}