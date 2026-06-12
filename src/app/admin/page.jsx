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
import ThemeToggle from '@/components/ThemeToggle'; // Toegevoegd voor thema-wissel

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
      <div className="p-8 text-center text-red-400 bg-red-950/20 border border-red-900/50 font-bold text-xl rounded-xl max-w-2xl mx-auto mt-10">
        Toegang geweigerd. Deze pagina is enkel voor leerkrachten.
      </div>
    );
  }

  // 2. Data Ophalen
  const { data: opdrachten } = await supabase
    .from('opdrachten')
    .select('*')
    .order('jaar_niveau', { ascending: true })
    .order('volgorde', { ascending: true });

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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-bg-card p-6 rounded-xl shadow-lg border border-border-main gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Leerkrachten Dashboard</h1>
          <p className="text-text-muted">Volg en beheer de voortgang van al je klassen</p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/dashboard" className="bg-bg-app border border-border-main text-text-main px-4 py-2 rounded-full hover:border-neon-blue hover:text-neon-blue transition-colors font-medium text-sm flex items-center gap-2">
            &larr; Naar Leerlingoverzicht
          </Link>
        </div>
      </div>

      {/* TABBLADEN NAVIGATIE */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-border-main pb-0">
        {[
          { id: 'beheer', label: 'Opdrachten Overzicht' },
          { id: 'cms', label: '+ Nieuwe Opdracht Maken' },
          { id: 'leerling', label: 'Voortgang per Leerling' },
          { id: 'opdracht', label: 'Voortgang per Opdracht' },
          { id: 'klassen', label: 'Klas- & Projectbeheer' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link 
              key={tab.id}
              href={`?tab=${tab.id}`} 
              className={`px-5 py-3 rounded-t-lg font-bold text-sm transition-all duration-300 border border-b-0 ${
                isActive 
                  ? tab.id === 'cms' 
                    ? 'bg-neon-green text-dark border-neon-green shadow-glow-green transform translate-y-px' 
                    : 'bg-neon-blue text-dark border-neon-blue shadow-glow-blue transform translate-y-px'
                  : 'bg-bg-card text-text-muted hover:bg-border-main hover:text-text-main border-transparent'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* CONTENT TAB 1: BEHEER */}
      {activeTab === 'beheer' && (
        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-main">
          <h2 className="text-xl font-bold mb-4 text-text-main">Bestaande Oefeningen & Toetsen</h2>
          <div className="overflow-x-auto rounded-lg border border-border-main">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-app text-text-muted text-sm font-semibold border-b border-border-main">
                  <th className="p-4">Jaar</th>
                  <th className="p-4">Volgorde</th>
                  <th className="p-4">Titel</th>
                  <th className="p-4">Module (Taal)</th>
                  <th className="p-4 text-center">Zichtbaarheid</th>
                  <th className="p-4 text-center">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main text-text-main">
                {opdrachten?.map((opdracht) => (
                  <tr key={opdracht.id} className="hover:bg-bg-app/50 transition-colors">
                    <td className="p-4 font-medium">{opdracht.jaar_niveau}e</td>
                    <td className="p-4 text-sm text-text-muted">{opdracht.volgorde} {opdracht.is_extra && <span className="text-neon-purple text-xs ml-1">(Extra)</span>}</td>
                    <td className="p-4 font-semibold">{opdracht.titel} {opdracht.is_toets && <span className="text-neon-orange">📝</span>}</td>
                    <td className="p-4 text-sm text-text-muted">
                      {opdracht.module} <span className="uppercase text-xs bg-bg-app border border-border-main px-2 py-0.5 rounded ml-2 font-mono">{opdracht.taal}</span>
                    </td>
                    <td className="p-4 text-center">
                      <form action={toggleOpdrachtStatus.bind(null, opdracht.id, opdracht.enabled)}>
                        <button 
                          type="submit"
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            opdracht.enabled 
                              ? 'bg-neon-green/10 text-neon-green border-neon-green/30 hover:bg-neon-green/20' 
                              : 'bg-bg-app text-text-muted border-border-main hover:bg-border-main'
                          }`}
                        >
                          {opdracht.enabled ? '✓ Zichtbaar' : '✕ Verborgen'}
                        </button>
                      </form>
                    </td>
                    <td className="p-4 text-center">
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
        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-main border-t-neon-green">
          <h2 className="text-2xl font-bold mb-6 text-text-main border-b border-border-main pb-4">Een Nieuwe Opdracht Toevoegen</h2>
          
          <form action={maakOpdrachtAan} className="space-y-6 text-text-main">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Kolom 1 */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1.5">Titel van de opdracht</label>
                  <input type="text" name="titel" required className="w-full border border-border-main p-2.5 rounded-lg bg-bg-app focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all" placeholder="Bv: 1. De Productkaart" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1.5">Module / Thema</label>
                  <input type="text" name="module" required className="w-full border border-border-main p-2.5 rounded-lg bg-bg-app focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all" placeholder="Bv: HTML Basis" />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-text-muted mb-1.5">Leerjaar</label>
                    <select name="jaar_niveau" className="w-full border border-border-main p-2.5 rounded-lg bg-bg-app focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all">
                      <option value="1">1e jaar</option>
                      <option value="2">2e jaar</option>
                      <option value="3">3e jaar</option>
                      <option value="4">4e jaar</option>
                      <option value="5" defaultValue={true}>5e jaar</option>
                      <option value="6">6e jaar</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-text-muted mb-1.5">Programmeertaal</label>
                    <select name="taal" className="w-full border border-border-main p-2.5 rounded-lg bg-bg-app focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all">
                      <option value="html">HTML & CSS</option>
                      <option value="javascript">JavaScript</option>
                      <option value="sql">SQL Databases</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1.5">Volgorde (Bepaalt de positie)</label>
                  <input type="number" name="volgorde" required className="w-full border border-border-main p-2.5 rounded-lg bg-bg-app focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all" placeholder="Bv: 10, 20, 30..." />
                  <p className="text-xs text-text-muted mt-2">Houd stappen van 10 aan, zodat je later oefeningen ertussen kan schuiven.</p>
                </div>
              </div>

              {/* Kolom 2 */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1.5">Uitleg (HTML toegestaan)</label>
                  <textarea 
                    name="uitleg" 
                    required 
                    rows="4" 
                    className="w-full border border-border-main p-2.5 rounded-lg bg-bg-app focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all font-mono text-sm" 
                    placeholder="Typ de uitleg hier... Gebruik <code>...</code> voor code-woorden."
                  ></textarea>
                </div>

                <div className="bg-bg-app p-5 rounded-xl border border-border-main grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="is_extra" className="w-4 h-4 accent-neon-purple bg-bg-card border-border-main" />
                    <span className="text-sm font-semibold text-text-main group-hover:text-neon-purple transition-colors">Extra (zijpad) oefening</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="is_toets" className="w-4 h-4 accent-neon-orange bg-bg-card border-border-main" />
                    <span className="text-sm font-semibold text-text-main group-hover:text-neon-orange transition-colors">Dit is een Toets</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer md:col-span-2 group mt-2">
                    <input type="checkbox" name="enkel_schooluren" className="w-4 h-4 accent-neon-blue bg-bg-card border-border-main" />
                    <span className="text-sm font-semibold text-text-main group-hover:text-neon-blue transition-colors">Enkel toegankelijk tijdens schooluren (08:00 - 16:00)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Code Velden */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-border-main pt-8">
              <div>
                <label className="block text-sm font-bold text-text-muted mb-1.5">Start Code (Wat de leerling ziet)</label>
                <textarea 
                  name="start_code" 
                  rows="8" 
                  className="w-full border border-border-main p-4 rounded-xl bg-bg-app font-mono text-sm focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green" 
                  placeholder=""
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-text-muted mb-1.5">Test Script (Jouw Validatie)</label>
                <textarea 
                  name="test_script" 
                  rows="8" 
                  className="w-full border border-border-main p-4 rounded-xl bg-bg-app font-mono text-sm focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green" 
                  placeholder="// Typ hier de logica met 'throw new Error()'"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button type="submit" className="bg-neon-green text-dark px-8 py-3 rounded-full font-bold hover:shadow-glow-green text-lg transition-all duration-300">
                💾 Opdracht Opslaan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENT TAB 2: PER LEERLING */}
      {activeTab === 'leerling' && (
        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-main">
          <h2 className="text-xl font-bold mb-6 text-text-main">Voortgang per Leerling</h2>
          <div className="grid gap-4">
            {leerlingen?.map((leerling) => {
              const relevanteOpdrachten = opdrachten.filter(o => o.jaar_niveau <= leerling.jaar_niveau);
              const voltooideAantal = relevanteOpdrachten.filter(o => geefVoortgangStatus(leerling.id, o.id) === 'voltooid').length;
              return (
                <details key={leerling.id} className="group border border-border-main rounded-xl bg-bg-app overflow-hidden">
                  <summary className="flex justify-between items-center p-5 cursor-pointer font-bold text-text-main bg-bg-card hover:bg-border-main/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span>{leerling.naam}</span>
                      <span className="text-xs font-normal bg-bg-app border border-border-main text-text-muted px-2 py-1 rounded">{leerling.jaar_niveau}e jaar</span>
                    </div>
                    <span className="text-sm font-mono text-text-muted bg-bg-app px-3 py-1 rounded-full border border-border-main">
                      {voltooideAantal} / {relevanteOpdrachten.length} voltooid
                    </span>
                  </summary>
                  <div className="p-5 bg-bg-app border-t border-border-main">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-border-main text-text-main">
                        {relevanteOpdrachten.map((opdracht) => {
                          const status = geefVoortgangStatus(leerling.id, opdracht.id);
                          return (
                            <tr key={opdracht.id} className="hover:bg-border-main/30 transition-colors">
                              <td className="py-3 pl-2 w-1/2">{opdracht.titel} {opdracht.is_toets && '📝'}</td>
                              <td className="py-3">
                                {status === 'voltooid' && <span className="text-neon-green font-bold">✓ Voltooid</span>}
                                {status === 'bezig' && <span className="text-neon-orange font-bold">... Bezig</span>}
                                {status === 'niet_gestart' && <span className="text-text-muted">Niet gestart</span>}
                              </td>
                              <td className="py-3 pr-2">
                                <div className="flex justify-end items-center gap-4">
                                  <Link 
                                    href={`/admin/review/${leerling.id}/${opdracht.id}`} 
                                    className="text-neon-blue hover:text-white transition-colors text-xs font-bold"
                                  >
                                    👁️ Bekijk Code
                                  </Link>
                                  
                                  {status !== 'voltooid' ? (
                                    <form action={forceerVoltooid.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-neon-green hover:underline text-xs">+ Forceer</button>
                                    </form>
                                  ) : (
                                    <form action={resetVoortgang.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-red-400 hover:underline text-xs">↺ Reset</button>
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
        <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-main">
          <h2 className="text-xl font-bold mb-6 text-text-main">Voortgang per Opdracht</h2>
          <div className="grid gap-4">
            {opdrachten?.map((opdracht) => {
              const relevanteLeerlingen = leerlingen.filter(l => l.jaar_niveau >= opdracht.jaar_niveau);
              const voltooideAantal = relevanteLeerlingen.filter(l => geefVoortgangStatus(l.id, opdracht.id) === 'voltooid').length;
              return (
                <details key={opdracht.id} className="group border border-border-main rounded-xl bg-bg-app overflow-hidden">
                  <summary className="flex justify-between items-center p-5 cursor-pointer font-bold text-text-main bg-bg-card hover:bg-border-main/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span>{opdracht.titel} {opdracht.is_toets && '📝'}</span>
                      <span className="text-xs font-normal bg-bg-app border border-border-main text-text-muted px-2 py-1 rounded">Jaar {opdracht.jaar_niveau}</span>
                    </div>
                    <span className="text-sm font-mono text-text-muted bg-bg-app px-3 py-1 rounded-full border border-border-main">
                      {voltooideAantal} / {relevanteLeerlingen.length} klaar
                    </span>
                  </summary>
                  <div className="p-5 bg-bg-app border-t border-border-main">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-border-main text-text-main">
                        {relevanteLeerlingen.map((leerling) => {
                          const status = geefVoortgangStatus(leerling.id, opdracht.id);
                          return (
                            <tr key={leerling.id} className="hover:bg-border-main/30 transition-colors">
                              <td className="py-3 pl-2 w-1/3 font-medium">{leerling.naam}</td>
                              <td className="py-3 text-xs text-text-muted">{leerling.jaar_niveau}e</td>
                              <td className="py-3">
                                {status === 'voltooid' && <span className="text-neon-green font-bold">✓ Voltooid</span>}
                                {status === 'bezig' && <span className="text-neon-orange font-bold">... Bezig</span>}
                                {status === 'niet_gestart' && <span className="text-text-muted">Niet gestart</span>}
                              </td>
                              <td className="py-3 pr-2">
                                <div className="flex justify-end items-center gap-4">
                                  <Link 
                                    href={`/admin/review/${leerling.id}/${opdracht.id}`} 
                                    className="text-neon-blue hover:text-white transition-colors text-xs font-bold"
                                  >
                                    👁️ Bekijk Code
                                  </Link>
                                  
                                  {status !== 'voltooid' ? (
                                    <form action={forceerVoltooid.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-neon-green hover:underline text-xs">+ Forceer</button>
                                    </form>
                                  ) : (
                                    <form action={resetVoortgang.bind(null, leerling.id, opdracht.id)}>
                                      <button type="submit" className="text-red-400 hover:underline text-xs">↺ Reset</button>
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
          <div className="bg-bg-card p-6 rounded-xl shadow-lg border border-border-main h-fit">
            <h2 className="text-xl font-bold mb-4 text-text-main">Nieuwe Groep</h2>
            <form action={maakKlasAan} className="flex flex-col gap-3">
              <input 
                type="text" 
                name="naam" 
                placeholder="Bv. SDG+ Rotatie 2" 
                required
                className="border border-border-main p-2.5 rounded-lg bg-bg-app text-text-main focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              />
              <button type="submit" className="bg-neon-blue text-dark px-4 py-2.5 rounded-lg font-bold hover:shadow-glow-blue transition-all">
                + Aanmaken
              </button>
            </form>
            <h3 className="font-bold text-text-main mt-8 border-b border-border-main pb-2 mb-3">Bestaande Groepen</h3>
            <ul className="divide-y divide-border-main text-sm text-text-main">
              {klassen?.length === 0 && <li className="text-text-muted italic py-3">Nog geen groepen.</li>}
              {klassen?.map(klas => (
                <li key={klas.id} className="py-3 flex justify-between items-center">
                  <span className="font-semibold">{klas.naam}</span>
                  <span className="text-xs bg-bg-app border border-border-main px-2 py-1 rounded text-text-muted font-mono">
                    {leerlingen?.filter(l => l.klas_id === klas.id).length} lln
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="md:col-span-2 bg-bg-card p-6 rounded-xl shadow-lg border border-border-main">
            <h2 className="text-xl font-bold mb-4 text-text-main">Leerlingen Indelen</h2>
            <div className="overflow-x-auto border border-border-main rounded-lg">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-bg-app text-text-muted border-b border-border-main">
                    <th className="p-4">Naam</th>
                    <th className="p-4">Jaar</th>
                    <th className="p-4">Huidige Groep</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main text-text-main">
                  {leerlingen?.map(leerling => (
                    <tr key={leerling.id} className="hover:bg-bg-app/50 transition-colors">
                      <td className="p-4 font-semibold">{leerling.naam}</td>
                      <td className="p-4 text-text-muted">{leerling.jaar_niveau}e</td>
                      <td className="p-4">
                        <form action={updateLeerlingKlas.bind(null, leerling.id)} className="flex items-center gap-2">
                          <select 
                            name="klas_id" 
                            defaultValue={leerling.klas_id || 'geen'}
                            className="border border-border-main p-2 rounded-lg bg-bg-app text-text-main focus:outline-none focus:border-neon-blue text-sm w-full max-w-[150px]"
                          >
                            <option value="geen">-- Geen groep --</option>
                            {klassen?.map(klas => (
                              <option key={klas.id} value={klas.id}>{klas.naam}</option>
                            ))}
                          </select>
                          <button 
                            type="submit" 
                            className="bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-dark px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
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