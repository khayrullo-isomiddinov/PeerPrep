// The facts the Privacy Policy, Terms and Contact page rely on, in one place.
// `null` means the owner still has to provide it: the pages then show a visible "to be confirmed" marker,
// so nothing is guessed. Have the finished texts reviewed by a legal professional before relying on them.

export const LEGAL = {
  lastUpdated: "2026-10-25",

  // Who runs PeerPrep and is responsible for personal data (the "controller" under the GDPR)
  operator: "Khayrullo Isomiddinov",
  contactEmail: "khayrullo2@outlook.com",
  website: "https://www.khayrullo.com",
  postalAddress: null,

  // Country whose law governs the Terms, and whose courts and data protection authority apply
  governingCountry: null,

  // Minimum age to create an account. 16 is the GDPR default for consent to online services;
  // some EU countries set it lower (13–15). Confirm for the countries you serve.
  minimumAge: 16,

  // Who sends the verification emails (the SMTP provider configured on the server)
  emailProvider: null,

  repoUrl: "https://github.com/khayrullo-isomiddinov/PeerPrep",
  issuesUrl: "https://github.com/khayrullo-isomiddinov/PeerPrep/issues",

  // How long the sign-in token stays valid (ACCESS_TOKEN_EXPIRE_MINUTES on the server)
  sessionMinutes: 60,
}

// Third parties that process data for PeerPrep. Keep in sync with the actual setup.
export const PROCESSORS = [
  {
    name: "Render",
    purpose: "Runs the PeerPrep server (API, chat and whiteboard connections).",
    location: "Frankfurt, Germany (EU)",
    url: "https://render.com/privacy",
  },
  {
    name: "Neon",
    purpose: "Hosts the database that stores accounts, events, messages and whiteboards.",
    location: "Frankfurt, Germany (EU), on Amazon Web Services",
    url: "https://neon.com/privacy-policy",
  },
  {
    name: "Vercel",
    purpose: "Serves the website itself (pages, scripts, images) through its global network.",
    location: "United States and a worldwide edge network",
    url: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "OpenAI",
    purpose: "Only when you use an AI helper: improves the text you wrote or creates a cover image from your description.",
    location: "United States",
    url: "https://openai.com/policies/privacy-policy",
  },
]

export const hasPendingInfo = Object.values(LEGAL).some((value) => value === null)
