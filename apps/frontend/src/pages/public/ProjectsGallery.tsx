export default function ProjectsGallery() {
  return (
    <div className="public-page">
      {/* Projects Header */}
      <section className="public-page-hero">
        <div className="public-container">
          <div className="public-page-hero__content">
            <h1 className="public-page-hero__title">Project Gallery</h1>
            <p className="public-page-hero__subtitle">
              Discover inspiring initiatives creating positive change across Australia. 
              From grassroots movements to large-scale programs, find projects that align with your values.
            </p>
          </div>
        </div>
      </section>

      {/* Project Filters */}
      <section className="public-project-filters">
        <div className="public-container">
          <div className="public-filters-bar">
            <div className="public-filters-group">
              <label className="public-filter-label">Category:</label>
              <select className="public-filter-select">
                <option>All Categories</option>
                <option>Environment</option>
                <option>Education</option>
                <option>Housing</option>
                <option>Health & Wellbeing</option>
                <option>Arts & Culture</option>
                <option>Social Justice</option>
              </select>
            </div>
            <div className="public-filters-group">
              <label className="public-filter-label">Location:</label>
              <select className="public-filter-select">
                <option>All Locations</option>
                <option>Queensland</option>
                <option>New South Wales</option>
                <option>Victoria</option>
                <option>South Australia</option>
                <option>Western Australia</option>
                <option>Tasmania</option>
                <option>Northern Territory</option>
                <option>ACT</option>
              </select>
            </div>
            <div className="public-filters-group">
              <label className="public-filter-label">Status:</label>
              <select className="public-filter-select">
                <option>All Status</option>
                <option>Active</option>
                <option>Seeking Volunteers</option>
                <option>Recently Completed</option>
              </select>
            </div>
            <div className="public-filters-group">
              <input type="search" className="public-search-input" placeholder="Search projects..." />
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="public-projects-gallery">
        <div className="public-container">
          <div className="public-projects-grid">
            {/* Project 1 */}
            <article className="public-project-card public-project-card--featured">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">🌱 Community Gardens</div>
                <div className="public-project-card__status">Active</div>
                <div className="public-project-card__category">Environment</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Brisbane Community Gardens Network
                </h3>
                <p className="public-project-card__excerpt">
                  Building sustainable food systems through community-led urban agriculture. 
                  Our network of 12 gardens now provides fresh produce to over 200 families 
                  while fostering neighborhood connections.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Brisbane, QLD</span>
                  <span className="public-project-card__members">👥 45 members</span>
                  <span className="public-project-card__impact">🥕 2.4T produce grown</span>
                </div>
                <div className="public-project-card__tags">
                  <span className="public-project-tag">Urban Agriculture</span>
                  <span className="public-project-tag">Food Security</span>
                  <span className="public-project-tag">Community Building</span>
                </div>
                <a href="/public/projects/1" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            {/* Project 2 */}
            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">📚 Digital Learning</div>
                <div className="public-project-card__status">Seeking Volunteers</div>
                <div className="public-project-card__category">Education</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Digital Literacy for Seniors
                </h3>
                <p className="public-project-card__excerpt">
                  Empowering older Australians with essential digital skills. Our volunteer 
                  tutors provide one-on-one support to help seniors stay connected and 
                  access online services.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Sydney, NSW</span>
                  <span className="public-project-card__members">👥 28 members</span>
                  <span className="public-project-card__impact">👨‍💻 500+ trained</span>
                </div>
                <div className="public-project-card__tags">
                  <span className="public-project-tag">Digital Inclusion</span>
                  <span className="public-project-tag">Senior Support</span>
                </div>
                <a href="/public/projects/2" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            {/* Project 3 */}
            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">🏠 Housing Advocacy</div>
                <div className="public-project-card__status">Active</div>
                <div className="public-project-card__category">Housing</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Affordable Housing Melbourne
                </h3>
                <p className="public-project-card__excerpt">
                  Advocating for affordable housing solutions through community organizing, 
                  policy research, and direct support for those facing housing stress.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Melbourne, VIC</span>
                  <span className="public-project-card__members">👥 67 members</span>
                  <span className="public-project-card__impact">🏠 150 homes secured</span>
                </div>
                <div className="public-project-card__tags">
                  <span className="public-project-tag">Housing Justice</span>
                  <span className="public-project-tag">Policy Advocacy</span>
                </div>
                <a href="/public/projects/3" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            {/* Project 4 */}
            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">🎨 Arts Program</div>
                <div className="public-project-card__status">Active</div>
                <div className="public-project-card__category">Arts & Culture</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Youth Arts Collective Perth
                </h3>
                <p className="public-project-card__excerpt">
                  Providing creative opportunities for young people through workshops, 
                  mentorship, and community art projects that celebrate diversity and self-expression.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Perth, WA</span>
                  <span className="public-project-card__members">👥 34 members</span>
                  <span className="public-project-card__impact">🎭 12 shows produced</span>
                </div>
                <div className="public-project-card__tags">
                  <span className="public-project-tag">Youth Development</span>
                  <span className="public-project-tag">Creative Arts</span>
                </div>
                <a href="/public/projects/4" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            {/* Project 5 */}
            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">💚 Mental Health</div>
                <div className="public-project-card__status">Recently Completed</div>
                <div className="public-project-card__category">Health & Wellbeing</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Rural Mental Health Initiative
                </h3>
                <p className="public-project-card__excerpt">
                  Addressing mental health challenges in rural communities through peer support 
                  networks, telehealth connections, and stigma reduction campaigns.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Regional QLD</span>
                  <span className="public-project-card__members">👥 23 members</span>
                  <span className="public-project-card__impact">💙 800+ supported</span>
                </div>
                <div className="public-project-card__tags">
                  <span className="public-project-tag">Mental Health</span>
                  <span className="public-project-tag">Rural Support</span>
                </div>
                <a href="/public/projects/5" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            {/* Project 6 */}
            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">⚖️ Justice Reform</div>
                <div className="public-project-card__status">Seeking Volunteers</div>
                <div className="public-project-card__category">Social Justice</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Criminal Justice Reform SA
                </h3>
                <p className="public-project-card__excerpt">
                  Working toward a more equitable justice system through research, advocacy, 
                  and support for those impacted by incarceration and the court system.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Adelaide, SA</span>
                  <span className="public-project-card__members">👥 19 members</span>
                  <span className="public-project-card__impact">📋 3 policies changed</span>
                </div>
                <div className="public-project-card__tags">
                  <span className="public-project-tag">Justice Reform</span>
                  <span className="public-project-tag">Policy Change</span>
                </div>
                <a href="/public/projects/6" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>
          </div>

          {/* Load More */}
          <div className="public-gallery-actions">
            <button className="public-btn public-btn--outline">
              Load More Projects
            </button>
            <p className="public-gallery-info">
              Showing 6 of 24 active projects
            </p>
          </div>
        </div>
      </section>

      {/* Start Project CTA */}
      <section className="public-start-project-cta">
        <div className="public-container">
          <div className="public-cta-banner">
            <div className="public-cta-banner__content">
              <h2 className="public-cta-banner__title">
                Have a Project Idea?
              </h2>
              <p className="public-cta-banner__description">
                Every great movement starts with a single idea. Share your vision 
                and connect with others who want to make it happen.
              </p>
            </div>
            <div className="public-cta-banner__actions">
              <a href="/public/contact" className="public-btn public-btn--primary">
                Start a Project
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}