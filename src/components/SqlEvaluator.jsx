'use client';

import React, { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { slaVoortgangOp } from '@/app/editor/actions';

export default function SqlEvaluator({ initialCode, testScript, opdrachtId }) {
  const [code, setCode] = useState(initialCode || '');
  const [feedback, setFeedback] = useState({ status: 'idle', message: "Klik op 'Query Uitvoeren & Testen' om je SQL te verifiëren." });
  const [consoleLogs, setConsoleLogs] = useState([]);
  const iframeRef = useRef(null);

  const disablePaste = EditorView.domEventHandlers({
    paste(event) {
      event.preventDefault(); 
      setFeedback({ status: 'error', message: '❌ Kopiëren en plakken is uitgeschakeld.' });
      return true; 
    }
  });

  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data.type === 'test-result') {
        if (event.data.success) {
          setFeedback({ status: 'success', message: `✅ Correct! ${event.data.message || ''}` });
          await slaVoortgangOp(opdrachtId, true);
        } else {
          setFeedback({ status: 'error', message: `❌ Fout: ${event.data.message}` });
        }
      }
      if (event.data.type === 'console') {
        setConsoleLogs(prev => [...prev, event.data.message]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [opdrachtId]);

  const handleReset = () => {
    if (window.confirm("Weet je zeker dat je de code wilt resetten? Al je huidige werk voor deze oefening gaat verloren.")) {
      setCode(initialCode || '');
      setFeedback({ status: 'idle', message: "Code succesvol gereset naar de startwaarde." });
    }
  };

  const handleRunAndTest = () => {
    setFeedback({ status: 'testing', message: 'Query uitvoeren...' });
    setConsoleLogs([]); 

    const iframeDoc = iframeRef.current.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/alasql@4"></script>
        </head>
        <body>
          <script>
            (function() {
              const originalLog = console.log;
              console.log = function(...args) {
                const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
                window.parent.postMessage({ type: 'console', message: msg }, '*');
                originalLog.apply(console, args);
              };

              function verwacht(conditie, foutmelding) { 
                if (!conditie) throw new Error(foutmelding); 
              }

              try {
                // Sla de SQL van de leerling veilig op in een variabele
                const leerlingQuery = ${JSON.stringify(code)};
                
                // Voer het testscript van de leerkracht uit
                // Het testscript is verantwoordelijk voor het aanmaken van tabellen en het uitvoeren van leerlingQuery
                ${testScript}

                window.parent.postMessage({ type: 'test-result', success: true, message: 'De query gaf het perfecte resultaat!' }, '*');
              } catch (e) {
                // Stuur zowel AlaSQL syntax fouten als logica fouten terug
                window.parent.postMessage({ type: 'test-result', success: false, message: e.message }, '*');
              } finally {
                console.log = originalLog;
              }
            })();
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  return (
    <div style={styles.container}>
      <div style={styles.workspace}>
        <div style={styles.editorPanel}>
          <div style={styles.editorHeader}>query.sql</div>
          <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
            <CodeMirror 
              value={code} 
              height="100%" 
              style={{ minHeight: '100%' }}
              theme="dark" 
              extensions={[sql(), disablePaste]} 
              onChange={setCode} 
            />
          </div>
        </div>
        <div style={styles.outputPanel}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
             <button onClick={handleRunAndTest} style={styles.button}>▶ Query Uitvoeren & Testen</button>
             <button onClick={handleReset} style={styles.resetButton}>↻ Reset Code</button>
          </div>
          <div style={styles.consoleBox}>
             <div style={styles.consoleHeader}>-- Database Resultaat --</div>
             {consoleLogs.length === 0 && <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Wachten op query...</div>}
             {consoleLogs.map((log, i) => (
                <pre key={i} style={{ margin: 0, paddingBottom: '8px', whiteSpace: 'pre-wrap' }}>{log}</pre>
             ))}
          </div>
          <iframe ref={iframeRef} style={{ display: 'none' }} title="hidden-sandbox" />
          <div style={{ ...styles.feedbackBox, ...styles[feedback.status] }}>{feedback.message}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { width: '100%', marginBottom: '40px' },
  button: { backgroundColor: '#0056b3', color: 'white', border: 'none', padding: '10px 20px', fontSize: '16px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' },
  workspace: { display: 'flex', gap: '20px', height: '600px' }, 
  editorPanel: { flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc', backgroundColor: '#282c34', display: 'flex', flexDirection: 'column' },
  editorHeader: { backgroundColor: '#1e2126', color: '#56b6c2', padding: '10px 15px', fontSize: '14px', borderBottom: '1px solid #181a1f', fontFamily: 'monospace', fontWeight: 'bold' },
  outputPanel: { flex: 1, display: 'flex', flexDirection: 'column' },
  consoleBox: { flex: 1, border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1e1e1e', color: '#e5c07b', padding: '15px', marginBottom: '10px', fontFamily: 'monospace', fontSize: '14px', overflowY: 'auto' },
  consoleHeader: { color: '#888', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '10px' },
  feedbackBox: { padding: '15px', borderRadius: '8px', fontWeight: 'bold', transition: 'all 0.2s ease' },
  idle: { backgroundColor: '#e9ecef', color: '#495057', border: '1px solid #ced4da' },
  testing: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
  success: { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
  error: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' },
    resetButton: {
    backgroundColor: '#dc3545', color: 'white', border: 'none',
    padding: '10px 15px', fontSize: '14px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
  },
};