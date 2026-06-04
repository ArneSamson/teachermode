// lib/mockData.js

// 1. We faken de ingelogde gebruiker. 
// Verander 'jaar_niveau' naar 1 of 6 om je routing te testen.
export const currentUser = {
  id: "user-123",
  naam: "Test Leerling",
  rol: "leerling",
  jaar_niveau: 5
};

export const opdrachtenDB = [
  {
    id: "html-01",
    module: "HTML & CSS",
    jaar_niveau: 5,
    titel: "Het Rode Vierkant",
    enkel_schooluren: false,
    // Nieuw veld:
    uitleg: "Maak een <code>&lt;div&gt;</code> aan met het id <strong>'vierkant'</strong>. Geef dit element via CSS een breedte en hoogte van 100px, en een rode achtergrondkleur.",
    start_code: "<style>\n\n</style>\n\n<div id='vierkant'></div>",
    // Test voor oefening 1
    test_script: `
      <script>
        function runTest() {
          try {
            const el = document.getElementById('vierkant');
            if (!el) return window.parent.postMessage({ type: 'test-result', success: false, message: 'Geen element met id="vierkant" gevonden.' }, '*');
            const styles = window.getComputedStyle(el);
            if (styles.backgroundColor !== 'rgb(255, 0, 0)' && styles.backgroundColor !== 'red') return window.parent.postMessage({ type: 'test-result', success: false, message: 'De kleur is niet rood.' }, '*');
            if (styles.width !== '100px' || styles.height !== '100px') return window.parent.postMessage({ type: 'test-result', success: false, message: 'Afmetingen zijn niet 100x100px.' }, '*');
            window.parent.postMessage({ type: 'test-result', success: true, message: 'Perfect een rood vierkant!' }, '*');
          } catch(e) { window.parent.postMessage({ type: 'test-result', success: false, message: 'Fout in code.' }, '*'); }
        }
        setTimeout(runTest, 100);
      </script>
    `
  },
  {
    id: "html-02",
    module: "HTML & CSS",
    jaar_niveau: 5,
    titel: "De Blauwe Cirkel",
    enkel_schooluren: false,
    // Nieuw veld:
    uitleg: "Teken een cirkel door een <code>&lt;div&gt;</code> te maken met het id <strong>'cirkel'</strong>. Maak de achtergrondkleur blauw, zorg ervoor dat de cirkel 100 pixels op 100 pixels is, en zorg dat het element perfect rond is via de juiste CSS-eigenschap.",
    start_code: "<style>\n\n</style>\n\n",
    // Test voor oefening 2
    test_script: `
      <script>
        function runTest() {
          try {
            const el = document.getElementById('cirkel');
            if (!el) return window.parent.postMessage({ type: 'test-result', success: false, message: 'Geen element met id="cirkel" gevonden.' }, '*');
            const styles = window.getComputedStyle(el);
            if (styles.backgroundColor !== 'rgb(0, 0, 255)' && styles.backgroundColor !== 'blue') return window.parent.postMessage({ type: 'test-result', success: false, message: 'De kleur is niet blauw.' }, '*');
            if (styles.borderRadius !== '50%') return window.parent.postMessage({ type: 'test-result', success: false, message: 'Het element is niet rond (gebruik border-radius: 50%).' }, '*');
            if (styles.width !== '100px' || styles.height !== '100px') return window.parent.postMessage({ type: 'test-result', success: false, message: 'Afmetingen zijn niet 100x100px.' }, '*');
            window.parent.postMessage({ type: 'test-result', success: true, message: 'Mooi! Je hebt een blauwe cirkel gemaakt.' }, '*');
          } catch(e) { window.parent.postMessage({ type: 'test-result', success: false, message: 'Fout in code.' }, '*'); }
        }
        setTimeout(runTest, 100);
      </script>
    `
  }
];
