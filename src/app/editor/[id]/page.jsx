'use client'; 

import { use } from 'react'; // 1. Importeer 'use' uit React
import { opdrachtenDB } from '@/lib/mockData';
import { notFound } from 'next/navigation';
import CodeEvaluator from '@/components/CodeEvaluator'; 

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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 bg-white p-6 rounded shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Oefening: {opdracht.titel}</h2>
        <p className="text-gray-700">Bouw je oplossing in de editor hieronder.</p>
      </div>
      
      <CodeEvaluator initialCode={opdracht.start_code} /> 
    </div>
  );
}