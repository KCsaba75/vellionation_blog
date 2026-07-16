
import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Star, Check, Share2, Copy, Facebook, Instagram, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FtcDisclosureBanner from '@/components/FtcDisclosureBanner';

const SolutionDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(true);

  const solutionUrl = window.location.href;

  useEffect(() => {
    const fetchSolution = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('solutions')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) {
        console.error('Error fetching solution:', error);
        setSolution(null);
      } else {
        setSolution(data);
      }
      setLoading(false);
    };

    if (slug) fetchSolution();
  }, [slug]);
  
  const handleShare = (platform) => {
    let url = '';
    const encodedUrl = encodeURIComponent(solutionUrl);
    const text = encodeURIComponent(solution.name);

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'messenger':
        url = `fb-messenger://share?link=${encodedUrl}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(solutionUrl);
        toast({ title: "Link Copied!", description: "URL copied to your clipboard." });
        return;
      default:
        toast({ title: "Sharing not available for this platform", variant: "destructive" });
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="container mx-auto px-4 py-12 text-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!solution) return <div className="container mx-auto px-4 py-12 text-center"><p className="text-muted-foreground">Solution not found</p><Button onClick={() => navigate('/solutions')} className="mt-4">Back to Solutions</Button></div>;

  return (
    <>
      <Helmet>
        <title>{solution.seo_title || solution.name} - Vellio Nation</title>
        <meta name="description" content={solution.seo_description || solution.description} />
        <link rel="canonical" href={`https://www.vellionation.com/solutions/${solution.slug}`} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://www.vellionation.com/solutions/${solution.slug}`} />
        <meta property="og:title" content={solution.seo_title || solution.name} />
        <meta property="og:description" content={solution.seo_description || solution.description} />
        <meta property="og:image" content={solution.image_url || "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={solution.seo_title || solution.name} />
        <meta name="twitter:description" content={solution.seo_description || solution.description} />
        <meta name="twitter:image" content={solution.image_url || "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg"} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": solution.name,
            "description": solution.description,
            "image": solution.image_url || "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": solution.rating || 5,
              "bestRating": 5,
              "worstRating": 1
            },
            "brand": {
              "@type": "Organization",
              "name": "Vellio Nation"
            },
            "url": `https://www.vellionation.com/solutions/${solution.slug}`
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
                "name": "Solutions",
                "item": "https://www.vellionation.com/solutions"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": solution.categories?.name || "Product",
                "item": `https://www.vellionation.com/solutions?category=${solution.category_id || ''}`
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": solution.name
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-8 lg:py-12">
          <div className="container mx-auto px-4 max-w-6xl">
            <Button variant="ghost" onClick={() => navigate('/solutions')} className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Solutions
            </Button>

            <FtcDisclosureBanner />

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
              {/* Image */}
              <div className="order-2 lg:order-1 min-h-[300px] lg:min-h-[450px]">
                <div className="h-full w-full bg-secondary/30 rounded-2xl overflow-hidden shadow-2xl">
                  {solution.image_url ? (
                    <img 
                      alt={solution.name} 
                      className="w-full h-full object-cover" 
                      src={solution.image_url}
                      loading="lazy"
                      width="800"
                      height="450"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center min-h-[300px]">
                      <span className="text-muted-foreground text-lg">No image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="order-1 lg:order-2 space-y-6">
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-6 w-6 ${i < (solution.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                  ))}
                  <span className="text-muted-foreground ml-2 text-lg">({solution.rating || '5'}.0)</span>
                </div>

                <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">{solution.name}</h1>

                {solution.excerpt && (
                  <div className="text-xl lg:text-2xl text-muted-foreground leading-relaxed prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(solution.excerpt) }} />
                )}

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" className="text-lg px-8 py-6" asChild>
                    <a href={solution.affiliate_url || '#'} target="_blank" rel="noopener noreferrer">
                      Get This Solution <ExternalLink className="ml-2 h-5 w-5" />
                    </a>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="lg" variant="outline" className="px-6 py-6" aria-label="Share this solution">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShare('facebook')}><Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />Facebook</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('messenger')}><MessageSquare className="mr-2 h-4 w-4 text-[#00B2FF]" />Messenger</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({title: "Instagram sharing from web is not directly supported."})}><Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />Instagram</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')}><Copy className="mr-2 h-4 w-4" />Copy Link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Description Section - Full Width */}
        <section className="py-6 lg:py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="prose prose-lg lg:prose-xl dark:prose-invert max-w-none prose-p:leading-snug prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-li:my-0.5"
            >
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(solution.description) }} />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        {solution.features && solution.features.length > 0 && (
          <section className="py-8 lg:py-12 bg-secondary/30">
            <div className="container mx-auto px-4 max-w-4xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-3xl lg:text-4xl font-bold mb-12 text-center">Key Features</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {solution.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4 bg-background p-6 rounded-xl shadow-sm">
                      <div className="bg-primary/10 rounded-full p-2 shrink-0">
                        <Check className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-8 lg:py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-primary/10 to-secondary/20 p-8 lg:p-12 rounded-2xl text-center"
            >
              <h2 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Transform Your Wellness Journey?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                This is an affiliate solution. When you purchase or sign up through our link, you support Vellio Nation at no extra cost to you.
              </p>
              <Button size="lg" className="text-lg px-10 py-6" asChild>
                <a href={solution.affiliate_url || '#'} target="_blank" rel="noopener noreferrer">
                  Get Started Today <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default SolutionDetailPage;
