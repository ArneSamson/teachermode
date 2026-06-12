'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

// Helper functie om badges te checken en uit te delen
async function checkEnDeelBadgesUit(profielId, isSucces, pogingen, supabase) {
  const uur = new Date().getHours();
  const nieuweBadges = [];

  // 1. Nachtraaf: Code uitvoeren voor 07:00 of na 18:00
  if (uur >= 18 || uur < 7) {
    nieuweBadges.push({ 
      naam: 'Nachtraaf', icoon: '🦉', 
      beschrijving: 'Je hebt code geschreven buiten de schooluren.' 
    });
  }

  // 2. Foutloos: Een oefening in de allereerste poging perfect opgelost
  if (isSucces && pogingen === 1) {
    nieuweBadges.push({ 
      naam: 'Foutloos', icoon: '🎯', 
      beschrijving: 'Direct raak! Je hebt een oefening in 1 keer juist opgelost.' 
    });
  }

  // 3. Volhouder: Niet opgeven! Geslaagd na 10 of meer pogingen
  if (isSucces && pogingen >= 10) {
    nieuweBadges.push({ 
      naam: 'Volhouder', icoon: '🐢', 
      beschrijving: 'De aanhouder wint. Je bleef proberen tot het werkte!' 
    });
  }

  // 4. Eerste Code: Gewoon voor de moeite van het proberen
  if (pogingen === 1) {
    nieuweBadges.push({ 
      naam: 'Hello World', icoon: '🚀', 
      beschrijving: 'Je eerste stappen gezet en code uitgevoerd.' 
    });
  }

  if (nieuweBadges.length > 0) {
    // Haal reeds behaalde badges op om dubbele push-pogingen te vermijden
    const { data: bestaand } = await supabase
      .from('behaalde_badges')
      .select('badge_naam')
      .eq('profiel_id', profielId);
      
    const bestaandeNamen = bestaand?.map(b => b.badge_naam) || [];

    // Filter de badges die de leerling al heeft
    const toInsert = nieuweBadges
      .filter(b => !bestaandeNamen.includes(b.naam))
      .map(b => ({
        profiel_id: profielId,
        badge_naam: b.naam,
        icoon: b.icoon,
        beschrijving: b.beschrijving
      }));

    // Voeg de nieuwe toe
    if (toInsert.length > 0) {
      await supabase.from('behaalde_badges').insert(toInsert);
    }
  }
}

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

  // 🔥 NIEUW: Controleer op badges!
  // We berekenen het juiste aantal pogingen (het bestaande aantal + 1, of gewoon 1 als het nieuw is)
  const actuelePogingen = bestaand ? (bestaand.aantal_pogingen || 0) + 1 : 1;
  await checkEnDeelBadgesUit(user.id, isSucces, actuelePogingen, supabase);

  // Vertel Next.js dat de cache in de prullenbak mag, 
  // maar doe dit (voor de performance) best enkel als de status daadwerkelijk wijzigt naar succes.
  if (isSucces) {
    revalidatePath('/dashboard');
    revalidatePath(`/editor/${opdrachtId}`);
  }

  return { success: true };
}