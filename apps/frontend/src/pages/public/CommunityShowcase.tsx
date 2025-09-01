export default function CommunityShowcase() {
  return (
    <div className="public-page">
      {/* Community Header */}
      <section className="public-page-hero">
        <div className="public-container">
          <div className="public-page-hero__content">
            <h1 className="public-page-hero__title">Our Community</h1>
            <p className="public-page-hero__subtitle">
              Meet the passionate individuals, organisations, and advocates 
              working together to create positive change across Australia.
            </p>
          </div>
        </div>
      </section>

      {/* Community Stats */}
      <section className="public-community-stats">
        <div className="public-container">
          <div className="public-stats-grid">
            <div className="public-stat-highlight">
              <div className="public-stat-highlight__number">1,247</div>
              <div className="public-stat-highlight__label">Active Members</div>
              <div className="public-stat-highlight__growth">+89 this month</div>
            </div>
            <div className="public-stat-highlight">
              <div className="public-stat-highlight__number">156</div>
              <div className="public-stat-highlight__label">Organisations</div>
              <div className="public-stat-highlight__growth">+12 this quarter</div>
            </div>
            <div className="public-stat-highlight">
              <div className="public-stat-highlight__number">8.5k</div>
              <div className="public-stat-highlight__label">Volunteer Hours</div>
              <div className="public-stat-highlight__growth">This month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Members */}
      <section className="public-featured-members">
        <div className="public-container">
          <div className="public-section-header">
            <h2 className="public-section-title">Community Leaders</h2>
            <p className="public-section-subtitle">
              Spotlight on the champions driving meaningful change in their communities
            </p>
          </div>

          <div className="public-members-grid">
            <div className="public-member-card">
              <div className="public-member-card__avatar">
                <div className="public-member-avatar">DR</div>
              </div>
              <div className="public-member-card__content">
                <h3 className="public-member-card__name">Dr. Rebecca Martinez</h3>
                <div className="public-member-card__role">Environmental Scientist & Advocate</div>
                <div className="public-member-card__location">📍 Perth, WA</div>
                <p className="public-member-card__bio">
                  Leading climate action initiatives and sustainable urban planning 
                  projects across Western Australia. Passionate about community-led 
                  environmental solutions.
                </p>
                <div className="public-member-card__projects">
                  <span className="public-member-tag">Urban Forest Project</span>
                  <span className="public-member-tag">Climate Action WA</span>
                </div>
              </div>
            </div>

            <div className="public-member-card">
              <div className="public-member-card__avatar">
                <div className="public-member-avatar">JL</div>
              </div>
              <div className="public-member-card__content">
                <h3 className="public-member-card__name">James Liu</h3>
                <div className="public-member-card__role">Youth Mentor & Social Worker</div>
                <div className="public-member-card__location">📍 Darwin, NT</div>
                <p className="public-member-card__bio">
                  Dedicated to empowering young people through mentorship programs 
                  and skill development workshops. Building bridges between 
                  communities and opportunities.
                </p>
                <div className="public-member-card__projects">
                  <span className="public-member-tag">Youth Leadership</span>
                  <span className="public-member-tag">Skills for Future</span>
                </div>
              </div>
            </div>

            <div className="public-member-card">
              <div className="public-member-card__avatar">
                <div className="public-member-avatar">AP</div>
              </div>
              <div className="public-member-card__content">
                <h3 className="public-member-card__name">Aisha Patel</h3>
                <div className="public-member-card__role">Digital Inclusion Specialist</div>
                <div className="public-member-card__location">📍 Adelaide, SA</div>
                <p className="public-member-card__bio">
                  Breaking down digital barriers through accessible technology 
                  training and support programs for multicultural communities 
                  and seniors.
                </p>
                <div className="public-member-card__projects">
                  <span className="public-member-tag">Digital Bridge</span>
                  <span className="public-member-tag">Tech Together</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Categories */}
      <section className="public-community-categories">
        <div className="public-container">
          <div className="public-section-header">
            <h2 className="public-section-title">Find Your Tribe</h2>
            <p className="public-section-subtitle">
              Connect with others who share your interests and values
            </p>
          </div>

          <div className="public-categories-grid">
            <div className="public-category-card">
              <div className="public-category-card__icon">🌱</div>
              <h3 className="public-category-card__title">Environmental Action</h3>
              <p className="public-category-card__description">
                Climate action, conservation, and sustainability initiatives
              </p>
              <div className="public-category-card__stats">
                <span>234 members</span>
                <span>18 projects</span>
              </div>
            </div>

            <div className="public-category-card">
              <div className="public-category-card__icon">📚</div>
              <h3 className="public-category-card__title">Education & Learning</h3>
              <p className="public-category-card__description">
                Digital literacy, skill development, and educational programs
              </p>
              <div className="public-category-card__stats">
                <span>189 members</span>
                <span>12 projects</span>
              </div>
            </div>

            <div className="public-category-card">
              <div className="public-category-card__icon">🏠</div>
              <h3 className="public-category-card__title">Housing & Homelessness</h3>
              <p className="public-category-card__description">
                Affordable housing advocacy and homelessness support services
              </p>
              <div className="public-category-card__stats">
                <span>156 members</span>
                <span>8 projects</span>
              </div>
            </div>

            <div className="public-category-card">
              <div className="public-category-card__icon">💚</div>
              <h3 className="public-category-card__title">Health & Wellbeing</h3>
              <p className="public-category-card__description">
                Mental health support, community wellness, and health advocacy
              </p>
              <div className="public-category-card__stats">
                <span>298 members</span>
                <span>22 projects</span>
              </div>
            </div>

            <div className="public-category-card">
              <div className="public-category-card__icon">🎨</div>
              <h3 className="public-category-card__title">Arts & Culture</h3>
              <p className="public-category-card__description">
                Community arts projects and cultural preservation initiatives
              </p>
              <div className="public-category-card__stats">
                <span>167 members</span>
                <span>14 projects</span>
              </div>
            </div>

            <div className="public-category-card">
              <div className="public-category-card__icon">⚖️</div>
              <h3 className="public-category-card__title">Social Justice</h3>
              <p className="public-category-card__description">
                Human rights advocacy, equality campaigns, and policy reform
              </p>
              <div className="public-category-card__stats">
                <span>203 members</span>
                <span>16 projects</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="public-success-stories">
        <div className="public-container">
          <div className="public-section-header">
            <h2 className="public-section-title">Success Stories</h2>
            <p className="public-section-subtitle">
              Real impact happening in communities across Australia
            </p>
          </div>

          <div className="public-stories-timeline">
            <div className="public-story-item">
              <div className="public-story-date">March 2024</div>
              <div className="public-story-content">
                <h4 className="public-story-title">
                  Brisbane Community Gardens Network Launched
                </h4>
                <p className="public-story-description">
                  12 community groups came together to establish a network of 
                  urban gardens, now providing fresh produce to over 200 families.
                </p>
                <div className="public-story-impact">
                  <span className="public-impact-metric">🥕 2,400kg produce grown</span>
                  <span className="public-impact-metric">👨‍👩‍👧‍👦 200+ families served</span>
                </div>
              </div>
            </div>

            <div className="public-story-item">
              <div className="public-story-date">February 2024</div>
              <div className="public-story-content">
                <h4 className="public-story-title">
                  Digital Skills Program Reaches 500 Seniors
                </h4>
                <p className="public-story-description">
                  Volunteer-led technology workshops helped seniors stay connected 
                  with family and access essential online services.
                </p>
                <div className="public-story-impact">
                  <span className="public-impact-metric">👥 500 seniors trained</span>
                  <span className="public-impact-metric">💻 50 volunteer tutors</span>
                </div>
              </div>
            </div>

            <div className="public-story-item">
              <div className="public-story-date">January 2024</div>
              <div className="public-story-content">
                <h4 className="public-story-title">
                  Housing Advocacy Campaign Achieves Policy Win
                </h4>
                <p className="public-story-description">
                  Community-led advocacy resulted in new affordable housing 
                  commitments from local government, creating 150 new homes.
                </p>
                <div className="public-story-impact">
                  <span className="public-impact-metric">🏠 150 new homes committed</span>
                  <span className="public-impact-metric">📋 Policy change achieved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Community CTA */}
      <section className="public-community-cta">
        <div className="public-container">
          <div className="public-cta-card">
            <h2 className="public-cta-card__title">
              Ready to Connect with Your Community?
            </h2>
            <p className="public-cta-card__description">
              Join thousands of Australians working together to create positive change. 
              Find your people, share your skills, and make a difference.
            </p>
            <div className="public-cta-card__actions">
              <a href="/public/contact" className="public-btn public-btn--primary">
                Join Our Community
              </a>
              <a href="/public/projects" className="public-btn public-btn--outline">
                Explore Projects
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}