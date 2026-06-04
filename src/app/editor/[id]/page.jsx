'use client'; 

import { use } from 'react'; // 1. Importeer 'use' uit React
import { opdrachtenDB } from '@/lib/mockData';
import { notFound } from 'next/navigation';
import CodeEvaluator from '@/components/CodeEvaluator';
import Link from 'next/link';

export default function EditorPage({ params }) {
  // 2. Pak de params uit met de use() hook
  const { id } = use(params);

  // 3. Gebruik nu de uitgepakte 'id'
  const opdracht = opdrachtenDB.find(o => o.id === id);

  if (!opdracht) {
    return notFound(); 
  }

  const huidigeUur = new Date().getHours();
  const isSchoolTijd = huidigeUur >= 8 && huidigeUur < 16;

  if (opdracht.enkel_schooluren && !isSchoolTijd) {
    return (
      <div className="p-8 text-red-600 font-bold text-center mt-10">
        Deze test is momenteel gesloten. Je kan deze enkel tijdens de schooluren maken.
      </div>
    );
  }

  return (<>
  
    <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
      &larr; Terug naar overzicht
    </Link>
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 bg-white p-6 rounded shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Oefening: {opdracht.titel}</h2>
        
        {/* Hier injecteren we de uitleg inclusief eventuele HTML opmaak */}
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
    </>
  );
}