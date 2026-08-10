import { redirect } from 'next/navigation';

/**
 * Redirecționare către pagina canonică de adăugare.
 *
 * Aici a existat un al doilea formular de creare a scadențelor, complet
 * funcțional dar nelegat din nicio pagină. Scria direct în `reminders` cu
 * propriul server action, ocolind ruta `/api/reminders` — deci și validarea, și
 * deduplicarea, și coloanele de consimțământ pe care le completează aceasta.
 * Două căi de scriere care diverg în tăcere sunt mai rele decât una: multi-
 * scadența s-a implementat doar pe cea folosită.
 *
 * Nu ștergem adresa, ca un eventual link salvat de cineva să nu ducă în gol.
 */
export default function NewReminderRedirect() {
  redirect('/dashboard/add-vehicle');
}
