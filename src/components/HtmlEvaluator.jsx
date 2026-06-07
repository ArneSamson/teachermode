'use client';

import React, { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import { slaVoortgangOp } from '@/app/editor/actions';

export default function HtmlEvaluator({ initialCode, testScript, opdrachtId }) {
  const [code, setCode] = useState(initialCode || '');
  const [feedback, setFeedback] = useState({ status: 'idle', message: "Klik op 'Code Uitvoeren' om je oplossing te testen." });
  
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
          await slaVoortgangOp(opdrachtId, true);
        } else {
          setFeedback({ status: 'error', message: `❌ Fout: ${event.data.message}` });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
          
          </script></style></textarea></div>
          
          ${scriptInjectie}
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  return (
    <div style={styles.container}>
      <div style={styles.workspace}>
        <div style={styles.editorPanel}>
          {/* Deze div wrapper forceert het scrol-gedrag */}
          <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
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
        
        <div style={styles.outputPanel}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
             <button onClick={handleRunAndTest} style={styles.button}>Code Uitvoeren & Testen</button>
          </div>
          <iframe 
            ref={iframeRef} 
            id="outputFrame" 
            title="Code Sandbox"
            style={styles.iframe}
          />
          <div style={{ ...styles.feedbackBox, ...styles[feedback.status] }}>
            {feedback.message}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { width: '100%' },
  button: {
    backgroundColor: '#0056b3', color: 'white', border: 'none',
    padding: '10px 20px', fontSize: '16px', borderRadius: '4px', cursor: 'pointer', width: '100%'
  },
  workspace: { display: 'flex', gap: '20px', height: '500px' },
  editorPanel: { flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc', backgroundColor: '#282c34', display: 'flex', flexDirection: 'column' },
  outputPanel: { flex: 1, display: 'flex', flexDirection: 'column' },
  iframe: { flex: 1, border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '10px' },
  feedbackBox: { padding: '15px', borderRadius: '8px', fontWeight: 'bold', transition: 'all 0.2s ease' },
  idle: { backgroundColor: '#e9ecef', color: '#495057', border: '1px solid #ced4da' },
  testing: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' },
  success: { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
  error: { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }
};