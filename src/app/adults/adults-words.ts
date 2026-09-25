import type { Words } from '../services/language.service';

/**
 * The grown-ups' screen's own words (and its gate's), in its lazy chunk
 * rather than in the language service: everything there is in the first load, and this screen is not.
 * The screen hands them to the service when it opens (`extend`).
 */
export type AdultsKey =
  | 'adults-accuracy'
  | 'adults-answer'
  | 'adults-copy-not'
  | 'adults-copy-title'
  | 'adults-copy-what'
  | 'adults-for'
  | 'adults-forget'
  | 'adults-forget-done'
  | 'adults-forget-no'
  | 'adults-forget-sure'
  | 'adults-forget-yes'
  | 'adults-how'
  | 'adults-how-title'
  | 'adults-no-rounds'
  | 'adults-nothing-missed'
  | 'adults-practise'
  | 'adults-questions'
  | 'adults-right-so-far'
  | 'adults-rounds'
  | 'adults-spacing'
  | 'adults-stuck-many'
  | 'adults-stuck-none'
  | 'adults-stuck-one'
  | 'adults-stuck-title'
  | 'adults-trend'
  | 'adults-trend-note'
  | 'adults-waiting'
  | 'adults-weakest'
  | 'gate-ask'
  | 'gate-continue'
  | 'gate-note'
  | 'op-divide'
  | 'op-minus'
  | 'op-plus'
  | 'op-times';

