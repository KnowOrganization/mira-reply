export const metadata = { title: "Terms of Service — Mira" };

export default function Terms() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-sm leading-6">
      <h1 className="text-2xl font-medium tracking-tight mb-2">Terms of Service</h1>
      <p className="text-xs opacity-60 mb-6">Last updated: 2026-05-06</p>

      <h2 className="text-base font-medium mt-6 mb-2">Acceptance</h2>
      <p>
        By using Mira you agree to these terms. Mira is a personal-use, locally-run automation
        tool that helps Instagram account holders draft and send replies to comments and direct
        messages on their own connected account.
      </p>

      <h2 className="text-base font-medium mt-6 mb-2">Permitted use</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You connect only Instagram accounts you own or are authorized to manage.</li>
        <li>
          You are responsible for the content of replies sent through the tool. Drafts are
          assistive; final approval, where applicable, is yours.
        </li>
        <li>Use must comply with Instagram&apos;s Platform Policy and Community Guidelines.</li>
      </ul>

      <h2 className="text-base font-medium mt-6 mb-2">Prohibited use</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Spamming, harassment, or impersonation.</li>
        <li>Bulk-messaging accounts that have not opted in.</li>
        <li>Attempts to scrape, sell, or share data of other users.</li>
      </ul>

      <h2 className="text-base font-medium mt-6 mb-2">No warranty</h2>
      <p>
        Mira is provided as-is, without warranty of any kind. The author is not liable for
        actions taken by the user through the tool, including any account moderation by
        Instagram resulting from misuse.
      </p>

      <h2 className="text-base font-medium mt-6 mb-2">Termination</h2>
      <p>
        You may stop using the tool at any time by disconnecting the connected account and
        removing local data.
      </p>

      <h2 className="text-base font-medium mt-6 mb-2">Contact</h2>
      <p>danyalforg@gmail.com</p>
    </main>
  );
}
