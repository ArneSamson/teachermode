import { createClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import HtmlEvaluator from '@/components/HtmlEvaluator';
import JsEvaluator from '@/components/JsEvaluator';
import SqlEvaluator from '@/components/SqlEvaluator';

export default async function EditorPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Haal de huidige gebruiker op
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profiel } = await supabase
    .from('profielen')
    .select('rol')
    .eq('id', user.id)
    .single();

  const isLeerkracht = profiel?.rol === 'leerkracht';

  // 2. Haal de opdracht op
  const { data: opdracht, error } = await supabase
    .from('opdrachten')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !opdracht) return notFound();

  // 3. Haal ALLE voltooide opdrachten op voor deze leerling
  const { data: voortgangLijst } = await supabase
    .from('voortgang')
    .select('opdracht_id')
    .eq('profiel_id', user.id)
    .eq('status', 'voltooid');

  const voltooideIds = new Set(voortgangLijst?.map(v => v.opdracht_id) || []);

  // 4. BEVEILIGING: Is deze opdracht vergrendeld?
  const { data: moduleOpdrachten } = await supabase
    .from('opdrachten')
    .select('id, volgorde, is_extra')
    .eq('taal', opdracht.taal)
    .eq('jaar_niveau', opdracht.jaar_niveau)
    .order('volgorde', { ascending: false });

  const isVoltooid = voltooideIds.has(id);
  
  const vorigeBasis = moduleOpdrachten?.find(o => o.volgorde < opdracht.volgorde && !o.is_extra);
  const bijbehorendeBasis = moduleOpdrachten?.find(o => o.volgorde === opdracht.volgorde && !o.is_extra);

  const isGelocked = 
    (!opdracht.is_extra && vorigeBasis && !voltooideIds.has(vorigeBasis.id)) ||
    (opdracht.is_extra && bijbehorendeBasis && !voltooideIds.has(bijbehorendeBasis.id));

  if (isGelocked && !isVoltooid && !isLeerkracht) {
    redirect('/dashboard');
  }

  // 5. Blokkeer als het een toets is die al voltooid is
  if (opdracht.is_toets && isVoltooid) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Link href="/dashboard" className="text-neon-blue hover:text-white transition-colors mb-6 font-bold inline-flex items-center gap-2">
          &larr; Terug naar overzicht
        </Link>
        <div className="p-8 text-neon-orange font-bold text-center mt-10 bg-neon-orange/10 border border-neon-orange/30 rounded-xl shadow-glow-orange/20">
          Je hebt deze toets al succesvol afgelegd. Je kan deze niet opnieuw maken.
        </div>
      </div>
    );
  }

  // 6. Check voor schooluren
  const huidigeUur = new Date().getHours();
  const isSchoolTijd = huidigeUur >= 8 && huidigeUur < 16;

  if (opdracht.enkel_schooluren && !isSchoolTijd) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Link href="/dashboard" className="text-neon-blue hover:text-white transition-colors mb-6 font-bold inline-flex items-center gap-2">
          &larr; Terug naar overzicht
        </Link>
        <div className="p-8 text-red-400 font-bold text-center mt-10 bg-red-950/20 border border-red-900/50 rounded-xl">
          Deze test is momenteel gesloten. Je kan deze enkel tijdens schooluren maken.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/dashboard" className="text-neon-blue hover:text-white transition-colors mb-6 font-bold inline-flex items-center gap-2">
        &larr; Terug naar overzicht
      </Link>
      
      {/* Uitleg Container */}
      <div className="mb-8 bg-bg-card p-6 rounded-xl border border-border-main shadow-lg flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4 text-text-main flex items-center gap-2">
            {opdracht.is_toets ? <span className="text-neon-orange">📝 Toets:</span> : 'Oefening:'} {opdracht.titel}
          </h2>
          <div 
            className="text-text-main text-lg leading-relaxed bg-bg-app p-5 border-l-4 border-neon-blue rounded-r-lg"
            dangerouslySetInnerHTML={{ __html: opdracht.uitleg }}
          />
        </div>
        
        {/* Visuele feedback voor gewone oefeningen die al af zijn */}
        {!opdracht.is_toets && isVoltooid && (
          <span className="bg-neon-green/10 text-neon-green px-4 py-2 rounded-full text-sm font-bold border border-neon-green/30 shadow-glow-green/20 whitespace-nowrap">
            ✓ Voltooid (Herhalen)
          </span>
        )}
      </div>
      
      {opdracht.taal === 'javascript' ? (
        <JsEvaluator 
          opdrachtId={opdracht.id}
          initialCode={opdracht.start_code} 
          testScript={opdracht.test_script} 
          modeloplossing={opdracht.modeloplossing}
          isVoltooid={isVoltooid}
        />
      ) : opdracht.taal === 'sql' ? (
        <SqlEvaluator 
          opdrachtId={opdracht.id}
          initialCode={opdracht.start_code} 
          testScript={opdracht.test_script} 
          modeloplossing={opdracht.modeloplossing}
          isVoltooid={isVoltooid}
        />
      ) : (
        <HtmlEvaluator 
          opdrachtId={opdracht.id}
          initialCode={opdracht.start_code} 
          testScript={opdracht.test_script} 
          modeloplossing={opdracht.modeloplossing}
          isVoltooid={isVoltooid}
        />
      )}
    </div>
  );
}