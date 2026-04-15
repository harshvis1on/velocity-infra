import { createClient } from '@/utils/supabase/server'
import { Outfit } from 'next/font/google'
import "./globals.css";
import GlobalNav from './components/GlobalNav';
import GlobalFooter from './components/GlobalFooter';

const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })

export const metadata = {
  title: "Velocity — The cheapest GPUs for AI",
  description: "Deploy A100s, H100s, and RTX 4090s at up to 80% off cloud pricing. Per-minute billing. No credit card required to start.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className={outfit.className}>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className="antialiased bg-[#0a0a0a] text-white selection:bg-primary/30">
        <GlobalNav userEmail={user?.email} />
        {children}
        <GlobalFooter />
      </body>
    </html>
  );
}
