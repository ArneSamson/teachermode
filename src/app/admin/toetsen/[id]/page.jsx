import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ToetsNakijkOverzicht({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  // Controleer admin rechten
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profiel } = await supabase.from('profielen').select('rol').eq('id', user.id).single();
  if (profiel?.rol !== 'leerkracht') redirect('/dashboard');

  // Haal de toetsgegevens op
  const { data: toets } = await supabase.from('toetsen').select('*').eq('id', id).single();

  // Haal alle sessies voor deze toets op, gekoppeld aan de leerlinggegevens
  const { data: sessies } = await supabase
    .from('toets_sessies')
    .select(`
      *,
      profielen ( naam, jaar_niveau, klas_id )
    `)
    .eq('toets_id', id)
    .order('ingediend_op', { ascending: false, nullsFirst: false });

  if (!toets) return <div className="p-8 text-center text-red-500 font-bold">Toets niet gevonden.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/admin" className="text-neon-blue font-bold hover:text-white mb-6 inline-block">
        &larr; Terug naar Admin
      </Link>
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Resultaten: {toets.titel}</h1>
          <p className="text-text-muted">Tijdslimiet: {toets.tijdslimiet_minuten} minuten</p>
        </div>
      </div>

      <div className="bg-bg-card border border-border-main rounded-xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-app border-b border-border-main text-text-muted text-sm font-bold">
              <th className="p-4">Leerling</th>
              <th className="p-4">Klas / Jaar</th>
              <th className="p-4">Status</th>
              <th className="p-4">Tab Verlaten</th>
              <th className="p-4">Score</th>
              <th className="p-4">Actie</th>
            </tr>
          </thead>
          <tbody>
            {sessies?.map((sessie) => (
              <tr key={sessie.id} className="border-b border-border-main/50 hover:bg-bg-app transition-colors">
                <td className="p-4 font-medium text-text-main">{sessie.profielen?.naam}</td>
                <td className="p-4 text-text-muted">{sessie.profielen?.jaar_niveau}e jaar</td>
                <td className="p-4">
                  {sessie.is_ingediend ? (
                    <span className="bg-neon-green/10 text-neon-green px-3 py-1 rounded-full text-xs font-bold border border-neon-green/30">
                      Ingediend
                    </span>
                  ) : (
                    <span className="bg-neon-orange/10 text-neon-orange px-3 py-1 rounded-full text-xs font-bold border border-neon-orange/30">
                      Bezig...
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {sessie.tab_verlaten_count > 0 ? (
                    <span className="text-red-500 font-bold bg-red-950/30 px-2 py-1 rounded">
                      {sessie.tab_verlaten_count}x
                    </span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
                <td className="p-4 font-bold text-neon-blue">
                  {sessie.leerkracht_score !== null ? `${sessie.leerkracht_score}/20` : '-'}
                </td>
                <td className="p-4">
                  <Link 
                    href={`/admin/toetsen/nakijken/${sessie.id}`} 
                    className="text-sm border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-bg-app px-4 py-2 rounded-full font-bold transition-colors"
                  >
                    Nakijken
                  </Link>
                </td>
              </tr>
            ))}
            
            {!sessies?.length && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-text-muted italic">
                  Nog geen leerlingen gestart aan deze toets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}