export const ADULTS_WORDS: Words<AdultsKey> = {
  en: {
    'adults-accuracy': 'Answers right',
    'adults-answer': 'Answer',
    'adults-copy-not': 'The sums the player gets wrong are never part of that copy. Those stay on this device, and so does anything played without signing in.',
    'adults-copy-title': 'The copy on the account',
    'adults-copy-what': 'Signing in keeps a copy of scores, levels, events and the character, so they are there on another phone or tablet.',
    'adults-for': 'How {name} is getting on',
    'adults-forget': 'Delete the copy',
    'adults-forget-done': 'Deleted. Nothing is kept on the account. Playing while signed in will start a new copy.',
    'adults-forget-no': 'Keep it',
    'adults-forget-sure': 'Delete the copy kept on the account? The game on this device keeps everything — only the copy goes.',
    'adults-forget-yes': 'Yes, delete it',
    'adults-how': 'Keep it to these three, keep it short, and stop while it is still going well. Each one is already worked out, so you never have to explain it on the spot — read the line, then ask for the answer. Sounding relaxed about maths matters more than being good at it: children pick up how an adult feels about it long before they pick up the method.',
    'adults-how-title': 'How to use this',
    'adults-no-rounds': 'No rounds finished yet, so there is nothing to show.',
    'adults-nothing-missed': 'Nothing is being missed at the moment.',
    'adults-practise': 'Three things to practise',
    'adults-questions': 'Questions answered',
    'adults-right-so-far': 'Right so far:',
    'adults-rounds': 'Rounds played',
    'adults-spacing': 'Facts come back a day apart, not the same afternoon — the gap is what makes them stick. One answered right on three separate days is done with and drops off this list.',
    'adults-stuck-many': '{count} facts stuck this week:',
    'adults-stuck-none': 'Nothing has finished this week yet. A fact counts as stuck once it has come back right on three separate days, so this fills up slowly on purpose.',
    'adults-stuck-one': 'One fact stuck this week:',
    'adults-stuck-title': 'What stuck',
    'adults-trend': 'Every round, oldest first',
    'adults-trend-note': 'The player never sees this line. A score that can go down is discouraging to read about yourself, and useful to you.',
    'adults-waiting': '{count} more are waiting for their day to come round.',
    'adults-weakest': 'Most of the missed questions are about {operation}.',
    'gate-ask': 'Type this number in digits.',
    'gate-continue': 'Continue',
    'gate-note': 'This page is for the grown-up, not the player.',
    'op-divide': 'dividing',
    'op-minus': 'taking away',
    'op-plus': 'adding',
    'op-times': 'times tables'
  },
  nl: {
    'adults-accuracy': 'Goede antwoorden',
    'adults-answer': 'Antwoord',
    'adults-copy-not': 'De sommen die fout gaan horen nooit bij die kopie. Die blijven op dit apparaat, net als alles wat zonder inloggen is gespeeld.',
    'adults-copy-title': 'De kopie bij het account',
    'adults-copy-what': 'Bij inloggen wordt een kopie van scores, niveaus, evenementen en het figuur bewaard, zodat die er ook zijn op een andere telefoon of tablet.',
    'adults-for': 'Hoe het met {name} gaat',
    'adults-forget': 'Kopie verwijderen',
    'adults-forget-done': 'Verwijderd. Er staat niets meer bij het account. Ingelogd spelen begint een nieuwe kopie.',
    'adults-forget-no': 'Bewaren',
    'adults-forget-sure': 'De kopie bij het account verwijderen? Het spel op dit apparaat houdt alles — alleen de kopie gaat weg.',
    'adults-forget-yes': 'Ja, verwijderen',
    'adults-how': 'Houd het bij deze drie, houd het kort, en stop zolang het nog goed gaat. Elke som is al uitgewerkt, zodat je het nooit ter plekke hoeft uit te leggen — lees de regel voor en vraag daarna om het antwoord. Ontspannen klinken over rekenen telt zwaarder dan er goed in zijn: kinderen pikken op hoe een volwassene zich erbij voelt, lang voordat ze de methode oppikken.',
    'adults-how-title': 'Hoe je dit gebruikt',
    'adults-no-rounds': 'Nog geen rondes afgerond, dus er is nog niets te zien.',
    'adults-nothing-missed': 'Er gaat op dit moment niets mis.',
    'adults-practise': 'Drie dingen om te oefenen',
    'adults-questions': 'Beantwoorde vragen',
    'adults-right-so-far': 'Tot nu toe goed:',
    'adults-rounds': 'Gespeelde rondes',
    'adults-spacing': 'Sommen komen een dag later terug, niet dezelfde middag — die tussentijd zorgt dat ze blijven hangen. Een som die op drie verschillende dagen goed gaat, is klaar en verdwijnt van deze lijst.',
    'adults-stuck-many': '{count} sommen zijn deze week blijven hangen:',
    'adults-stuck-none': 'Deze week is er nog niets afgerond. Een som telt pas als hij op drie verschillende dagen goed is teruggekomen, dus dit vult zich met opzet langzaam.',
    'adults-stuck-one': 'Eén som is deze week blijven hangen:',
    'adults-stuck-title': 'Wat is blijven hangen',
    'adults-trend': 'Elke ronde, oudste eerst',
    'adults-trend-note': 'De speler ziet deze lijn nooit. Een score die omlaag kan gaan is ontmoedigend om over jezelf te lezen, en nuttig voor jou.',
    'adults-waiting': 'Er wachten er nog {count} op hun beurt.',
    'adults-weakest': 'De meeste fouten gaan over {operation}.',
    'gate-ask': 'Typ dit getal in cijfers.',
    'gate-continue': 'Verder',
    'gate-note': 'Deze pagina is voor de volwassene, niet voor de speler.',
    'op-divide': 'delen',
    'op-minus': 'aftrekken',
    'op-plus': 'optellen',
    'op-times': 'tafels'
  },
  es: {
    'adults-accuracy': 'Respuestas correctas',
    'adults-answer': 'Respuesta',
    'adults-copy-not': 'Las cuentas que se fallan nunca forman parte de esa copia. Se quedan en este dispositivo, igual que todo lo jugado sin iniciar sesión.',
    'adults-copy-title': 'La copia de la cuenta',
    'adults-copy-what': 'Al iniciar sesión se guarda una copia de las puntuaciones, los niveles, los eventos y el personaje, para que estén también en otro móvil o tableta.',
    'adults-for': 'Cómo le va a {name}',
    'adults-forget': 'Borrar la copia',
    'adults-forget-done': 'Borrada. No queda nada en la cuenta. Jugar con la sesión iniciada empezará una copia nueva.',
    'adults-forget-no': 'Conservarla',
    'adults-forget-sure': '¿Borrar la copia guardada en la cuenta? El juego de este dispositivo lo conserva todo: solo se va la copia.',
    'adults-forget-yes': 'Sí, bórrala',
    'adults-how': 'Quédate con estas tres, que sea corto, y para mientras todavía va bien. Cada una ya está resuelta, así que nunca tienes que explicarla sobre la marcha: lee la línea y luego pregunta la respuesta. Sonar tranquilo con las matemáticas importa más que dárselas bien: los niños captan cómo se siente un adulto mucho antes de captar el método.',
    'adults-how-title': 'Cómo usar esto',
    'adults-no-rounds': 'Todavía no hay rondas terminadas, así que no hay nada que mostrar.',
    'adults-nothing-missed': 'Por ahora no falla nada.',
    'adults-practise': 'Tres cosas para practicar',
    'adults-questions': 'Preguntas respondidas',
    'adults-right-so-far': 'Aciertos hasta ahora:',
    'adults-rounds': 'Rondas jugadas',
    'adults-spacing': 'Las operaciones vuelven un día después, no la misma tarde: ese intervalo es lo que hace que se fijen. La que se acierta en tres días distintos ya está lista y sale de esta lista.',
    'adults-stuck-many': '{count} operaciones se aprendieron esta semana:',
    'adults-stuck-none': 'Esta semana aún no se ha completado nada. Una operación solo cuenta cuando ha vuelto bien en tres días distintos, así que esto se llena despacio a propósito.',
    'adults-stuck-one': 'Una operación se aprendió esta semana:',
    'adults-stuck-title': 'Lo que se ha aprendido',
    'adults-trend': 'Cada ronda, de la más antigua a la más reciente',
    'adults-trend-note': 'Quien juega nunca ve esta línea. Una puntuación que puede bajar desanima si es sobre ti, y es útil para ti.',
    'adults-waiting': 'Quedan {count} esperando su turno.',
    'adults-weakest': 'La mayoría de los fallos son de {operation}.',
    'gate-ask': 'Escribe este número en cifras.',
    'gate-continue': 'Continuar',
    'gate-note': 'Esta página es para el adulto, no para quien juega.',
    'op-divide': 'dividir',
    'op-minus': 'restar',
    'op-plus': 'sumar',
    'op-times': 'tablas de multiplicar'
  }
};
