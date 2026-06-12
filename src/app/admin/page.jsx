import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  toggleOpdrachtStatus, 
  forceerVoltooid, 
  resetVoortgang, 
  maakKlasAan, 
  updateLeerlingKlas,
  maakOpdrachtAan,
  verwijderOpdracht
} from './actions';
import VerwijderKnop from '@/components/VerwijderKnop';

export default async function AdminDashboard({ searchParams }) {
  const supabase = await createClient();
  
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
    .order('volgorde', { ascending: true }); // Aangepast naar sorteren op volgorde

  const { data: leerlingen } = await supabase
    .from('profielen')
    .select('*')
    .eq('rol', 'leerling')
    .order('jaar_niveau', { ascending: true })
    .order('naam', { ascending: true });

  const { data: alleVoortgang } = await supabase
    .from('voortgang')
    .select('*');

  const { data: klassen } = await supabase
    .from('klassen')
    .select('*')
    .order('naam', { ascending: true });

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
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
        <Link 
          href="?tab=beheer" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'beheer' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Opdrachten Overzicht
        </Link>
        <Link 
          href="?tab=cms" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'cms' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
        >
          + Nieuwe Opdracht Maken
        </Link>
        <Link 
          href="?tab=leerling" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'leerling' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Voortgang per Leerling
        </Link>
        <Link 
          href="?tab=opdracht" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'opdracht' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Voortgang per Opdracht
        </Link>
        <Link 
          href="?tab=klassen" 
          className={`px-4 py-2 rounded-t font-bold ${activeTab === 'klassen' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          Klas- & Projectbeheer
        </Link>
      </div>

      {/* CONTENT TAB 1: BEHEER (Nu met Verwijder-knop) */}
      {activeTab === 'beheer' && (
        <div className="bg-white p-6 rounded shadow-sm border">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Bestaande Oefeningen & Toetsen</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm font-semibold">
                  <th className="p-3">Jaar</th>
                  <th className="p-3">Volgorde</th>
                  <th className="p-3">Titel</th>
                  <th className="p-3">Module (Taal)</th>
                  <th className="p-3 text-center">Zichtbaarheid</th>
                  <th className="p-3 text-center">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {opdrachten?.map((opdracht) => (
                  <tr key={opdracht.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{opdracht.jaar_niveau}e</td>
                    <td className="p-3 text-sm text-gray-500">{opdracht.volgorde} {opdracht.is_extra && '(Extra)'}</td>
                    <td className="p-3 font-semibold">{opdracht.titel} {opdracht.is_toets && '📝'}</td>
                    <td className="p-3 text-sm text-gray-500">{opdracht.module} <span className="uppercase text-xs bg-gray-200 px-1 rounded ml-1">{opdracht.taal}</span></td>
                    <td className="p-3 text-center">
                      <form action={toggleOpdrachtStatus.bind(null, opdracht.id, opdracht.enabled)}>
                        <button 
                          type="submit"
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${
                            opdracht.enabled ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-400 text-white hover:bg-gray-500'
                          }`}
                        >
                          {opdracht.enabled ? '✓ Zichtbaar' : '✕ Verborgen'}
                        </button>
                      </form>
                    </td>
                    <td className="p-3 text-center">
                      <VerwijderKnop id={opdracht.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT TAB: CMS (Nieuwe Opdracht) */}
      {activeTab === 'cms' && (
        <div className="bg-white p-6 rounded shadow-sm border">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Een Nieuwe Opdracht Toevoegen</h2>
          
          <form action={maakOpdrachtAan} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Kolom 1: Basis Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Titel van de opdracht</label>
                  <input type="text" name="titel" required className="w-full border p-2 rounded bg-gray-50 focus:bg-white" placeholder="Bv: 1. De Productkaart" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Module / Thema</label>
                  <input type="text" name="module" required className="w-full border p-2 rounded bg-gray-50 focus:bg-white" placeholder="Bv: HTML Basis" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Leerjaar</label>
                    <select name="jaar_niveau" className="w-full border p-2 rounded bg-gray-50 focus:bg-white">
                      <option value="1">1e jaar</option>
                      <option value="2">2e jaar</option>
                      <option value="3">3e jaar</option>
                      <option value="4">4e jaar</option>
                      <option value="5" defaultValue={true}>5e jaar</option>
                      <option value="6">6e jaar</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Programmeertaal</label>
                    <select name="taal" className="w-full border p-2 rounded bg-gray-50 focus:bg-white">
                      <option value="html">HTML & CSS</option>
                      <option value="javascript">JavaScript</option>
                      <option value="sql">SQL Databases</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Volgorde (Bepaalt de positie)</label>
                  <input type="number" name="volgorde" required className="w-full border p-2 rounded bg-gray-50 focus:bg-white" placeholder="Bv: 10, 20, 30..." />
                  <p className="text-xs text-gray-500 mt-1">Houd stappen van 10 aan, zodat je later oefeningen ertussen kan schuiven (bv. 15).</p>
                </div>
              </div>

              {/* Kolom 2: Instellingen & Uitleg */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Uitleg (HTML toegestaan)</label>
                  <textarea 
                    name="uitleg" 
                    required 
                    rows="4" 
                    className="w-full border p-2 rounded bg-gray-50 focus:bg-white font-mono text-sm" 
                    placeholder="Typ de uitleg hier... Gebruik <code>...</code> voor code-woorden."
                  ></textarea>
                </div>

                <div className="bg-gray-50 p-4 rounded border grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_extra" className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold">Dit is een Extra (zijpad) oefening</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_toets" className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">Dit is een Toets</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer col-span-2">
                    <input type="checkbox" name="enkel_schooluren" className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold">Enkel toegankelijk tijdens schooluren (08:00 - 16:00)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Code Velden */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t pt-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Start Code (Wat de leerling ziet)</label>
                <textarea 
                  name="start_code" 
                  rows="8" 
                  className="w-full border p-3 rounded bg-[#282c34] text-[#abb2bf] font-mono text-sm focus:outline-blue-500" 
                  placeholder=""
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Test Script (Jouw Javascript Validatie)</label>
                <textarea 
                  name="test_script" 
                  rows="8" 
                  className="w-full border p-3 rounded bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm focus:outline-emerald-500" 
                  placeholder="// Typ hier de logica met 'throw new Error()'"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded font-bold hover:bg-emerald-700 shadow-md text-lg transition-transform active:scale-95">
                💾 Opdracht Opslaan in Database
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENT TAB 2: PER LEERLING */}
      {activeTab === 'leerling' && (
        /* ... Bestaande Leerling Code ... */
        <div className="bg-white p-6 rounded shadow-sm border">
          {/* De rest is ongewijzigd gebleven uit je snippet */}
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
                              <td className="py-2 pr-2">
                                <div className="flex justify-end items-center gap-4">
                                  <Link 
                                    href={`/admin/review/${leerling.id}/${opdracht.id}`} 
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-bold"
                                  >
                                    👁️ Bekijk Code
                                  </Link>
                                  
                                  {status !== 'voltooid' ? (
                                    <form action={forceerVoltooid.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-green-600 hover:underline text-xs">+ Forceer</button>
                                    </form>
                                  ) : (
                                    <form action={resetVoortgang.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-red-600 hover:underline text-xs">↺ Reset</button>
                                    </form>
                                  )}
                                </div>
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
        /* ... Bestaande Opdracht Code ... */
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
                              <td className="py-2 pr-2">
                                <div className="flex justify-end items-center gap-4">
                                  <Link 
                                    href={`/admin/review/${leerling.id}/${opdracht.id}`} 
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-bold"
                                  >
                                    👁️ Bekijk Code
                                  </Link>
                                  
                                  {status !== 'voltooid' ? (
                                    <form action={forceerVoltooid.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-green-600 hover:underline text-xs">+ Forceer</button>
                                    </form>
                                  ) : (
                                    <form action={resetVoortgang.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-red-600 hover:underline text-xs">↺ Reset</button>
                                    </form>
                                  )}
                                </div>
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

      {/* CONTENT TAB 4: KLASBEHEER */}
      {activeTab === 'klassen' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow-sm border h-fit">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Nieuwe Groep</h2>
            <form action={maakKlasAan} className="flex flex-col gap-3">
              <input 
                type="text" 
                name="naam" 
                placeholder="Bv. SDG+ Rotatie 2" 
                required
                className="border p-2 rounded focus:outline-blue-500"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
                + Aanmaken
              </button>
            </form>
            <h3 className="font-bold text-gray-700 mt-8 border-b pb-2 mb-3">Bestaande Groepen</h3>
            <ul className="divide-y text-sm">
              {klassen?.length === 0 && <li className="text-gray-500 italic py-2">Nog geen groepen.</li>}
              {klassen?.map(klas => (
                <li key={klas.id} className="py-2 flex justify-between items-center">
                  <span className="font-semibold">{klas.naam}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {leerlingen?.filter(l => l.klas_id === klas.id).length} lln
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2 bg-white p-6 rounded shadow-sm border">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Leerlingen Indelen</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="p-3">Naam</th>
                    <th className="p-3">Jaar</th>
                    <th className="p-3">Huidige Groep</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {leerlingen?.map(leerling => (
                    <tr key={leerling.id} className="hover:bg-gray-50">
                      <td className="p-3 font-semibold">{leerling.naam}</td>
                      <td className="p-3">{leerling.jaar_niveau}e</td>
                      <td className="p-3">
                        <form action={updateLeerlingKlas.bind(null, leerling.id)} className="flex items-center gap-2">
                          <select 
                            name="klas_id" 
                            defaultValue={leerling.klas_id || 'geen'}
                            className="border p-1.5 rounded bg-white text-sm w-full max-w-[150px]"
                          >
                            <option value="geen">-- Geen groep --</option>
                            {klassen?.map(klas => (
                              <option key={klas.id} value={klas.id}>{klas.naam}</option>
                            ))}
                          </select>
                          <button 
                            type="submit" 
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                          >
                            Opslaan
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}