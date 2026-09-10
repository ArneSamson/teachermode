import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Teachermode",
  description: "Welkom op mijn website voor informaticawetenschappen",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      {/* 1. min-h-screen en flex-col zorgen dat de body altijd 100% van de schermhoogte pakt */}
      <body className="bg-bg-app text-text-main min-h-screen flex flex-col font-sans">
        
        {/* 2. flex-1 zorgt ervoor dat de hoofdcontent de overgebleven ruimte vult en de footer naar beneden duwt */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* 3. De semantische footer tag veilig binnen de body */}
        <footer className="w-full py-6 mt-auto border-t border-border-main/50 text-center text-xs font-mono text-text-muted">
          Platform gebaseerd op Professormode van mijn uitstekende docent{' '}
          <a 
            href="https://www.goodbytes.be/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-neon-blue hover:text-white transition-colors font-bold"
          >
            Goodbytes
          </a>
          .
        </footer>

      </body>
    </html>
  );
}
