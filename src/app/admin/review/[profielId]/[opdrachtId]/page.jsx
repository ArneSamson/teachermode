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
      <Link href="/admin?tab=leerling" className="text-blue-600 hover:underline mb-6 inline-block font-bold">
        &larr; Terug naar Admin Dashboard
      </Link>
      
      <div className="mb-6 bg-white p-6 rounded shadow-sm border border-blue-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-1 text-gray-800">
              Code Review: {leerling.naam}
            </h2>
            <p className="text-gray-500 mb-4">
              Opdracht: <span className="font-semibold text-gray-700">{opdracht.titel}</span> 
              <span className="ml-3 text-xs bg-gray-100 px-2 py-1 rounded">Pogingen: {voortgang?.aantal_pogingen || 0}</span>
            </p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded text-sm font-bold ${
              voortgang?.status === 'voltooid' ? 'bg-green-100 text-green-800' : 
              voortgang?.status === 'bezig' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'
            }`}>
              {voortgang?.status === 'voltooid' ? '✓ Voltooid' : 
               voortgang?.status === 'bezig' ? '... Bezig' : 'Niet gestart'}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-100">
          <strong>Jouw acties hier beïnvloeden de voortgang van de leerling niet.</strong> Je kan de code veilig aanpassen en testen.
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