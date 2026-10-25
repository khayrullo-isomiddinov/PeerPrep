import { Link } from "react-router-dom"
import LegalPage, { ExternalLink, MailLink, Pending } from "../features/legal/LegalPage"
import { LEGAL } from "../features/legal/legalInfo"

const sections = [
  {
    id: "agreement",
    title: "About these terms",
    body: (
      <>
        <p>
          These terms are the agreement between you and <strong>{LEGAL.operator}</strong>, who runs PeerPrep (“we”,
          “us”). By creating an account or using PeerPrep you agree to them. If you don't agree, please don't use
          PeerPrep.
        </p>
        <p>
          How we handle personal data is explained in the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "service",
    title: "What PeerPrep is",
    body: (
      <>
        <p>
          PeerPrep lets students find and organise study sessions, in person or online, chat with the people attending
          and work together on a shared whiteboard. It is free to use.
        </p>
        <p>
          PeerPrep is a small, independently run project. We work to keep it available and reliable, but we can't
          promise it will always be online, fast or free of errors, and we may change, pause or stop features at any
          time. Where a change significantly affects you, we'll try to tell you in advance.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least {LEGAL.minimumAge} years old to create an account.</li>
        <li>Give a real email address that you control. One account per person.</li>
        <li>Keep your password to yourself. You're responsible for what happens under your account; tell us straight away if you think someone else has access to it.</li>
        <li>You can delete your account at any time from your <Link to="/profile">profile</Link>.</li>
      </ul>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <>
        <p>
          Events, messages, drawings, profile details and files you add (“your content”) remain yours. So that we can
          run PeerPrep, you give us a non-exclusive, worldwide, royalty-free permission to store, copy, display and
          transmit your content, only as needed to provide the service to you and the people you share it with. This
          permission ends when your content is deleted, apart from short-lived backups.
        </p>
        <p>
          You are responsible for your content. Only upload study materials and images you have the right to share:
          your own notes, openly licensed material, or material whose owner allows it. Don't upload copyrighted
          textbooks, paid course material or exam papers you're not allowed to distribute.
        </p>
      </>
    ),
  },
  {
    id: "rules",
    title: "Rules for using PeerPrep",
    body: (
      <>
        <p>When using PeerPrep, don't:</p>
        <ul>
          <li>harass, threaten, bully or discriminate against anyone, or post hateful, sexual or violent content;</li>
          <li>post anything illegal, or share other people's personal information without their permission;</li>
          <li>pretend to be someone else, or create events that are misleading or not really study sessions;</li>
          <li>send spam, advertising or chain messages, or create accounts automatically;</li>
          <li>help anyone cheat: for example, by sharing answers during an exam or leaking assessment material you were told to keep confidential;</li>
          <li>upload malware, or try to break, overload, probe or get around the security or limits of PeerPrep;</li>
          <li>collect data about other users, for example by scraping.</li>
        </ul>
        <p>
          Found a security issue? Please report it privately to <MailLink subject="Security report" /> rather than
          publicly, and don't access other people's data while testing.
        </p>
      </>
    ),
  },
  {
    id: "meeting",
    title: "Meeting in person",
    body: (
      <p>
        Many sessions take place in real locations with people you haven't met. We don't check users' identities or
        vet events. Use your judgement: prefer public places like libraries, tell someone where you're going, and
        leave if you feel uncomfortable. Organisers are responsible for the sessions they create. If someone behaves
        inappropriately, <Link to="/contact">report it to us</Link>.
      </p>
    ),
  },
  {
    id: "ai",
    title: "AI helpers",
    body: (
      <p>
        The AI writing and cover-image helpers are optional. Their output can be inaccurate or unsuitable, so review it
        before you use it; once you publish it, it's your content. Don't enter personal or confidential information in
        them. What you send to the helpers is processed by OpenAI, as described in the{" "}
        <Link to="/privacy#collect">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "moderation",
    title: "Moderation and ending your access",
    body: (
      <>
        <p>
          We may remove content, or suspend or close an account, if it breaks these terms or the law, or puts other
          users at risk. Where reasonable, we'll tell you why and give you a chance to respond.
        </p>
        <p>You can stop using PeerPrep and delete your account whenever you like.</p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Our name and code",
    body: (
      <p>
        The PeerPrep name, logo and design belong to {LEGAL.operator}. The source code is publicly available on{" "}
        <ExternalLink href={LEGAL.repoUrl}>GitHub</ExternalLink>; any rights to reuse it are only those granted in that
        repository.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Disclaimers and liability",
    body: (
      <>
        <p>
          PeerPrep is provided free of charge and “as is”. We're not responsible for what users post, for the accuracy
          of study materials or AI output, or for what happens at sessions organised by users.
        </p>
        <p>
          To the extent the law allows, we aren't liable for indirect or consequential losses, or for losses caused by
          events outside our reasonable control. Nothing in these terms limits liability that can't legally be limited,
          such as for death or personal injury caused by negligence, for fraud, or your statutory rights as a consumer.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms as PeerPrep changes. We'll update the date at the top and, for significant changes,
        tell you in the app or by email before they take effect. If you keep using PeerPrep afterwards, the new terms
        apply; if you don't agree, you can delete your account.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of {LEGAL.governingCountry ?? <Pending>country</Pending>}. If you live in
        the EU, you also keep the protection of the mandatory consumer laws of your country, and can bring claims in
        your local courts.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these terms: <MailLink subject="Question about the terms" />. More ways to reach us are on the{" "}
        <Link to="/contact">contact page</Link>.
      </p>
    ),
  },
]

export default function Terms() {
  return (
    <LegalPage
      label="Terms & Conditions"
      title={<>Terms &amp; <span className="serif">Conditions</span></>}
      intro="The rules for using PeerPrep, written to be read, not skimmed past."
      summary={[
        `PeerPrep is free. You need to be ${LEGAL.minimumAge} or older and use your own email address.`,
        "What you post stays yours. Only share study materials you're allowed to share.",
        "Be kind, don't cheat, don't spam, don't try to break things.",
        "Meeting strangers in person? Choose public places. We don't vet users or events.",
      ]}
      sections={sections}
    />
  )
}
