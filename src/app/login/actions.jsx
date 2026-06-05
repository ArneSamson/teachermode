'use server';

import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export async function login(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = await createClient();

  // Supabase probeert de gebruiker in te loggen
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Stuur de gebruiker terug met een error in de URL
    redirect('/login?message=Foutieve inloggegevens');
  }

  // Bij succes, stuur ze direct naar het dashboard
  redirect('/dashboard');
}