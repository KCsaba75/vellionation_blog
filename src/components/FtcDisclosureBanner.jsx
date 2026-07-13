import React from 'react';
import { Link } from 'react-router-dom';

const FtcDisclosureBanner = () => (
  <div className="mb-6 rounded-md border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm dark:bg-blue-950/40 dark:border-blue-400">
    <p className="font-semibold text-blue-800 dark:text-blue-200">
      💡 FTC Disclosure
    </p>
    <p className="mt-1 text-blue-700 dark:text-blue-300">
      This page contains affiliate links. If you make a purchase through these links, we may earn a commission at no extra cost to you. We only recommend products we genuinely believe in.{' '}
      <Link to="/affiliate-disclosure" className="underline hover:text-blue-900 dark:hover:text-blue-100">
        Learn more
      </Link>
      .
    </p>
  </div>
);

export default FtcDisclosureBanner;
