import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.vellionation.com';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rtklsdtadtqpgoibulux.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0a2xzZHRhZHRxcGdvaWJ1bHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzOTM0MTAsImV4cCI6MjA3Nzk2OTQxMH0.mLf0EfbHZc0ur069ihRwEIIVIMmvO0ogthymfKa0rHs';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

const staticPages = [
  { url: '/', title: 'Vellio Nation - Your Health & Wellness Community', description: 'Join Vellio Nation and embark on your wellness journey. Get inspired, connect with our community, and achieve your health goals.' },
  { url: '/blog', title: 'Blog - Vellio Nation', description: 'Explore wellness articles, health tips, and lifestyle advice from our community of experts.' },
  { url: '/community', title: 'Community - Vellio Nation', description: 'Connect with like-minded individuals on their wellness journey. Share experiences and support each other.' },
  { url: '/solutions', title: 'Solutions - Vellio Nation', description: 'Discover wellness products, apps, and educational resources to support your healthy lifestyle.' },
  { url: '/about', title: 'About Vellio Nation', description: 'Learn about Vellio Nation, our mission to support women over 40 with evidence-based weight loss strategies, hormone-friendly nutrition, and a welcoming community.' },
  { url: '/login', title: 'Login - Vellio Nation', description: 'Login to your Vellio Nation account.' },
  { url: '/register', title: 'Join Vellio Nation', description: 'Create your Vellio Nation account and start your wellness journey today.' },
  { url: '/forgot-password', title: 'Forgot Password - Vellio Nation', description: 'Reset your Vellio Nation password.' },
  { url: '/help-center', title: 'Help Center - Vellio Nation', description: 'Find answers to common questions and get support.' },
  { url: '/privacy-policy', title: 'Privacy Policy - Vellio Nation', description: 'Learn how we protect your data and privacy.' },
  { url: '/terms-of-service', title: 'Terms of Service - Vellio Nation', description: 'Read our terms and conditions for using Vellio Nation.' },
];

function truncateText(text, maxLength = 150) {
  if (!text) return '';
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

async function generateLlmsTxt() {
  console.log('Generating dynamic llms.txt...');
  
  let entries = [];

  entries.push('# Vellio Nation');
  entries.push('');
  entries.push('> A wellness community platform dedicated to healthy living, mindful choices, and sustainable transformation.');
  entries.push('');
  entries.push('## Static Pages');

  for (const page of staticPages) {
    entries.push(`- [${page.title}](${SITE_URL}${page.url}): ${page.description}`);
  }

  try {
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('title, slug, excerpt, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.warn('Could not fetch posts:', postsError.message);
    } else if (posts && posts.length > 0) {
      console.log(`Found ${posts.length} published blog posts`);
      entries.push('');
      entries.push('## Blog Posts');
      
      for (const post of posts) {
        const description = truncateText(post.excerpt) || 'Read this wellness article on Vellio Nation.';
        entries.push(`- [${post.title}](${SITE_URL}/blog/${post.slug}): ${description}`);
      }
    }
  } catch (err) {
    console.warn('Error fetching posts:', err.message);
  }

  try {
    const { data: solutions, error: solutionsError } = await supabase
      .from('solutions')
      .select('id, name, description')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (solutionsError) {
      console.warn('Could not fetch solutions:', solutionsError.message);
    } else if (solutions && solutions.length > 0) {
      console.log(`Found ${solutions.length} active solutions`);
      entries.push('');
      entries.push('## Solutions');
      
      for (const solution of solutions) {
        const description = truncateText(solution.description) || 'Discover this wellness solution on Vellio Nation.';
        entries.push(`- [${solution.name}](${SITE_URL}/solutions/${solution.id}): ${description}`);
      }
    }
  } catch (err) {
    console.warn('Error fetching solutions:', err.message);
  }

  entries.push('');
  entries.push('---');
  entries.push(`Generated: ${new Date().toISOString().split('T')[0]}`);

  const llmsTxt = entries.join('\n');
  const outputPath = path.join(process.cwd(), 'public', 'llms.txt');
  
  fs.writeFileSync(outputPath, llmsTxt, 'utf8');
  console.log(`llms.txt generated at ${outputPath}`);
}

generateLlmsTxt().catch(console.error);
