export default function PublicOverview() {
  return (
    <div className="public-page">
      {/* Hero Section */}
      <section className="public-hero">
        <div className="public-hero__content">
          <h1 className="public-hero__title">
            Empowering Communities Through
            <span className="public-hero__accent"> Collaborative Action</span>
          </h1>
          <p className="public-hero__subtitle">
            The ACT Platform connects passionate individuals, innovative projects, 
            and transformative opportunities across Australia to create lasting social impact.
          </p>
          <div className="public-hero__actions">
            <a href="#projects" className="public-btn public-btn--primary">
              Explore Projects
            </a>
            <a href="/public/community" className="public-btn public-btn--outline">
              Join Community
            </a>
          </div>
        </div>
        <div className="public-hero__visual">
          <div className="public-hero__image">
            <div className="public-placeholder-image">
              🌅 Hero Image
            </div>
          </div>
        </div>
      </section>

      {/* Impact Statistics */}
      <section className="public-impact">
        <div className="public-container">
          <div className="public-impact__grid">
            <div className="public-impact__stat">
              <div className="public-impact__number">1,200+</div>
              <div className="public-impact__label">Community Members</div>
            </div>
            <div className="public-impact__stat">
              <div className="public-impact__number">85</div>
              <div className="public-impact__label">Active Projects</div>
            </div>
            <div className="public-impact__stat">
              <div className="public-impact__number">12</div>
              <div className="public-impact__label">States & Territories</div>
            </div>
            <div className="public-impact__stat">
              <div className="public-impact__number">$2.4M</div>
              <div className="public-impact__label">Funding Raised</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="public-featured" id="projects">
        <div className="public-container">
          <div className="public-section-header">
            <h2 className="public-section-title">Featured Projects</h2>
            <p className="public-section-subtitle">
              Discover inspiring initiatives making a difference across Australia
            </p>
          </div>

          <div className="public-projects-grid">
            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">🌱 Project Image</div>
                <div className="public-project-card__category">Environment</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Community Gardens Initiative
                </h3>
                <p className="public-project-card__excerpt">
                  Creating sustainable urban food systems through community-led garden projects 
                  across Brisbane neighbourhoods.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Brisbane, QLD</span>
                  <span className="public-project-card__members">👥 24 members</span>
                </div>
                <a href="/public/projects/1" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">📚 Project Image</div>
                <div className="public-project-card__category">Education</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Digital Literacy Workshops
                </h3>
                <p className="public-project-card__excerpt">
                  Bridging the digital divide by providing technology training 
                  for seniors and underserved communities.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Sydney, NSW</span>
                  <span className="public-project-card__members">👥 18 members</span>
                </div>
                <a href="/public/projects/2" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>

            <article className="public-project-card">
              <div className="public-project-card__image">
                <div className="public-placeholder-image">🏠 Project Image</div>
                <div className="public-project-card__category">Housing</div>
              </div>
              <div className="public-project-card__content">
                <h3 className="public-project-card__title">
                  Affordable Housing Advocacy
                </h3>
                <p className="public-project-card__excerpt">
                  Advocating for policy change and supporting communities 
                  affected by housing affordability crisis.
                </p>
                <div className="public-project-card__meta">
                  <span className="public-project-card__location">📍 Melbourne, VIC</span>
                  <span className="public-project-card__members">👥 32 members</span>
                </div>
                <a href="/public/projects/3" className="public-project-card__link">
                  Learn More →
                </a>
              </div>
            </article>
          </div>

          <div className="public-section-action">
            <a href="/public/projects" className="public-btn public-btn--outline">
              View All Projects
            </a>
          </div>
        </div>
      </section>

      {/* Community Voices */}
      <section className="public-voices">
        <div className="public-container">
          <div className="public-section-header">
            <h2 className="public-section-title">Community Voices</h2>
            <p className="public-section-subtitle">
              Stories from our members making a difference
            </p>
          </div>

          <div className="public-testimonials-grid">
            <blockquote className="public-testimonial">
              <div className="public-testimonial__content">
                "The ACT Platform connected me with like-minded people who share my passion 
                for environmental action. Together, we've created three community gardens 
                that now feed over 50 families."
              </div>
              <footer className="public-testimonial__author">
                <div className="public-testimonial__avatar">SB</div>
                <div className="public-testimonial__details">
                  <cite className="public-testimonial__name">Sarah Blake</cite>
                  <div className="public-testimonial__role">Environmental Advocate, Brisbane</div>
                </div>
              </footer>
            </blockquote>

            <blockquote className="public-testimonial">
              <div className="public-testimonial__content">
                "What started as a small workshop in my local library has grown into 
                a network of digital literacy programs across Sydney. The platform 
                made collaboration effortless."
              </div>
              <footer className="public-testimonial__author">
                <div className="public-testimonial__avatar">MT</div>
                <div className="public-testimonial__details">
                  <cite className="public-testimonial__name">Michael Torres</cite>
                  <div className="public-testimonial__role">Tech Educator, Sydney</div>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="public-cta">
        <div className="public-container">
          <div className="public-cta__content">
            <h2 className="public-cta__title">Ready to Make a Difference?</h2>
            <p className="public-cta__description">
              Join our community of changemakers and start your journey toward meaningful impact.
            </p>
            <div className="public-cta__actions">
              <a href="/public/community" className="public-btn public-btn--primary">
                Get Started
              </a>
              <a href="/public/contact" className="public-btn public-btn--outline">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}