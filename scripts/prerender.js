#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.vellionation.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rtklsdtadtqpgoibulux.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0a2xzZHRhZHRxcGdvaWJ1bHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTM0MTAsImV4cCI6MjA3Nzk2OTQxMH0.mLf0EfbHZc0ur069ihRwEIIVIMmvO0ogthymfKa0rHs';
const DEFAULT_OG_IMAGE = `${SUPABASE_URL}/storage/v1/object/public/site_images/og-image.jpg`;
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/site_images/logo.png`;
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');
const PLACEHOLDER_RE = /<!--PRERENDER:SEO-->[\s\S]*?<!--\/PRERENDER:SEO-->/;

const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Vellio Nation',
  url: SITE_URL,
  logo: LOGO_URL,
  description:
    'A wellness community helping women over 40 achieve sustainable weight loss through healthy eating, fitness guidance, and lifestyle transformation.',
  sameAs: ['https://www.facebook.com/vellionation', 'https://www.instagram.com/vellionation'],
};

const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Vellio Nation',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/blog?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(str, max = 160) {
  const s = String(str ?? '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<script type="application/ld+json" data-react-helmet="true">${json}</script>`;
}

function buildSeoBlock({
  title,
  description,
  canonical,
  keywords,
  ogType = 'website',
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_OG_IMAGE,
  twitterTitle,
  twitterDescription,
  twitterImage,
  articlePublishedTime,
  articleAuthor,
  jsonLd = [],
}) {
  const lines = [];
  lines.push('<!--PRERENDER:SEO-->');
  lines.push(`<title data-react-helmet="true">${escapeHtml(title)}</title>`);
  lines.push(
    `<meta data-react-helmet="true" name="description" content="${escapeHtml(description)}" />`,
  );
  if (keywords) {
    lines.push(
      `<meta data-react-helmet="true" name="keywords" content="${escapeHtml(keywords)}" />`,
    );
  }
  lines.push(
    `<link data-react-helmet="true" rel="canonical" href="${escapeHtml(canonical)}" />`,
  );
  lines.push(`<meta data-react-helmet="true" property="og:type" content="${escapeHtml(ogType)}" />`);
  lines.push(`<meta data-react-helmet="true" property="og:url" content="${escapeHtml(canonical)}" />`);
  lines.push(
    `<meta data-react-helmet="true" property="og:title" content="${escapeHtml(ogTitle ?? title)}" />`,
  );
  lines.push(
    `<meta data-react-helmet="true" property="og:description" content="${escapeHtml(
      ogDescription ?? description,
    )}" />`,
  );
  lines.push(
    `<meta data-react-helmet="true" property="og:image" content="${escapeHtml(ogImage)}" />`,
  );
  if (articlePublishedTime) {
    lines.push(
      `<meta data-react-helmet="true" property="article:published_time" content="${escapeHtml(
        articlePublishedTime,
      )}" />`,
    );
  }
  if (articleAuthor) {
    lines.push(
      `<meta data-react-helmet="true" property="article:author" content="${escapeHtml(
        articleAuthor,
      )}" />`,
    );
  }
  lines.push(`<meta data-react-helmet="true" name="twitter:card" content="summary_large_image" />`);
  lines.push(
    `<meta data-react-helmet="true" name="twitter:title" content="${escapeHtml(
      twitterTitle ?? title,
    )}" />`,
  );
  lines.push(
    `<meta data-react-helmet="true" name="twitter:description" content="${escapeHtml(
      twitterDescription ?? description,
    )}" />`,
  );
  if (twitterImage) {
    lines.push(
      `<meta data-react-helmet="true" name="twitter:image" content="${escapeHtml(twitterImage)}" />`,
    );
  }
  for (const entry of jsonLd) {
    lines.push(jsonLdScript(entry));
  }
  lines.push('<!--/PRERENDER:SEO-->');
  return lines.join('\n\t\t');
}

function injectSeo(template, seoBlock) {
  if (!PLACEHOLDER_RE.test(template)) {
    throw new Error('SEO placeholder not found in template index.html');
  }
  return template.replace(PLACEHOLDER_RE, seoBlock);
}

