import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mozopost — One Platform. Every Courier. Every Aggregator.',
  description: "India's Shipping Aggregator of Aggregators",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
