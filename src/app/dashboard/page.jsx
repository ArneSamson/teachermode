import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

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

  const { data: behaaldeBadges } = await supabase
    .from('behaalde_badges')
    .select('*')
    .eq('profiel_id', user.id)
    .order('behaald_op', { ascending: false });

  if (profielError || !profiel) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-red-400 bg-red-950/20 rounded-lg border border-red-900/50 font-mono text-sm">
        ❌ Profiel niet gevonden in de database.
      </div>
    );
  }

  let opdrachtenQuery = supabase
    .from('opdrachten')
    .select('*')
    .eq('enabled', true)
    .order('jaar_niveau', { ascending: false });

  if (profiel.rol !== 'leerkracht') {
    opdrachtenQuery = opdrachtenQuery.lte('jaar_niveau', profiel.jaar_niveau);
  }

  const { data: opdrachten, error: opdrachtenError } = await opdrachtenQuery;

  const { data: voortgangData } = await supabase
    .from('voortgang')
    .select('opdracht_id, status')
    .eq('profiel_id', user.id);

  const voltooideOpdrachten = new Set(
    voortgangData?.filter(v => v.status === 'voltooid').map(v => v.opdracht_id) || []
  );

  if (opdrachtenError) {
    return (
      <div className="p-8 text-red-400 bg-red-950/20 rounded-lg border border-red-900/50 font-mono text-sm">
        ❌ Er ging iets mis met het laden van de opdrachten.
      </div>
    );
  }

  const beschikbareTalen = [...new Set(opdrachten?.map(o => o.taal || 'html'))];
  const params = await searchParams;
  let activeTab = params?.tab;
  if (!activeTab || !beschikbareTalen.includes(activeTab)) {
    activeTab = beschikbareTalen[0] || 'html';
  }

  const actieveOpdrachten = opdrachten?.filter(o => (o.taal || 'html') === activeTab) || [];
  const totaalTabOpdrachten = actieveOpdrachten.length;
  const voltooideTabAantal = actieveOpdrachten.filter(o => voltooideOpdrachten.has(o.id)).length;
  const percentage = totaalTabOpdrachten > 0 ? Math.round((voltooideTabAantal / totaalTabOpdrachten) * 100) : 0;

  const opdrachtenPerJaar = actieveOpdrachten.reduce((groepen, opdracht) => {
    const jaar = opdracht.jaar_niveau;
    if (!groepen[jaar]) groepen[jaar] = [];
    groepen[jaar].push(opdracht);
    return groepen;
  }, {});

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-1">Welkom, {profiel.naam}</h1>
          <p className="text-neon-blue text-sm font-medium tracking-wide">
            Ingelogd als {profiel.rol === 'leerkracht' ? 'Leerkracht' : `Leerling (${profiel.jaar_niveau}e jaar)`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {profiel.rol === 'leerkracht' && (
            <Link 
              href="/admin" 
              className="text-sm bg-transparent border border-neon-green text-neon-green hover:bg-neon-green hover:text-bg-app hover:shadow-glow-green px-4 py-2 rounded-full transition-all duration-300 font-bold flex items-center gap-2"
            >
              <span>⚙️</span> Beheerpaneel
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button className="text-sm bg-bg-card hover:bg-border-main text-text-muted hover:text-text-main px-4 py-2 rounded-full transition-all duration-300 font-medium border border-border-main cursor-pointer">
              Uitloggen
            </button>
          </form>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-8 bg-bg-card p-6 rounded-xl border border-border-main shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-text-main flex items-center gap-2">
          <span>🏆</span> Jouw Trofeeënkast
        </h2>
        {behaaldeBadges && behaaldeBadges.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {behaaldeBadges.map(badge => (
              <div 
                key={badge.id} 
                className="group relative flex items-center gap-3 bg-bg-app border border-neon-orange/40 hover:border-neon-orange px-4 py-2 rounded-full cursor-help hover:shadow-glow-orange transition-all duration-300"
              >
                <span className="text-2xl">{badge.icoon}</span>
                <span className="font-bold text-text-main text-sm">{badge.badge_naam}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-bg-card border border-border-main text-text-muted text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center shadow-xl">
                  {badge.beschrijving}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-bg-card"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-text-muted italic text-sm">
            Nog geen badges behaald. Start snel met je eerste oefening!
          </div>
        )}
      </div>

      {/* Tabs */}
      {beschikbareTalen.length > 0 && (
        <div className="flex border-b border-border-main mb-6 gap-1">
          {beschikbareTalen.map(taalCode => {
            const isActive = activeTab === taalCode;
            return (
              <Link 
                key={taalCode}
                href={`/dashboard?tab=${taalCode}`}
                className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all duration-300 ${
                  isActive 
                    ? 'bg-neon-blue text-bg-app shadow-[0_-5px_15px_rgba(0,240,255,0.15)] transform translate-y-px' 
                    : 'bg-bg-card text-text-muted hover:bg-border-main hover:text-text-main border border-b-0 border-transparent'
                }`}
              >
                {TAAL_LABELS[taalCode] || taalCode.toUpperCase()}
              </Link>
            )
          })}
        </div>
      )}

      {/* Voortgang */}
      {totaalTabOpdrachten > 0 && profiel.rol === 'leerling' && (
        <div className="mb-10 bg-bg-card p-6 rounded-xl border border-border-main shadow-lg">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h2 className="text-lg font-bold text-text-main">Jouw voortgang in {TAAL_LABELS[activeTab]}</h2>
              <p className="text-sm text-text-muted">
                {voltooideTabAantal} van de {totaalTabOpdrachten} opdrachten afgerond
              </p>
            </div>
            <span className={`text-3xl font-black ${percentage === 100 ? 'text-neon-green' : 'text-neon-blue'}`}>
              {percentage}%
            </span>
          </div>
          <div className="w-full bg-bg-app rounded-full h-4 overflow-hidden p-0.5 border border-border-main">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                percentage === 100 ? 'bg-neon-green shadow-glow-green' : 'bg-neon-blue shadow-glow-blue'
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Opdrachten Lijst */}
      {actieveOpdrachten.length === 0 ? (
        <div className="bg-bg-card p-8 rounded-xl border border-border-main text-center text-text-muted italic">
          Er staan momenteel geen {TAAL_LABELS[activeTab]} opdrachten voor jou open.
        </div>
      ) : (
        Object.keys(opdrachtenPerJaar).sort((a, b) => b - a).map((jaar) => (
          <div key={jaar} className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-border-main pb-2 text-text-main">
              Oefeningen {jaar}e jaar
            </h2>
            <div className="grid gap-4">
              {opdrachtenPerJaar[jaar]
                .sort((a, b) => a.volgorde - b.volgorde)
                .map((opdracht, index, array) => {
                  const isVoltooid = voltooideOpdrachten.has(opdracht.id);
                  const vorigeBasis = array.slice(0, index).reverse().find(o => !o.is_extra);
                  const isBasisGelocked = !opdracht.is_extra && vorigeBasis && !voltooideOpdrachten.has(vorigeBasis.id);
                  const bijbehorendeBasis = array.find(o => o.volgorde === opdracht.volgorde && !o.is_extra);
                  const isExtraGelocked = opdracht.is_extra && bijbehorendeBasis && !voltooideOpdrachten.has(bijbehorendeBasis.id);
                  const isGelocked = profiel?.rol !== 'leerkracht' && (isBasisGelocked || isExtraGelocked);
                  
                  return (
                    <div 
                      key={opdracht.id} 
                      className={`border p-5 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center transition-all duration-300 gap-4 ${
                        isGelocked 
                          ? 'opacity-50 bg-bg-app border-border-main/50' 
                          : 'bg-bg-card border-border-main hover:border-gray-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-bold text-lg ${isGelocked ? 'text-text-muted' : 'text-text-main'}`}>
                            {isGelocked ? '🔒 ' : ''} {opdracht.titel}
                          </h3>
                          {isVoltooid && (
                            <span className="bg-neon-green/10 text-neon-green text-xs px-2.5 py-0.5 rounded-full font-bold border border-neon-green/30 shadow-glow-green/20">
                              ✓ Voltooid
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted bg-bg-app border border-border-main px-2 py-1 rounded font-mono">
                            {opdracht.module}
                          </span>
                        </div>
                      </div>
                      
                      <Link 
                        href={isGelocked ? '#' : `/editor/${opdracht.id}`}
                        className={`px-5 py-2.5 rounded-full font-bold transition-all duration-300 text-center text-sm md:w-auto w-full ${
                          isGelocked 
                            ? 'bg-bg-app border border-border-main text-text-muted cursor-not-allowed'
                            : isVoltooid 
                              ? 'border border-neon-blue text-neon-blue hover:bg-neon-blue/10'
                              : 'bg-neon-blue text-bg-app hover:shadow-glow-blue font-bold'
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