// LandingPageConversion.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthChange } from '../services/supabase';
import AuthModal from './AuthModal';
import SEO from './SEO';
import styles from './LandingPageConversion.module.scss';

const LandingPageConversion = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();
  const hasShownExitIntent = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        navigate('/calendar');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY < 10 && !hasShownExitIntent.current) {
        setShowExitIntent(true);
        hasShownExitIntent.current = true;
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  const openAuthModal = () => {
    setShowExitIntent(false);
    setShowAuthModal(true);
  };

  const whyHabitLock = [
    {
      stat: '92%',
      highlight: 'of habits fail',
      description: 'Most people give up within the first 2 weeks. Without visual progress tracking, motivation fades quickly.',
      icon: '📉'
    },
    {
      stat: '21',
      highlight: 'days to form a habit',
      description: 'Research shows consistency is key. HabitLock makes every day visible so you never want to break the chain.',
      icon: '🔗'
    },
    {
      stat: '3x',
      highlight: 'more likely to succeed',
      description: 'People who track their habits are significantly more likely to achieve their goals. See your progress, stay motivated.',
      icon: '🚀'
    }
  ];

  const features = [
    {
      title: 'See Your Discipline',
      description: 'Instead of spreadsheets and numbers, your progress becomes a visual landscape. Each day adds to a larger picture of your habits.',
      image: 'calendar'
    },
    {
      title: 'Build Streaks That Matter',
      description: "Streaks aren't just numbers. They shape the patterns that form across your calendar, making consistency visible.",
      image: 'stats'
    },
    {
      title: 'Your Month Becomes a Story',
      description: 'Over time your habits form a unique composition — a visual record of your discipline.',
      image: 'achievements'
    }
  ];

  const socialProof = [
    { name: 'Alex K.', role: 'Entrepreneur', text: 'Finally broke my 3-year gym inconsistency. 45 day streak now!', rating: 5 },
    { name: 'Maria S.', role: 'Designer', text: 'The visual design is gorgeous and actually makes me want to track.', rating: 5 },
    { name: 'James L.', role: 'Developer', text: 'Simple, fast, no bloat. Exactly what I needed.', rating: 5 }
  ];

  const faqs = [
    { q: 'Is it really free?', a: 'Yes! HabitLock is completely free to use. No hidden fees, no premium tiers.' },
    { q: 'Do I need to create an account?', a: 'Just enter your email and click the magic link we send you - no password needed! Your data syncs across devices automatically.' },
    { q: 'Can I track multiple habits?', a: 'Absolutely! Create unlimited habits with custom emojis, colors, and weekly goals.' }
  ];

  return (
    <div className={styles.landing}>
      <SEO faqs={faqs} />
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <div className={styles.navLinks}>
            <a href="/what-is-habitlock.html">What is HabitLock?</a>
            <a href="/how-habitlock-works.html">How It Works</a>
            <a href="#features">Features</a>
            <a href="#proof">Reviews</a>
            <a href="#faq">FAQ</a>
          </div>
          <button className={styles.navCta} onClick={openAuthModal}>
            Try Free →
          </button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.socialBadge}>
            <div className={styles.avatarStack}>
              <div className={styles.miniAvatar}>JK</div>
              <div className={styles.miniAvatar}>SM</div>
              <div className={styles.miniAvatar}>AL</div>
            </div>
            <span><strong>1,000+</strong> people building better habits</span>
          </div>
          
          <h1>
            Build habits. <span className={styles.highlight}>Watch your discipline take shape.</span>
          </h1>
          
          <p className={styles.heroSub}>
            HabitLock turns daily consistency into something you can see. 
            Every completed habit adds to a living calendar that evolves 
            into patterns, colors, and visual progress over time.
          </p>

          <div className={styles.heroCta}>
            <button className={styles.primaryCta} onClick={openAuthModal}>
              Start Building Your Habit Landscape →
            </button>
            <div className={styles.ctaBenefits}>
              <span>✓ Free forever</span>
              <span>✓ No password needed</span>
              <span>✓ Instant access</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.videoContainer}>
            <video 
              className={styles.heroVideo}
              autoPlay 
              loop 
              muted 
              playsInline
            >
              <source src="/background.mp4" type="video/mp4" />
            </video>
          </div>
          <div className={styles.floatingBadge}>
            <span>🎉</span>
            <div>
              <strong>Achievement Unlocked!</strong>
              <span>First Week Complete</span>
            </div>
          </div>
        </div>
      </section>

