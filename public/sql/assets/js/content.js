// Loaded content, shared by every view. Filled once at boot.
export const C = { exercises: [], quiz: [], lessons: [] };

export async function loadContent() {
  const safe = (p, key) => import(p).then(m => m[key] || []).catch(err => { console.warn('content missing', p, err); return []; });
  const [exercises, quiz, lessons] = await Promise.all([
    safe('./content/exercises.js', 'EXERCISES'),
    safe('./content/quiz.js', 'QUIZ'),
    safe('./content/lessons.js', 'LESSONS'),
  ]);
  C.exercises = exercises;
  C.quiz = quiz;
  C.lessons = lessons;
  return C;
}

export const exerciseById = id => C.exercises.find(e => e.id === id);
export const lessonById = id => C.lessons.find(l => l.id === id);
