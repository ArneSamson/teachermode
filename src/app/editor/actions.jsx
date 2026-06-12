'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// We voegen 'ingegevenCode' toe aan de parameters
export async function slaVoortgangOp(opdrachtId, ingegevenCode, isSucces) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Niet ingelogd' };

  // Haal ook 'aantal_pogingen' en 'status' op om te checken of we moeten plussen
  const { data: bestaand } = await supabase
    .from('voortgang')
    .select('id, aantal_pogingen, status')
    .eq('profiel_id', user.id)
    .eq('opdracht_id', opdrachtId)
    .single();

  if (bestaand) {
    // Basis update voor ELKE poging (fout of juist)
    const updateData = {
      huidige_code: ingegevenCode,
      aantal_pogingen: (bestaand.aantal_pogingen || 0) + 1,
    };

    // We updaten de status en tijd enkel als ze de oefening NU PAS correct hebben.
    // (We willen een al 'voltooide' oefening niet overschrijven als ze blijven spelen)
    if (isSucces && bestaand.status !== 'voltooid') {
      updateData.status = 'voltooid';
      updateData.eind_tijdstip = new Date().toISOString();
    }

    await supabase.from('voortgang').update(updateData).eq('id', bestaand.id);
  } else {
    // Gloednieuw record: hun allereerste klik op "Uitvoeren"
    await supabase.from('voortgang').insert({
      profiel_id: user.id,
      opdracht_id: opdrachtId,
      huidige_code: ingegevenCode,
      aantal_pogingen: 1,
      start_tijdstip: new Date().toISOString(),
      status: isSucces ? 'voltooid' : 'bezig',
      eind_tijdstip: isSucces ? new Date().toISOString() : null
    });
  }

  // Vertel Next.js dat de cache in de prullenbak mag, 
  // maar doe dit (voor de performance) best enkel als de status daadwerkelijk wijzigt naar succes.
  if (isSucces) {
    revalidatePath('/dashboard');
    revalidatePath(`/editor/${opdrachtId}`);
  }

  return { success: true };
}