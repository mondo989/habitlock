// LandingPageConversion.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, onAuthChange } from '../services/firebase';
import styles from './LandingPageConversion.module.scss';

const LandingPageConversion = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
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

  const handleGetStarted = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed:', error);
      setIsSigningIn(false);
    }
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
      title: 'Visual Calendar',
      description: 'See your entire month at a glance with beautiful emoji-based tracking',
      image: 'calendar'
    },
    {
      title: 'Smart Analytics',
      description: 'Understand your patterns with insights that help you improve',
      image: 'stats'
    },
    {
      title: 'Achievements',
      description: 'Unlock rewards and celebrate milestones as you build consistency',
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
    { q: 'Do I need to create an account?', a: 'Just sign in with Google - takes 2 seconds. Your data syncs across devices automatically.' },
    { q: 'Can I track multiple habits?', a: 'Absolutely! Create unlimited habits with custom emojis, colors, and weekly goals.' }
  ];

  return (
    <div className={styles.landing}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#proof">Reviews</a>
            <a href="#faq">FAQ</a>
          </div>
          <button className={styles.navCta} onClick={handleGetStarted} disabled={isSigningIn}>
            {isSigningIn ? 'Signing in...' : 'Try Free →'}
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
            Build habits that <span className={styles.highlight}>actually stick</span>
          </h1>
          
          <p className={styles.heroSub}>
            The simple, beautiful habit tracker that helps you stay consistent. 
            Track daily, see your progress, achieve your goals.
          </p>

          <div className={styles.heroCta}>
            <button className={styles.primaryCta} onClick={handleGetStarted} disabled={isSigningIn}>
              {isSigningIn ? (
                <span className={styles.loading}>
                  <span className={styles.spinner} />
                  Connecting...
                </span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className={styles.googleIcon}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Start Free with Google
                </>
              )}
            </button>
            <div className={styles.ctaBenefits}>
              <span>✓ Free forever</span>
              <span>✓ No credit card</span>
              <span>✓ 2-second setup</span>
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
              <source src="/background.mov" type="video/quicktime" />
              <source src="/background.mov" type="video/mp4" />
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
          <h2>Everything you need to succeed</h2>
          <p className={styles.featuresIntro}>
            No complexity. No subscriptions. Just the tools that work.
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
          <button className={styles.midCtaButton} onClick={handleGetStarted} disabled={isSigningIn}>
            {isSigningIn ? 'Connecting...' : 'Start Free Today →'}
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
          <h2>Start building habits today</h2>
          <p>It takes less than 30 seconds to get started. No credit card required.</p>
          <button className={styles.finalCta} onClick={handleGetStarted} disabled={isSigningIn}>
            {isSigningIn ? (
              <span className={styles.loading}>
                <span className={styles.spinner} />
                Connecting...
              </span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className={styles.googleIcon}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google — It's Free
              </>
            )}
          </button>
          <div className={styles.guarantee}>
            <span>🔒</span>
            <span>Secure sign-in with Google. We never store your password.</span>
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
                Build habits that stick. Track progress beautifully.
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
            <button className={styles.exitCta} onClick={handleGetStarted} disabled={isSigningIn}>
              {isSigningIn ? 'Connecting...' : 'Try Free Now →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPageConversion;
