import { supabase } from './customSupabaseClient';

const SITE_URL = 'https://www.vellionation.com';

const staticPages = [
  { url: '/', changefreq: 'weekly', priority: '1.0', title: 'Weight Loss for Women Over 40 | Vellio Nation', description: 'Discover proven weight loss strategies for women over 40. Expert tips on losing weight, healthy eating, metabolism boosting, and sustainable lifestyle changes.' },
  { url: '/blog', changefreq: 'daily', priority: '0.9', title: 'Weight Loss Blog for Women Over 40 | Diet, Fitness & Healthy Living Tips', description: 'Expert weight loss tips for women over 40. Articles on metabolism boosting, healthy eating habits, exercise routines, and lifestyle changes for sustainable results.' },
  { url: '/community', changefreq: 'daily', priority: '0.8', title: 'Weight Loss Community for Women Over 40 | Support & Motivation', description: 'Join our supportive community of women over 40 on their weight loss journey. Share experiences, get motivated, and find accountability partners.' },
  { url: '/solutions', changefreq: 'weekly', priority: '0.8', title: 'Weight Loss Products & Apps for Women Over 40 | Recommended Solutions', description: 'Discover the best weight loss products, fitness apps, and health tools for women over 40. Expert-recommended solutions for metabolism support and healthy living.' },
  { url: '/about', changefreq: 'monthly', priority: '0.5', title: 'About Vellio Nation | Wellness Community for Women Over 40', description: 'Learn about Vellio Nation, our mission to support women over 40 with evidence-based weight loss strategies, hormone-friendly nutrition, and a welcoming community.' },
  { url: '/login', changefreq: 'monthly', priority: '0.3', title: 'Login - Vellio Nation', description: 'Login to your Vellio Nation account.' },
  { url: '/register', changefreq: 'monthly', priority: '0.3', title: 'Join Vellio Nation', description: 'Create your Vellio Nation account and start your wellness journey today.' },
  { url: '/help-center', changefreq: 'monthly', priority: '0.4', title: 'Help Center - Vellio Nation', description: 'Find answers to common questions about weight loss after 40 and get support.' },
  { url: '/privacy-policy', changefreq: 'monthly', priority: '0.3', title: 'Privacy Policy - Vellio Nation', description: 'Learn how we protect your data and privacy.' },
  { url: '/terms-of-service', changefreq: 'monthly', priority: '0.3', title: 'Terms of Service - Vellio Nation', description: 'Read our terms and conditions for using Vellio Nation.' },
];

function truncateText(text, maxLength = 150) {
  if (!text) return '';
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/HERO:\s*/gi, '')
    .replace(/VALUE:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

export async function generateLlmsTxt() {
  let entries = [];

  entries.push('# Vellio Nation');
  entries.push('');
  entries.push('> Vellio Nation is a weight loss and wellness community for women over 40. We provide evidence-based strategies for losing weight after 40, boosting metabolism, hormone-friendly nutrition, strength training, and sustainable lifestyle transformation. Our platform includes expert blog articles, an active community forum, and curated wellness solutions.');
  entries.push('');
  entries.push('## Static Pages');

  for (const page of staticPages) {
    entries.push(`- [${page.title}](${SITE_URL}${page.url}): ${page.description}`);
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('title, slug, excerpt, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (posts && posts.length > 0) {
    entries.push('');
    entries.push('## Blog Posts');
    
    for (const post of posts) {
      const description = truncateText(post.excerpt) || 'Read this wellness article on Vellio Nation.';
      const date = formatDate(post.created_at);
      entries.push(`- [${post.title}](${SITE_URL}/blog/${post.slug}) (Published: ${date}): ${description}`);
    }
  }

  const { data: solutions } = await supabase
    .from('solutions')
    .select('id, slug, name, description')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (solutions && solutions.length > 0) {
    entries.push('');
    entries.push('## Solutions');
    
    for (const solution of solutions) {
      if (!solution.slug) continue;
      const description = truncateText(solution.description) || 'Discover this wellness solution on Vellio Nation.';
      entries.push(`- [${solution.name}](${SITE_URL}/solutions/${solution.slug}): ${description}`);
    }
  }

  entries.push('');
  entries.push('---');
  entries.push(`Generated: ${new Date().toISOString().split('T')[0]}`);

  return entries.join('\n');
}

export async function generateSitemapXml() {
  let urls = [];

  for (const page of staticPages) {
    urls.push({
      loc: `${SITE_URL}${page.url}`,
      lastmod: formatDate(new Date()),
      changefreq: page.changefreq,
      priority: page.priority
    });
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, created_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  if (posts && posts.length > 0) {
    for (const post of posts) {
      urls.push({
        loc: `${SITE_URL}/blog/${escapeXml(post.slug)}`,
        lastmod: formatDate(post.updated_at || post.created_at),
        changefreq: 'weekly',
        priority: '0.7'
      });
    }
  }

  const { data: solutions } = await supabase
    .from('solutions')
    .select('id, slug, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (solutions && solutions.length > 0) {
    for (const solution of solutions) {
      if (!solution.slug) continue;
      urls.push({
        loc: `${SITE_URL}/solutions/${escapeXml(solution.slug)}`,
        lastmod: formatDate(solution.created_at),
        changefreq: 'weekly',
        priority: '0.6'
      });
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemap;
}

export async function uploadSeoFilesToStorage() {
  try {
    const llmsTxt = await generateLlmsTxt();
    const sitemapXml = await generateSitemapXml();

    const llmsBlob = new Blob([llmsTxt], { type: 'text/plain' });
    const sitemapBlob = new Blob([sitemapXml], { type: 'application/xml' });

    const { error: llmsError } = await supabase.storage
      .from('seo-files')
      .upload('llms.txt', llmsBlob, { upsert: true, contentType: 'text/plain' });

    if (llmsError) {
      console.error('Error uploading llms.txt:', llmsError.message || llmsError);
      return false;
    }

    const { error: sitemapError } = await supabase.storage
      .from('seo-files')
      .upload('sitemap.xml', sitemapBlob, { upsert: true, contentType: 'application/xml' });

    if (sitemapError) {
      console.error('Error uploading sitemap.xml:', sitemapError.message || sitemapError);
      return false;
    }

    console.log('SEO files regenerated successfully');
    return true;
  } catch (error) {
    console.error('Error regenerating SEO files:', error);
    return false;
  }
}

export async function regenerateSeoFiles() {
  return uploadSeoFilesToStorage();
}
