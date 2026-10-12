import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import "./globals.css";

/* Republica Minor ships one weight (400). Asking it for more gets a
   synthetic bold that smears the joins the face was drawn to keep open,
   so the rule that uses it asks for 400 and nothing else. */
const Republica = localFont({
  src: "./fonts/republica-minor.otf",
  variable: "--font-republica",
  display: "swap",
  weight: "400",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/* nomo brand faces. Fredoka is the display face (headlines, the hero,
   page titles): chunky and rounded, the same letters as the brand's
   chrome artwork. Nunito is the UI face, rounded to sit beside it. Both
   are variable, so every weight the terminal asks for is a real one. */
const Fredoka = localFont({
  src: "./fonts/fredoka-variable.woff2",
  variable: "--font-fredoka",
  display: "swap",
  weight: "300 700",
  fallback: ["ui-rounded", "system-ui", "sans-serif"],
});
const Nunito = localFont({
  src: "./fonts/nunito-variable.woff2",
  variable: "--font-nunito",
  display: "swap",
  weight: "200 1000",
  fallback: ["ui-rounded", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Nomo — Find your next move",
    template: "%s · Nomo",
  },
  description:
    "Discover markets, explore NEAR pairs, and find your next move with Nomo.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    /* suppressHydrationWarning is scoped to <html> only: the script below
       writes data-chain before React hydrates, so server markup and the
       client DOM disagree on that one attribute by design. */
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${Republica.variable} ${Fredoka.variable} ${Nunito.variable}`}
    >
      <head>
        {/* Blocking, in the head, because the network decides the accent.
            Set from an effect instead, every load would paint a frame of
            the Solana green before flipping to the Robinhood neon. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem("ansem.chain");document.documentElement.dataset.chain=c==="2"?"2":"1"}catch(e){document.documentElement.dataset.chain="1"}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
