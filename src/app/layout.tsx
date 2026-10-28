import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Meeting Room Booking System',
  description: 'ระบบจองห้องประชุมแบบเรียลไทม์พร้อมซิงก์ Google Sheets & Google Drive',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
