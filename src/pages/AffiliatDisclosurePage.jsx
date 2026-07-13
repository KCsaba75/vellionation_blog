import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const AffiliatDisclosurePage = () => (
  <>
    <Helmet>
      <title>Affiliate Disclosure - Vellio Nation</title>
      <meta name="description" content="Learn how Vellio Nation uses affiliate links and how we earn commissions, at no extra cost to you." />
      <link rel="canonical" href="https://www.vellionation.com/affiliate-disclosure" />
    </Helmet>

    <div className="container mx-auto px-4 max-w-3xl py-12">
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <h1>Affiliate Disclosure</h1>

        <p>
          Vellio Nation participates in affiliate marketing programs, which means we may earn
          commissions when you purchase products through our affiliate links — at <strong>no extra
          cost to you</strong>.
        </p>

        <h2>What is an affiliate link?</h2>
        <p>
          An affiliate link is a special tracking link. When you click one and make a purchase,
          the retailer pays us a small commission. The price you pay is exactly the same whether
          or not you use our link.
        </p>

        <h2>How we recommend products</h2>
        <ul>
          <li>We only recommend products we genuinely believe can benefit our readers — women over 40 on a health and weight-loss journey.</li>
          <li>Our recommendations are based on independent research, expert reviews, and community feedback.</li>
          <li>Earning a commission does <strong>not</strong> influence our editorial opinions. We will not recommend something we do not believe in simply because it pays more.</li>
        </ul>

        <h2>Commission disclosure</h2>
        <p>
          Vellio Nation is a participant in various affiliate programs, including the Amazon
          Associates Program and other third-party affiliate networks. We may receive commissions
          from qualifying purchases made through links on our site.
        </p>

        <h2>Questions?</h2>
        <p>
          If you have any questions about our affiliate relationships or how we select products,
          contact us at{' '}
          <a href="mailto:info@vellionation.com">info@vellionation.com</a>.
        </p>

        <p className="text-sm text-muted-foreground mt-8">
          This disclosure is required by the U.S. Federal Trade Commission under 16 CFR Part 255.
          See also our{' '}
          <Link to="/privacy-policy">Privacy Policy</Link> and{' '}
          <Link to="/terms-of-service">Terms of Service</Link>.
        </p>
      </div>
    </div>
  </>
);

export default AffiliatDisclosurePage;
