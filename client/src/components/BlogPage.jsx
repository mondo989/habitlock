// BlogPage.jsx
import { Link } from 'react-router-dom';
import styles from './BlogPage.module.scss';

const blogArticles = [
  {
    id: 1,
    title: "Why Most Habits Fail After a Good Start — and What Actually Makes Them Stick",
    description: "Most habits do not fail at the start. They fail in the middle. Here's what the research says about why that happens and what actually helps habits last.",
    url: "/blog/blog-why-most-habits-fail-after-a-good-start-and-what-actually-makes-them-stick.html",
    readTime: "10 min read",
    category: "Habit Science"
  },
  {
    id: 2,
    title: "The If-Then Method: A Smarter Way to Build Habits That Last",
    description: "Most habits fail because they stay vague. The if-then method turns good intentions into clear actions the brain can actually follow.",
    url: "/blog/the-if-then-method-a-smarter-way-to-build-habits-that-last.html",
    readTime: "11 min read",
    category: "Strategies"
  }
];

const BlogPage = () => {
  return (
    <div className={styles.blogPage}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <Link to="/" className={styles.logo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </Link>
          <Link to="/" className={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.header}>
          <span className={styles.label}>Resources</span>
          <h1>HabitLock Blog</h1>
          <p>Research-backed insights and practical strategies to help you build habits that actually stick.</p>
        </header>

        <div className={styles.articleGrid}>
          {blogArticles.map((article) => (
            <a 
              key={article.id} 
              href={article.url}
              className={styles.articleCard}
            >
              <div className={styles.articleMeta}>
                <span className={styles.category}>{article.category}</span>
                <span className={styles.readTime}>{article.readTime}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <span className={styles.readMore}>
                Read article →
              </span>
            </a>
          ))}
        </div>

        <section className={styles.cta}>
          <h2>Ready to put these ideas into practice?</h2>
          <p>HabitLock helps you build habits that stick with visual tracking and smart insights.</p>
          <Link to="/" className={styles.ctaButton}>
            Start Building Habits →
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <img src="/habit-lock-logo.svg" alt="HabitLock" className={styles.logoIcon} />
            <span>HabitLock</span>
          </div>
          <p>© 2026 HabitLock. Made with ❤️ for habit builders.</p>
        </div>
      </footer>
    </div>
  );
};

export default BlogPage;
