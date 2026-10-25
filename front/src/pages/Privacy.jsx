import { Link } from "react-router-dom"
import LegalPage, { ExternalLink, MailLink, Pending } from "../features/legal/LegalPage"
import { LEGAL, PROCESSORS } from "../features/legal/legalInfo"

// Everything here describes what the app actually does. If the code changes what is collected, stored,
// shared or kept, update this page (and LEGAL.lastUpdated) in the same change.

const STORAGE = [
  { key: "access_token", where: "Local storage", purpose: "Keeps you signed in.", kept: `Until you sign out. The token inside stops working after ${LEGAL.sessionMinutes} minutes.` },
  { key: "peerprep-theme", where: "Local storage", purpose: "Remembers light or dark mode, if you picked one.", kept: "Until you switch back to the system setting." },
  { key: "peerprep-onboarding:…", where: "Local storage", purpose: "Remembers your getting-started checklist (hidden, whiteboard opened).", kept: "Until you clear your browser data." },
  { key: "auth_notice", where: "Session storage", purpose: "Shows a one-time message after your session expires.", kept: "Until it's shown, or the tab is closed." },
  { key: "peerprep-chunk-reload", where: "Session storage", purpose: "Reloads the page once after we release a new version.", kept: "Until the tab is closed." },
]

const sections = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          PeerPrep is a website that helps students find study groups, plan sessions and work through problems together.
          It is run by <strong>{LEGAL.operator}</strong>, who is the controller of your personal data under the EU General
          Data Protection Regulation (GDPR).
        </p>
        <p>
          Contact: <MailLink subject="Privacy question" /> · Postal address: {LEGAL.postalAddress ?? <Pending>postal address</Pending>}
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <h3>When you create an account</h3>
        <ul>
          <li><strong>Your email address</strong>, to sign you in and to send the verification email. It is never shown to other users.</li>
          <li><strong>Your password</strong>, stored only as a one-way hash (Argon2). We can't see or recover it.</li>
          <li>Whether your email is verified, and when the account was created.</li>
        </ul>

        <h3>When you fill in your profile (optional)</h3>
        <ul>
          <li>Your <strong>name</strong>, <strong>bio</strong> and <strong>profile photo</strong>.</li>
          <li>Until you set a name, other people see the part of your email address before the “@” instead.</li>
          <li>Your <strong>experience points and level</strong>, which we calculate from the sessions you attend.</li>
        </ul>

        <h3>When you use PeerPrep</h3>
        <ul>
          <li><strong>Events you create:</strong> title, description, time, duration, location, exam, capacity, cover image and any study materials you attach.</li>
          <li><strong>Events you join</strong>, and when you joined.</li>
          <li><strong>Chat messages</strong> you send in an event, and which messages you've read. Deleting a message erases its text.</li>
          <li><strong>Whiteboard drawings</strong>, notes and shapes you add to an event's board.</li>
          <li>Who is online and who is typing, kept briefly in the server's memory only and never saved.</li>
        </ul>

        <h3>When you use an AI helper</h3>
        <p>
          Some forms let you ask AI to improve a title or description, or to create a cover image. Only when you press
          that button, the text or description you entered is sent to OpenAI to produce the result. Nothing else about
          you is sent, and nothing is sent if you don't use these buttons.
        </p>

        <h3>Technical data</h3>
        <p>
          Like any website, our hosting providers receive your IP address, browser type and the pages or API addresses
          requested, and keep them in short-lived server logs for security and troubleshooting. Our own logs don't
          record your email address, password or messages.
        </p>
        <p>
          We do <strong>not</strong> use analytics, advertising, tracking pixels or social media plugins, and we don't
          build profiles of you for marketing.
        </p>
      </>
    ),
  },
  {
    id: "visible",
    title: "What other people can see",
    body: (
      <>
        <ul>
          <li><strong>Anyone, including visitors who aren't signed in,</strong> can see events and their details, and the names and photos of the people attending them.</li>
          <li><strong>Anyone</strong> can open your public profile: name, photo, bio, level and the date you joined.</li>
          <li><strong>Members of an event</strong> can read its chat (with each message's author and read count), see its whiteboard and download its study materials.</li>
          <li><strong>Nobody else</strong> sees your email address.</li>
        </ul>
        <p>Please don't put personal details in event titles, descriptions or chats that you wouldn't want others to see.</p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we use it (legal bases)",
    body: (
      <>
        <ul>
          <li>
            <strong>To provide PeerPrep to you</strong> (GDPR Art. 6(1)(b), performance of a contract): your account,
            profile, events, chats, whiteboards, verification emails, and the AI helpers when you ask for them.
          </li>
          <li>
            <strong>To keep PeerPrep safe and working</strong> (Art. 6(1)(f), legitimate interests): security logs,
            limiting repeated sign-in attempts, preventing spam and abuse, and fixing errors. You can object to this; see
            “Your rights”.
          </li>
          <li>
            <strong>To meet legal obligations</strong> (Art. 6(1)(c)), for example when the law requires us to keep or
            hand over information.
          </li>
        </ul>
        <p>We don't sell your data, and we don't use it for advertising.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>
          We use the following providers to run PeerPrep. They process data only on our behalf and for the purposes
          below.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th scope="col">Provider</th><th scope="col">What for</th><th scope="col">Where</th></tr>
            </thead>
            <tbody>
              {PROCESSORS.map((p) => (
                <tr key={p.name}>
                  <td><ExternalLink href={p.url}>{p.name}</ExternalLink></td>
                  <td>{p.purpose}</td>
                  <td>{p.location}</td>
                </tr>
              ))}
              <tr>
                <td>{LEGAL.emailProvider ?? <Pending>email provider</Pending>}</td>
                <td>Delivers verification emails.</td>
                <td>{LEGAL.emailProvider ? "See their privacy policy" : <Pending>location</Pending>}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We may also disclose information if required by law, or to protect the rights, safety or property of our
          users or others.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "International transfers",
    body: (
      <p>
        Our server and database are in the EU. Vercel and OpenAI are based in the United States, so some data
        (your IP address when you load the website; the text you send to an AI helper) may be processed there. Where
        that happens, we rely on the safeguards these providers offer for transfers out of the EEA, such as the EU–US
        Data Privacy Framework or the European Commission's Standard Contractual Clauses.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <>
        <ul>
          <li><strong>Your account and profile:</strong> until you delete your account.</li>
          <li><strong>Events, their chats, whiteboards and materials:</strong> until the organiser deletes the event, or deletes their account. Past events stay visible as history until then.</li>
          <li><strong>Your messages and drawings in other people's events:</strong> until you delete them, the event is deleted, or you delete your account.</li>
          <li><strong>Sign-in attempt counters:</strong> in the server's memory for at most an hour.</li>
          <li><strong>Server logs:</strong> kept by our hosting providers for a limited period under their own policies.</li>
        </ul>
        <p>
          Our database provider keeps short-term backups so we can recover from mistakes. Deleted data can remain in
          those backups until they expire, and is not used in the meantime.
        </p>
      </>
    ),
  },
  {
    id: "delete",
    title: "Deleting your account",
    body: (
      <>
        <p>
          You can delete your account at any time from your <Link to="/profile">profile page</Link>. This permanently
          removes:
        </p>
        <ul>
          <li>your account, email address, password hash and profile;</li>
          <li>every event you organised, with its chat, whiteboard and study materials;</li>
          <li>your memberships, messages, read receipts and drawings in other people's events.</li>
        </ul>
        <p>This can't be undone. If you can't access your account, email <MailLink subject="Account deletion request" /> instead.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <p>
          PeerPrep doesn't set any cookies. It keeps a few small items in your browser's local and session storage,
          all of them needed for the features you use, so we don't ask for consent. Nothing here is used for tracking
          or shared with anyone.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th scope="col">Name</th><th scope="col">Where</th><th scope="col">Purpose</th><th scope="col">Kept</th></tr>
            </thead>
            <tbody>
              {STORAGE.map((item) => (
                <tr key={item.key}>
                  <td><code>{item.key}</code></td>
                  <td>{item.where}</td>
                  <td>{item.purpose}</td>
                  <td>{item.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          You can clear these at any time in your browser settings; you'll simply be signed out. The fonts and images
          that make up the website are served from PeerPrep itself, not from third-party font or analytics services.
          Event cover images that link to another website are loaded from that website.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the GDPR you have the right to:</p>
        <ul>
          <li><strong>access</strong> the personal data we hold about you and get a copy of it;</li>
          <li><strong>correct</strong> it; most of it you can edit yourself on your profile;</li>
          <li><strong>delete</strong> it; you can delete your account yourself;</li>
          <li><strong>restrict</strong> or <strong>object to</strong> how we use it, including processing based on legitimate interests;</li>
          <li><strong>receive it</strong> in a portable, machine-readable format.</li>
        </ul>
        <p>
          To use any of these rights, email <MailLink subject="Privacy request" /> from the address on your account,
          so we can confirm it's you. We'll reply within one month.
        </p>
        <p>
          You also have the right to complain to a data protection authority, in particular in the EU country where
          you live or work. Our lead authority: {LEGAL.governingCountry ? `the data protection authority of ${LEGAL.governingCountry}` : <Pending>supervisory authority</Pending>}.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        All connections use HTTPS. Passwords are hashed with Argon2. Chats and whiteboards are only available to the
        event's members. Repeated sign-in attempts are limited, and access to the database is restricted. No service
        can promise perfect security, but if we ever learn of a breach that puts your data at risk, we'll tell you and
        the authorities as the law requires.
      </p>
    ),
  },
  {
    id: "age",
    title: "Age",
    body: (
      <p>
        PeerPrep is for people aged {LEGAL.minimumAge} and over. If you believe someone younger has created an account,
        contact us and we'll delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change how we handle your data, we'll update this page and the date at the top. For significant changes,
        we'll tell you in the app or by email before they take effect.
      </p>
    ),
  },
]

export default function Privacy() {
  return (
    <LegalPage
      label="Privacy Policy"
      title={<>Privacy <span className="serif">Policy</span></>}
      intro="What PeerPrep collects, why, who can see it, and how to get it deleted, in plain language."
      summary={[
        "We collect what's needed to run PeerPrep: your email, a hashed password, and what you choose to add.",
        "Your email is never shown to anyone. Events and attendee names are public; chats and whiteboards are for members.",
        "No ads, no analytics, no tracking, no cookies. We never sell your data.",
        "You can delete your account and everything you created, at any time, from your profile.",
      ]}
      sections={sections}
    />
  )
}
