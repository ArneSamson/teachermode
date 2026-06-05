import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { toggleOpdrachtStatus, forceerVoltooid, resetVoortgang } from './actions';

export default async function AdminDashboard({ searchParams }) {
  const supabase = await createClient();
  
  // Lees uit welk tabblad actief is (standaard 'beheer')
  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab || 'beheer';

  // 1. Beveiliging
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: huidigProfiel } = await supabase
    .from('profielen')
    .select('*')
    .eq('id', user.id)
    .single();

  if (huidigProfiel?.rol !== 'leerkracht') {
    return (
      <div className="p-8 text-center text-red-600 font-bold text-xl">
        Toegang geweigerd. Deze pagina is enkel voor leerkrachten.
      </div>
    );
  }

  // 2. Data Ophalen
  const { data: opdrachten } = await supabase
    .from('opdrachten')
    .select('*')
    .order('jaar_niveau', { ascending: true })
    .order('titel', { ascending: true });

  const { data: leerlingen } = await supabase
    .from('profielen')
    .select('*')
    .eq('rol', 'leerling')
    .order('jaar_niveau', { ascending: true })
    .order('naam', { ascending: true });

  const { data: alleVoortgang } = await supabase
    .from('voortgang')
    .select('*');

  // Hulpopdracht
  const geefVoortgangStatus = (leerlingId, opdrachtId) => {
    const match = alleVoortgang?.find(v => v.profiel_id === leerlingId && v.opdracht_id === opdrachtId);
    return match ? match.status : 'niet_gestart';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6 bg-white p-6 rounded shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Leerkrachten Dashboard</h1>
          <p className="text-gray-500">Volg en beheer de voortgang van al je klassen</p>
        </div>
        <Link href="/dashboard" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors font-medium">
          &larr; Naar Leerlingoverzicht
        </Link>
      </div>

      {/* TABBLADEN NAVIGATIE */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <Link 
          href="?tab=beheer" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'beheer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Opdrachten Beheer
        </Link>
        <Link 
          href="?tab=leerling" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'leerling' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Overzicht per Leerling
        </Link>
        <Link 
          href="?tab=opdracht" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'opdracht' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Overzicht per Opdracht
        </Link>
      </div>

      {/* CONTENT TAB 1: BEHEER */}
      {activeTab === 'beheer' && (
        <div className="bg-white p-6 rounded shadow-sm border">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Oefeningen & Toetsen In/Uitschakelen</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm font-semibold">
                  <th className="p-3">Jaar</th>
                  <th className="p-3">Titel</th>
                  <th className="p-3">Module</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {opdrachten?.map((opdracht) => (
                  <tr key={opdracht.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{opdracht.jaar_niveau}e</td>
                    <td className="p-3 font-semibold">{opdracht.titel} {opdracht.is_toets && '📝'}</td>
                    <td className="p-3 text-sm text-gray-500">{opdracht.module}</td>
                    <td className="p-3 text-center">
                      <form action={toggleOpdrachtStatus.bind(null, opdracht.id, opdracht.enabled)}>
                        <button 
                          type="submit"
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${
                            opdracht.enabled ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          {opdracht.enabled ? '✓ Zichtbaar' : '✕ Verborgen'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT TAB 2: PER LEERLING */}
      {activeTab === 'leerling' && (
        <div className="bg-white p-6 rounded shadow-sm border">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Voortgang per Leerling</h2>
          <div className="grid gap-3">
            {leerlingen?.map((leerling) => {
              const relevanteOpdrachten = opdrachten.filter(o => o.jaar_niveau <= leerling.jaar_niveau);
              const voltooideAantal = relevanteOpdrachten.filter(o => geefVoortgangStatus(leerling.id, o.id) === 'voltooid').length;

              return (
                <details key={leerling.id} className="group border rounded-lg bg-gray-50 overflow-hidden">
                  <summary className="flex justify-between items-center p-4 cursor-pointer font-bold text-gray-800 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span>{leerling.naam}</span>
                      <span className="text-xs font-normal bg-gray-200 text-gray-700 px-2 py-1 rounded">{leerling.jaar_niveau}e jaar</span>
                    </div>
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full border">
                      {voltooideAantal} / {relevanteOpdrachten.length} voltooid
                    </span>
                  </summary>
                  
                  <div className="p-4 bg-white border-t">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y text-gray-700">
                        {relevanteOpdrachten.map((opdracht) => {
                          const status = geefVoortgangStatus(leerling.id, opdracht.id);
                          return (
                            <tr key={opdracht.id} className="hover:bg-gray-50">
                              <td className="py-2 pl-2 w-1/2">{opdracht.titel} {opdracht.is_toets && '📝'}</td>
                              <td className="py-2">
                                {status === 'voltooid' && <span className="text-green-600 font-bold">✓ Voltooid</span>}
                                {status === 'bezig' && <span className="text-orange-600 font-bold">... Bezig</span>}
                                {status === 'niet_gestart' && <span className="text-gray-400">Niet gestart</span>}
                              </td>
                              <td className="py-2 text-right pr-2">
                                {status !== 'voltooid' ? (
                                  <form action={forceerVoltooid.bind(null, leerling.id, opdracht.id)}>
                                    <button type="submit" className="text-green-600 hover:underline text-xs">+ Forceer Voltooid</button>
                                  </form>
                                ) : (
                                  <form action={resetVoortgang.bind(null, leerling.id, opdracht.id)}>
                                    <button type="submit" className="text-red-600 hover:underline text-xs">↺ Reset</button>
                                  </form>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENT TAB 3: PER OPDRACHT */}
      {activeTab === 'opdracht' && (
        <div className="bg-white p-6 rounded shadow-sm border">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Voortgang per Opdracht</h2>
          <div className="grid gap-3">
            {opdrachten?.map((opdracht) => {
              const relevanteLeerlingen = leerlingen.filter(l => l.jaar_niveau >= opdracht.jaar_niveau);
              const voltooideAantal = relevanteLeerlingen.filter(l => geefVoortgangStatus(l.id, opdracht.id) === 'voltooid').length;

              return (
                <details key={opdracht.id} className="group border rounded-lg bg-gray-50 overflow-hidden">
                  <summary className="flex justify-between items-center p-4 cursor-pointer font-bold text-gray-800 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span>{opdracht.titel} {opdracht.is_toets && '📝'}</span>
                      <span className="text-xs font-normal bg-gray-200 text-gray-700 px-2 py-1 rounded">Jaar {opdracht.jaar_niveau}</span>
                    </div>
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full border">
                      {voltooideAantal} / {relevanteLeerlingen.length} leerlingen klaar
                    </span>
                  </summary>
                  
                  <div className="p-4 bg-white border-t">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y text-gray-700">
                        {relevanteLeerlingen.map((leerling) => {
                          const status = geefVoortgangStatus(leerling.id, opdracht.id);
                          return (
                            <tr key={leerling.id} className="hover:bg-gray-50">
                              <td className="py-2 pl-2 w-1/3 font-medium">{leerling.naam}</td>
                              <td className="py-2 text-xs text-gray-500">{leerling.jaar_niveau}e</td>
                              <td className="py-2">
                                {status === 'voltooid' && <span className="text-green-600 font-bold">✓ Voltooid</span>}
                                {status === 'bezig' && <span className="text-orange-600 font-bold">... Bezig</span>}
                                {status === 'niet_gestart' && <span className="text-gray-400">Niet gestart</span>}
                              </td>
                              <td className="py-2 text-right pr-2">
                                {status !== 'voltooid' ? (
                                  <form action={forceerVoltooid.bind(null, leerling.id, opdracht.id)}>
                                    <button type="submit" className="text-green-600 hover:underline text-xs">+ Forceer</button>
                                  </form>
                                ) : (
                                  <form action={resetVoortgang.bind(null, leerling.id, opdracht.id)}>
                                    <button type="submit" className="text-red-600 hover:underline text-xs">↺ Reset</button>
                                  </form>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}