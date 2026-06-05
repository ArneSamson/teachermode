import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Dashboard() {
  const supabase = await createClient();

  // 1. Controleer of de gebruiker is ingelogd via Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login'); // Niet ingelogd? Direct terug naar de loginpagina!
  }

  // 2. Haal de extra gegevens (naam en jaar_niveau) van deze leerling op uit jouw 'profielen' tabel
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

  // 3. Haal enkel de ingeschakelde opdrachten op voor het juiste leerjaar
  const { data: opdrachten, error: opdrachtenError } = await supabase
    .from('opdrachten')
    .select('*')
    .eq('jaar_niveau', profiel.jaar_niveau)
    .eq('enabled', true);

  if (opdrachtenError) {
    return <div className="p-8 text-red-600">Er ging iets mis met het laden van de opdrachten.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Uitlog-knop bovenaan */}
      <div className="flex justify-end mb-4">
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-500 hover:text-red-600 underline">
            Uitloggen
          </button>
        </form>
      </div>

      <h1 className="text-2xl font-bold mb-4">Welkom, {profiel.naam}</h1>
      <p className="mb-8">Jouw lesmateriaal voor het {profiel.jaar_niveau}e middelbaar:</p>

      {opdrachten.length === 0 ? (
        <p className="text-gray-500 italic">Er staan momenteel geen opdrachten voor jou open.</p>
      ) : (
        <div className="grid gap-4">
          {opdrachten.map((opdracht) => (
            <div key={opdracht.id} className="border p-4 rounded shadow-sm flex justify-between items-center bg-white">
              <div>
                <h2 className="font-semibold">{opdracht.titel}</h2>
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
      )}
    </div>
  );
}