import React from 'react';
import { Footer, Header } from './App.jsx';
import buildsLogo from '../res/404_builds_logo.png';
import founderPortrait from '../res/MrCodeGameAndAnime.jpg';

const mission = '404 Builds is where failure meets creation. A digital foundry for the imperfect and the impossible. We turn ideas, edge cases, and “what ifs” into real products, experiences, and tools.';

export default function AboutPage() {
  return (
    <div id="top" className="site-shell about-shell">
      <Header page="about" />
      <main className="about-main">
        <section className="about-banner" aria-label="404 Builds banner">
          <img src={buildsLogo} alt="404 Builds logo" />
        </section>

        <section className="about-story shell" aria-label="About 404 Builds and its founder">
          <div className="about-mission">
            <div className="about-kicker" aria-hidden="true">// OUR MISSION</div>
            <h1 id="about-heading">About 404 Builds</h1>
            <p>{mission}</p>
          </div>

          <section className="founder-spotlight" aria-labelledby="founder-heading">
            <div className="about-kicker">// FOUNDER</div>
            <a
              className="founder-portrait-link"
              href="https://github.com/MrCodeGameAndAnime"
              target="_blank"
              rel="noreferrer"
              aria-label="View MrCodeGameAndAnime on GitHub"
            >
              <span className="founder-chevron" aria-hidden="true">&gt;</span>
              <span className="founder-portrait-frame">
                <img src={founderPortrait} alt="MrCodeGameAndAnime" />
              </span>
            </a>
            <h2 id="founder-heading">MrCodeGameAndAnime</h2>
            <p>Founder / Builder</p>
          </section>
        </section>
      </main>
      <Footer page="about" />
    </div>
  );
}
