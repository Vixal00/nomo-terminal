import Link from "next/link";
import { XLogo } from "@phosphor-icons/react/dist/ssr";
import { LandingBackground } from "./landing-background";
import { LandingCoins } from "./landing-coins";
import "./landing.css";

export default function NomoLanding() {
  return (
    <div className="nomo-landing">
      <LandingBackground />
      <header className="nl-header">
        <Link className="nl-logo" href="/" aria-label="Nomo home">
          <img src="/nomo/nomo-logo.svg" alt="Nomo" width={130} height={25} />
        </Link>
        <div className="nl-header-actions">
          <a className="nl-x-link" href="https://x.com/nomotrading" target="_blank" rel="noopener noreferrer" aria-label="Nomo on X"><XLogo size={18}/></a>
          <Link className="nl-header-cta" href="/discover/index">Start trading</Link>
        </div>
      </header>

      <main className="nl-hero">
        <div className="nl-copy">
          <h1>Find your<br />next move.</h1>
          <p>A world of tokens.<br className="nl-mobile-break" /> A place to make it yours.</p>
          <div className="nl-hero-actions">
            <Link className="nl-cta" href="/discover/index">Start trading</Link>
            <Link className="nl-cta nl-cta-secondary" href="/discover/index">Explore launches</Link>
          </div>
        </div>

        <LandingCoins />
      </main>

      <footer className="nl-footer">
        <span>nomo.trading</span>
        <span>All rights reserved.</span>
      </footer>
    </div>
  );
}
