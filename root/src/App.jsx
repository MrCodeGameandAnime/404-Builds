import React from 'react';

/**
 * @typedef {{ name: string, description: string, tags: string[], visual: 'heads-up' | 'wac' | 'dungeon', href: string }} Project
 * @typedef {{ title: string, description: string, icon: 'brain' | 'palette' | 'chip' }} Category
 * @typedef {{ label: string, href: string }} NavigationItem
 * @typedef {{ label: string, href: string, mark: string }} SocialLink
 */

/** @type {Project[]} */
const projects = [
  {
    name: 'HeadsUp',
    description: 'A configurable Avalonia Windows HUD for GitHub repo/branch status, Actions jobs, and exact-SHA CI results.',
    tags: ['Desktop'],
    visual: 'heads-up',
    href: 'https://apps.microsoft.com/detail/9nmls5ft4zrw?hl=en-US&gl=US',
  },
  {
    name: 'WAC',
    description: 'A native WinUI 3 app that turns PNG/JPEG files into a complete Microsoft Store/MSIX asset set.',
    tags: ['Desktop'],
    visual: 'wac',
    href: 'https://github.com/MrCodeGameandAnime/Windows-Asset-Creator',
  },
  {
    name: 'Dungeon Drifters',
    description: 'A character-driven fantasy RPG in Ketlyv. Choose one of four Drifters and master their combat styles.',
    tags: ['Web', 'Terminal'],
    visual: 'dungeon',
    href: 'https://mrcodegameandanime.github.io/Dungeon-Drifters/',
  },
];

/** @type {Category[]} */
const categories = [
  {
    title: 'AI / Code',
    description: 'Tools, automations, and experiments with AI and modern development.',
    icon: 'brain',
  },
  {
    title: 'Design & Merch',
    description: 'Original designs, digital goods, and 404 Builds merchandise.',
    icon: 'palette',
  },
  {
    title: 'Hardware / Experiments',
    description: 'Physical builds, electronics, and unconventional ideas.',
    icon: 'chip',
  },
];

/** @type {NavigationItem[]} */
const navigation = [
  { label: 'Projects', href: '#projects' },
  { label: 'Experiments', href: '#experiments' },
  { label: 'Studio', href: '#studio' },
  { label: 'About', href: '#about' },
];

/** @type {SocialLink[]} */
const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/MrCodeGameandAnime', mark: 'GH' },
  { label: 'Threads', href: 'https://www.threads.com/@404.builds.dev', mark: 'TH' },
  { label: 'X', href: 'https://x.com/404buildsdev', mark: 'X' },
  { label: 'Instagram', href: 'https://www.instagram.com/404.builds.dev/', mark: 'IG' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61594536011286', mark: 'FB' },
  { label: 'Discord', href: 'https://discord.gg/NZnTcZtEQ', mark: 'DS' },
];

function Arrow({ direction = '↗' }) {
  return <span aria-hidden="true">{direction}</span>;
}

function Header() {
  return (
    <header className="site-header">
      <div className="shell nav-shell">
        <a className="brand" href="#top" aria-label="404 Builds home">
          <span className="brand-number">404</span>
          <span className="brand-word">BUILDS</span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item.label} href={item.href}>{item.label}</a>
          ))}
        </nav>
        <a className="nav-cta" href="#studio">
          <span>Start here</span>
          <Arrow />
        </a>
      </div>
    </header>
  );
}

function HeroEmblem() {
  return (
    <div className="hero-art" role="img" aria-label="Glowing 404 emblem built from geometric shards">
      <div className="emblem-orbit emblem-orbit-one" />
      <div className="emblem-orbit emblem-orbit-two" />
      <div className="emblem-beam beam-one" />
      <div className="emblem-beam beam-two" />
      <div className="emblem-shard shard-one" />
      <div className="emblem-shard shard-two" />
      <div className="emblem-shard shard-three" />
      <div className="emblem-shard shard-four" />
      <div className="emblem-core">
        <div className="emblem-core-grid" />
        <div className="emblem-mark" data-testid="hero-emblem">
          <span>404</span>
          <small>BUILDS</small>
        </div>
      </div>
      <div className="emblem-spark spark-one" />
      <div className="emblem-spark spark-two" />
      <div className="emblem-spark spark-three" />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero shell" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" />Independent studio</div>
        <h1 id="hero-heading">We build <span className="hero-highlight">what&apos;s missing</span></h1>
        <p className="hero-lede">Independent software, games, and experiments built from scratch.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#projects">View builds <Arrow direction="→" /></a>
          <a className="button button-ghost" href="https://github.com/MrCodeGameandAnime" target="_blank" rel="noreferrer">GitHub <span className="github-mark" aria-hidden="true">●</span></a>
        </div>
      </div>
      <HeroEmblem />
    </section>
  );
}

