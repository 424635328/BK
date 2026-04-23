import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'BidKing | Immersive Protocol',
  description: 'Distributed Client-As-Host Protocol | No-DB Architecture',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-[#050505] text-[#e0e0e0] font-sans antialiased relative min-h-screen overflow-x-hidden select-none">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-orange-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]"></div>
        </div>
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
