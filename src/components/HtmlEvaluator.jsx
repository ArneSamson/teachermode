'use client';

import React, { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import { slaVoortgangOp } from '@/app/editor/actions';

export default function HtmlEvaluator({ initialCode, testScript, opdrachtId, modeloplossing, isVoltooid, isReviewMode }) {
  const [code, setCode] = useState(initialCode || '');
  const [feedback, setFeedback] = useState({ status: 'idle', message: "Klik op 'Uitvoeren & Testen' om je oplossing te testen." });
  const [toonOplossing, setToonOplossing] = useState(false);
  
  const iframeRef = useRef(null);

  const disablePaste = EditorView.domEventHandlers({
    paste(event, view) {
      event.preventDefault(); 
      
      setFeedback({ 
        status: 'error', 
        message: '❌ Kopiëren en plakken is uitgeschakeld. Probeer de code zelf te typen!' 
      });
      
      return true; 
    }
  });

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'test-result') {
        if (event.data.success) {
          setFeedback({ status: 'success', message: `✅ Correct! ${event.data.message}` });
          
          if (!isVoltooid && !isReviewMode) {
            await slaVoortgangOp(opdrachtId, code, true); 
          }
        } else {
          setFeedback({ status: 'error', message: `❌ Fout: ${event.data.message}` });
          
          if (!isVoltooid && !isReviewMode) {
            await slaVoortgangOp(opdrachtId, code, false); 
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [code, opdrachtId, isVoltooid, isReviewMode]); 

  const handleReset = () => {
    if (window.confirm("Weet je zeker dat je de code wilt resetten? Al je huidige werk voor deze oefening gaat verloren.")) {
      setCode(initialCode || '');
      setFeedback({ status: 'idle', message: "Code succesvol gereset naar de startwaarde." });
    }
  };

  const handleRunAndTest = () => {
    setFeedback({ status: 'testing', message: 'Aan het testen...' });
    const iframeDoc = iframeRef.current.contentWindow.document;
    iframeDoc.open();

    const isOudFormat = testScript.includes('<script') || testScript.includes('window.parent.postMessage');
    let scriptInjectie = '';

    if (isOudFormat) {
      scriptInjectie = testScript; 
    } else {
      scriptInjectie = `
        <script>
          window.onerror = function(msg) {
            window.parent.postMessage({ type: 'test-result', success: false, message: msg }, '*');
          };
          
          setTimeout(() => {
            try {
              ${testScript}
              window.parent.postMessage({ type: 'test-result', success: true, message: 'Alle tests geslaagd!' }, '*');
            } catch (e) {
              window.parent.postMessage({ type: 'test-result', success: false, message: e.message }, '*');
            }
          }, 50);
        </script>
      `;
    }

    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { font-family: sans-serif; }</style>
        </head>
        <body>
          ${code}
          ${scriptInjectie}
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  const getFeedbackStyles = () => {
    switch (feedback.status) {
      case 'success': return 'bg-neon-green/10 border-neon-green/30 text-neon-green shadow-glow-green/20';
      case 'error': return 'bg-red-950/20 border-red-900/50 text-red-400';
      case 'testing': return 'bg-neon-orange/10 border-neon-orange/30 text-neon-orange';
      default: return 'bg-bg-app border-border-main text-text-muted';
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
        
        {/* Editor Paneel */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border-main bg-bg-app shadow-lg flex flex-col">
          <div className="flex-1 overflow-auto h-full">
            <CodeMirror
              value={code}
              height="100%"
              style={{ minHeight: '100%' }}
              theme="dark"
              extensions={[html({ selfClosingTags: true, matchClosingTags: true }), disablePaste]}
              onChange={(value) => setCode(value)}
            />
          </div>
        </div>
        
        {/* Output Paneel */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden"> {/* overflow-hidden toegevoegd op de container */}
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
             <button 
               onClick={handleRunAndTest} 
               className="flex-1 bg-neon-blue text-dark font-bold py-3 px-4 rounded-full hover:shadow-glow-blue transition-all duration-300"
             >
               ▶ Uitvoeren & Testen
             </button>
             <button 
               onClick={handleReset} 
               className="bg-transparent border border-red-500 text-red-500 font-bold py-3 px-6 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300"
             >
               ↻ Reset
             </button>
          </div>
          
          {/* Modeloplossing sectie */}
          {isVoltooid && modeloplossing && (
            <div className="border border-neon-green/50 rounded-xl overflow-hidden bg-neon-green/5 flex-shrink-0 flex flex-col max-h-[50%]"> 
              {/* max-h-[50%] toegevoegd zodat het niet het hele scherm overneemt */}
              <button 
                onClick={() => setToonOplossing(!toonOplossing)}
                className="w-full bg-neon-green/20 text-neon-green border-none p-3 text-sm font-bold cursor-pointer text-left flex justify-between items-center transition-colors hover:bg-neon-green/30 flex-shrink-0"
              >
                {toonOplossing ? '💡 Verberg Modeloplossing' : '💡 Bekijk Modeloplossing'}
              </button>
              
              {toonOplossing && (
                <div className="overflow-y-auto"> {/* Extra div wrapper voor scroll */}
                  <pre className="m-0 p-4 text-text-main font-mono text-sm whitespace-pre-wrap">
                    {modeloplossing}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {/* Iframe */}
          <iframe 
            ref={iframeRef} 
            id="outputFrame" 
            title="Code Sandbox"
            className="flex-1 border border-border-main rounded-xl bg-white shadow-inner min-h-0" 
            /* min-h-0 toegevoegd om flexbox correct te laten verkleinen */
          />
          
          {/* Feedback Box */}
          <div className={`p-4 rounded-xl font-bold border transition-all duration-300 flex-shrink-0 ${getFeedbackStyles()}`}>
            {feedback.message}
          </div>
        </div>
      </div>
    </div>
  );
}