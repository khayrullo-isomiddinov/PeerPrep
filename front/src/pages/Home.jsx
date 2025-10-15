import { Link } from "react-router-dom"

export default function Home() {
  return (
    <div className="min-h-screen tap-safe premium-scrollbar flex flex-col home-light route-transition">

      {/* Hero */}
      <section className="home-hero premium-fade-in">
        <div className="home-hero-bg" />
        <div className="home-hero-inner reveal-up">
          <h1 className="home-hero-title">
            <span>Pick up your</span>
            <span className="accent">wonderful plans</span>
          </h1>
        </div>
        <div className="search-wrap reveal-up" style={{animationDelay:'.06s'}}>
          <div className="home-search premium-scale-in">
            <div className="field">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#ec4899" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <input placeholder="Find the event you're interested in"/>
            </div>
            <div className="divider" />
            <div className="field">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#ec4899" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
              <input placeholder="New York, NY"/>
            </div>
            <button className="btn-pink square">Search</button>
          </div>
        </div>
      </section>

      {/* New events */}
      <section className="home-section">
        <div className="home-section-inner reveal-up" style={{animationDelay:'.12s'}}>
          <div className="home-section-head">
            <h2 className="home-title">New events in <span className="accent">NYC</span></h2>
            <button className="btn-ghost-pink pill">View more</button>
          </div>

          <div className="home-card-grid">
            <article className="event-card">
              <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop" alt="Urban Marathon"/>
              <div className="event-meta">
                <h3>Urban Marathon</h3>
                <div className="row"><span className="muted">Monday, June 06 | 06:00 AM</span><span className="price">From $20</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>

            <article className="event-card">
              <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop" alt="Melody Mania"/>
              <div className="event-meta">
                <h3>Melody Mania</h3>
                <div className="row"><span className="muted">Wednesday, June 24 | 07:00 PM</span><span className="free">Free ticket</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>

            <article className="event-card">
              <img src="https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?q=80&w=1600&auto=format&fit=crop" alt="Rockin' the Stage"/>
              <div className="event-meta">
                <h3>"Rockin' the Stage"</h3>
                <div className="row"><span className="muted">Monday, March 14 | 04:00 PM</span><span className="price">From $120</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Upcoming in 24h */}
      <section className="home-section">
        <div className="home-section-inner reveal-up">
          <div className="home-section-head">
            <h2 className="home-title">Upcoming <span className="accent">in 24h</span></h2>
            <button className="btn-ghost-pink pill">View more</button>
          </div>
          <div className="upcoming-grid">
            <article className="upcoming-card">
              <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop" alt="Musical Fusion Festival" />
              <div className="event-meta">
                <h3>Musical Fusion Festival</h3>
                <div className="row"><span className="muted">Monday, June 06 | 06:00 AM</span><span className="price">From $100</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>
            <article className="upcoming-card">
              <img src="https://images.unsplash.com/photo-1520975616617-9f8a1fef7c88?q=80&w=1600&auto=format&fit=crop" alt="Business in the United States" />
              <div className="event-meta">
                <h3>Business in the United States</h3>
                <div className="row"><span className="muted">Tuesday, June 07 | 06:00 AM</span><span className="price">From $50</span></div>
                <div className="row muted">Atlanta</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Highlights this week */}
      <section className="home-section">
        <div className="home-section-inner reveal-up">
          <div className="home-section-head">
            <h2 className="home-title">Highlights <span className="accent">this week</span></h2>
            <button className="btn-ghost-pink pill">View more</button>
          </div>
          <div className="highlight-banner" role="region" aria-label="Highlights">
            <img className="highlight-img" src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2000&auto=format&fit=crop" alt="An Oil Painting Odyssey" />
            <div className="highlight-gradient" />
            <div className="highlight-card">
              <div className="badge">From $8</div>
              <h3 className="highlight-title">Brushstrokes & Beyond: An Oil Painting Odyssey</h3>
              <div className="muted text-sm">Tuesday, June 7 | 06:00 PM</div>
              <div className="muted text-sm">2678 Forest Ave, San Jose, CA</div>
              <div className="mt-3">
                <a className="btn-pink square" href="#">Purchase Ticket</a>
              </div>
            </div>
            <button className="highlight-nav prev" aria-label="Previous">‹</button>
            <button className="highlight-nav next" aria-label="Next">›</button>
          </div>
        </div>
      </section>

      {/* More events */}
      <section className="home-section">
        <div className="home-section-inner reveal-up">
          <div className="home-section-head">
            <h2 className="home-title">More events</h2>
            <button className="btn-ghost-pink pill">View more</button>
          </div>
          <div className="home-card-grid">
            <article className="event-card">
              <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop" alt="Marathon"/>
              <div className="event-meta">
                <h3>Marathon</h3>
                <div className="row"><span className="muted">Monday, June 06 | 06:00 AM</span><span className="price">From $10</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>
            <article className="event-card">
              <img src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1600&auto=format&fit=crop" alt="Rock Festival"/>
              <div className="event-meta">
                <h3>Rock Festival</h3>
                <div className="row"><span className="muted">Monday, March 14 | 04:00 PM</span><span className="price">From $100</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>
            <article className="event-card">
              <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop" alt="Harmony of Melodies Concert"/>
              <div className="event-meta">
                <h3>Harmony of Melodies Concert</h3>
                <div className="row"><span className="muted">Wednesday, June 24 | 07:00 PM</span><span className="free">Free ticket</span></div>
                <div className="row muted">New York, NY</div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  )
}
