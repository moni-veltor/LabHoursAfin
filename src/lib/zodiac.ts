export type Zodiac =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type ChineseZodiac =
  | "Rat"
  | "Ox"
  | "Tiger"
  | "Rabbit"
  | "Dragon"
  | "Snake"
  | "Horse"
  | "Goat"
  | "Monkey"
  | "Rooster"
  | "Dog"
  | "Pig";

export type Element = "fire" | "earth" | "air" | "water";

export const ZODIAC_EMOJI: Record<Zodiac, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export const CHINESE_EMOJI: Record<ChineseZodiac, string> = {
  Rat: "🐀",
  Ox: "🐂",
  Tiger: "🐅",
  Rabbit: "🐇",
  Dragon: "🐉",
  Snake: "🐍",
  Horse: "🐎",
  Goat: "🐐",
  Monkey: "🐒",
  Rooster: "🐓",
  Dog: "🐕",
  Pig: "🐖",
};

const ELEMENT_OF: Record<Zodiac, Element> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

export function elementOf(z: Zodiac): Element {
  return ELEMENT_OF[z];
}

export function zodiacFromDate(d: Date): Zodiac {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const cuts: [number, number, Zodiac][] = [
    [1, 19, "Capricorn"],
    [2, 18, "Aquarius"],
    [3, 20, "Pisces"],
    [4, 19, "Aries"],
    [5, 20, "Taurus"],
    [6, 20, "Gemini"],
    [7, 22, "Cancer"],
    [8, 22, "Leo"],
    [9, 22, "Virgo"],
    [10, 22, "Libra"],
    [11, 21, "Scorpio"],
    [12, 21, "Sagittarius"],
  ];
  for (const [cm, cd, sign] of cuts) {
    if (m < cm || (m === cm && day <= cd)) return sign;
  }
  return "Capricorn";
}

const CHINESE_ORDER: ChineseZodiac[] = [
  "Monkey",
  "Rooster",
  "Dog",
  "Pig",
  "Rat",
  "Ox",
  "Tiger",
  "Rabbit",
  "Dragon",
  "Snake",
  "Horse",
  "Goat",
];

export function chineseZodiacFromDate(d: Date): ChineseZodiac {
  // Year-based mapping; rough — Chinese New Year cutoff varies, this approximates.
  const y = d.getUTCFullYear();
  return CHINESE_ORDER[((y % 12) + 12) % 12];
}

const TRINES: Record<ChineseZodiac, Set<ChineseZodiac>> = {
  Rat: new Set(["Rat", "Dragon", "Monkey"]),
  Dragon: new Set(["Rat", "Dragon", "Monkey"]),
  Monkey: new Set(["Rat", "Dragon", "Monkey"]),
  Ox: new Set(["Ox", "Snake", "Rooster"]),
  Snake: new Set(["Ox", "Snake", "Rooster"]),
  Rooster: new Set(["Ox", "Snake", "Rooster"]),
  Tiger: new Set(["Tiger", "Horse", "Dog"]),
  Horse: new Set(["Tiger", "Horse", "Dog"]),
  Dog: new Set(["Tiger", "Horse", "Dog"]),
  Rabbit: new Set(["Rabbit", "Goat", "Pig"]),
  Goat: new Set(["Rabbit", "Goat", "Pig"]),
  Pig: new Set(["Rabbit", "Goat", "Pig"]),
};

const CLASH_PAIRS: [ChineseZodiac, ChineseZodiac][] = [
  ["Rat", "Horse"],
  ["Ox", "Goat"],
  ["Tiger", "Monkey"],
  ["Rabbit", "Rooster"],
  ["Dragon", "Dog"],
  ["Snake", "Pig"],
];

const CLASH_SET = new Set(
  CLASH_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`])
);

const ELEMENT_RELATION: Record<
  Element,
  { harmony: Element[]; tension: Element[] }
> = {
  fire: { harmony: ["fire", "air"], tension: ["water"] },
  earth: { harmony: ["earth", "water"], tension: ["air"] },
  air: { harmony: ["air", "fire"], tension: ["earth"] },
  water: { harmony: ["water", "earth"], tension: ["fire"] },
};

export function westernAffinity(a: Zodiac, b: Zodiac): number {
  if (a === b) return 3;
  const ea = elementOf(a);
  const eb = elementOf(b);
  if (ea === eb) return 3;
  if (ELEMENT_RELATION[ea].harmony.includes(eb)) return 2;
  if (ELEMENT_RELATION[ea].tension.includes(eb)) return 0;
  return 1;
}

export function chineseAffinity(a: ChineseZodiac, b: ChineseZodiac): number {
  if (a === b) return 2;
  if (TRINES[a].has(b)) return 3;
  if (CLASH_SET.has(`${a}|${b}`)) return 0;
  return 1;
}

export type AffinityFn = (a: string, b: string) => number;

export function teamAffinity(signs: string[], score: AffinityFn): number {
  if (signs.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < signs.length; i++) {
    for (let j = i + 1; j < signs.length; j++) {
      sum += score(signs[i], signs[j]);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

export function formZodiacTeams<T extends { id: string; sign: string }>(
  pool: T[],
  size: number,
  mode: "compat" | "chaos",
  system: "western" | "chinese"
): T[][] {
  if (size < 2) size = 2;
  const score: AffinityFn =
    system === "western"
      ? (a, b) => westernAffinity(a as Zodiac, b as Zodiac)
      : (a, b) => chineseAffinity(a as ChineseZodiac, b as ChineseZodiac);

  const remaining = pool.slice();
  const teams: T[][] = [];

  while (remaining.length >= 2) {
    const seedIdx = Math.floor(Math.random() * remaining.length);
    const seed = remaining.splice(seedIdx, 1)[0];
    const team: T[] = [seed];
    while (team.length < size && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = mode === "compat" ? -Infinity : Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const teamScore = team.reduce(
          (acc, t) => acc + score(t.sign, candidate.sign),
          0
        );
        if (mode === "compat" && teamScore > bestScore) {
          bestScore = teamScore;
          bestIdx = i;
        } else if (mode === "chaos" && teamScore < bestScore) {
          bestScore = teamScore;
          bestIdx = i;
        }
      }
      team.push(remaining.splice(bestIdx, 1)[0]);
    }
    teams.push(team);
  }

  if (remaining.length === 1 && teams.length > 0) {
    teams[teams.length - 1].push(remaining.pop()!);
  }
  return teams;
}
