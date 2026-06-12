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
  // We halen enkel de opdrachten van DEZELFDE TAAL en HETZELFDE JAAR op
  // We sorteren aflopend (descending) zodat de eerste die we vinden met een lagere volgorde direct de 'vorige' is.
  const { data: moduleOpdrachten } = await supabase
    .from('opdrachten')
    .select('id, volgorde, is_extra')
    .eq('taal', opdracht.taal)
    .eq('jaar_niveau', opdracht.jaar_niveau)
    .order('volgorde', { ascending: false });

  const isVoltooid = voltooideIds.has(id);
  
  // Zoek de onmiddellijk voorafgaande basisopdracht (omdat de lijst aflopend is, is de eerste hit de juiste)
  const vorigeBasis = moduleOpdrachten?.find(o => o.volgorde < opdracht.volgorde && !o.is_extra);
  
  // Zoek de basisopdracht die bij een extra opdracht hoort
  const bijbehorendeBasis = moduleOpdrachten?.find(o => o.volgorde === opdracht.volgorde && !o.is_extra);

  const isGelocked = 
    (!opdracht.is_extra && vorigeBasis && !voltooideIds.has(vorigeBasis.id)) ||
    (opdracht.is_extra && bijbehorendeBasis && !voltooideIds.has(bijbehorendeBasis.id));

  // Als de leerling probeert te 'smokkelen' via de URL -> stuur terug naar dashboard
  if (isGelocked && !isVoltooid) {
    redirect('/dashboard');
  }

  // 5. Blokkeer als het een toets is die al voltooid is
  if (opdracht.is_toets && isVoltooid) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
          &larr; Terug naar overzicht
        </Link>
        <div className="p-8 text-orange-700 font-bold text-center mt-10 bg-orange-50 border border-orange-200 rounded">
          Je hebt deze toets al succesvol afgelegd. Je kan deze niet opnieuw maken.
        </div>
      </div>
    );
  }

  // 5. Check voor schooluren
  const huidigeUur = new Date().getHours();
  const isSchoolTijd = huidigeUur >= 8 && huidigeUur < 16;

  if (opdracht.enkel_schooluren && !isSchoolTijd) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
          &larr; Terug naar overzicht
        </Link>
        <div className="p-8 text-red-600 font-bold text-center mt-10 bg-red-50 border border-red-200 rounded">
          Deze test is momenteel gesloten. Je kan deze enkel tijdens schooluren maken.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Terug naar overzicht
      </Link>
      
      <div className="mb-6 bg-white p-6 rounded shadow-sm border flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {opdracht.is_toets ? '📝 Toets: ' : 'Oefening: '} {opdracht.titel}
          </h2>
          <div 
            className="text-gray-800 text-lg leading-relaxed bg-gray-50 p-4 border-l-4 border-blue-500 rounded"
            dangerouslySetInnerHTML={{ __html: opdracht.uitleg }}
          />
        </div>
        {/* Visuele feedback voor gewone oefeningen die al af zijn */}
        {!opdracht.is_toets && isVoltooid && (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold border border-green-300">
            ✓ Voltooid (Je mag blijven oefenen)
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