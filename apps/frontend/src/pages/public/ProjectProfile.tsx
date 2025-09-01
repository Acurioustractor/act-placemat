import { useParams } from 'react-router-dom'

export default function ProjectProfile() {
  const { id } = useParams()
  
  return (
    <div className="public-page">
      <section className="public-project-profile">
        <div className="public-container">
          {/* Project Header */}
          <div className="public-project-header">
            <div className="public-project-header__image">
              <div className="public-placeholder-image">🌱 Project Hero Image</div>
            </div>
            <div className="public-project-header__content">
              <div className="public-project-header__meta">
                <span className="public-badge public-badge--environment">Environment</span>
                <span className="public-badge public-badge--active">Active</span>
              </div>
              <h1 className="public-project-header__title">
                Brisbane Community Gardens Network
              </h1>
              <p className="public-project-header__subtitle">
                Building sustainable food systems through community-led urban agriculture 
                that brings neighborhoods together while addressing food security.
              </p>
              <div className="public-project-header__stats">
                <div className="public-stat">
                  <div className="public-stat__number">45</div>
                  <div className="public-stat__label">Active Members</div>
                </div>
                <div className="public-stat">
                  <div className="public-stat__number">12</div>
                  <div className="public-stat__label">Garden Sites</div>
                </div>
                <div className="public-stat">
                  <div className="public-stat__number">2.4T</div>
                  <div className="public-stat__label">Produce Grown</div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Content */}
          <div className="public-project-content">
            <div className="public-project-main">
              <section className="public-project-section">
                <h2>About This Project</h2>
                <p>
                  The Brisbane Community Gardens Network began in early 2023 when a small 
                  group of neighbors in West End decided to transform an unused council lot 
                  into a thriving community garden. What started as a single plot has now 
                  grown into a network of 12 gardens across Brisbane's inner suburbs.
                </p>
                <p>
                  Our mission is to create sustainable, accessible food systems that strengthen 
                  community bonds while addressing food security challenges. Each garden site 
                  serves as both a food production space and a community gathering place, 
                  hosting workshops, cultural events, and educational programs.
                </p>
              </section>

              <section className="public-project-section">
                <h2>Our Impact</h2>
                <div className="public-impact-grid">
                  <div className="public-impact-item">
                    <div className="public-impact-icon">🥕</div>
                    <div className="public-impact-content">
                      <h4>Food Production</h4>
                      <p>2,400kg of fresh produce grown and distributed to local families</p>
                    </div>
                  </div>
                  <div className="public-impact-item">
                    <div className="public-impact-icon">👨‍👩‍👧‍👦</div>
                    <div className="public-impact-content">
                      <h4>Families Served</h4>
                      <p>Over 200 families now have access to fresh, affordable produce</p>
                    </div>
                  </div>
                  <div className="public-impact-item">
                    <div className="public-impact-icon">🌍</div>
                    <div className="public-impact-content">
                      <h4>Environmental Benefit</h4>
                      <p>15 tonnes of CO2 equivalent saved through local food production</p>
                    </div>
                  </div>
                  <div className="public-impact-item">
                    <div className="public-impact-icon">🎓</div>
                    <div className="public-impact-content">
                      <h4>Education & Skills</h4>
                      <p>125 community members trained in sustainable gardening practices</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="public-project-section">
                <h2>How We Work</h2>
                <div className="public-project-steps">
                  <div className="public-step">
                    <div className="public-step__number">1</div>
                    <div className="public-step__content">
                      <h4>Community Consultation</h4>
                      <p>We work with local residents to identify suitable sites and assess community needs</p>
                    </div>
                  </div>
                  <div className="public-step">
                    <div className="public-step__number">2</div>
                    <div className="public-step__content">
                      <h4>Garden Establishment</h4>
                      <p>Volunteers collaborate to prepare soil, build infrastructure, and plant initial crops</p>
                    </div>
                  </div>
                  <div className="public-step">
                    <div className="public-step__number">3</div>
                    <div className="public-step__content">
                      <h4>Community Management</h4>
                      <p>Local gardeners take ownership of day-to-day operations with ongoing support</p>
                    </div>
                  </div>
                  <div className="public-step">
                    <div className="public-step__number">4</div>
                    <div className="public-step__content">
                      <h4>Harvest & Distribution</h4>
                      <p>Fresh produce is shared among gardeners and donated to local food relief services</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="public-project-sidebar">
              <div className="public-project-info-card">
                <h3>Get Involved</h3>
                <p>
                  Join our community of growers and help us expand access to 
                  fresh, sustainable food across Brisbane.
                </p>
                <div className="public-project-actions">
                  <button className="public-btn public-btn--primary">
                    Volunteer with Us
                  </button>
                  <button className="public-btn public-btn--outline">
                    Donate
                  </button>
                  <button className="public-btn public-btn--outline">
                    Share Project
                  </button>
                </div>
              </div>

              <div className="public-project-info-card">
                <h3>Project Details</h3>
                <div className="public-project-details">
                  <div className="public-detail-item">
                    <strong>Location:</strong> Brisbane, QLD
                  </div>
                  <div className="public-detail-item">
                    <strong>Started:</strong> March 2023
                  </div>
                  <div className="public-detail-item">
                    <strong>Lead Organisation:</strong> West End Community Association
                  </div>
                  <div className="public-detail-item">
                    <strong>Partners:</strong> Brisbane City Council, Griffith University
                  </div>
                </div>
              </div>

              <div className="public-project-info-card">
                <h3>Contact</h3>
                <div className="public-contact-info">
                  <div className="public-contact-item">
                    <strong>Project Coordinator:</strong><br />
                    Sarah Blake<br />
                    sarah@westendcommunity.org
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}