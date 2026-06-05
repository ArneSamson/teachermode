import { login } from './actions';

export default async function LoginPage({ searchParams }) {
  // Lees eventuele foutmeldingen uit de URL
  const { message } = await searchParams;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          Inloggen Leerplatform
        </h1>
        
        {message && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        <form action={login} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="naam@school.be"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border border-gray-300 p-2 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold mt-2 transition-colors"
          >
            Aanmelden
          </button>
        </form>
      </div>
    </div>
  );
}