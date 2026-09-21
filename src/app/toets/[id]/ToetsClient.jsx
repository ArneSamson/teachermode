'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HtmlEvaluator from '@/components/HtmlEvaluator';
import JsEvaluator from '@/components/JsEvaluator';
import SqlEvaluator from '@/components/SqlEvaluator';
import { registreerTabVerlaten, dienToetsIn, slaToetsCodeOp } from './actions';

export default function ToetsClient({ toets, sessie, initiëleResterendeSeconden }) {
  const router = useRouter();
  const [tijd, setTijd] = useState(initiëleResterendeSeconden);
  const [waarschuwing, setWaarschuwing] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [huidigeCode, setHuidigeCode] = useState(toets.start_code || '');

  // 1. Timer Logica
  useEffect(() => {
    if (tijd <= 0) {
      if (!isSubmitting) forceerInleveren();
      return;
    }
    
    const interval = setInterval(() => {
      setTijd((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [tijd, isSubmitting]);

  // 2. Anti-Cheat (Visibility API)
  useEffect(() => {

    if(!sessie) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        setWaarschuwing('⚠️ Let op! Je hebt het tabblad verlaten. Dit is doorgegeven aan de leerkracht.');
        await registreerTabVerlaten(sessie.id);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessie?.id]);

  // 3. Auto-save logica (Debounced)
  useEffect(() => {

    if(!sessie) return;

    // Sla de code elke 3 seconden na het laatste typen stil op
    const timeoutId = setTimeout(() => {
      slaToetsCodeOp(sessie.id, huidigeCode);
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [huidigeCode, sessie?.id]);

  // Format de tijd naar MM:SS
  const formatTijd = (seconden) => {
    const m = Math.floor(seconden / 60).toString().padStart(2, '0');
    const s = (seconden % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const forceerInleveren = async () => {
    setIsSubmitting(true);
    if(sessie) {
        await slaToetsCodeOp(sessie.id, huidigeCode); // Zeker zijn dat de laatste letters erin zitten
        await dienToetsIn(sessie.id);
    }
    router.refresh(); // Triggert de server page om het "Tijd is om" scherm te tonen
  };

  const handleHandmatigInleveren = async () => {
    if (window.confirm("Weet je zeker dat je jouw toets wilt indienen? Je kan hierna niets meer aanpassen.")) {
      await forceerInleveren();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* Header met Sticky Timer en Indienen Knop */}
      <div className="bg-bg-card p-6 rounded-xl border border-border-main shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center sticky top-4 z-50 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <span className="text-neon-orange">📝 Toets:</span> {toets.titel}
          </h2>
          {waarschuwing && <p className="text-red-500 font-bold text-sm mt-2 bg-red-950/20 px-3 py-1 rounded inline-block">{waarschuwing}</p>}
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`font-mono text-3xl font-bold px-6 py-2 rounded-lg border transition-colors ${
            tijd < 300 
              ? 'bg-red-950/50 border-red-500 text-red-500 animate-pulse shadow-glow-orange' 
              : 'bg-bg-app border-neon-blue text-neon-blue shadow-glow-blue'
          }`}>
            {formatTijd(tijd)}
          </div>
          
          <button 
            onClick={handleHandmatigInleveren}
            disabled={isSubmitting}
            className="bg-neon-orange text-white px-6 py-3 rounded-full font-bold hover:shadow-[0_0_15px_rgba(255,95,0,0.6)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Bezig met indienen...' : 'Toets Indienen'}
          </button>
        </div>
      </div>
      
      {/* Uitleg */}
      <div 
        className="text-text-main text-lg leading-relaxed bg-bg-card p-6 rounded-xl border border-border-main shadow-lg"
        dangerouslySetInnerHTML={{ __html: toets.uitleg }}
      />
      
      {/* Evaluator Rendering */}
      <div className="opacity-95">
         {toets.taal === 'javascript' ? (
            <JsEvaluator 
              opdrachtId={toets.id} 
              initialCode={sessie?.laatste_code || toets.start_code} 
              testScript={toets.test_script} 
              onCodeChange={(nieuweCode) => setHuidigeCode(nieuweCode)}
            />
         ) : toets.taal === 'sql' ? (
            <SqlEvaluator 
              opdrachtId={toets.id} 
              initialCode={sessie?.laatste_code || toets.start_code} 
              testScript={toets.test_script} 
              onCodeChange={(nieuweCode) => setHuidigeCode(nieuweCode)}
            />
         ) : (
            <HtmlEvaluator 
              opdrachtId={toets.id} 
              initialCode={sessie?.laatste_code || toets.start_code} 
              testScript={toets.test_script} 
              onCodeChange={(nieuweCode) => setHuidigeCode(nieuweCode)}
            />
         )}
      </div>
    </div>
  );
}