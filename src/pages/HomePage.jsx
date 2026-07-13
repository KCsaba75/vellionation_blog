import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Users, TrendingUp, Award, PlayCircle, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/lib/settingsCache';
import DailyTipBanner from '@/components/DailyTipBanner';
import NewsletterSection from '@/components/NewsletterSection';

const HomePage = () => {
  const [homeImages, setHomeImages] = useState({
    hero: '',
    community: ''
  });

  useEffect(() => {
    getSettings().then(s => {
      if (s.home_images) {
        setHomeImages({
          hero: s.home_images.hero || '',
          community: s.home_images.community || ''
        });
      }
    }).catch(err => console.warn('Error fetching home images:', err));
  }, []);
  const features = [
    {
      icon: Heart,
      title: 'Longevity Lifestyle',
      description: 'Embrace sustainable wellness with functional medicine insights and expert guidance'
    },
    {
      icon: Users,
      title: 'Ageless Vitality Circle',
      description: 'Connect with driven individuals committed to mastering their second half'
    },
    {
      icon: TrendingUp,
      title: 'Metabolism Reset Tracker',
      description: 'Monitor your biohacking journey with our gamified transformation system'
    },
    {
      icon: Award,
      title: 'Functional Wellness Rewards',
      description: 'Unlock achievements as you reach your vitality milestones'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Weight Loss for Women Over 40 | Vellio Nation</title>
        <meta name="description" content="Proven weight loss strategies for women over 40. Expert tips on losing weight, healthy eating & metabolism boosting. Join Vellio Nation today." />
        <meta name="keywords" content="weight loss, weight loss over 40, metabolism reset, longevity lifestyle, ageless vitality, biohacking, functional medicine, healthy weight loss, sustainable transformation, midlife wellness" />
        <link rel="canonical" href="https://www.vellionation.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.vellionation.com/" />
        <meta property="og:title" content="Weight Loss for Women Over 40 | Vellio Nation" />
        <meta property="og:description" content="Proven weight loss strategies for women over 40. Expert tips on losing weight, healthy eating & metabolism boosting. Join Vellio Nation today." />
        <meta property="og:image" content="https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weight Loss for Women Over 40 | Vellio Nation" />
        <meta name="twitter:description" content="Proven weight loss strategies for women over 40. Expert tips on losing weight, healthy eating & metabolism boosting. Join Vellio Nation today." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Vellio Nation",
            "url": "https://www.vellionation.com",
            "logo": "https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/logo.png",
            "description": "A wellness community helping women over 40 achieve sustainable weight loss through healthy eating, fitness guidance, and lifestyle transformation.",
            "sameAs": [
              "https://www.facebook.com/vellionation",
              "https://www.instagram.com/vellionation"
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Vellio Nation",
            "url": "https://www.vellionation.com",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://www.vellionation.com/blog?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 pt-8">
        <DailyTipBanner />
      </div>

      <section className="relative overflow-hidden py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Tired of Feeling Like a Stranger<br className="hidden md:block" /> in Your Own Body?<br />{' '}<span className="text-primary">We Know Exactly How to Bring You Back.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                After 40, your hormones shift, your metabolism slows, and everything that used to work stops working — overnight. You're not imagining it. It's not your fault. At Vellio Nation, we combine functional medicine, real science, and the lived wisdom of a thriving 40+ community to help you shed stubborn weight, restore your energy, and step into the strongest, most confident version of yourself. <strong className="text-foreground">This is your decade. Don't waste another day of it.</strong>
              </p>
              <div className="flex flex-col items-start gap-3">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Join the Nation <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <div className="border-l-4 border-primary pl-4 py-1 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Time is passing — and every single day matters.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Read it free, no account needed: what to eat, how to move, how to sleep, how to manage stress — and why it's not your fault it hasn't worked until now. Nutrition, exercise, meditation, hormone balance, weight loss after 40 — it's all there. One article could be all it takes to change everything.
                  </p>
                </div>
                <Button size="lg" asChild>
                  <Link to="/blog">
                    Explore Blog <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <div className="border-l-4 border-primary pl-4 py-1 space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Prefer watching or listening? We've got you covered.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dive into our videos and podcast conversations — real talk on weight loss, nutrition, movement, and mindset for life after 40. No fluff, no gimmicks. Just honest, science-backed insights you can absorb on your commute, at the gym, or on your couch. <span className="text-foreground font-medium">Find them in the menu — anytime, anywhere.</span>
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <PlayCircle className="h-4 w-4" /> Videos
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Headphones className="h-4 w-4" /> Podcasts
                    </span>
                    <span className="text-xs text-muted-foreground">— free, always.</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative w-full rounded-2xl shadow-2xl overflow-hidden" style={{aspectRatio: '800/533'}}>
                {homeImages.hero ? (
                  <img 
                    alt="Wellness fitness group exercising together in nature" 
                    className="absolute inset-0 w-full h-full object-cover" 
                    src={homeImages.hero + '?width=800'}
                    width="800"
                    height="533"
                    fetchpriority="high"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-muted-foreground text-lg">Hero image placeholder</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Vellio Nation?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're more than just a platform - we're a movement dedicated to ageless vitality and sustainable transformation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative w-full rounded-2xl shadow-xl overflow-hidden" style={{aspectRatio: '800/533'}}>
                {homeImages.community ? (
                  <img alt="Community members sharing healthy recipes" className="absolute inset-0 w-full h-full object-cover" src={homeImages.community + '?width=700'} loading="lazy" width="800" height="533" />
                ) : (
                  <div className="absolute inset-0 bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-muted-foreground text-lg">Community image placeholder</span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Join Our Ageless Vitality Community</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Connect with driven individuals committed to mastering their second half. Share biohacking insights, get accountability, and celebrate transformation wins together.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span>Share your journey and spark change in others.</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span>Get exclusive functional medicine insights from our experts.</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-primary/10 rounded-full p-1 mr-3 mt-1">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span>Track your metabolism reset and climb the vitality ranks.</span>
                </li>
              </ul>
              <Button size="lg" asChild>
                <Link to="/community">Explore Community</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <NewsletterSection />

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Master Your Second Half?</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              Join Vellio Nation today and unlock your ageless vitality. Your longevity transformation starts now.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                Join Now - It's Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default HomePage;