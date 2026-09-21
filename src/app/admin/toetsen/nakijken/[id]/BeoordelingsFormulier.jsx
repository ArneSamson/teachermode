'use client';

import { useState } from 'react';

export default function BeoordelingsFormulier({ sessie, bewaarAction }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'success'

  const handleSubmit = async (formData) => {
    setStatus('saving');
    
    // Roep de server action aan die we als prop meekrijgen
    await bewaarAction(formData);
    
    // Toon het succes-vinkje
    setStatus('success');
    
    // Verberg het vinkje weer na 3 seconden
    setTimeout(() => {
      setStatus('idle');
    }, 3000);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-bold text-text-muted mb-2">Score (op 20)</label>
        <input 
          type="number" 
          name="score"
          defaultValue={sessie.leerkracht_score || ''}
          min="0"
          max="20"
          placeholder="Bv. 16"
          className="w-full bg-bg-app border border-border-main text-text-main rounded-lg p-3 outline-none focus:border-neon-blue focus:shadow-glow-blue transition-all font-mono text-xl"
        />
      </div>
      
      <div>
        <label className="block text-sm font-bold text-text-muted mb-2">Feedback voor de leerling</label>
        <textarea 
          name="feedback"
          defaultValue={sessie.leerkracht_feedback || ''}
          rows="6"
          placeholder="Wat ging er goed? Wat kan er beter?"
          className="w-full bg-bg-app border border-border-main text-text-main rounded-lg p-3 outline-none focus:border-neon-blue focus:shadow-glow-blue transition-all text-sm resize-none"
        ></textarea>
      </div>
      
      <button 
        type="submit" 
        disabled={status === 'saving'}
        className="w-full bg-neon-blue text-bg-app font-bold text-lg py-3 rounded-full hover:shadow-glow-blue hover:bg-white transition-all mt-2 cursor-pointer disabled:opacity-50"
      >
        {status === 'saving' ? 'Aan het opslaan...' : 'Beoordeling Opslaan'}
      </button>

      {/* Dynamische feedback */}
      {status === 'success' && (
        <div className="bg-neon-green/20 text-neon-green border border-neon-green p-3 rounded-lg text-center font-bold animate-pulse">
          ✅ Succesvol opgeslagen!
        </div>
      )}
      
      {status === 'idle' && sessie.leerkracht_score !== null && (
        <p className="text-center text-neon-green text-sm font-bold mt-2">
          Laatst opgeslagen score: {sessie.leerkracht_score}/20
        </p>
      )}
    </form>
  );
}