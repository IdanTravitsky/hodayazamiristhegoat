// Trophies: little milestones. test(d, ctx) gets profile data and the content lists.

const solvedIn = (d, ctx, pred) => ctx.exercises.filter(pred).every(e => d.solved[e.id]);
const countSolved = d => Object.keys(d.solved).length;

export const TROPHIES = [
  { id: 'first', icon: 'sword', name: 'Query felled.', desc: 'Solved your first exercise.', hint: 'Solve any practice exercise.',
    test: d => countSolved(d) >= 1 },
  { id: 'ten', icon: 'star', name: 'Ten down.', desc: 'Ten exercises solved. The streak of a professional.', hint: 'Solve 10 exercises.',
    test: d => countSolved(d) >= 10 },
  { id: 'tour', icon: 'map', name: 'Tourist in Chinook', desc: 'Opened every one of the 11 tables. You know where everything lives now.', hint: 'Visit every table on the Chinook page.',
    test: (d, ctx) => ctx.tableCount > 0 && d.tables.length >= ctx.tableCount },
  { id: 'warmups', icon: 'check', name: 'Warmed up', desc: 'Every warm-up exercise solved.', hint: 'Solve all the warm-up (one dot) exercises.',
    test: (d, ctx) => solvedIn(d, ctx, e => e.level === 1) },
  { id: 'joins', icon: 'map', name: 'Lands Between the tables', desc: 'Every JOIN exercise solved. Nothing is unreachable now.', hint: 'Solve every exercise in Joins.',
    test: (d, ctx) => solvedIn(d, ctx, e => e.topic === 'join') },
  { id: 'groups', icon: 'table', name: 'Group project, solo', desc: 'Every GROUP BY exercise solved, and nobody else did any work.', hint: 'Solve every exercise in GROUP BY & HAVING.',
    test: (d, ctx) => solvedIn(d, ctx, e => e.topic === 'group') },
  { id: 'subq', icon: 'eye', name: 'Subquery-ception', desc: 'Every subquery exercise solved. A query, inside a query, inside your head.', hint: 'Solve every exercise in Subqueries.',
    test: (d, ctx) => solvedIn(d, ctx, e => e.topic === 'subq') },
  { id: 'nohints', icon: 'key', name: 'No messages needed', desc: 'Solved a boss-level exercise without a single hint.', hint: 'Solve a three-dot exercise without opening hints.',
    test: (d, ctx) => ctx.exercises.some(e => e.level === 3 && d.solved[e.id] && !d.solved[e.id].hints && !d.solved[e.id].revealed) },
  { id: 'reader', icon: 'book', name: 'Reads SQL like subtitles', desc: '20 Understand questions answered right.', hint: 'Get 20 questions right in Understand.',
    test: d => Object.values(d.quiz).filter(q => q.ok).length >= 20 },
  { id: 'lessons', icon: 'book', name: 'Read the whole manual', desc: 'Every lesson marked done.', hint: 'Finish every lesson in Learn.',
    test: (d, ctx) => ctx.lessons.length > 0 && ctx.lessons.every(l => d.lessons[l.id]) },
  { id: 'mock', icon: 'clock', name: 'Grace under pressure', desc: 'Scored 80% or more on a mock exam.', hint: 'Score 80%+ on a mock exam.',
    test: d => d.exams.some(e => e.score / e.total >= 0.8) },
  { id: 'hitless', icon: 'sword', name: 'Hitless, again', desc: 'A perfect mock exam. Radahn sends his regards.', hint: 'Get every question right on a mock exam.',
    test: d => d.exams.some(e => e.score === e.total && e.total >= 5) },
  { id: 'night', icon: 'moon', name: 'Night shift', desc: 'Solved something after 23:00. Go to sleep. (Proud of you.)', hint: 'Solve an exercise late at night.',
    test: d => Object.values(d.solved).some(s => { const h = new Date(s.at).getHours(); return h >= 23 || h < 4; }) },
  { id: 'streak', icon: 'spark', name: 'Three days running', desc: 'Studied on three different days.', hint: 'Come back on three different days.',
    test: d => d.days.length >= 3 },
  { id: 'goat', icon: 'goat', name: 'Emotional support goat', desc: 'Pet the goat five times. It needed that. So did you.', hint: 'There is a goat somewhere on this page.',
    test: d => d.goatPets >= 5 },
  { id: 'all', icon: 'trophy', name: 'Promised Consort of SQL', desc: 'Every single exercise solved. There is nothing left to teach you.', hint: 'Solve every exercise.',
    test: (d, ctx) => ctx.exercises.every(e => d.solved[e.id]) },
];
