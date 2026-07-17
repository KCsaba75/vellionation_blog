
import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { sanitizeArticleHtml } from '@/lib/contentSanitizer';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Clock, User, ArrowLeft, Heart, MessageCircle, Share2, Copy, FileText, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { markArticleRead as trackArticleRead } from '@/lib/gamificationService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Facebook, Instagram, MessageSquare } from 'lucide-react';
import ArticleLimitPopup from '@/components/ArticleLimitPopup';
import ArticleAudioPlayer from '@/components/ArticleAudioPlayer';
import FtcDisclosureBanner from '@/components/FtcDisclosureBanner';

const calculateReadingTime = (content) => {
  if (!content) return 1;
  const text = content.replace(/<[^>]*>/g, '');
  const wordCount = text.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(1, readingTime);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canReadArticle, markArticleRead } = useCookieConsent();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState([]);
  const [latestPosts, setLatestPosts] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [canView, setCanView] = useState(true);
  
  const postUrl = window.location.href;

  const userHasLiked = user && likes.some(like => like.user_id === user.id);

  const fetchPostData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    
    // Fetch post details
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey ( name, avatar_url, bio ),
        categories!posts_category_id_fkey ( name ),
        subcategories:categories!posts_subcategory_id_fkey ( name )
      `)
      .eq('slug', slug)
      .single();
    
    if (postError || !postData) {
      console.error('Error fetching post:', postError);
      setPost(null);
      setLoading(false);
      return;
    }
    
    setPost(postData);

    // Fetch comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey ( name )')
      .eq('post_id', postData.id)
      .order('created_at', { ascending: true });
    
    if (commentsError) console.error('Error fetching comments:', commentsError);
    else setComments(commentsData || []);

    // Fetch likes
    const { data: likesData, error: likesError } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postData.id);

    if (likesError) console.error('Error fetching likes:', likesError);
    else setLikes(likesData || []);

    // Fetch latest 4 posts (excluding current post)
    const { data: latestData } = await supabase
      .from('posts')
      .select(`
        id, title, slug, excerpt, image_url, read_time, created_at,
        categories!posts_category_id_fkey ( name )
      `)
      .neq('id', postData.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(4);

    setLatestPosts(latestData || []);

    // Fetch blog disclaimer for FTC compliance
    const { data: disclaimerData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'blog_disclaimer')
      .single();

    if (disclaimerData?.value) {
      setDisclaimer(disclaimerData.value);
    }
    
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchPostData();
  }, [fetchPostData]);

  useEffect(() => {
    if (!loading && post && !user) {
      const allowed = canReadArticle(slug);
      setCanView(allowed);
      if (!allowed) {
        setShowLimitPopup(true);
      } else {
        markArticleRead(slug);
      }
    } else if (user) {
      setCanView(true);
    }
  }, [loading, post, user, slug, canReadArticle, markArticleRead]);

  useEffect(() => {
    if (!user || !post) return;
    trackArticleRead(user.id, post.id).then((res) => {
      if (res?.pointsAwarded > 0) {
        toast({
          title: '📖 +5 points for reading!',
          description: 'Keep exploring — every article counts towards your rank.',
        });
      }
    });
  }, [user, post]);

  const handleShare = (platform) => {
    let url = '';
    const encodedUrl = encodeURIComponent(postUrl);
    const text = encodeURIComponent(post.title);

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'messenger':
        url = `fb-messenger://share?link=${encodedUrl}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(postUrl);
        toast({ title: "Link Copied!", description: "URL copied to your clipboard." });
        return;
      default:
        toast({ title: "Sharing not available for this platform", variant: "destructive" });
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrintPdf = () => {
    const escapeHtml = (str) => String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const safeContent = sanitizeArticleHtml(post.content);
    const safeExcerpt = DOMPurify.sanitize(post.excerpt || '');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${escapeHtml(post.title)} - Vellio Nation</title>
          <style>
            body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            h1 { font-size: 2em; margin-bottom: 0.5em; }
            .meta { color: #666; margin-bottom: 2em; font-size: 0.9em; }
            .excerpt { font-size: 1.1em; color: #444; margin-bottom: 2em; font-style: italic; }
            .content { font-size: 1em; }
            .content img { max-width: 100%; height: auto; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(post.title)}</h1>
          <div class="meta">
            By ${escapeHtml(post.profiles?.name || 'Vellio Team')} | ${escapeHtml(post.read_time || '5 min read')} | ${escapeHtml(post.categories?.name || 'Uncategorized')}
          </div>
          <div class="excerpt">${safeExcerpt}</div>
          <div class="content">${safeContent}</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to comment" });
      return;
    }
    if (!newComment.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: user.id, content: newComment })
      .select('*, profiles!comments_user_id_fkey ( name )')
      .single();

    if (error) {
      toast({ title: 'Error posting comment', description: error.message, variant: 'destructive' });
    } else {
      setComments([...comments, data]);
      setNewComment('');
      toast({ title: "Comment posted!" });
    }
  };
  
  const toggleLike = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to like this post.", variant: "destructive" });
      return;
    }

    if (userHasLiked) {
      // Unlike
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .match({ post_id: post.id, user_id: user.id });

      if (error) {
        toast({ title: "Error unliking post", description: error.message, variant: 'destructive' });
      } else {
        setLikes(likes.filter(like => like.user_id !== user.id));
      }
    } else {
      // Like
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: post.id, user_id: user.id });

      if (error) {
        toast({ title: "Error liking post", description: error.message, variant: 'destructive' });
      } else {
        setLikes([...likes, { post_id: post.id, user_id: user.id }]);
      }
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-12 text-center"><p className="text-muted-foreground">Loading Post...</p></div>;
  if (!post) return <div className="container mx-auto px-4 py-12 text-center"><p className="text-muted-foreground">Post not found</p><Button onClick={() => navigate('/blog')} className="mt-4">Back to Blog</Button></div>;

  return (
    <>
      <Helmet>
        <title>{post.seo_title || post.title} - Vellio Nation</title>
        <meta name="description" content={post.seo_description || post.excerpt} />
        <link rel="canonical" href={`https://www.vellionation.com/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.vellionation.com/blog/${post.slug}`} />
        <meta property="og:title" content={post.seo_title || post.title} />
        <meta property="og:description" content={post.seo_description || post.excerpt} />
        <meta property="og:image" content={post.image_url || "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg"} />
        <meta property="article:published_time" content={post.created_at} />
        <meta property="article:author" content={post.profiles?.name || 'Vellio Team'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seo_title || post.title} />
        <meta name="twitter:description" content={post.seo_description || post.excerpt} />
        <meta name="twitter:image" content={post.image_url || "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg"} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://www.vellionation.com/blog/${post.slug}`
            },
            "headline": post.title,
            "image": {
              "@type": "ImageObject",
              "url": post.image_url || "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg",
              "width": "1200",
              "height": "675"
            },
            "datePublished": post.created_at,
            "dateModified": post.updated_at || post.created_at,
            "author": {
              "@type": "Person",
              "name": post.profiles?.name || "Vellio Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Vellio Nation",
              "logo": {
                "@type": "ImageObject",
                "url": "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/logo.png",
                "width": "600",
                "height": "60"
              }
            },
            "description": post.seo_description || post.excerpt,
            "keywords": (Array.isArray(post.tags) && post.tags.length > 0 ? post.tags.join(', ') + ', ' : '') + "weight loss, women 40+, metabolism, supplements, menopause, health, wellness, diet, fitness"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.vellionation.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Blog",
                "item": "https://www.vellionation.com/blog"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": post.categories?.name || "Article",
                "item": `https://www.vellionation.com/blog?category=${post.category_id || ''}`
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": post.title
              }
            ]
          })}
        </script>
      </Helmet>

      <article className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                {post.categories?.name || 'Uncategorized'}
                {post.subcategories?.name && ` → ${post.subcategories.name}`}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-muted-foreground mb-6">
              <div className="flex items-center gap-2"><User className="h-5 w-5" /><span>{post.profiles?.name || 'Vellio Team'}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-5 w-5" /><span>{formatDate(post.created_at)}</span></div>
              <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><span>{calculateReadingTime(post.content)} min read</span></div>
            </div>
            {canView && <ArticleAudioPlayer content={post.content} title={post.title} />}
            <div className="aspect-video bg-secondary/50 rounded-xl mb-8 overflow-hidden">
              {post.image_url ? (
                <img alt={post.title} className="w-full h-full object-cover" src={post.image_url} loading="lazy" width="800" height="450" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </div>
            <div className="mb-12">
              <FtcDisclosureBanner />
              <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
              
              {canView ? (
                <>
                  <div className="prose prose-lg dark:prose-invert max-w-none rich-content" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(post.content) }} />
                  
                  {disclaimer && (
                    <div className="mt-8 p-4 bg-muted/50 border border-muted-foreground/20 rounded-lg">
                      <div className="text-sm text-muted-foreground [&_img]:inline [&_img]:align-middle [&_img]:mr-2 [&_img]:max-h-8 [&_p]:inline [&_p]:my-0 [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_em]:italic" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(disclaimer) }} />
                    </div>
                  )}
                </>
              ) : (
                <div className="relative">
                  <div className="prose prose-lg dark:prose-invert max-w-none rich-content line-clamp-6 overflow-hidden" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background flex items-end justify-center pb-8">
                    <div className="text-center">
                      <p className="text-lg font-semibold mb-3">Want to read more?</p>
                      <Button onClick={() => setShowLimitPopup(true)}>
                        Unlock Full Article
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 py-6 border-y">
              <Button variant="outline" className="gap-2" onClick={toggleLike} aria-label={userHasLiked ? 'Unlike this article' : 'Like this article'}>
                <Heart className={`h-5 w-5 ${userHasLiked ? 'text-red-500 fill-current' : ''}`} />
                {likes.length}
              </Button>
              <span className="text-muted-foreground">{comments.length} comments</span>
              <div className="flex-grow" />
              {user && (
                <>
                  <Button variant="outline" className="gap-2" onClick={handlePrintPdf} aria-label="Download as PDF">
                    <FileText className="h-5 w-5" /> PDF
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="gap-2" aria-label="Share this article"><Share2 className="h-5 w-5" /> Share</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShare('facebook')}><Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />Facebook</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('messenger')}><MessageSquare className="mr-2 h-4 w-4 text-[#00B2FF]" />Messenger</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({title: "Instagram sharing from web is not directly supported."})}><Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />Instagram</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')}><Copy className="mr-2 h-4 w-4" />Copy Link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>

            {/* Author Section */}
            <section className="mt-10 mb-10">
              <div className="bg-card border rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="flex-shrink-0">
                    {post.profiles?.avatar_url ? (
                      <img 
                        src={post.profiles.avatar_url} 
                        alt={post.profiles?.name || 'Author'} 
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20"
                        width="96"
                        height="96"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/20">
                        <User className="w-12 h-12 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-muted-foreground mb-1">Written by</p>
                    <h2 className="text-xl font-bold mb-2">{post.profiles?.name || 'Vellio Team'}</h2>
                    {post.profiles?.bio ? (
                      <p className="text-muted-foreground leading-relaxed">{post.profiles.bio}</p>
                    ) : (
                      <p className="text-muted-foreground italic">Passionate about wellness and healthy living.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Comments</h2>
              {user && (<div className="mb-8">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full p-4 rounded-lg border bg-background resize-none"
                  rows="4"
                  maxLength={2000}
                  aria-label="Write a comment"
                  aria-describedby="blog-comment-counter"
                />
                <div className="flex items-center justify-between mt-2">
                  <Button onClick={handleComment} disabled={!newComment.trim() || newComment.length > 2000} aria-label="Post comment"><MessageCircle className="mr-2 h-4 w-4" />Post Comment</Button>
                  <span id="blog-comment-counter" className={`text-xs ${newComment.length > 1900 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} aria-live="polite">{newComment.length} / 2000</span>
                </div>
              </div>)}
              <div className="space-y-6">
                {comments.map(comment => (<div key={comment.id} className="bg-card p-6 rounded-lg"><div className="flex items-center gap-2 mb-2"><User className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{comment.profiles?.name || 'Anonymous'}</span><span className="text-sm text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span></div><p className="text-muted-foreground">{comment.content}</p></div>))}
                {comments.length === 0 && (<p className="text-center text-muted-foreground py-8">No comments yet. Be the first to share your thoughts!</p>)}
              </div>
            </section>
          </motion.div>
        </div>
      </article>

      {latestPosts.length > 0 && (
        <section className="pt-4 pb-8 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Latest Articles</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/blog">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {latestPosts.map((latestPost, index) => (
                <motion.article
                  key={latestPost.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow border border-black dark:border-white"
                >
                  <Link to={`/blog/${latestPost.slug}`}>
                    <div className="aspect-video bg-secondary/50">
                      {latestPost.image_url ? (
                        <img
                          alt={latestPost.title}
                          className="w-full h-full object-cover"
                          src={latestPost.image_url}
                          loading="lazy"
                          width="280"
                          height="158"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {latestPost.categories?.name && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {latestPost.categories.name}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm mt-2 line-clamp-2 hover:text-primary transition-colors">
                        {latestPost.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {latestPost.excerpt}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{latestPost.read_time || '5 min read'}</span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}
      
      <ArticleLimitPopup 
        isOpen={showLimitPopup} 
        onClose={() => setShowLimitPopup(false)} 
      />
    </>
  );
};

export default BlogPostPage;
