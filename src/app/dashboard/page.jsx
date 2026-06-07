import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Deze labels zorgen dat de database-taal mooi wordt weergegeven op de tab
const TAAL_LABELS = {
  'html': 'HTML & CSS',
  'javascript': 'JavaScript',
  'sql': 'Database Queries'
};

export default async function Dashboard({ searchParams }) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profiel, error: profielError } = await supabase
    .from('profielen')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profielError || !profiel) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-red-600 bg-red-50 rounded border border-red-200">
        Profiel niet gevonden in de database.
      </div>
    );
  }

  // 1. Haal alle toegestane opdrachten op voor deze gebruiker
  let opdrachtenQuery = supabase
    .from('opdrachten')
    .select('*')
    .eq('enabled', true)
    .order('jaar_niveau', { ascending: false });

  if (profiel.rol !== 'leerkracht') {
    opdrachtenQuery = opdrachtenQuery.lte('jaar_niveau', profiel.jaar_niveau);
  }

  const { data: opdrachten, error: opdrachtenError } = await opdrachtenQuery;

  // 2. Persoonlijke voortgang ophalen
  const { data: voortgangData } = await supabase
    .from('voortgang')
    .select('opdracht_id, status')
    .eq('profiel_id', user.id);

  const voltooideOpdrachten = new Set(
    voortgangData?.filter(v => v.status === 'voltooid').map(v => v.opdracht_id) || []
  );

  if (opdrachtenError) {
    return <div className="p-8 text-red-600">Er ging iets mis met het laden van de opdrachten.</div>;
  }

// 3. Dynamische Tab Logica bepalen
  // Kijk welke talen voorkomen in de opdrachten van deze leerling
  const beschikbareTalen = [...new Set(opdrachten?.map(o => o.taal || 'html'))];
  
  // FIX: Wacht op de Next.js searchParams Promise
  const params = await searchParams;
  
  // Bepaal de actieve tab via de URL (bv. ?tab=javascript), of neem de eerste beschikbare
  let activeTab = params?.tab;
  if (!activeTab || !beschikbareTalen.includes(activeTab)) {
    activeTab = beschikbareTalen[0] || 'html';
  }

  // Filter de opdrachtenlijst op basis van de gekozen tab
  const actieveOpdrachten = opdrachten?.filter(o => (o.taal || 'html') === activeTab) || [];

  // Bereken voortgang specifiek voor de actieve tab
  const totaalTabOpdrachten = actieveOpdrachten.length;
  const voltooideTabAantal = actieveOpdrachten.filter(o => voltooideOpdrachten.has(o.id)).length;
  const percentage = totaalTabOpdrachten > 0 ? Math.round((voltooideTabAantal / totaalTabOpdrachten) * 100) : 0;

  // Groepeer voor weergave
  const opdrachtenPerJaar = actieveOpdrachten.reduce((groepen, opdracht) => {
    const jaar = opdracht.jaar_niveau;
    if (!groepen[jaar]) groepen[jaar] = [];
    groepen[jaar].push(opdracht);
    return groepen;
  }, {});

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header & Uitloggen */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Welkom, {profiel.naam}</h1>
          <p className="text-gray-600">
            Ingelogd als {profiel.rol === 'leerkracht' ? 'Leerkracht' : `Leerling (${profiel.jaar_niveau}e jaar)`}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors font-medium">
            Uitloggen
          </button>
        </form>
      </div>

      {/* Tabs Menu (Enkel tonen als er opdrachten zijn) */}
      {beschikbareTalen.length > 0 && (
        <div className="flex border-b-2 border-gray-200 mb-6 gap-1">
          {beschikbareTalen.map(taalCode => {
            const isActive = activeTab === taalCode;
            return (
              <Link 
                key={taalCode}
                href={`/dashboard?tab=${taalCode}`}
                className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md transform translate-y-[2px]' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
              >
                {TAAL_LABELS[taalCode] || taalCode.toUpperCase()}
              </Link>
            )
          })}
        </div>
      )}

      {/* Voortgangsbalk (per taal) */}
      {totaalTabOpdrachten > 0 && profiel.rol === 'leerling' && (
        <div className="mb-10 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Jouw Voortgang in {TAAL_LABELS[activeTab]}</h2>
              <p className="text-sm text-gray-500">
                {voltooideTabAantal} van de {totaalTabOpdrachten} opdrachten afgerond
              </p>
            </div>
            <span className="text-3xl font-black text-blue-600">{percentage}%</span>
          </div>
          
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
            <div 
              className={`h-4 rounded-full transition-all duration-1000 ease-out ${percentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          {percentage === 100 && (
            <p className="mt-4 text-sm text-green-700 font-bold flex items-center gap-2 bg-green-50 p-2 rounded inline-flex">
              <span>🎉</span> Fantastisch gewerkt! Je hebt alle openstaande opdrachten voor deze module voltooid.
            </p>
          )}
        </div>
      )}

      {/* Lijst met Opdrachten */}
      {actieveOpdrachten.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded border text-center text-gray-500 italic">
          Er staan momenteel geen {TAAL_LABELS[activeTab]} opdrachten voor jou open.
        </div>
      ) : (
        Object.keys(opdrachtenPerJaar).sort((a, b) => b - a).map((jaar) => (
          <div key={jaar} className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-700">Oefeningen Jaar {jaar}</h2>
            <div className="grid gap-4">
              {opdrachtenPerJaar[jaar]
                .sort((a, b) => a.volgorde - b.volgorde) // Sorteer op volgorde (10, 20, 30)
                .map((opdracht, index, array) => {
                  const isVoltooid = voltooideOpdrachten.has(opdracht.id);
                  
                  // LOGICA: bepaal of de opdracht vergrendeld is
                  // 1. Zoek de vorige basisopdracht in deze module
                  const vorigeBasis = array.slice(0, index).reverse().find(o => !o.is_extra);
                  
                  // 2. Een basisopdracht is gelocked als de vorige basisopdracht niet voltooid is
                  const isBasisGelocked = !opdracht.is_extra && vorigeBasis && !voltooideOpdrachten.has(vorigeBasis.id);
                  
                  // 3. Een extra opdracht is gelocked als de bijbehorende basisopdracht nog niet klaar is
                  const bijbehorendeBasis = array.find(o => o.volgorde === opdracht.volgorde && !o.is_extra);
                  const isExtraGelocked = opdracht.is_extra && bijbehorendeBasis && !voltooideOpdrachten.has(bijbehorendeBasis.id);
                  
                  const isGelocked = isBasisGelocked || isExtraGelocked;

                  return (
                    <div key={opdracht.id} className={`border p-5 rounded-lg shadow-sm flex flex-col md:flex-row md:justify-between md:items-center bg-white transition-colors gap-4 ${isGelocked ? 'opacity-60 bg-gray-50' : 'hover:border-blue-300'}`}>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg text-gray-800">
                            {isGelocked ? '🔒 ' : ''} {opdracht.titel}
                          </h3>
                          {isVoltooid && (
                            <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-green-200">✓</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">{opdracht.module}</span>
                        {opdracht.is_extra && <span className="ml-2 text-xs text-purple-600 font-bold italic">Extra Oefening</span>}
                      </div>
                      
                      <Link 
                        href={isGelocked ? '#' : `/editor/${opdracht.id}`}
                        className={`px-5 py-2.5 rounded font-bold transition-colors text-center ${
                          isGelocked 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : isVoltooid 
                              ? 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                      >
                        {isGelocked ? 'Vergrendeld' : isVoltooid ? 'Herhalen' : 'Start Oefening'}
                      </Link>
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