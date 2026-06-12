import { login } from './actions';
import ThemeToggle from '@/components/ThemeToggle'; // Optioneel, maar leuk voor de leerlingen!

export default async function LoginPage({ searchParams }) {
  // Lees eventuele foutmeldingen uit de URL
  const { message } = await searchParams;

  return (
    <div className="flex justify-center items-center min-h-screen bg-bg-app relative">
      {/* Theme Toggle in de rechterbovenhoek */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="bg-bg-card p-8 rounded-xl shadow-lg border border-border-main w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-main">
            Inloggen
          </h1>
          <p className="text-neon-blue font-mono mt-2 tracking-wide">
            {"< Leerplatform />"}
          </p>
        </div>
        
        {message && (
          <div className="bg-red-950/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm text-center font-bold">
            {message}
          </div>
        )}

        <form action={login} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-text-muted mb-1.5" htmlFor="email">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-border-main p-3 rounded-lg bg-bg-app text-text-main focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
              placeholder="naam@school.be"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-text-muted mb-1.5" htmlFor="password">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border border-border-main p-3 rounded-lg bg-bg-app text-text-main focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-neon-blue text-dark p-3 rounded-full hover:shadow-glow-blue font-bold mt-4 transition-all duration-300 text-lg"
          >
            Aanmelden
          </button>
        </form>
      </div>
    </div>
  );
}