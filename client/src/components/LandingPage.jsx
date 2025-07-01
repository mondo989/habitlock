import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, onAuthChange } from '../services/firebase';
import ThemeToggle from './ThemeToggle';
import AnimatedCalendar from './AnimatedCalendar';
import styles from './LandingPage.module.scss';

const LandingPage = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  // Redirect authenticated users to calendar
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (user) {
        navigate('/calendar');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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
      title: 'Smart Habit Tracking',
      description: 'Effortlessly track daily habits with intelligent insights that adapt to your lifestyle and goals.'
    },
    {
      icon: '📊',
      title: 'Beautiful Analytics',
      description: 'Visualize your progress with stunning charts and streaks that motivate you to keep going.'
    },
    {
      icon: '🔐',
      title: 'Lock Your Focus',
      description: 'Stay committed with our unique locking mechanism that helps you build unbreakable habits.'
    },
    {
      icon: '☁️',
      title: 'Seamless Sync',
      description: 'Your data follows you everywhere with real-time sync across all your devices.'
    }
  ];

  const testimonials = [
    {
      quote: "HabitLock transformed how I build routines. The visual progress tracking keeps me motivated every day.",
      author: "Sarah Chen",
      role: "Product Designer"
    },
    {
      quote: "Finally, a habit tracker that doesn't overwhelm me. Clean, simple, and incredibly effective.",
      author: "Marcus Rodriguez", 
      role: "Entrepreneur"
    },
    {
      quote: "The streak visualization is addictive in the best way. I've never been more consistent with my habits.",
      author: "Emma Thompson",
      role: "Software Engineer"
    }
  ];

  return (
    <div className={styles.landingPage}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <div className={styles.navLogo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
            <span className={styles.logoText}>HabitLock</span>
          </div>
          <div className={styles.navActions}>
            <ThemeToggle />
            <button 
              className={styles.navCtaButton}
              onClick={handleGetStarted}
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Signing in...' : 'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Build habits that
              <span className={styles.gradient}> stick</span>
            </h1>
            <p className={styles.heroSubtitle}>
              The beautifully simple habit tracker that helps you build consistency, 
              visualize progress, and achieve your goals with intelligent insights.
            </p>
            <div className={styles.heroActions}>
              <button 
                className={styles.ctaButton}
                onClick={handleGetStarted}
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <div className={styles.spinner}></div>
                    Getting started...
                  </>
                ) : (
                  <>
                    <span className={styles.ctaIcon}>🚀</span>
                    Start building better habits
                  </>
                )}
              </button>
              <p className={styles.ctaSubtext}>
                Free to start • Sign in with Google • No credit card required
              </p>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.mockupContainer}>
              <div className={styles.mockup}>
                <div className={styles.mockupHeader}>
                  <div className={styles.mockupDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className={styles.mockupContent}>
                  <AnimatedCalendar />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Everything you need to succeed</h2>
            <p>Powerful features designed to make habit building effortless and enjoyable</p>
          </div>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Simple by design, powerful by nature</h2>
            <p>Start tracking habits in three effortless steps</p>
          </div>
          <div className={styles.stepsContainer}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Add Your Habits</h3>
              <p>Create habits that matter to you with our intuitive interface</p>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Track Daily Progress</h3>
              <p>Mark completion with a simple tap and watch your streaks grow</p>
            </div>
            <div className={styles.stepConnector}></div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Build Momentum</h3>
              <p>Visualize your consistency and celebrate your achievements</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className={styles.testimonials}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Loved by habit builders everywhere</h2>
          </div>
          <div className={styles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className={styles.testimonialCard}>
                <p className={styles.quote}>"{testimonial.quote}"</p>
                <div className={styles.author}>
                  <strong>{testimonial.author}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2>Ready to build lasting habits?</h2>
            <p>Join thousands of people who've transformed their lives with HabitLock</p>
            <button 
              className={styles.ctaButton}
              onClick={handleGetStarted}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <>
                  <div className={styles.spinner}></div>
                  Getting started...
                </>
              ) : (
                <>
                  <span className={styles.ctaIcon}>✨</span>
                  Get started for free
                </>
              )}
            </button>
            <p className={styles.ctaSubtext}>
              Takes less than 30 seconds • No spam, ever
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <img src="/habit-lock-logo.svg" alt="HabitLock Logo" className={styles.logoIcon} />
              <span>HabitLock</span>
            </div>
            <p>Built with ❤️ for building better habits</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 