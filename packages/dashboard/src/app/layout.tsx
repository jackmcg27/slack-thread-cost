import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slack Thread Cost',
  description: 'Estimated staff-time cost of Slack conversations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <span className="nav__brand">Slack Thread Cost</span>
          <Link href="/">Overview</Link>
          <Link href="/threads">Threads</Link>
          <Link href="/channels">Channels</Link>
          <Link href="/people">People</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
