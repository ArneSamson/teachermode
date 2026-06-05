'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// 1. Opdracht aan- of uitzetten
export async function toggleOpdrachtStatus(opdrachtId, huidigEnabled) {
    console.log("➔ Server Action 'toggleOpdrachtStatus' succesvol aangeroepen voor ID:", opdrachtId);
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiel } = await supabase.from('profielen').select('rol').eq('id', user?.id).single();
  if (profiel?.rol !== 'leerkracht') throw new Error('Niet geautoriseerd');

  // Vang hier de error op van de update
  const { error } = await supabase
    .from('opdrachten')
    .update({ enabled: !huidigEnabled })
    .eq('id', opdrachtId);

  // Als er een database-fout is, loggen we die direct in de terminal
  if (error) {
    console.error("❌ Supabase Error bij toggelen opdracht:", error.message);
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { success: true };
}

// 2. Handmatig een oefening als voltooid markeren voor een leerling
export async function forceerVoltooid(profielId, opdrachtId) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiel } = await supabase.from('profielen').select('rol').eq('id', user?.id).single();
  if (profiel?.rol !== 'leerkracht') throw new Error('Niet geautoriseerd');

  // Check of er al een record bestaat
  const { data: bestaand } = await supabase
    .from('voortgang')
    .select('id')
    .eq('profiel_id', profielId)
    .eq('opdracht_id', opdrachtId)
    .single();

  if (bestaand) {
    await supabase
      .from('voortgang')
      .update({ status: 'voltooid', eind_tijdstip: new Date().toISOString() })
      .eq('id', bestaand.id);
  } else {
    await supabase
      .from('voortgang')
      .insert({
        profiel_id: profielId,
        opdracht_id: opdrachtId,
        status: 'voltooid',
        eind_tijdstip: new Date().toISOString()
      });
  }

  revalidatePath('/admin');
}

// 3. Voortgang van een leerling volledig wissen/resetten
export async function resetVoortgang(profielId, opdrachtId) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profiel } = await supabase.from('profielen').select('rol').eq('id', user?.id).single();
  if (profiel?.rol !== 'leerkracht') throw new Error('Niet geautoriseerd');

  await supabase
    .from('voortgang')
    .delete()
    .eq('profiel_id', profielId)
    .eq('opdracht_id', opdrachtId);

  revalidatePath('/admin');
}