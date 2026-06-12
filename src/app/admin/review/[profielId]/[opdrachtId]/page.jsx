import { createClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import HtmlEvaluator from '@/components/HtmlEvaluator';
import JsEvaluator from '@/components/JsEvaluator';
import SqlEvaluator from '@/components/SqlEvaluator';

export default async function ReviewPage({ params }) {
  const { profielId, opdrachtId } = await params;
  const supabase = await createClient();

  // 1. Beveiliging: Enkel leerkrachten
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: adminProfiel } = await supabase
    .from('profielen')
    .select('rol')
    .eq('id', user.id)
    .single();
    
  if (adminProfiel?.rol !== 'leerkracht') redirect('/dashboard');

  // 2. Data ophalen (Leerling, Opdracht & Voortgang)
  const { data: leerling } = await supabase
    .from('profielen')
    .select('naam, jaar_niveau')
    .eq('id', profielId)
    .single();

  const { data: opdracht } = await supabase
    .from('opdrachten')
    .select('*')
    .eq('id', opdrachtId)
    .single();

  const { data: voortgang } = await supabase
    .from('voortgang')
    .select('*')
    .eq('profiel_id', profielId)
    .eq('opdracht_id', opdrachtId)
    .single();

  if (!opdracht || !leerling) return notFound();

  // Als de leerling al code heeft getypt, gebruiken we die. Anders de standaard startcode.
  const startCode = voortgang?.huidige_code || opdracht.start_code || '';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/admin?tab=leerling" className="text-neon-blue hover:text-text-main transition-colors mb-6 font-bold inline-flex items-center gap-2">
        &larr; Terug naar Admin Dashboard
      </Link>
      
      {/* Header Kaart */}
      <div className="mb-6 bg-bg-card p-6 rounded-xl border border-border-main shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1 text-text-main">
              Code Review: <span className="text-neon-blue">{leerling.naam}</span>
            </h2>
            <p className="text-text-muted">
              Opdracht: <span className="font-semibold text-text-main">{opdracht.titel}</span> 
              <span className="ml-3 text-xs bg-bg-app border border-border-main px-2 py-1 rounded font-mono">
                Pogingen: {voortgang?.aantal_pogingen || 0}
              </span>
            </p>
          </div>
          
          <div className="text-right">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
              voortgang?.status === 'voltooid' 
                ? 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-glow-green/20' : 
              voortgang?.status === 'bezig' 
                ? 'bg-neon-orange/10 text-neon-orange border-neon-orange/30 shadow-glow-orange/20' 
                : 'bg-bg-app border-border-main text-text-muted'
            }`}>
              {voortgang?.status === 'voltooid' ? '✓ Voltooid' : 
               voortgang?.status === 'bezig' ? '... Bezig' : 'Niet gestart'}
            </span>
          </div>
        </div>
        
        {/* Informatie Box */}
        <div className="text-sm text-neon-blue bg-neon-blue/10 p-4 rounded-lg border border-neon-blue/20 flex items-start gap-3">
          <span className="text-lg leading-none">ℹ️</span>
          <div>
            <strong className="block mb-0.5">God Mode is actief</strong> 
            Jouw acties hier beïnvloeden de database of de voortgang van de leerling niet. Je kan de code veilig bewerken en testen.
          </div>
        </div>
      </div>

      {opdracht.taal === 'javascript' ? (
        <JsEvaluator opdrachtId={opdracht.id} initialCode={startCode} testScript={opdracht.test_script} isReviewMode={true} />
      ) : opdracht.taal === 'sql' ? (
        <SqlEvaluator opdrachtId={opdracht.id} initialCode={startCode} testScript={opdracht.test_script} isReviewMode={true} />
      ) : (
        <HtmlEvaluator opdrachtId={opdracht.id} initialCode={startCode} testScript={opdracht.test_script} isReviewMode={true} />
      )}
    </div>
  );
}