{/* Stats section temporarily removed */}

      <section className={styles.whySection}>
        <div className={styles.whyContent}>
          <div className={styles.whyHeader}>
            <span className={styles.whyLabel}>Why HabitLock?</span>
            <h2>Building habits is hard. <span>We make it easier.</span></h2>
            <p>Most habit apps overwhelm you with features. HabitLock focuses on what actually works: visual progress that keeps you motivated.</p>
          </div>
          
          <div className={styles.whyGrid}>
            {whyHabitLock.map((item, i) => (
              <div key={i} className={styles.whyCard}>
                <div className={styles.whyIcon}>{item.icon}</div>
                <div className={styles.whyStat}>
                  <span className={styles.whyNumber}>{item.stat}</span>
                  <span className={styles.whyHighlight}>{item.highlight}</span>
                </div>
                <p className={styles.whyDescription}>{item.description}</p>
              </div>
            ))}
          </div>

          <div className={styles.whyFeatures}>
            <div className={styles.whyFeature}>
              <span className={styles.checkIcon}>✓</span>
              <span>No complex setup</span>
            </div>
            <div className={styles.whyFeature}>
              <span className={styles.checkIcon}>✓</span>
              <span>Works on any device</span>
            </div>
            <div className={styles.whyFeature}>
              <span className={styles.checkIcon}>✓</span>
              <span>Free forever</span>
            </div>
            <div className={styles.whyFeature}>
              <span className={styles.checkIcon}>✓</span>
              <span>No account required</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.featuresContent}>
          <h2>Watch your discipline turn into art</h2>
          <p className={styles.featuresIntro}>
            Your progress becomes visible, meaningful, and uniquely yours.
          </p>
          
          <div className={styles.featureTabs}>
            {features.map((f, i) => (
              <button 
                key={i}
                className={`${styles.featureTab} ${activeTab === i ? styles.active : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {f.title}
              </button>
            ))}
          </div>
          
          <div className={styles.featureDisplay}>
            <div className={styles.featureInfo}>
              <h3>{features[activeTab].title}</h3>
              <p>{features[activeTab].description}</p>
              <ul className={styles.featurePoints}>
                <li>✓ Works offline</li>
                <li>✓ Syncs instantly</li>
                <li>✓ Dark mode included</li>
              </ul>
            </div>
            <div className={styles.featurePreview}>
              <div className={styles.featureMockup}>
                {activeTab === 0 && (
                  <div className={styles.mockCalendar}>
                    <div className={styles.mockRow}>
                      {['M','T','W','T','F','S','S'].map((d,i) => (
                        <div key={i} className={styles.mockHead}>{d}</div>
                      ))}
                    </div>
                    {[0,1,2,3].map(row => (
                      <div key={row} className={styles.mockRow}>
                        {[0,1,2,3,4,5,6].map(col => {
                          const day = row * 7 + col + 1;
                          const done = day <= 15;
                          return (
                            <div key={col} className={`${styles.mockCell} ${done ? styles.done : ''}`}>
                              {done && '💪'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 1 && (
                  <div className={styles.mockStats}>
                    <div className={styles.mockStatRow}>
                      <span>This Week</span>
                      <div className={styles.mockBar}>
                        <div className={styles.mockProgress} style={{width: '85%'}} />
                      </div>
                      <span>85%</span>
                    </div>
                    <div className={styles.mockStatRow}>
                      <span>Last Week</span>
                      <div className={styles.mockBar}>
                        <div className={styles.mockProgress} style={{width: '70%'}} />
                      </div>
                      <span>70%</span>
                    </div>
                    <div className={styles.mockStatRow}>
                      <span>Best Streak</span>
                      <div className={styles.mockBar}>
                        <div className={styles.mockProgress} style={{width: '100%'}} />
                      </div>
                      <span>21 days</span>
                    </div>
                  </div>
                )}
                {activeTab === 2 && (
                  <div className={styles.mockAchievements}>
                    <div className={styles.mockBadge}>
                      <span>🏆</span>
                      <div>First Week</div>
                    </div>
                    <div className={styles.mockBadge}>
                      <span>🔥</span>
                      <div>On Fire</div>
                    </div>
                    <div className={styles.mockBadge}>
                      <span>⭐</span>
                      <div>Perfectionist</div>
                    </div>
                    <div className={`${styles.mockBadge} ${styles.locked}`}>
                      <span>🎯</span>
                      <div>Locked</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.midCta}>
        <div className={styles.midCtaContent}>
          <h2>Ready to build better habits?</h2>
          <p>Join 1,000+ people who've transformed their routines</p>
          <button className={styles.midCtaButton} onClick={openAuthModal}>
            Start Free Today →
          </button>
        </div>
      </section>

      <section className={styles.social} id="proof">
        <div className={styles.socialContent}>
          <h2>Loved by habit builders</h2>
          <div className={styles.reviewGrid}>
            {socialProof.map((review, i) => (
              <div key={i} className={styles.reviewCard}>
                <div className={styles.stars}>{'★'.repeat(review.rating)}</div>
                <p>"{review.text}"</p>
                <div className={styles.reviewer}>
                  <div className={styles.reviewAvatar}>{review.name[0]}</div>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <div className={styles.faqContent}>
          <h2>Questions? We've got answers.</h2>
          <div className={styles.faqGrid}>
            {faqs.map((faq, i) => (
              <div key={i} className={styles.faqItem}>
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.final}>
        <div className={styles.finalContent}>
          <h2>Start Building Your Habit Landscape</h2>
          <p>Turn your daily discipline into something you can see. No credit card required.</p>
          <button className={styles.finalCta} onClick={openAuthModal}>
            Get Started Free →
          </button>
          <div className={styles.guarantee}>
            <span>🔒</span>
            <span>Secure magic link sign-in. No password needed.</span>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
                <span>HabitLock</span>
              </div>
              <p className={styles.footerTagline}>
                Watch your discipline turn into art.
              </p>
              <div className={styles.footerSocial}>
                <a 
                  href="https://www.facebook.com/habitlock" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on Facebook"
                  className={styles.socialLink}
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a 
                  href="https://x.com/habitlock_" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on X (Twitter)"
                  className={styles.socialLink}
                >
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div className={styles.footerLinks}>
              <div className={styles.footerColumn}>
                <h4>Product</h4>
                <a href="/what-is-habitlock.html">What is HabitLock?</a>
                <a href="/how-habitlock-works.html">How It Works</a>
                <a href="#features">Features</a>
                <a href="#proof">Reviews</a>
                <a href="#faq">FAQ</a>
              </div>
            <div className={styles.footerColumn}>
              <h4>Resources</h4>
              <a href="/blog">Blog</a>
              <a href="/blog/blog-why-most-habits-fail-after-a-good-start-and-what-actually-makes-them-stick.html">Why Habits Fail</a>
              <a href="/blog/the-if-then-method-a-smarter-way-to-build-habits-that-last.html">The If-Then Method</a>
            </div>
            </div>
          </div>
          
          <div className={styles.footerBottom}>
            <p>© 2026 HabitLock. Made with ❤️ for habit builders everywhere.</p>
            <div className={styles.footerBottomLinks}>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      {showExitIntent && (
        <div className={styles.exitModal} onClick={() => setShowExitIntent(false)}>
          <div className={styles.exitContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.exitClose} onClick={() => setShowExitIntent(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <span className={styles.exitEmoji}>👋</span>
            <h2>Wait! Before you go...</h2>
            <p>Join 1,000+ people who are building better habits with HabitLock.</p>
            <button className={styles.exitCta} onClick={openAuthModal}>
              Try Free Now →
            </button>
          </div>
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default LandingPageConversion;
