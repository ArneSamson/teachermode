'use client'; // Dit vertelt Next.js dat dit stukje wél in de browser draait

import { verwijderOpdracht } from '@/app/admin/actions';

export default function VerwijderKnop({ id }) {
  return (
    <form 
      action={verwijderOpdracht.bind(null, id)} 
      onSubmit={(e) => {
        // Nu we in een Client Component zitten, werkt de browser-popup perfect!
        if (!window.confirm('Weet je zeker dat je deze opdracht permanent wilt verwijderen?')) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 px-3 py-1 rounded">
        Verwijderen
      </button>
    </form>
  );
}