function writeHtml(routePath, html) {
  // We write a flat `<path>.html` per route. The runtime server
  // (`scripts/preview.js`) resolves `/foo` -> `dist/foo.html` via try-files.
  let outPath;
  if (routePath === '/') {
    outPath = path.join(DIST_DIR, 'index.html');
  } else {
    const trimmed = routePath.replace(/^\/|\/$/g, '');
    outPath = path.join(DIST_DIR, `${trimmed}.html`);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  return path.relative(DIST_DIR, outPath);
}

function staticRoutes() {
  return [
    {
      path: '/',
      seo: {
        title: 'Weight Loss for Women Over 40 | Vellio Nation',
        description:
          'Proven weight loss strategies for women over 40. Expert tips on losing weight, healthy eating & metabolism boosting. Join Vellio Nation today.',
        canonical: `${SITE_URL}/`,
        keywords:
          'weight loss, weight loss over 40, metabolism reset, longevity lifestyle, ageless vitality, biohacking, functional medicine, healthy weight loss, sustainable transformation, midlife wellness',
        jsonLd: [ORG_JSON_LD, WEBSITE_JSON_LD],
      },
    },
    {
      path: '/blog',
      seo: {
        title: 'Weight Loss Blog for Women Over 40 | Diet, Fitness & Healthy Living Tips',
        description:
          'Expert weight loss tips for women over 40. Read articles on metabolism boosting, healthy eating habits, exercise routines, and lifestyle changes for sustainable results after 40.',
        canonical: `${SITE_URL}/blog`,
        ogDescription:
          'Expert weight loss tips for women over 40. Articles on metabolism boosting, healthy eating, and sustainable lifestyle changes.',
        twitterDescription:
          'Expert weight loss tips for women over 40. Articles on metabolism boosting, healthy eating, and sustainable lifestyle changes.',
      },
    },
    {
      path: '/community',
      seo: {
        title: 'Weight Loss Community for Women Over 40 | Support & Motivation',
        description:
          'Join a supportive weight loss community for women over 40. Share your journey, find motivation, and connect with others on the path to healthier living.',
        canonical: `${SITE_URL}/community`,
      },
    },
    {
      path: '/solutions',
      seo: {
        title: 'Weight Loss Products & Apps for Women Over 40 | Recommended Solutions',
        description:
          'Discover the best weight loss products, fitness apps, and health tools for women over 40. Expert-recommended solutions for metabolism support, nutrition tracking, and healthy lifestyle habits.',
        canonical: `${SITE_URL}/solutions`,
        ogDescription:
          'Best weight loss products and health tools for women over 40. Expert-recommended solutions for metabolism support and healthy living.',
        twitterDescription:
          'Best weight loss products and health tools for women over 40. Expert-recommended solutions for metabolism support and healthy living.',
      },
    },
    {
      path: '/about',
      seo: {
        title: 'About Vellio Nation | Wellness Community for Women Over 40',
        description:
          'Learn about Vellio Nation — our mission, story, and the team helping women over 40 transform their health, energy, and confidence.',
        canonical: `${SITE_URL}/about`,
      },
    },
    {
      path: '/help-center',
      seo: {
        title: 'Help Center - Vellio Nation',
        description:
          'Find answers to common questions about Vellio Nation, including account help, blog access, and community guidelines.',
        canonical: `${SITE_URL}/help-center`,
      },
    },
    {
      path: '/privacy-policy',
      seo: {
        title: 'Privacy Policy - Vellio Nation',
        description:
          'Read the Vellio Nation privacy policy to learn how we collect, use, and protect your personal information.',
        canonical: `${SITE_URL}/privacy-policy`,
      },
    },
    {
      path: '/terms-of-service',
      seo: {
        title: 'Terms of Service - Vellio Nation',
        description:
          'Review the terms and conditions for using Vellio Nation, our blog, community features, and recommended solutions.',
        canonical: `${SITE_URL}/terms-of-service`,
      },
    },
    {
      path: '/login',
      seo: {
        title: 'Sign In to Vellio Nation | Wellness Community for 40+',
        description:
          'Sign in to your Vellio Nation account to read unlimited weight loss articles, join the community, and track your wellness progress.',
        canonical: `${SITE_URL}/login`,
      },
    },
    {
      path: '/register',
      seo: {
        title: 'Join Vellio Nation | Free Wellness Community for 40+',
        description:
          'Create your free Vellio Nation account to access expert weight loss articles, join a supportive community, and start your transformation after 40.',
        canonical: `${SITE_URL}/register`,
      },
    },
    {
      path: '/affiliate-disclosure',
      seo: {
        title: 'Affiliate Disclosure - Vellio Nation',
        description:
          'Learn how Vellio Nation uses affiliate links and how we earn commissions at no extra cost to you. FTC-required disclosure for our product recommendations.',
        canonical: `${SITE_URL}/affiliate-disclosure`,
      },
    },
  ];
}

async function fetchBlogPosts(supabase) {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      slug,
      title,
      excerpt,
      seo_title,
      seo_description,
      image_url,
      created_at,
      updated_at,
      category_id,
      categories!posts_category_id_fkey ( name ),
      profiles!posts_user_id_fkey ( name )
    `,
    )
    .eq('status', 'published');
  if (error) throw new Error(`Failed to fetch posts: ${error.message}`);
  return data || [];
}

async function fetchSolutions(supabase) {
  const { data, error } = await supabase
    .from('solutions')
    .select(
      `
      slug,
      name,
      description,
      seo_title,
      seo_description,
      image_url,
      rating,
      category_id,
      categories!solutions_category_id_fkey(name)
    `,
    )
    .eq('status', 'active');
  if (error) throw new Error(`Failed to fetch solutions: ${error.message}`);
  return data || [];
}

function blogPostSeo(post) {
  if (!post.slug) return null;
  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = `${post.seo_title || post.title} - Vellio Nation`;
  const rawDescription = post.seo_description || post.excerpt || '';
  const description = truncate(stripHtml(rawDescription), 200);
  const image = post.image_url || DEFAULT_OG_IMAGE;
  const authorName = post.profiles?.name || 'Vellio Team';
  const categoryName = post.categories?.name || 'Article';

  const blogPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: stripHtml(post.excerpt || rawDescription),
    image,
    author: { '@type': 'Person', name: authorName },
    publisher: {
      '@type': 'Organization',
      name: 'Vellio Nation',
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `${SITE_URL}/blog?category=${post.category_id || ''}`,
      },
      { '@type': 'ListItem', position: 4, name: post.title },
    ],
  };

  return {
    path: `/blog/${post.slug}`,
    seo: {
      title,
      description,
      canonical: url,
      ogType: 'article',
      ogImage: image,
      twitterImage: image,
      articlePublishedTime: post.created_at,
      articleAuthor: authorName,
      jsonLd: [blogPostingLd, breadcrumbLd],
    },
  };
}

function solutionSeo(solution) {
  if (!solution.slug) return null;
  const url = `${SITE_URL}/solutions/${solution.slug}`;
  const title = `${solution.seo_title || solution.name} - Vellio Nation`;
  const rawDescription = solution.seo_description || solution.description || '';
  const description = truncate(stripHtml(rawDescription), 200);
  const image = solution.image_url || DEFAULT_OG_IMAGE;
  const categoryName = solution.categories?.name || 'Product';

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: solution.name,
    description: stripHtml(solution.description || ''),
    image,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: solution.rating || 5,
      bestRating: 5,
      worstRating: 1,
    },
    brand: { '@type': 'Organization', name: 'Vellio Nation' },
    url,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Solutions', item: `${SITE_URL}/solutions` },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `${SITE_URL}/solutions?category=${solution.category_id || ''}`,
      },
      { '@type': 'ListItem', position: 4, name: solution.name },
    ],
  };

  return {
    path: `/solutions/${solution.slug}`,
    seo: {
      title,
      description,
      canonical: url,
      ogType: 'product',
      ogImage: image,
      twitterImage: image,
      jsonLd: [productLd, breadcrumbLd],
    },
  };
}

async function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Prerender skipped: ${TEMPLATE_PATH} not found. Run vite build first.`);
    process.exit(0);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  if (!PLACEHOLDER_RE.test(template)) {
    console.error(
      'Prerender skipped: <!--PRERENDER:SEO--> placeholder missing from index.html template.',
    );
    process.exit(0);
  }

  const allRoutes = [...staticRoutes()];
  const staticPaths = allRoutes.map((r) => r.path);
  let dynamicCount = 0;

  // Dynamic SEO data is critical for search rankings, so we let any Supabase
  // failure (network, auth, RLS, schema drift) propagate and abort the build
  // instead of silently shipping a deploy with no per-post / per-solution
  // prerendered HTML. Set PRERENDER_ALLOW_EMPTY=1 to bypass in emergencies.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const [posts, solutions] = await Promise.all([
    fetchBlogPosts(supabase),
    fetchSolutions(supabase),
  ]);

  for (const post of posts) {
    const route = blogPostSeo(post);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
    }
  }
  for (const solution of solutions) {
    const route = solutionSeo(solution);
    if (route) {
      allRoutes.push(route);
      dynamicCount++;
    }
  }

  let written = 0;
  let failed = 0;
  for (const route of allRoutes) {
    try {
      const seoBlock = buildSeoBlock(route.seo);
      const html = injectSeo(template, seoBlock);
      const rel = writeHtml(route.path, html);
      written++;
      console.log(`  ✓ ${route.path.padEnd(40)} → ${rel}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${route.path}: ${err.message}`);
    }
  }

  console.log(
    `Prerender complete: ${written} routes written (${dynamicCount} dynamic), ${failed} failed.`,
  );

  // Post-build verification: critical static routes MUST exist on disk.
  const requiredStatic = ['/', '/blog', '/solutions', '/community', '/about'];
  const missing = [];
  for (const p of requiredStatic) {
    if (!staticPaths.includes(p)) continue;
    const expected =
      p === '/'
        ? path.join(DIST_DIR, 'index.html')
        : path.join(DIST_DIR, `${p.replace(/^\//, '')}.html`);
    if (!fs.existsSync(expected)) missing.push(`${p} → ${expected}`);
  }
  if (missing.length > 0) {
    console.error('Prerender verification FAILED — missing critical files:');
    for (const m of missing) console.error(`  - ${m}`);
    process.exit(1);
  }

  if (failed > 0) process.exit(1);

  if (dynamicCount === 0 && process.env.PRERENDER_ALLOW_EMPTY !== '1') {
    console.error(
      'Prerender verification FAILED — zero dynamic routes generated. ' +
        'Supabase returned no posts and no solutions, which almost certainly ' +
        'indicates a data or query problem. Set PRERENDER_ALLOW_EMPTY=1 to bypass.',
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
