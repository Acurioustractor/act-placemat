export default function ContactUs() {
  return (
    <div className="public-page">
      {/* Contact Hero */}
      <section className="public-page-hero">
        <div className="public-container">
          <div className="public-page-hero__content">
            <h1 className="public-page-hero__title">Get in Touch</h1>
            <p className="public-page-hero__subtitle">
              Ready to start a project, join our community, or explore partnership opportunities? 
              We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="public-contact-section">
        <div className="public-container">
          <div className="public-contact-layout">
            <div className="public-contact-main">
              <div className="public-contact-form-card">
                <h2>Send us a Message</h2>
                <form className="public-contact-form">
                  <div className="public-form-row">
                    <div className="public-form-group">
                      <label className="public-form-label" htmlFor="firstName">
                        First Name *
                      </label>
                      <input 
                        type="text" 
                        id="firstName" 
                        className="public-form-input" 
                        required 
                      />
                    </div>
                    <div className="public-form-group">
                      <label className="public-form-label" htmlFor="lastName">
                        Last Name *
                      </label>
                      <input 
                        type="text" 
                        id="lastName" 
                        className="public-form-input" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="public-form-group">
                    <label className="public-form-label" htmlFor="email">
                      Email Address *
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      className="public-form-input" 
                      required 
                    />
                  </div>

                  <div className="public-form-group">
                    <label className="public-form-label" htmlFor="organisation">
                      Organisation (Optional)
                    </label>
                    <input 
                      type="text" 
                      id="organisation" 
                      className="public-form-input" 
                    />
                  </div>

                  <div className="public-form-group">
                    <label className="public-form-label" htmlFor="location">
                      Location
                    </label>
                    <select id="location" className="public-form-select">
                      <option value="">Select your state/territory</option>
                      <option value="QLD">Queensland</option>
                      <option value="NSW">New South Wales</option>
                      <option value="VIC">Victoria</option>
                      <option value="SA">South Australia</option>
                      <option value="WA">Western Australia</option>
                      <option value="TAS">Tasmania</option>
                      <option value="NT">Northern Territory</option>
                      <option value="ACT">Australian Capital Territory</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="public-form-group">
                    <label className="public-form-label" htmlFor="interest">
                      I'm interested in... *
                    </label>
                    <select id="interest" className="public-form-select" required>
                      <option value="">Please select</option>
                      <option value="joining">Joining the community</option>
                      <option value="volunteering">Volunteering with a project</option>
                      <option value="starting">Starting a new project</option>
                      <option value="partnership">Partnership opportunities</option>
                      <option value="funding">Funding or investment</option>
                      <option value="media">Media inquiry</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>

                  <div className="public-form-group">
                    <label className="public-form-label" htmlFor="message">
                      Message *
                    </label>
                    <textarea 
                      id="message" 
                      className="public-form-textarea" 
                      rows={6}
                      placeholder="Tell us about yourself and what you're hoping to achieve..."
                      required
                    ></textarea>
                  </div>

                  <div className="public-form-group public-form-checkbox-group">
                    <label className="public-form-checkbox">
                      <input type="checkbox" required />
                      <span className="public-form-checkbox-text">
                        I agree to the <a href="/privacy">Privacy Policy</a> and 
                        <a href="/terms"> Terms of Service</a> *
                      </span>
                    </label>
                  </div>

                  <div className="public-form-group public-form-checkbox-group">
                    <label className="public-form-checkbox">
                      <input type="checkbox" />
                      <span className="public-form-checkbox-text">
                        I'd like to receive updates about new projects, events, 
                        and community opportunities (you can unsubscribe anytime)
                      </span>
                    </label>
                  </div>

                  <div className="public-form-actions">
                    <button type="submit" className="public-btn public-btn--primary">
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="public-contact-sidebar">
              <div className="public-contact-info-card">
                <h3>Other Ways to Connect</h3>
                
                <div className="public-contact-method">
                  <div className="public-contact-method__icon">📧</div>
                  <div className="public-contact-method__content">
                    <h4>General Inquiries</h4>
                    <p>hello@actplatform.org.au</p>
                  </div>
                </div>

                <div className="public-contact-method">
                  <div className="public-contact-method__icon">🤝</div>
                  <div className="public-contact-method__content">
                    <h4>Partnerships</h4>
                    <p>partnerships@actplatform.org.au</p>
                  </div>
                </div>

                <div className="public-contact-method">
                  <div className="public-contact-method__icon">📰</div>
                  <div className="public-contact-method__content">
                    <h4>Media & Press</h4>
                    <p>media@actplatform.org.au</p>
                  </div>
                </div>

                <div className="public-contact-method">
                  <div className="public-contact-method__icon">🛠️</div>
                  <div className="public-contact-method__content">
                    <h4>Technical Support</h4>
                    <p>support@actplatform.org.au</p>
                  </div>
                </div>
              </div>

              <div className="public-contact-info-card">
                <h3>Response Times</h3>
                <div className="public-response-times">
                  <div className="public-response-time">
                    <strong>General inquiries:</strong> 1-2 business days
                  </div>
                  <div className="public-response-time">
                    <strong>Partnership requests:</strong> 3-5 business days
                  </div>
                  <div className="public-response-time">
                    <strong>Technical support:</strong> Within 24 hours
                  </div>
                  <div className="public-response-time">
                    <strong>Media inquiries:</strong> Same day when possible
                  </div>
                </div>
              </div>

              <div className="public-contact-info-card">
                <h3>Office Hours</h3>
                <div className="public-office-hours">
                  <p>
                    <strong>Monday - Friday:</strong><br />
                    9:00 AM - 5:00 PM AEST
                  </p>
                  <p>
                    <strong>Weekend & After Hours:</strong><br />
                    We'll respond to urgent matters as soon as possible
                  </p>
                </div>
              </div>

              <div className="public-contact-info-card">
                <h3>Join Our Community</h3>
                <p>
                  Stay connected with regular updates, project highlights, 
                  and opportunities to get involved.
                </p>
                <div className="public-social-links">
                  <a href="#" className="public-social-link">Newsletter</a>
                  <a href="#" className="public-social-link">LinkedIn</a>
                  <a href="#" className="public-social-link">Twitter</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="public-faq-section">
        <div className="public-container">
          <div className="public-section-header">
            <h2 className="public-section-title">Frequently Asked Questions</h2>
            <p className="public-section-subtitle">
              Quick answers to common questions about getting involved
            </p>
          </div>

          <div className="public-faq-grid">
            <div className="public-faq-item">
              <h4 className="public-faq-question">
                How do I start a new project on the platform?
              </h4>
              <p className="public-faq-answer">
                Get in touch with us using the form above and select "Starting a new project." 
                We'll schedule a conversation to understand your vision and help you connect 
                with potential collaborators and resources.
              </p>
            </div>

            <div className="public-faq-item">
              <h4 className="public-faq-question">
                Is there a cost to join the ACT Platform community?
              </h4>
              <p className="public-faq-answer">
                Joining our community is completely free for individuals and grassroots 
                organizations. We may offer premium services for larger organizations 
                seeking additional support and resources.
              </p>
            </div>

            <div className="public-faq-item">
              <h4 className="public-faq-question">
                What kind of support do you provide to projects?
              </h4>
              <p className="public-faq-answer">
                We help with project development, volunteer coordination, funding guidance, 
                and connecting projects with relevant partners. Our support is tailored to 
                each project's specific needs and stage of development.
              </p>
            </div>

            <div className="public-faq-item">
              <h4 className="public-faq-question">
                Can organizations outside Australia participate?
              </h4>
              <p className="public-faq-answer">
                While our primary focus is on Australian communities, we welcome 
                international organizations that want to collaborate on projects 
                with Australian partners or share relevant expertise.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}