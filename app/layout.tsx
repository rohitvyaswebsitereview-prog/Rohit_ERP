import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: "Rohit's ERP",
  description: 'Business operations, finance and export management.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
