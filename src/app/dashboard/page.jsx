import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Dashboard() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profiel, error: profielError } = await supabase
    .from('profielen')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profielError || !profiel) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-red-600 bg-red-50 rounded">
        Profiel niet gevonden in de database. Vraag je leerkracht om je account correct te koppelen.
      </div>
    );
  }

  // 1. Haal de actieve opdrachten op
  let opdrachtenQuery = supabase
    .from('opdrachten')
    .select('*')
    .eq('enabled', true)
    .order('jaar_niveau', { ascending: false });

  if (profiel.rol !== 'leerkracht') {
    opdrachtenQuery = opdrachtenQuery.lte('jaar_niveau', profiel.jaar_niveau);
  }

  const { data: opdrachten, error: opdrachtenError } = await opdrachtenQuery;

  // 2. Haal de persoonlijke voortgang van deze gebruiker op
  const { data: voortgangData } = await supabase
    .from('voortgang')
    .select('opdracht_id, status')
    .eq('profiel_id', user.id);

  // Maak een handige lijst (Set) van alle ID's die de status 'voltooid' hebben
  const voltooideOpdrachten = new Set(
    voortgangData?.filter(v => v.status === 'voltooid').map(v => v.opdracht_id) || []
  );

  if (opdrachtenError) {
    return <div className="p-8 text-red-600">Er ging iets mis met het laden van de opdrachten.</div>;
  }

  const opdrachtenPerJaar = opdrachten.reduce((groepen, opdracht) => {
    const jaar = opdracht.jaar_niveau;
    if (!groepen[jaar]) groepen[jaar] = [];
    groepen[jaar].push(opdracht);
    return groepen;
  }, {});

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-end mb-4">
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-500 hover:text-red-600 underline">
            Uitloggen
          </button>
        </form>
      </div>

      <h1 className="text-2xl font-bold mb-2">Welkom, {profiel.naam}</h1>
      <p className="mb-8 text-gray-600">
        Ingelogd als {profiel.rol === 'leerkracht' ? 'Leerkracht' : `Leerling (${profiel.jaar_niveau}e jaar)`}
      </p>

      {opdrachten.length === 0 ? (
        <p className="text-gray-500 italic">Er staan momenteel geen opdrachten voor jou open.</p>
      ) : (
        Object.keys(opdrachtenPerJaar).sort((a, b) => b - a).map((jaar) => (
          <div key={jaar} className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Opdrachten Jaar {jaar}</h2>
            <div className="grid gap-4">
              {opdrachtenPerJaar[jaar].map((opdracht) => {
                // Hier wordt gekeken of het id in de voltooide lijst zit
                const isVoltooid = voltooideOpdrachten.has(opdracht.id);

                return (
                  <div key={opdracht.id} className="border p-4 rounded shadow-sm flex justify-between items-center bg-white">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{opdracht.titel}</h3>
                        
                        {isVoltooid && (
                          <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-green-200 flex items-center gap-1">
                            <span>✓</span> Voltooid
                          </span>
                        )}
                        {opdracht.is_toets && (
                          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
                            📝 Toets
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{opdracht.module}</span>
                    </div>
                    
                    {/* Slimme knop: geen link meer als het een afgeronde toets is */}
                    {isVoltooid && opdracht.is_toets ? (
                      <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded font-medium border cursor-not-allowed">
                        Bekijken gesloten
                      </span>
                    ) : (
                      <Link 
                        href={`/editor/${opdracht.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                      >
                        {isVoltooid ? 'Opnieuw proberen' : 'Start Oefening'}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}