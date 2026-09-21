'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function bewaarBeoordeling(sessieId, formData) {
  const score = formData.get('score');
  const feedback = formData.get('feedback');
  
  const supabase = await createClient();
  await supabase.from('toets_sessies')
    .update({
      leerkracht_score: score ? parseInt(score) : null,
      leerkracht_feedback: feedback
    })
    .eq('id', sessieId);
    
  // Dit zorgt ervoor dat de pagina vernieuwt met de nieuwe data
  revalidatePath(`/admin/toetsen/nakijken/${sessieId}`);
}