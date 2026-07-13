import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Star, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

const SolutionsPage = () => {
  const [solutions, setSolutions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [subcategoryCounts, setSubcategoryCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: mainCategories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('type', 'solutions')
        .is('parent_id', null)
        .order('position', { ascending: true });

      const { data: subCategories } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('type', 'solutions')
        .not('parent_id', 'is', null)
        .order('position', { ascending: true });

      const categoriesWithSubs = (mainCategories || []).map(cat => ({
        ...cat,
        subcategories: (subCategories || []).filter(sub => sub.parent_id === cat.id)
      }));

      setCategories(categoriesWithSubs);

      const { data: countData } = await supabase
        .from('solutions')
        .select('category_id, subcategory_id')
        .eq('status', 'active');

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
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSolutions = async () => {
      setLoading(true);
      let query = supabase
        .from('solutions')
        .select(`
          *,
          categories!solutions_category_id_fkey(name),
          subcategories:categories!solutions_subcategory_id_fkey(name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (selectedSubcategoryId !== null) {
        query = query.eq('subcategory_id', selectedSubcategoryId);
      } else if (selectedCategoryId !== null) {
        query = query.eq('category_id', selectedCategoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching solutions:', error);
      } else {
        setSolutions(data || []);
      }
      setLoading(false);
    };

    fetchSolutions();
  }, [selectedCategoryId, selectedSubcategoryId]);

  const filteredSolutions = useMemo(() => {
    if (!searchQuery.trim()) return solutions;
    const query = searchQuery.toLowerCase();
    return solutions.filter(solution =>
      solution.name?.toLowerCase().includes(query) ||
      solution.description?.toLowerCase().includes(query)
    );
  }, [solutions, searchQuery]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null);
    if (categoryId !== null) {
      setExpandedCategories(prev => ({
        ...prev,
        [categoryId]: true
      }));
    }
  };

  const handleSubcategoryClick = (categoryId, subcategoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
  };

  const getSelectedName = () => {
    if (selectedSubcategoryId) {
      const cat = categories.find(c => c.id === selectedCategoryId);
      const sub = cat?.subcategories?.find(s => s.id === selectedSubcategoryId);
      return sub?.name || 'Solutions';
    }
    if (selectedCategoryId) {
      return categories.find(c => c.id === selectedCategoryId)?.name || 'Solutions';
    }
    return 'All Solutions';
  };

  return (
    <>
      <Helmet>
        <title>Weight Loss Products & Apps for Women Over 40 | Recommended Solutions</title>
        <meta name="description" content="Discover the best weight loss products, fitness apps, and health tools for women over 40. Expert-recommended solutions for metabolism support, nutrition tracking, and healthy lifestyle habits." />
        <link rel="canonical" href="https://www.vellionation.com/solutions" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.vellionation.com/solutions" />
        <meta property="og:title" content="Weight Loss Products & Apps for Women Over 40 | Recommended Solutions" />
        <meta property="og:description" content="Best weight loss products and health tools for women over 40. Expert-recommended solutions for metabolism support and healthy living." />
        <meta property="og:image" content="https://rtklsdtadtqpgoibulux.supabase.co/storage/v1/object/public/site_images/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weight Loss Products & Apps for Women Over 40 | Recommended Solutions" />
        <meta name="twitter:description" content="Best weight loss products and health tools for women over 40. Expert-recommended solutions for metabolism support and healthy living." />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-48 lg:w-52 flex-shrink-0">
            <p className="text-lg font-semibold mb-4 px-3">Categories</p>
            <nav className="flex flex-col space-y-1" aria-label="Solution categories">
              <Button
                variant="ghost"
                onClick={() => handleCategoryClick(null)}
                className={cn('w-full justify-start', selectedCategoryId === null && 'bg-primary/10 text-primary')}
              >
                <span>All</span>
                {totalCount > 0 && <span className="text-xs text-muted-foreground ml-1">({totalCount})</span>}
                {selectedCategoryId === null && <ChevronRight className="ml-auto h-4 w-4" />}
              </Button>

              {categories.map(cat => {
                const catCount = categoryCounts[cat.id] || 0;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        onClick={() => handleCategoryClick(cat.id)}
                        className={cn(
                          'flex-1 justify-start',
                          selectedCategoryId === cat.id && selectedSubcategoryId === null && 'bg-primary/10 text-primary'
                        )}
                      >
                        <span>{cat.name}</span>
                        {catCount > 0 && <span className="text-xs text-muted-foreground ml-1">({catCount})</span>}
                        {selectedCategoryId === cat.id && selectedSubcategoryId === null && (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </Button>
                      {cat.subcategories?.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(cat.id);
                          }}
                        >
                          {expandedCategories[cat.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {expandedCategories[cat.id] && cat.subcategories?.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-2">
                        {cat.subcategories.map(sub => {
                          const subCount = subcategoryCounts[sub.id] || 0;
                          return (
                            <Button
                              key={sub.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSubcategoryClick(cat.id, sub.id)}
                              className={cn(
                                'w-full justify-start text-sm',
                                selectedSubcategoryId === sub.id && 'bg-primary/10 text-primary'
                              )}
                            >
                              <span>{sub.name}</span>
                              {subCount > 0 && <span className="text-xs text-muted-foreground ml-1">({subCount})</span>}
                              {selectedSubcategoryId === sub.id && (
                                <ChevronRight className="ml-auto h-4 w-4" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold">{getSelectedName()}</h1>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search solutions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading solutions...</p>
              </div>
            ) : filteredSolutions.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl">
                <p className="text-muted-foreground">
                  {searchQuery ? `No solutions found for "${searchQuery}"` : 'No solutions available in this category yet.'}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSolutions.map((solution, index) => (
                  <motion.div
                    key={solution.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-black dark:border-white"
                  >
                    <div className="aspect-[4/3] bg-secondary/50 flex items-center justify-center">
                      {solution.image_url ? (
                        <img
                          alt={solution.name}
                          className="w-full h-full object-contain"
                          src={solution.image_url}
                          loading="lazy"
                          width="400"
                          height="300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      {solution.categories?.name && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            {solution.categories.name}
                            {solution.subcategories?.name && ` → ${solution.subcategories.name}`}
                          </span>
                        </div>
                      )}
                      <h2 className="text-lg font-bold mb-2">{solution.name}</h2>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{stripHtml(solution.excerpt || solution.description)}</p>
                      <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < (solution.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
                          />
                        ))}
                      </div>
                      <Button asChild className="w-full">
                        <Link to={`/solutions/${solution.slug}`}>
                          View Details <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default SolutionsPage;
