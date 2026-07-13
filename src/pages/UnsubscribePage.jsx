import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    const doUnsubscribe = async () => {
      const { data, error } = await supabase
        .rpc('unsubscribe_by_token', { p_token: token });

      if (error) {
        setStatus('error');
      } else if (!data) {
        setStatus('invalid');
      } else {
        setStatus('success');
      }
    };

    doUnsubscribe();
  }, [token]);

  return (
    <>
      <Helmet>
        <title>Unsubscribe | Vellio Nation</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-[60vh] flex items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-auto px-4 text-center"
        >
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Processing your request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h1 className="text-2xl font-bold">You've been unsubscribed</h1>
              <p className="text-muted-foreground">
                You'll no longer receive newsletter emails from Vellio Nation. We're sorry to see you go!
              </p>
              <p className="text-sm text-muted-foreground">
                Changed your mind? You can always resubscribe on our website.
              </p>
              <Button asChild className="mt-2">
                <Link to="/">Back to Vellio Nation</Link>
              </Button>
            </div>
          )}

          {(status === 'invalid' || status === 'error') && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Link not valid</h1>
              <p className="text-muted-foreground">
                This unsubscribe link is invalid or has already been used. You may already be unsubscribed.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/">Back to Vellio Nation</Link>
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default UnsubscribePage;
