import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CodeEvaluator from '@/components/CodeEvaluator'; 

// Geen 'use client' meer! Dit is nu een veilige Server Component.
export default async function EditorPage({ params }) {
  // In Next.js 15 wachten we op de params in Server Components
  const { id } = await params;
  
  // Haal de specifieke oefening op uit Supabase
  const { data: opdracht, error } = await supabase
    .from('opdrachten')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !opdracht) {
    return notFound(); 
  }

  // Anti-fraud check op de server
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
      
      <div className="mb-6 bg-white p-6 rounded shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">Oefening: {opdracht.titel}</h2>
        <div 
          className="text-gray-800 text-lg leading-relaxed bg-gray-50 p-4 border-l-4 border-blue-500 rounded"
          dangerouslySetInnerHTML={{ __html: opdracht.uitleg }}
        />
      </div>
      
      <CodeEvaluator 
        initialCode={opdracht.start_code} 
        testScript={opdracht.test_script} 
      /> 
    </div>
  );
}