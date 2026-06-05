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

  // 1. Bouw de basis query (haal alle actieve opdrachten op)
  let query = supabase
    .from('opdrachten')
    .select('*')
    .eq('enabled', true)
    .order('jaar_niveau', { ascending: false }); // Sorteer hoogste jaar eerst

  // 2. Pas de query aan op basis van de rol
  if (profiel.rol !== 'leerkracht') {
    // Leerlingen: haal opdrachten op waarvan het jaar_niveau KLEINER OF GELIJK (lte) is aan hun eigen jaar
    query = query.lte('jaar_niveau', profiel.jaar_niveau);
  }
  // Als de rol 'leerkracht' is, voegen we geen extra filter toe en haalt hij letterlijk alles op.

  const { data: opdrachten, error: opdrachtenError } = await query;

  if (opdrachtenError) {
    return <div className="p-8 text-red-600">Er ging iets mis met het laden van de opdrachten.</div>;
  }

  // 3. Groepeer de opdrachten per leerjaar voor een overzichtelijk dashboard
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
        // Loop door de gegroepeerde jaren heen
        Object.keys(opdrachtenPerJaar).sort((a, b) => b - a).map((jaar) => (
          <div key={jaar} className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Opdrachten Jaar {jaar}</h2>
            <div className="grid gap-4">
              {opdrachtenPerJaar[jaar].map((opdracht) => (
                <div key={opdracht.id} className="border p-4 rounded shadow-sm flex justify-between items-center bg-white">
                  <div>
                    <h3 className="font-semibold">{opdracht.titel}</h3>
                    <span className="text-sm text-gray-500">{opdracht.module}</span>
                  </div>
                  <Link 
                    href={`/editor/${opdracht.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Start Oefening
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}