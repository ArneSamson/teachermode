import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { startToetsSessie } from './actions';
import ToetsClient from './ToetsClient';

export default async function ToetsServerPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profiel } = await supabase.from('profielen').select('rol').eq('id', user.id).single();
  const isLeerkracht = profiel?.rol === 'leerkracht';

  // 1. Haal de toets op
  const { data: toets } = await supabase.from('toetsen').select('*').eq('id', id).single();
  
  if (!toets) {
    return <div className="p-8 text-center text-red-500 font-bold">Toets niet gevonden.</div>;
  }

  if (!toets.is_actief && !isLeerkracht) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-20">
        <h1 className="text-3xl font-bold text-text-main mb-4">Toets Gesloten</h1>
        <p className="text-text-muted mb-8">Deze toets is momenteel niet geopend door de leerkracht.</p>
        <Link href="/dashboard" className="bg-neon-blue text-bg-app px-6 py-3 rounded-full font-bold">Terug naar Dashboard</Link>
      </div>
    );
  }

  // 2. Check of er al een sessie bestaat voor deze leerling
  const { data: sessie } = await supabase
    .from('toets_sessies')
    .select('*')
    .eq('toets_id', id)
    .eq('profiel_id', user.id)
    .single();

  // 3. Geen sessie? Toon het startscherm (Landingspagina)
  if (!sessie && !isLeerkracht) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-center mt-10 border border-neon-orange/50 bg-neon-orange/5 rounded-xl shadow-glow-orange/10">
        <h1 className="text-3xl font-bold text-text-main mb-4">Waarschuwing: Toets {toets.titel}</h1>
        <p className="text-lg text-text-muted mb-6">
          Je krijgt exact <strong>{toets.tijdslimiet_minuten} minuten</strong> voor deze toets. 
          Zodra je op de knop drukt, start de timer. 
          Sluit het tabblad niet onnodig af.
        </p>
        <form action={async () => {
          'use server';
          await startToetsSessie(toets.id);
        }}>
          <button type="submit" className="bg-neon-orange text-white px-8 py-4 rounded-full font-bold text-xl hover:shadow-glow-orange transition-all">
            Ik ben klaar. Start Toets!
          </button>
        </form>
      </div>
    );
  }

  // 4. Sessie bestaat! Bepaal resterende tijd op de SERVER
  let resterendeSeconden = 0;
  
  if (sessie && !sessie.is_ingediend) {
    const gestart = new Date(sessie.gestart_op).getTime();
    const nu = new Date().getTime();
    const verstrekenSeconden = Math.floor((nu - gestart) / 1000);
    const maxSeconden = toets.tijdslimiet_minuten * 60;
    
    resterendeSeconden = maxSeconden - verstrekenSeconden;

    // Als de tijd server-side om is, of de toets is al ingediend: toon lockdown scherm
    if (resterendeSeconden <= 0) {
      return (
        <div className="p-8 max-w-4xl mx-auto text-center mt-20">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Tijd is om!</h1>
          <p className="text-text-muted">Je sessie is verlopen en je code is automatisch opgeslagen.</p>
          <Link href="/dashboard" className="mt-8 inline-block text-neon-blue font-bold">Terug naar Dashboard</Link>
        </div>
      );
    }
  } else if (sessie?.is_ingediend) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-20">
        <h1 className="text-4xl font-bold text-neon-green mb-4">Toets Ingediend</h1>
        <p className="text-text-muted">Je hebt deze toets succesvol afgerond. Wacht op de verbetering van je leerkracht.</p>
        <Link href="/dashboard" className="mt-8 inline-block text-neon-blue font-bold">Terug naar Dashboard</Link>
      </div>
    );
  }

  // 5. Toon de effectieve Toets Editor
  return (
    <ToetsClient 
      toets={toets} 
      sessie={sessie} 
      initiëleResterendeSeconden={resterendeSeconden} 
    />
  );
}