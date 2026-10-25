import {
  faGraduationCap, faBook, faMicroscope, faCode, faMusic, faPalette, faDumbbell, faHeartPulse,
  faCalculator, faScaleBalanced, faChartLine, faLanguage,
} from "@fortawesome/free-solid-svg-icons"

// Picks an icon for an event from words in its title, description or exam (events have no category field)
const SUBJECTS = [
  { icon: faCalculator, words: ["math", "calculus", "algebra", "statistics", "geometry"] },
  { icon: faMicroscope, words: ["science", "biology", "chemistry", "physics", "lab"] },
  { icon: faCode, words: ["code", "coding", "programming", "computer", "software", "algorithm", "data"] },
  { icon: faHeartPulse, words: ["health", "medical", "medicine", "anatomy", "nursing", "mcat", "usmle"] },
  { icon: faScaleBalanced, words: ["law", "legal", "bar exam", "lsat"] },
  { icon: faChartLine, words: ["economics", "finance", "business", "accounting", "gmat"] },
  { icon: faLanguage, words: ["language", "english", "spanish", "french", "ielts", "toefl"] },
  { icon: faBook, words: ["literature", "writing", "history", "reading", "book", "essay"] },
  { icon: faPalette, words: ["art", "design", "creative"] },
  { icon: faMusic, words: ["music", "sound", "audio"] },
  { icon: faDumbbell, words: ["sport", "fitness", "exercise"] },
]

export function subjectIcon(event) {
  const text = `${event.title || ""} ${event.description || ""} ${event.exam || ""}`.toLowerCase()
  return SUBJECTS.find((s) => s.words.some((w) => text.includes(w)))?.icon || faGraduationCap
}
