import { Language } from '../services/language.service';

/**
 * Numbers written out in words, in each language the game speaks.
 *
 * This exists for one job: the gate in front of the grown-ups' screen. A
 * parental gate has to be something an adult passes without thinking and a
 * young child cannot, and the usual answer — a small multiplication — is the
 * one thing this app must never use. This is a maths game. A child who tried
 * the gate and failed would have failed at arithmetic, in a product whose
 * whole design is built to avoid telling children they are bad at maths.
 *
 * Reading "four thousand two hundred and six" and writing 4206 needs reading
 * fluency and place value, not calculation. Nobody is wrong at it; they
 * either read it or they do not.
 *
 * Kept free of the DOM so every number in range can be checked directly.
 */

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen'
];
const EN_TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

const NL_ONES = [
  'nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
  'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien',
  'zeventien', 'achttien', 'negentien'
];
const NL_TENS = [
  '', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig',
  'tachtig', 'negentig'
];
/**
 * Dutch says the unit first and joins it to the ten with "en". A unit ending
 * in a vowel takes a trema on that "en" so the seam reads as two syllables:
 * tweeëntwintig, but vierentwintig. The whole seam is written out here
 * rather than assembled, because the trema belongs to the join, not the unit.
 */
const NL_SEAM = [
  '', 'eenen', 'tweeën', 'drieën', 'vieren', 'vijfen', 'zesen',
  'zevenen', 'achten', 'negenen'
];

const ES_ONES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis',
  'diecisiete', 'dieciocho', 'diecinueve'
];
const ES_TWENTIES = [
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro',
  'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'
];
const ES_TENS = [
  '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
  'ochenta', 'noventa'
];
const ES_HUNDREDS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
];

/** The largest number this can write out. Four digits is all the gate needs. */
export const MAX_SPELLED = 9999;

/**
 * `value` written out in `language`, or an empty string when it is outside
 * 0..MAX_SPELLED. Never throws: a gate that cannot render its own challenge
 * must fail closed, not crash a screen.
 */
export function spellNumber(value: number, language: Language): string {
  if (!Number.isFinite(value) || value < 0 || value > MAX_SPELLED || Math.floor(value) !== value) {
    return '';
  }

  switch (language) {
    case 'nl':
      return dutch(value);
    case 'es':
      return spanish(value);
    default:
      return english(value);
  }
}

function english(value: number): string {
  if (value < 20) {
    return EN_ONES[value];
  }
  if (value < 100) {
    const unit = value % 10;
    return unit ? `${EN_TENS[Math.floor(value / 10)]}-${EN_ONES[unit]}` : EN_TENS[value / 10];
  }
  if (value < 1000) {
    const rest = value % 100;
    const head = `${EN_ONES[Math.floor(value / 100)]} hundred`;
    return rest ? `${head} and ${english(rest)}` : head;
  }

  const rest = value % 1000;
  const head = `${EN_ONES[Math.floor(value / 1000)]} thousand`;
  if (!rest) {
    return head;
  }
  // "four thousand and six", but "four thousand two hundred and six"
  return rest < 100 ? `${head} and ${english(rest)}` : `${head} ${english(rest)}`;
}

function dutch(value: number): string {
  if (value < 20) {
    return NL_ONES[value];
  }
  if (value < 100) {
    const unit = value % 10;
    const tens = NL_TENS[Math.floor(value / 10)];
    return unit ? `${NL_SEAM[unit]}${tens}` : tens;
  }
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    // "honderd", not "eenhonderd"
    const head = hundreds === 1 ? 'honderd' : `${NL_ONES[hundreds]}honderd`;
    return rest ? `${head}${dutch(rest)}` : head;
  }

  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  const head = thousands === 1 ? 'duizend' : `${NL_ONES[thousands]}duizend`;
  return rest ? `${head} ${dutch(rest)}` : head;
}

function spanish(value: number): string {
  if (value < 20) {
    return ES_ONES[value];
  }
  if (value < 30) {
    return ES_TWENTIES[value - 20];
  }
  if (value < 100) {
    const unit = value % 10;
    const tens = ES_TENS[Math.floor(value / 10)];
    return unit ? `${tens} y ${ES_ONES[unit]}` : tens;
  }
  if (value < 1000) {
    const rest = value % 100;
    // "cien" exactly, "ciento uno" above it
    if (value === 100) {
      return 'cien';
    }
    const head = ES_HUNDREDS[Math.floor(value / 100)];
    return rest ? `${head} ${spanish(rest)}` : head;
  }

  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  // "mil", not "uno mil"
  const head = thousands === 1 ? 'mil' : `${ES_ONES[thousands]} mil`;
  return rest ? `${head} ${spanish(rest)}` : head;
}
