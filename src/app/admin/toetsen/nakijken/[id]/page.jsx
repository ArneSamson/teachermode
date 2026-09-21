import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import HtmlEvaluator from '@/components/HtmlEvaluator';
import JsEvaluator from '@/components/JsEvaluator';
import SqlEvaluator from '@/components/SqlEvaluator';
import { bewaarBeoordeling } from './actions';
import BeoordelingsFormulier from './BeoordelingsFormulier';

export default async function ToetsNakijkenPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Auth Controle
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profiel } = await supabase.from('profielen').select('rol').eq('id', user.id).single();
  if (profiel?.rol !== 'leerkracht') redirect('/dashboard');

  // 2. Haal de sessie, leerling én toets data in één keer op
  const { data: sessie } = await supabase
    .from('toets_sessies')
    .select(`
      *,
      toetsen (*),
      profielen (naam, jaar_niveau)
    `)
    .eq('id', id)
    .single();

  if (!sessie) {
    return <div className="p-8 text-center text-red-500 font-bold">Sessie niet gevonden.</div>;
  }

  const toets = sessie.toetsen;
  const leerling = sessie.profielen;

  // 3. Koppel het unieke sessie-ID vast aan de externe server action
  const bewaarAction = bewaarBeoordeling.bind(null, id);

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <Link href={`/admin/toetsen/${toets.id}`} className="text-neon-blue font-bold hover:text-white inline-block">
        &larr; Terug naar overzicht van deze toets
      </Link>
      
      {/* Header met Leerling Info */}
      <div className="bg-bg-card p-6 rounded-xl border border-border-main shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main mb-1">
            Nakijken: <span className="text-neon-orange">{leerling?.naam}</span>
          </h1>
          <p className="text-text-muted text-sm font-mono">
            {toets.titel} • {leerling?.jaar_niveau}e jaar
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="bg-bg-app border border-border-main px-4 py-2 rounded-lg text-sm">
            <span className="text-text-muted">Status: </span>
            <span className={`font-bold ${sessie.is_ingediend ? 'text-neon-green' : 'text-neon-orange'}`}>
              {sessie.is_ingediend ? 'Ingediend' : 'Bezig (of Tijd op)'}
            </span>
          </div>
          <div className="bg-bg-app border border-border-main px-4 py-2 rounded-lg text-sm">
            <span className="text-text-muted">Spiek-teller: </span>
            <span className={`font-bold ${sessie.tab_verlaten_count > 0 ? 'text-red-500' : 'text-neon-blue'}`}>
              {sessie.tab_verlaten_count}x tabblad verlaten
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Linker kolom: De Editor (Review Modus) */}
        <div className="flex-grow xl:w-2/3">
          <div className="bg-bg-card border border-border-main p-4 rounded-t-xl border-b-0 font-bold text-text-main">
            Live Code Preview
          </div>
          <div className="opacity-95">
            {toets.taal === 'javascript' ? (
              <JsEvaluator 
                opdrachtId={toets.id} 
                initialCode={sessie.laatste_code || toets.start_code} 
                testScript={toets.test_script}
                isReviewMode={true} 
              />
            ) : toets.taal === 'sql' ? (
              <SqlEvaluator 
                opdrachtId={toets.id} 
                initialCode={sessie.laatste_code || toets.start_code} 
                testScript={toets.test_script}
                isReviewMode={true}
              />
            ) : (
              <HtmlEvaluator 
                opdrachtId={toets.id} 
                initialCode={sessie.laatste_code || toets.start_code} 
                testScript={toets.test_script}
                isReviewMode={true}
              />
            )}
          </div>
        </div>
        
        {/* Rechter kolom: Het Nakijk-formulier */}
        <div className="xl:w-1/3 flex flex-col gap-4">
          <div className="bg-bg-card p-6 rounded-xl border border-neon-blue/50 shadow-glow-blue/10 sticky top-4">
            <h2 className="text-xl font-bold text-neon-blue mb-4">Beoordeling</h2>
            
            <BeoordelingsFormulier sessie={sessie} bewaarAction={bewaarAction} />
          </div>
        </div>
        
      </div>
    </div>
  );
}