// LandingPageSpotify.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, onAuthChange } from '../services/firebase';
import styles from './LandingPageSpotify.module.scss';

const LandingPageSpotify = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        navigate('/calendar');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((scrolled / maxScroll) * 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible((prev) => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
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

  const features = [
    {
      icon: '🎯',
      title: 'Track Without Limits',
      description: 'Create unlimited habits. Set your own rules. Own your progress.',
      visual: 'calendar'
    },
    {
      icon: '📈',
      title: 'Data That Speaks',
      description: 'Beautiful analytics that tell your story. See patterns emerge.',
      visual: 'stats'
    },
    {
      icon: '🔥',
      title: 'Streaks That Stick',
      description: 'Watch your consistency compound. Every day counts.',
      visual: 'streaks'
    },
    {
      icon: '🏆',
      title: 'Earn Your Wins',
      description: 'Unlock achievements as you grow. Celebrate milestones.',
      visual: 'achievements'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500K+', label: 'Habits Tracked' },
    { value: '98%', label: 'Success Rate' },
    { value: '4.9★', label: 'User Rating' }
  ];

  return (
    <div className={styles.landing}>
      <div className={styles.progressBar} style={{ width: `${scrollProgress}%` }} />
      
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <button 
            className={styles.ctaNav}
            onClick={handleGetStarted}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Connecting...' : 'Start Free'}
          </button>
        </div>
      </nav>

      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroTag}>
            <span className={styles.pulse} />
            NEW: Achievement System Live
          </div>
          <h1 className={styles.heroTitle}>
            Your habits.
            <br />
            <span className={styles.gradient}>Amplified.</span>
          </h1>
          <p className={styles.heroSub}>
            The habit tracker that feels like you. Bold visuals. 
            Zero friction. Pure momentum.
          </p>
          <div className={styles.heroCta}>
            <button 
              className={styles.ctaPrimary}
              onClick={handleGetStarted}
              disabled={isSigningIn}
            >
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
                  Continue with Google
                </>
              )}
            </button>
            <span className={styles.ctaNote}>Free forever • No credit card</span>
          </div>
        </div>
        
        <div className={styles.heroVisual}>
          <div className={styles.deviceFrame}>
            <div className={styles.deviceScreen}>
              <div className={styles.mockCalendar}>
                <div className={styles.mockHeader}>
                  <span>February 2026</span>
                  <div className={styles.mockStreak}>🔥 12 days</div>
                </div>
                <div className={styles.mockGrid}>
                  {Array.from({ length: 28 }, (_, i) => (
                    <div 
                      key={i} 
                      className={`${styles.mockDay} ${i < 15 ? styles.completed : ''} ${i === 14 ? styles.today : ''}`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {i < 15 && <span className={styles.mockEmoji}>💧</span>}
                      <span className={styles.mockNum}>{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats} id="stats" data-animate>
        <div className={`${styles.statsContent} ${isVisible['stats'] ? styles.visible : ''}`}>
          {stats.map((stat, i) => (
            <div key={i} className={styles.stat} style={{ animationDelay: `${i * 100}ms` }}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.features} id="features" data-animate>
        <div className={styles.featuresContent}>
          <div className={styles.featuresHeader}>
            <h2>Built different.</h2>
            <p>Every feature designed to keep you moving forward.</p>
          </div>
          
          <div className={styles.featuresList}>
            {features.map((feature, i) => (
              <div 
                key={i}
                className={`${styles.featureCard} ${activeFeature === i ? styles.active : ''}`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className={styles.featureIcon}>{feature.icon}</div>
                <div className={styles.featureText}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
                <div className={styles.featureArrow}>→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.experience} id="experience" data-animate>
        <div className={`${styles.experienceContent} ${isVisible['experience'] ? styles.visible : ''}`}>
          <div className={styles.experienceText}>
            <span className={styles.tag}>THE EXPERIENCE</span>
            <h2>Designed for <span className={styles.gradient}>flow</span></h2>
            <p>
              We obsessed over every pixel so you don't have to think twice. 
              Just open, track, close. Your habits, handled.
            </p>
            <ul className={styles.checkList}>
              <li><span className={styles.check}>✓</span> One-tap completion</li>
              <li><span className={styles.check}>✓</span> Smart weekly goals</li>
              <li><span className={styles.check}>✓</span> Real-time sync</li>
              <li><span className={styles.check}>✓</span> Dark mode native</li>
            </ul>
          </div>
          <div className={styles.experienceVisual}>
            <div className={styles.floatingCards}>
              <div className={styles.floatCard} style={{ '--delay': '0s' }}>
                <span>💪</span>
                <div>Workout</div>
                <div className={styles.floatProgress}>5/5 this week</div>
              </div>
              <div className={styles.floatCard} style={{ '--delay': '0.2s' }}>
                <span>📚</span>
                <div>Reading</div>
                <div className={styles.floatProgress}>4/7 this week</div>
              </div>
              <div className={styles.floatCard} style={{ '--delay': '0.4s' }}>
                <span>🧘</span>
                <div>Meditation</div>
                <div className={styles.floatProgress}>6/7 this week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.social} id="social" data-animate>
        <div className={`${styles.socialContent} ${isVisible['social'] ? styles.visible : ''}`}>
          <h2>What people are saying</h2>
          <div className={styles.testimonials}>
            <div className={styles.testimonial}>
              <p>"Finally a habit app that doesn't feel like a chore. The design is incredible."</p>
              <div className={styles.author}>
                <div className={styles.avatar}>SC</div>
                <div>
                  <strong>Sarah Chen</strong>
                  <span>Product Designer @ Figma</span>
                </div>
              </div>
            </div>
            <div className={styles.testimonial}>
              <p>"I've tried every habit tracker. HabitLock is the only one that stuck. It just works."</p>
              <div className={styles.author}>
                <div className={styles.avatar}>MR</div>
                <div>
                  <strong>Marcus Rodriguez</strong>
                  <span>Founder @ Startup</span>
                </div>
              </div>
            </div>
            <div className={styles.testimonial}>
              <p>"The streak visualization is addictive in the best way. 30 day streak and counting!"</p>
              <div className={styles.author}>
                <div className={styles.avatar}>ET</div>
                <div>
                  <strong>Emma Thompson</strong>
                  <span>Software Engineer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.final}>
        <div className={styles.finalGlow} />
        <div className={styles.finalContent}>
          <h2>Ready to build habits that last?</h2>
          <p>Join thousands who've transformed their routines with HabitLock.</p>
          <button 
            className={styles.ctaFinal}
            onClick={handleGetStarted}
            disabled={isSigningIn}
          >
            {isSigningIn ? 'Connecting...' : 'Get Started — It\'s Free'}
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <p>© 2026 HabitLock. Built with ❤️ for habit builders.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageSpotify;
