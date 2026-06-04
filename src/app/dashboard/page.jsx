import { currentUser, opdrachtenDB } from '../../lib/mockData';
import Link from 'next/link';

export default function Dashboard() {
  // Haal enkel de opdrachten op voor het jaar van de ingelogde leerling
  const relevanteOpdrachten = opdrachtenDB.filter(
    (opdracht) => opdracht.jaar_niveau === currentUser.jaar_niveau
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welkom, {currentUser.naam}</h1>
      <p className="mb-8">Jouw lesmateriaal voor het {currentUser.jaar_niveau}e middelbaar:</p>

      <div className="grid gap-4">
        {relevanteOpdrachten.map((opdracht) => (
          <div key={opdracht.id} className="border p-4 rounded shadow-sm flex justify-between items-center">
            <div>
              <h2 className="font-semibold">{opdracht.titel}</h2>
              <span className="text-sm text-gray-500">{opdracht.module}</span>
            </div>
            {/* Link naar de specifieke editor pagina */}
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