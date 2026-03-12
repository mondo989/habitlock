// SEO.jsx
import { Helmet } from 'react-helmet-async';

const defaultMeta = {
  title: 'HabitLock - Build habits that stick',
  description: 'The beautifully simple habit tracker that helps you build consistency, visualize progress, and achieve your goals with intelligent insights.',
  image: 'https://habitlock.org/cover-thumbnail.png',
  url: 'https://habitlock.org',
  type: 'website'
};

const SEO = ({ 
  title, 
  description, 
  image,
  url,
  type = 'website',
  article = null,
  faqs = null,
  noindex = false
}) => {
  const seo = {
    title: title ? `${title} | HabitLock` : defaultMeta.title,
    description: description || defaultMeta.description,
    image: image || defaultMeta.image,
    url: url || defaultMeta.url,
    type: type
  };

  const faqSchema = faqs ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  } : null;

  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:type" content={seo.type} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:site_name" content="HabitLock" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      
      {/* Article specific */}
      {article && (
        <>
          <meta property="article:published_time" content={article.publishedTime} />
          <meta property="article:author" content={article.author || 'HabitLock Team'} />
          {article.tags?.map((tag, i) => (
            <meta key={i} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* FAQ Schema */}
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={seo.url} />
    </Helmet>
  );
};

export default SEO;
