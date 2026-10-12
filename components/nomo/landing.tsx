import Link from "next/link";
import { XLogo } from "@phosphor-icons/react/dist/ssr";
import { LandingCoins } from "./landing-coins";
import "./landing.css";
import "./brand.css";

/* The landing in the brand's chrome mode: black ground, a holographic
   burst of lime -> cyan -> violet light behind the bull coin, glassy chat
   bubbles and a glowing PnL pill, like the X header. */
export default function NomoLanding() {
  return (
    <div className="nomo-landing">
      <div className="nl-background nl-holo" aria-hidden="true">
        <i className="nl-holo-rays" />
        <i className="nl-holo-bloom" />
        <i className="nl-holo-grid" />
      </div>
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
          <h1>
            <span className="nl-h1-chrome">don&apos;t trade</span>
            <br />
            <span className="nl-h1-pill">alone.</span>
          </h1>
          <p>The social trading app for memes.<br className="nl-mobile-break" /> See what your friends are aping and copy the moves that hit.</p>
          <div className="nl-hero-actions">
            <Link className="nl-cta" href="/discover/index">Start trading</Link>
            <Link className="nl-cta nl-cta-secondary" href="/pulse">Explore launches</Link>
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
