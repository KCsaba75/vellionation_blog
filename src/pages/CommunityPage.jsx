
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageCircle, Heart, User, Send, ChevronRight, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';
import CommunityComments from '@/components/CommunityComments';
import { convertToWebPWithResize } from '@/lib/imageUtils';

const CommunityPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const newPostTextAreaRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'community')
        .is('parent_id', null)
        .order('position', { ascending: true });
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const fetchPosts = useCallback(async () => {
    if (categories.length === 0) return;
    setLoading(true);
    let query = supabase.from('community_posts').select(`*, profiles!community_posts_user_id_fkey(name, rank), categories!community_posts_category_id_fkey(name), subcategories:categories!community_posts_subcategory_id_fkey(name), community_post_likes(user_id), community_comments(id)`).order('created_at', { ascending: false });
    if (selectedCategoryId !== null) query = query.eq('category_id', selectedCategoryId);
    const { data, error } = await query;
    if (error) {
      toast({ title: "Error fetching posts", message: error.message, variant: "destructive" });
    } else {
      setPosts(data.map(p => ({
        ...p,
        likes: p.community_post_likes.length,
        user_has_liked: user ? p.community_post_likes.some(l => l.user_id === user.id) : false,
        comment_count: p.community_comments.length
      })));
    }
    setLoading(false);
  }, [selectedCategoryId, categories, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleImageUpload = useCallback(async (file) => {
    if (!user) return null;
    
    try {
      const webpFile = await convertToWebPWithResize(file, 1920, 1080, 0.85);
      const fileName = `${user.id}-${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage.from('community_post_images').upload(fileName, webpFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'image/webp'
      });

      if (uploadError) {
        toast({ title: "Image Upload Failed", description: uploadError.message, variant: "destructive" });
        return null;
      }
      const { data } = supabase.storage.from('community_post_images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      toast({ title: "Image conversion failed", description: err.message, variant: "destructive" });
      return null;
    }
  }, [user]);

  const insertTextAtCursor = (text) => {
    const textarea = newPostTextAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = newPostContent.substring(0, start) + text + newPostContent.substring(end);
    setNewPostContent(newContent);
    // Move cursor after inserted text
    setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }, 0);
  };
  
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        toast({ title: "Uploading image..." });
        const imageUrl = await handleImageUpload(file);
        if (imageUrl) {
          const markdownImage = `\n![image](${imageUrl})\n`;
          insertTextAtCursor(markdownImage);
          setUploadedImages(prev => [...prev, imageUrl]);
          toast({ title: "Image uploaded!" });
        }
        return;
      }
    }
  }, [handleImageUpload, newPostContent]);
  
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        toast({ title: "Uploading image..." });
        const imageUrl = await handleImageUpload(file);
        if (imageUrl) {
          const markdownImage = `\n![image](${imageUrl})\n`;
          insertTextAtCursor(markdownImage);
          setUploadedImages(prev => [...prev, imageUrl]);
          toast({ title: "Image uploaded!" });
        }
      }
    }
  }, [handleImageUpload, newPostContent]);

  const removeImage = (imageUrl) => {
    setUploadedImages(prev => prev.filter(url => url !== imageUrl));
    const markdownPattern = new RegExp(`\\n?!\\[image\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n?`, 'g');
    setNewPostContent(prev => prev.replace(markdownPattern, '\n').replace(/\n{3,}/g, '\n\n').trim());
  };

  const handleCreatePost = async () => {
    if (!user) { toast({ title: "Login Required", description: "Please login to create posts" }); return; }
    if (selectedCategoryId === null) { toast({ title: "Select a category", description: "Please select a specific category to post.", variant: "destructive" }); return; }
    if (!newPostContent.trim()) return;

    const { error } = await supabase.from('community_posts').insert({ user_id: user.id, content: newPostContent, category_id: selectedCategoryId });
    if (error) {
      toast({ title: "Error creating post", description: error.message, variant: 'destructive' });
    } else {
      setNewPostContent('');
      setUploadedImages([]);
      toast({ title: "Post created!" });
      fetchPosts();
    }
  };

  const toggleLike = async (postId, userHasLiked) => {
    if (!user) { toast({ title: "Login Required", description: "Please login to like posts.", variant: "destructive" }); return; }
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: userHasLiked ? p.likes - 1 : p.likes + 1, user_has_liked: !userHasLiked } : p));
    if (userHasLiked) {
      await supabase.from('community_post_likes').delete().match({ community_post_id: postId, user_id: user.id });
    } else {
      await supabase.from('community_post_likes').insert({ community_post_id: postId, user_id: user.id });
    }
  };

  const renderContent = (content) => {
    const parts = content.split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, index) => {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <img key={index} src={match[2]} alt={match[1]} className="my-2 rounded-lg max-h-80 object-contain" loading="lazy" width="400" height="300" />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      <Helmet>
        <title>Weight Loss Community for Women Over 40 | Support & Motivation</title>
        <meta name="description" content="Join our supportive community of women over 40 on their weight loss journey. Share experiences, get motivated, and find accountability partners for sustainable healthy living." />
        <link rel="canonical" href="https://www.vellionation.com/community" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.vellionation.com/community" />
        <meta property="og:title" content="Weight Loss Community for Women Over 40 | Support & Motivation" />
        <meta property="og:description" content="Join our supportive community of women over 40 on their weight loss journey. Share experiences and find accountability partners." />
        <meta property="og:image" content="https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weight Loss Community for Women Over 40 | Support & Motivation" />
        <meta name="twitter:description" content="Join our supportive community of women over 40 on their weight loss journey. Share experiences and find accountability partners." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-1/4 lg:w-1/5"><p className="text-lg font-semibold mb-4 px-3">Categories</p><nav className="flex flex-col space-y-1" aria-label="Community categories">
            <Button variant="ghost" onClick={() => setSelectedCategoryId(null)} className={cn('w-full justify-start', selectedCategoryId === null && 'bg-primary/10 text-primary')}>
              All{selectedCategoryId === null && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
            {categories.map(cat => (<Button key={cat.id} variant="ghost" onClick={() => setSelectedCategoryId(cat.id)} className={cn('w-full justify-start', selectedCategoryId === cat.id && 'bg-primary/10 text-primary')}>{cat.name}{selectedCategoryId === cat.id && <ChevronRight className="ml-auto h-4 w-4" />}</Button>))}
          </nav></aside>
          <main className="flex-1 flex flex-col">
            <h1 className="text-3xl font-bold mb-4">{selectedCategoryId === null ? 'All' : categories.find(c => c.id === selectedCategoryId)?.name || 'Community'}</h1>
            <div className="flex-grow space-y-6 overflow-y-auto pr-2 mb-8">
              {loading ? (<div className="text-center py-12"><p>Loading posts...</p></div>) : posts.length === 0 ? (<div className="text-center py-12 bg-card rounded-xl"><p className="text-muted-foreground">No posts yet in this category. Be the first to share!</p></div>) : (posts.map((post, index) => (
                <motion.article key={post.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="bg-card p-6 rounded-xl shadow-lg border border-black dark:border-white">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-primary/10 rounded-full p-3"><User className="h-6 w-6 text-primary" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{post.profiles?.name || 'Anonymous'}</span>
                        <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full font-medium">{post.profiles?.rank || 'New Member'}</span>
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                          {post.categories?.name || 'General'}
                          {post.subcategories?.name && ` → ${post.subcategories.name}`}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-foreground mb-4 whitespace-pre-wrap">{renderContent(post.content)}</div>
                  <div className="flex items-center gap-4 pt-4 border-t"><Button variant="ghost" size="sm" className="gap-2" onClick={() => toggleLike(post.id, post.user_has_liked)} aria-label={post.user_has_liked ? 'Unlike this post' : 'Like this post'}><Heart className={cn('h-4 w-4', post.user_has_liked && 'text-red-500 fill-current')} />{post.likes} Likes</Button>
                    <Dialog><DialogTrigger asChild><Button variant="ghost" size="sm" className="gap-2" aria-label="View comments"><MessageCircle className="h-4 w-4" /> {post.comment_count} Comments</Button></DialogTrigger><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>Comments</DialogTitle></DialogHeader><CommunityComments postId={post.id} /></DialogContent></Dialog>
                  </div>
                </motion.article>
              )))}
            </div>
            {user && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-4 bg-card p-4 rounded-xl shadow-lg mt-auto" onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={handleDrop}>
                {isDragOver && (<div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center pointer-events-none"><UploadCloud className="h-10 w-10 text-primary" /><p className="text-primary font-bold">Drop image to upload</p></div>)}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img src={imageUrl} alt={`Upload ${index + 1}`} className="h-20 w-20 object-cover rounded-lg border-2 border-primary" width="80" height="80" />
                        <button type="button" onClick={() => removeImage(imageUrl)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg" aria-label="Remove image">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <textarea ref={newPostTextAreaRef} value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} onPaste={handlePaste} placeholder={selectedCategoryId === null ? "Select a category to post..." : "Share with the community... (drag-and-drop or paste an image)"} className="w-full p-3 pr-12 rounded-lg border bg-background resize-none" rows="3" maxLength={5000} disabled={selectedCategoryId === null} aria-label="Write a new post" aria-describedby="community-post-counter" />
                  <Button onClick={handleCreatePost} size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9" disabled={(!newPostContent.trim() && uploadedImages.length === 0) || selectedCategoryId === null || newPostContent.length > 5000} aria-label="Submit post"><Send className="h-4 w-4" /></Button>
                </div>
                <div className="text-right mt-1">
                  <span id="community-post-counter" className={`text-xs ${newPostContent.length > 4750 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} aria-live="polite">{newPostContent.length} / 5000</span>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default CommunityPage;