/** @param {{ project: Project }} props */
function ProjectVisual({ project }) {
  return (
    <div className={`project-art ${project.visual}`} aria-hidden="true">
      {project.visual === 'heads-up' && (
        <>
          <div className="chat-bubble"><span /><span /><span /></div>
          <div className="art-scanline" />
        </>
      )}
      {project.visual === 'wac' && (
        <>
          <div className="phone phone-back" />
          <div className="phone phone-front"><span className="phone-logo">◒</span><i /><i /><i /></div>
        </>
      )}
      {project.visual === 'dungeon' && (
        <>
          <div className="dungeon-wall wall-back" />
          <div className="dungeon-floor" />
          <div className="dungeon-fire"><i /><i /><i /></div>
          <div className="dungeon-player" />
        </>
      )}
    </div>
  );
}

/** @param {{ project: Project }} props */
function BuildCard({ project }) {
  return (
    <article className="build-card">
      <ProjectVisual project={project} />
      <div className="card-body">
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        <div className="tag-list">
          {project.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="card-footer">
          <a className="card-link" href={project.href} target="_blank" rel="noreferrer">View project <Arrow direction="→" /></a>
          <a className="card-open" href={project.href} target="_blank" rel="noreferrer" aria-label={`${project.name} details`}><Arrow /></a>
        </div>
      </div>
    </article>
  );
}

function BuildGrid() {
  return (
    <section className="section shell" id="projects" aria-labelledby="projects-heading">
      <div className="section-heading">
        <div>
          <div className="section-kicker">// 01</div>
          <h2 id="projects-heading">Selected <span>builds</span></h2>
        </div>
        <p className="section-note">Real projects <b>·</b> real ideas.</p>
      </div>
      <div className="build-grid">
        {projects.map((project) => <BuildCard key={project.name} project={project} />)}
      </div>
    </section>
  );
}

function Philosophy() {
  return (
    <section className="philosophy section shell" id="about" aria-labelledby="philosophy-heading">
      <div className="glitch-panel" aria-hidden="true">
        <div className="glitch-photo" />
        <div className="glitch-block block-one" />
        <div className="glitch-block block-two" />
        <div className="glitch-block block-three" />
        <div className="glitch-frame" />
      </div>
      <div className="philosophy-copy">
        <div className="section-kicker">// 02 <span>Our philosophy</span></div>
        <h2 id="philosophy-heading">Error is the <span>blueprint</span></h2>
        <p>404 Builds is where failure meets creation — a digital foundry for the imperfect and the impossible. We turn ideas, edge cases, and “what ifs” into real products, experiences, and tools.</p>
      </div>
    </section>
  );
}

/** @param {{ type: Category['icon'] }} props */
function CategoryIcon({ type }) {
  return <span className={`category-icon icon-${type}`} aria-hidden="true"><i /><i /><i /></span>;
}

function ExploreGrid() {
  return (
    <section className="section shell" id="experiments" aria-labelledby="explore-heading">
      <div className="section-heading explore-heading">
        <div>
          <div className="section-kicker">// 03 <span>Explore what we build</span></div>
          <h2 id="explore-heading">Built for the <span>unknown</span></h2>
        </div>
      </div>
      <div className="explore-grid">
        {categories.map((category) => (
          <a className="explore-card" href="#studio" key={category.title}>
            <CategoryIcon type={category.icon} />
            <div>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
            </div>
            <Arrow direction="→" />
          </a>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="studio">
      <div className="shell footer-shell">
        <div className="footer-brand">
          <a className="brand" href="#top" aria-label="404 Builds home">
            <span className="brand-number">404</span>
            <span className="brand-word">BUILDS</span>
          </a>
          <span>We build what&apos;s missing.</span>
        </div>
        <div className="footer-nav">
          {navigation.map((item) => <a key={item.label} href={item.href} aria-label={`${item.label} footer link`}>{item.label}</a>)}
        </div>
        <div className="footer-meta">
          <div className="socials" aria-label="Social links">
            {socialLinks.map(({ label, href, mark }) => (
              <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer">{mark}</a>
            ))}
          </div>
          <span>© 404 BUILDS 2025</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div id="top" className="site-shell">
      <div className="site-grid" aria-hidden="true" />
      <Header />
      <main>
        <Hero />
        <BuildGrid />
        <Philosophy />
        <ExploreGrid />
      </main>
      <Footer />
    </div>
  );
}
