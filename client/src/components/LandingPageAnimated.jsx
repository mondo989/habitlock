// LandingPageAnimated.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, onAuthChange } from '../services/supabase';
import styles from './LandingPageAnimated.module.scss';

const LandingPageAnimated = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [activeHabit, setActiveHabit] = useState(0);
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
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15, rootMargin: '-50px' }
    );

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHabit((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
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

  const getParallaxStyle = useCallback((strength = 1) => ({
    transform: `translate(${(mousePos.x - 0.5) * 20 * strength}px, ${(mousePos.y - 0.5) * 20 * strength}px)`
  }), [mousePos]);

  const habits = [
    { emoji: '💪', name: 'Workout', progress: 85, color: '#ef4444' },
    { emoji: '📚', name: 'Reading', progress: 60, color: '#3b82f6' },
    { emoji: '🧘', name: 'Meditation', progress: 100, color: '#8b5cf6' },
    { emoji: '💧', name: 'Hydration', progress: 75, color: '#06b6d4' }
  ];

  const features = [
    {
      icon: '✨',
      title: 'Magical Tracking',
      description: 'Every tap creates a ripple of progress. Watch your calendar come alive.',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      icon: '🌊',
      title: 'Fluid Analytics',
      description: 'Data that flows and breathes. Insights that feel intuitive.',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      icon: '🎯',
      title: 'Streak Symphony',
      description: 'Your consistency visualized as beautiful, growing patterns.',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      icon: '🏆',
      title: 'Celebration Moments',
      description: 'Achievements that feel earned. Milestones worth remembering.',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
  ];

  return (
    <div className={styles.landing}>
      <div 
        className={styles.gradientOrb} 
        style={{ 
          transform: `translate(${mousePos.x * 100}px, ${mousePos.y * 100}px)`,
          opacity: Math.max(0, 1 - scrollY / 500)
        }} 
      />
      <div 
        className={styles.gradientOrb2} 
        style={{ 
          transform: `translate(${-mousePos.x * 80}px, ${-mousePos.y * 80}px)`,
          opacity: Math.max(0, 1 - scrollY / 600)
        }} 
      />
      
      <nav className={styles.nav} style={{ 
        backgroundColor: scrollY > 50 ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none'
      }}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <div className={styles.logoGlow} />
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <button className={styles.navCta} onClick={handleGetStarted} disabled={isSigningIn}>
            <span className={styles.ctaGlow} />
            {isSigningIn ? 'Connecting...' : 'Start Free'}
          </button>
        </div>
      </nav>

      <section className={styles.hero} id="hero" ref={heroRef}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.badge}>
              <span className={styles.badgeDot} />
              <span>Now with Achievements</span>
            </div>
            <h1 style={getParallaxStyle(0.3)}>
              <span className={styles.line1}>Habits that</span>
              <span className={styles.line2}>
                <span className={styles.magicText}>flow</span>
              </span>
            </h1>
            <p className={styles.heroSub}>
              Experience habit tracking that feels alive. Beautiful animations, 
              fluid interactions, and progress that inspires.
            </p>
            <button 
              className={styles.heroCta} 
              onClick={handleGetStarted}
              disabled={isSigningIn}
            >
              <span className={styles.ctaShine} />
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
                  Begin Your Journey
                </>
              )}
            </button>
          </div>
          
          <div className={styles.heroVisual} style={getParallaxStyle(0.5)}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                <div className={styles.screenHeader}>
                  <span>February 2026</span>
                  <div className={styles.streakBadge}>
                    <span className={styles.fireEmoji}>🔥</span>
                    <span>12</span>
                  </div>
                </div>
                <div className={styles.habitCards}>
                  {habits.map((habit, i) => (
                    <div 
                      key={i}
                      className={`${styles.habitCard} ${activeHabit === i ? styles.active : ''}`}
                      style={{ '--accent': habit.color }}
                    >
                      <span className={styles.habitEmoji}>{habit.emoji}</span>
                      <div className={styles.habitInfo}>
                        <span className={styles.habitName}>{habit.name}</span>
                        <div className={styles.habitBar}>
                          <div 
                            className={styles.habitProgress}
                            style={{ width: activeHabit === i ? `${habit.progress}%` : '0%' }}
                          />
                        </div>
                      </div>
                      <span className={styles.habitPercent}>{habit.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={styles.floatingElements}>
              <div className={styles.floatBubble} style={{ '--delay': '0s', '--x': '120px', '--y': '-60px' }}>✓</div>
              <div className={styles.floatBubble} style={{ '--delay': '0.5s', '--x': '-80px', '--y': '40px' }}>🎯</div>
              <div className={styles.floatBubble} style={{ '--delay': '1s', '--x': '100px', '--y': '100px' }}>⭐</div>
            </div>
          </div>
        </div>
        
        <div className={styles.scrollIndicator}>
          <div className={styles.scrollMouse}>
            <div className={styles.scrollWheel} />
          </div>
          <span>Scroll to explore</span>
        </div>
      </section>

      <section 
        className={`${styles.features} ${visibleSections.has('features') ? styles.visible : ''}`} 
        id="features"
      >
        <div className={styles.featuresContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>EXPERIENCE</span>
            <h2>Designed to <span className={styles.shimmer}>delight</span></h2>
            <p>Every interaction crafted to inspire your best self.</p>
          </div>
          
          <div className={styles.featureGrid}>
            {features.map((feature, i) => (
              <div 
                key={i} 
                className={styles.featureCard}
                style={{ '--delay': `${i * 0.1}s`, '--gradient': feature.gradient }}
              >
                <div className={styles.featureGlow} />
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className={styles.featureShine} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section 
        className={`${styles.showcase} ${visibleSections.has('showcase') ? styles.visible : ''}`} 
        id="showcase"
      >
        <div className={styles.showcaseContent}>
          <div className={styles.showcaseVisual}>
            <div className={styles.calendarPreview}>
              <div className={styles.calendarHeader}>
                <h3>Your Progress</h3>
                <span className={styles.monthLabel}>February</span>
              </div>
              <div className={styles.calendarGrid}>
                {Array.from({ length: 28 }, (_, i) => {
                  const isCompleted = i < 15;
                  const isToday = i === 14;
                  return (
                    <div 
                      key={i}
                      className={`${styles.calendarDay} ${isCompleted ? styles.completed : ''} ${isToday ? styles.today : ''}`}
                      style={{ '--delay': `${i * 30}ms` }}
                    >
                      {isCompleted && <span className={styles.dayEmoji}>💧</span>}
                      <span className={styles.dayNum}>{i + 1}</span>
                      {isToday && <div className={styles.todayRing} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className={styles.showcaseText}>
            <span className={styles.sectionTag}>VISUALIZATION</span>
            <h2>Watch your consistency <span className={styles.shimmer}>bloom</span></h2>
            <p>
              Every completed habit adds color to your calendar. Watch patterns emerge 
              as your commitment grows stronger day by day.
            </p>
            <ul className={styles.showcaseList}>
              <li>
                <span className={styles.checkIcon}>✓</span>
                <span>Visual streaks that motivate</span>
              </li>
              <li>
                <span className={styles.checkIcon}>✓</span>
                <span>Weekly goal tracking</span>
              </li>
              <li>
                <span className={styles.checkIcon}>✓</span>
                <span>Beautiful completion animations</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section 
        className={`${styles.testimonials} ${visibleSections.has('testimonials') ? styles.visible : ''}`} 
        id="testimonials"
      >
        <div className={styles.testimonialsContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>COMMUNITY</span>
            <h2>Loved by <span className={styles.shimmer}>thousands</span></h2>
          </div>
          
          <div className={styles.testimonialTrack}>
            <div className={styles.testimonialSlide}>
              {[
                { text: "The animations make tracking feel like a game. I actually look forward to it now!", author: "Sarah K.", role: "Designer" },
                { text: "Finally an app that's as beautiful as it is functional. My longest streak ever!", author: "Marcus R.", role: "Developer" },
                { text: "The visual feedback is incredible. Every completion feels like a small celebration.", author: "Emma T.", role: "Entrepreneur" }
              ].map((t, i) => (
                <div key={i} className={styles.testimonialCard} style={{ '--delay': `${i * 0.15}s` }}>
                  <p>"{t.text}"</p>
                  <div className={styles.testimonialAuthor}>
                    <div className={styles.authorAvatar}>{t.author[0]}</div>
                    <div>
                      <strong>{t.author}</strong>
                      <span>{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.final} id="final">
        <div className={styles.finalGradient} />
        <div className={styles.finalContent}>
          <h2>Ready to transform your habits?</h2>
          <p>Join thousands who've discovered the joy of consistent progress.</p>
          <button 
            className={styles.finalCta}
            onClick={handleGetStarted}
            disabled={isSigningIn}
          >
            <span className={styles.ctaShine} />
            {isSigningIn ? 'Connecting...' : 'Start Your Journey — Free'}
          </button>
          <span className={styles.finalNote}>No credit card required • Instant setup</span>
        </div>
        
        <div className={styles.finalParticles}>
          {Array.from({ length: 20 }, (_, i) => (
            <div 
              key={i} 
              className={styles.particle}
              style={{
                '--x': `${Math.random() * 100}%`,
                '--y': `${Math.random() * 100}%`,
                '--delay': `${Math.random() * 5}s`,
                '--duration': `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <p>© 2026 HabitLock. Crafted with ❤️ and countless animations.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPageAnimated;
