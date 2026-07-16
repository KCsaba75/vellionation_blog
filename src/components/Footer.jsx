
import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Facebook, Instagram, Youtube } from 'lucide-react';
import { getSettings } from '@/lib/settingsCache';

const Footer = memo(() => {
  const [logoUrl, setLogoUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', youtube: '', spotify: '' });

  useEffect(() => {
    getSettings().then(s => {
      if (s.home_images?.logo) setLogoUrl(s.home_images.logo);
      if (s.social_links) setSocialLinks(s.social_links);
    }).catch(err => console.warn('Failed to fetch footer settings:', err));
  }, []);

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Vellio Nation" className="h-10 mb-4 rounded-full object-cover" width="40" height="40" loading="lazy" />
            ) : (
              <div className="h-10 w-10 mb-4 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Logo</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Your journey to wellness starts here.
            </p>
          </div>

          <div>
            <span className="font-semibold mb-4 block">Quick Links</span>
            <nav className="flex flex-col space-y-2">
              <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</Link>
              <Link to="/community" className="text-sm text-muted-foreground hover:text-primary transition-colors">Community</Link>
              <Link to="/solutions" className="text-sm text-muted-foreground hover:text-primary transition-colors">Solutions</Link>
            </nav>
          </div>

          <div>
            <span className="font-semibold mb-4 block">Support</span>
            <nav className="flex flex-col space-y-2">
              <Link to="/help-center" className="text-sm text-muted-foreground hover:text-primary transition-colors">Help Center</Link>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/affiliate-disclosure" className="text-sm text-muted-foreground hover:text-primary transition-colors">Affiliate Disclosure</Link>
            </nav>
          </div>

          <div>
            <span className="font-semibold mb-4 block">Connect</span>
            <p className="text-sm text-muted-foreground mb-2">
              Email:{' '}
              <a href="mailto:info@vellionation.com" className="hover:text-primary transition-colors">
                info@vellionation.com
              </a>
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Join our community and start your transformation today.
            </p>
            <div className="flex items-center gap-3 min-h-[24px]">
              {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Open Facebook page" className="text-muted-foreground hover:text-secondary transition-colors"><Facebook className="h-6 w-6" /></a>}
              {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Open Instagram page" className="text-muted-foreground hover:text-secondary transition-colors"><Instagram className="h-6 w-6" /></a>}
              {socialLinks.youtube && <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="Open YouTube channel" className="text-muted-foreground hover:text-secondary transition-colors"><Youtube className="h-6 w-6" /></a>}
              {socialLinks.spotify && <a href={socialLinks.spotify} target="_blank" rel="noopener noreferrer" aria-label="Open Spotify profile" className="text-muted-foreground hover:text-secondary transition-colors"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg></a>}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 flex-wrap">
            Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by Vellio Nation · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
