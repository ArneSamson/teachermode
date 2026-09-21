'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function startToetsSessie(toetsId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  // Maak de sessie aan (gestart_op wordt automatisch door de database op NU gezet)
  const { error } = await supabase
    .from('toets_sessies')
    .insert([{ toets_id: toetsId, profiel_id: user.id }]);

  if (error) {
    return { error: "Kon sessie niet starten of je bent al gestart." };
  }

  // Ververs de pagina zodat Next.js de nieuwe sessie ziet
  revalidatePath(`/toets/${toetsId}`);
  return { success: true };
}

export async function registreerTabVerlaten(sessieId) {
  const supabase = await createClient();
  
  // We halen eerst de huidige count op (via een veilige RPC of door te selecteren en +1 te doen)
  // Om het simpel te houden voor nu, voeren we gewoon een update uit met de opgevraagde count.
  const { data: sessie } = await supabase.from('toets_sessies').select('tab_verlaten_count').eq('id', sessieId).single();
  
  if (sessie) {
    await supabase.from('toets_sessies')
      .update({ tab_verlaten_count: sessie.tab_verlaten_count + 1 })
      .eq('id', sessieId);
  }
}

export async function slaToetsCodeOp(sessieId, code) {
  const supabase = await createClient();
  await supabase.from('toets_sessies')
    .update({ laatste_code: code })
    .eq('id', sessieId);
}

export async function dienToetsIn(sessieId) {
  const supabase = await createClient();
  await supabase.from('toets_sessies')
    .update({ 
      is_ingediend: true, 
      ingediend_op: new Date().toISOString() 
    })
    .eq('id', sessieId);
}