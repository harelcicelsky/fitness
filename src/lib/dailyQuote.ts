// Rotating motivational quote — picked deterministically by day-of-year so
// it's the same all day but changes overnight.

const QUOTES: { text: string; author: string }[] = [
  { text: "The only bad workout is the one that didn't happen.", author: "—" },
  { text: "You don't have to be extreme, just consistent.", author: "—" },
  { text: "Strength is built, not born.", author: "—" },
  { text: "Suffer the pain of discipline or the pain of regret.", author: "Jim Rohn" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "Sore tomorrow or sorry tomorrow.", author: "—" },
  { text: "Show up. The reps will follow.", author: "—" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "—" },
  { text: "Heavy is just light you haven't gotten strong enough for yet.", author: "—" },
  { text: "Discipline is choosing what you want most over what you want now.", author: "—" },
  { text: "If it doesn't challenge you, it doesn't change you.", author: "Fred DeVito" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "—" },
  { text: "Train like someone who's behind. Recover like someone who's ahead.", author: "—" },
  { text: "Form first. Weight follows.", author: "—" },
  { text: "Every rep is a vote for who you're becoming.", author: "—" },
];

export function getDailyQuote(): { text: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
}
