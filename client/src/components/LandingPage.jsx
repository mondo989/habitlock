import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, onAuthChange } from '../services/firebase';
import ThemeToggle from './ThemeToggle';
import AnimatedCalendar from './AnimatedCalendar';
import styles from './LandingPage.module.scss';

// Import view assets
import view1 from '../assets/view-1.png';
import view2 from '../assets/view-2.png';
import view3 from '../assets/view-3.png';

const LandingPage = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  // Define carousel data first
  const carouselData = [
    {
      image: view1,
      title: "Beautiful Visual Tracking",
      subtitle: "See your progress at a glance",
      description: "Watch your habits come to life with our stunning calendar view. Each completed day creates a unique, colorful gradient that grows more vibrant as you build consistency.",
      highlight: "Visual streaks that motivate"
    },
    {
      image: view2,
      title: "Powerful Analytics & Insights",
      subtitle: "Understand your patterns",
      description: "Dive deep into your habit data with beautiful charts and statistics. Track weekly goals, identify patterns, and celebrate milestones with detailed progress insights.",
      highlight: "Data-driven improvement"
    },
    {
      image: view3,
      title: "Effortless Habit Management",
      subtitle: "Simple yet powerful",
      description: "Add, edit, and organize your habits with our intuitive interface. Set meaningful goals, choose perfect emojis, and customize everything to match your lifestyle.",
      highlight: "Personalized for you"
    }
  ];

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

  // Carousel navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselData.length) % carouselData.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 8000); // Change slide every 8 seconds
    return () => clearInterval(interval);
  }, [carouselData.length]);

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
                    Sign In with Google
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

      {/* Showcase Carousel */}
      <section className={styles.showcase}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2>Experience HabitLock in action</h2>
            <p>Discover the features that make building habits effortless and engaging</p>
          </div>
          
          <div className={styles.carousel}>
            <div className={styles.carouselContainer}>
              <div 
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselData.map((slide, index) => (
                  <div key={index} className={styles.carouselSlide}>
                    <div className={styles.slideContent}>
                      <div className={styles.slideImage}>
                        <img src={slide.image} alt={slide.title} />
                        <div className={styles.imageOverlay}></div>
                      </div>
                      <div className={styles.slideText}>
                        <div className={styles.slideTextContent}>
                          <div className={styles.slideHighlight}>{slide.highlight}</div>
                          <h3 className={styles.slideTitle}>{slide.title}</h3>
                          <p className={styles.slideSubtitle}>{slide.subtitle}</p>
                          <p className={styles.slideDescription}>{slide.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Navigation */}
            <div className={styles.carouselNav}>
              <button 
                className={styles.navButton} 
                onClick={prevSlide}
                aria-label="Previous slide"
              >
                ←
              </button>
              <div className={styles.carouselDots}>
                {carouselData.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.dot} ${index === currentSlide ? styles.active : ''}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <button 
                className={styles.navButton} 
                onClick={nextSlide}
                aria-label="Next slide"
              >
                →
              </button>
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