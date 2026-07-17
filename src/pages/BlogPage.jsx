
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, User, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import DailyTipBanner from '@/components/DailyTipBanner';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getReadArticleIds } from '@/lib/gamificationService';

const getReadMoreCta = (post) => {
  const combined = ((post.title || '') + ' ' + (post.categories?.name || '')).toLowerCase();
  if (combined.includes('hormone')) return 'Discover Your Hormone-Balancing Weight Loss Plan';
  if (combined.includes('story') || combined.includes('success') || combined.includes('sarah') || combined.includes('real life') || combined.includes('real-life')) return 'See This Real-Life Weight Loss Story';
  if (combined.includes('belly') || combined.includes('bloat') || combined.includes('midsection') || combined.includes('flat')) return 'Reveal Your Flat Belly Food Secrets';
  if (combined.includes('perimenopause') || combined.includes('menopause')) return 'Navigate Perimenopause Weight Gain Effectively';
  if (combined.includes('morning') || combined.includes('minute') || combined.includes('routine') || combined.includes('7-minute')) return 'Start Your Metabolism-Boosting Morning Routine';
  if (combined.includes('energy') || combined.includes('lazy') || combined.includes('easy') || combined.includes('simple')) return 'Get Your Easy Energy & Fat-Burning Guide';
  return 'Unlock Your Post-40 Metabolism Secret';
};

const BlogPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryCounts, setCategoryCounts] = useState({});
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [readIds, setReadIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    getReadArticleIds(user.id).then((ids) => {
      setReadIds(new Set(ids));
    });
  }, [user]);

  useEffect(() => {
    const fetchCategoriesAndSubcategories = async () => {
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'blog')
        .is('parent_id', null)
        .order('position', { ascending: true });
      setCategories(catData || []);

      const { data: subData } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('type', 'blog')
        .not('parent_id', 'is', null)
        .order('position', { ascending: true });
      setSubcategories(subData || []);

      const { data: countData } = await supabase
        .from('posts')
        .select('category_id, subcategory_id')
        .eq('status', 'published');

      if (countData) {
        setTotalCount(countData.length);
        const catMap = {};
        const subMap = {};
        countData.forEach(({ category_id, subcategory_id }) => {
          if (category_id) catMap[category_id] = (catMap[category_id] || 0) + 1;
          if (subcategory_id) subMap[subcategory_id] = (subMap[subcategory_id] || 0) + 1;
        });
        setCategoryCounts(catMap);
        setSubcategoryCounts(subMap);
      }
    };
    fetchCategoriesAndSubcategories();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey ( name ),
          categories!posts_category_id_fkey ( name ),
          subcategories:categories!posts_subcategory_id_fkey ( name )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (selectedSubcategory) {
        query = query.eq('subcategory_id', selectedSubcategory);
      } else if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, [selectedCategory, selectedSubcategory]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(post => 
      post.title?.toLowerCase().includes(query) ||
      post.excerpt?.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleCategoryClick = (categoryId) => {
    if (selectedCategory === categoryId && !selectedSubcategory) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(null);
    }
    if (!expandedCategories[categoryId]) {
      toggleCategory(categoryId);
    }
  };

  const handleSubcategoryClick = (categoryId, subcategoryId) => {
    if (selectedSubcategory === subcategoryId) {
      setSelectedSubcategory(null);
      setSelectedCategory(categoryId);
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(subcategoryId);
    }
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearchQuery('');
  };

  const getSubcategoriesForCategory = (categoryId) => {
    return subcategories.filter(sub => sub.parent_id === categoryId);
  };

  return (
    <>
      <Helmet>
        <title>Weight Loss Blog for Women Over 40 | Diet, Fitness & Healthy Living Tips</title>
        <meta name="description" content="Expert weight loss tips for women over 40. Read articles on metabolism boosting, healthy eating habits, exercise routines, and lifestyle changes for sustainable results after 40." />
        <link rel="canonical" href="https://www.vellionation.com/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.vellionation.com/blog" />
        <meta property="og:title" content="Weight Loss Blog for Women Over 40 | Diet, Fitness & Healthy Living Tips" />
        <meta property="og:description" content="Expert weight loss tips for women over 40. Articles on metabolism boosting, healthy eating, and sustainable lifestyle changes." />
        <meta property="og:image" content="https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weight Loss Blog for Women Over 40 | Diet, Fitness & Healthy Living Tips" />
        <meta name="twitter:description" content="Expert weight loss tips for women over 40. Articles on metabolism boosting, healthy eating, and sustainable lifestyle changes." />
      </Helmet>

      <section className="py-6 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Vellio Nation Blog</h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Discover inspiring stories, expert tips, and practical advice for your wellness journey.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 overflow-x-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-52 flex-shrink-0">
              <div className="bg-card rounded-xl p-4 shadow-lg sticky top-4">
                <p className="font-bold text-lg mb-4">Categories</p>
                <nav className="space-y-1" aria-label="Article categories">
                  <button
                    onClick={clearFilters}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                    }`}
                  >
                    <span>All Articles</span>
                    {totalCount > 0 && <span className={`text-xs ml-1 ${!selectedCategory ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>({totalCount})</span>}
                  </button>
                  {categories.map(category => {
                    const subs = getSubcategoriesForCategory(category.id);
                    const isExpanded = expandedCategories[category.id];
                    const isSelected = selectedCategory === category.id && !selectedSubcategory;
                    const catCount = categoryCounts[category.id] || 0;

                    return (
                      <div key={category.id}>
                        <div className="flex items-center">
                          {subs.length > 0 && (
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="p-1 hover:bg-secondary rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleCategoryClick(category.id)}
                            className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                            } ${subs.length === 0 ? 'ml-5' : ''}`}
                          >
                            <span>{category.name}</span>
                            {catCount > 0 && <span className={`text-xs ml-1 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>({catCount})</span>}
                          </button>
                        </div>
                        {isExpanded && subs.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1">
                            {subs.map(sub => {
                              const subCount = subcategoryCounts[sub.id] || 0;
                              const isSubSelected = selectedSubcategory === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => handleSubcategoryClick(category.id, sub.id)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                    isSubSelected
                                      ? 'bg-primary/80 text-primary-foreground'
                                      : 'hover:bg-secondary text-muted-foreground'
                                  }`}
                                >
                                  <span>{sub.name}</span>
                                  {subCount > 0 && <span className={`text-xs ml-1 ${isSubSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>({subCount})</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </aside>

            <div className="flex-1">
              <DailyTipBanner />
              <div className="max-w-md mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {(selectedCategory || selectedSubcategory) && (
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-sm text-muted-foreground">Filtering by:</span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {selectedSubcategory
                      ? subcategories.find(s => s.id === selectedSubcategory)?.name
                      : categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading posts...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery ? `No articles found for "${searchQuery}"` : 'No blog posts yet. Check back soon!'}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-black dark:border-white"
                    >
                      <div className="relative aspect-video bg-secondary/50 flex items-center justify-center">
                        {post.image_url ? (
                          <img alt={post.title} className="w-full h-full object-cover" src={post.image_url} loading="lazy" width="400" height="225" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No image</span>
                          </div>
                        )}
                        {readIds.has(post.id) && (
                          <span className="absolute top-2 right-2 bg-green-100 text-green-700 dark:bg-green-900/80 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
                            ✓ Read
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                            {post.categories?.name || 'Uncategorized'}
                            {post.subcategories?.name && ` → ${post.subcategories.name}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.read_time || '5 min read'}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold mb-2 line-clamp-2">{post.title}</h2>
                        <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{post.profiles?.name || 'Vellio Team'}</span>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/blog/${post.slug}`}>{getReadMoreCta(post)}</Link>
                          </Button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BlogPage;
