import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function Dashboard() {
  // We faken de leerling nog even tot we het inlogsysteem bouwen
  const currentUser = { naam: "Test Leerling", jaar_niveau: 5 };

  // Haal de opdrachten voor dit specifieke jaar direct uit Supabase
  const { data: opdrachten, error } = await supabase
    .from('opdrachten')
    .select('*')
    .eq('jaar_niveau', currentUser.jaar_niveau);

  if (error) {
    console.error(error);
    return <div className="p-8 text-red-600">Er ging iets mis met het laden van de database.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welkom, {currentUser.naam}</h1>
      <p className="mb-8">Jouw lesmateriaal voor het {currentUser.jaar_niveau}e middelbaar:</p>

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
    </div>
  );
}