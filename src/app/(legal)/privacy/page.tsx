export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: 29 September 2026. StudyPilot is in private beta. This policy explains what we collect, why, and your choices. We follow the Australian Privacy Principles in the Privacy Act 1988 (Cth).</p>
      <h2>Who this is for</h2>
      <p>Most StudyPilot users are high-school students, many under 18. We collect as little as we can and never sell personal information or show advertising.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: email address, password (stored hashed by our auth provider) or Google/Apple sign-in.</li>
        <li>Profile: username, avatar colour, year level, country, education system, subjects and goal.</li>
        <li>Study activity: lessons, practice papers and answers, flashcards, notes, planner items, XP and streaks.</li>
        <li>Evidence you upload to verify study sessions (photos, screenshots or documents). These are private to you; our team only looks at them to review suspected cheating.</li>
        <li>Messages you send to Pip, our AI tutor, and feedback reports.</li>
        <li>Security records: login times, method, device type and IP address.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run StudyPilot: teach lessons, mark papers, plan your study and track progress.</li>
        <li>To generate AI content. Your questions and answers are sent to our AI provider (Anthropic) to produce responses. They are not used to train AI models.</li>
        <li>To keep accounts secure and prevent cheating on leaderboards.</li>
        <li>To improve the beta, using feedback and aggregated usage statistics.</li>
      </ul>
      <h2>What other students see</h2>
      <p>Only your username, avatar, level, badges and streak, and only if your privacy settings allow it. Other students never see your email address. You can hide yourself from leaderboards in Settings → Privacy.</p>
      <h2>Where it is stored</h2>
      <p>Data is stored with Supabase (database, authentication and file storage) and our app is hosted on Vercel. Some providers may store data outside Australia; we require them to protect it to a standard comparable to the Australian Privacy Principles.</p>
      <h2>Your choices</h2>
      <ul>
        <li>Update your profile and privacy settings at any time.</li>
        <li>Turn notification categories and channels on or off.</li>
        <li>Delete your account in Settings → Account. This permanently removes your account and study data.</li>
        <li>Ask for a copy or correction of your information by contacting us.</li>
      </ul>
      <h2>Parents and guardians</h2>
      <p>If you are a parent or guardian and have questions about your child&apos;s account, or want it removed, contact us and we will help.</p>
      <h2>Contact</h2>
      <p>Email ardennescorporate@gmail.com. If you are not satisfied with our response, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).</p>
    </>
  );
}
