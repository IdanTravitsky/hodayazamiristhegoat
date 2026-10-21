// The little lines that make it feel like someone made this for her.

export const PRAISE = [
  'Clean. Not a single wasted JOIN.',
  'GOAT behavior, as documented.',
  'Query felled.',
  "That's the one.",
  'Hitless. Again.',
  'Radahn took longer than this.',
  'Rows: correct. Vibes: immaculate.',
  'The examiner is going to be bored by how right this is.',
  'No rewind needed.',
  'Final Spark of correctness.',
  'Leon would have a one-liner for this. It would be worse than your query.',
  'Chinook bows to you.',
  'Textbook. Possibly better than the textbook.',
  'Correct, and it reads nicely too.',
];

export const FIRST_TRY = [
  'First try. Show-off.',
  'First try. Of course.',
  'One run, done. Remember this feeling on Wednesday.',
];

export const NUDGES = [
  "Not yet. You're circling it.",
  'Close-ish. The message above knows things.',
  'Every great query was wrong a few times first.',
  'Deep breath. Check the row count first, then the columns.',
  "This is the part where it clicks. Keep going.",
];

export function greeting(name) {
  const h = new Date().getHours();
  if (h < 5) return { title: `Still up, ${name}?`, note: 'late-night SQL. respect. (but also, sleep.)' };
  if (h < 12) return { title: `Good morning, ${name}.`, note: 'coffee first, JOINs second.' };
  if (h < 17) return { title: `Hi ${name}.`, note: 'a few queries a day keeps the exam stress away.' };
  if (h < 22) return { title: `Good evening, ${name}.`, note: 'one more exercise, then a break.' };
  return { title: `Night shift, ${name}?`, note: 'the database never sleeps. you should, a little.' };
}

export const GOAT = [
  'The goat has no comment. The goat is a goat.',
  'The goat has reviewed your progress. The goat approves.',
  'Pet count rising. The goat remains supportive.',
  "The goat doesn't know SQL. That's why you're the one studying.",
  'Baaa. (translation: GROUP BY before HAVING.)',
  'The goat is staying for the exam. Moral support only.',
];
