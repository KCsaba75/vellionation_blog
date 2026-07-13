
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Plus, Trash2, Edit, CheckCircle, Eye, BarChart, User, Upload, Settings, Save, Package, MessageSquare, FileText, X, Image } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { supabase } from '@/lib/customSupabaseClient';
import { regenerateSeoFiles } from '@/lib/seoFileGenerator';
import { invalidateSettingsCache } from '@/lib/settingsCache';
import { convertToWebPWithResize } from '@/lib/imageUtils';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import RichTextEditor from '@/components/RichTextEditor';
import '@/index.css';
import HierarchicalCategoryManager from '@/components/HierarchicalCategoryManager';
import CategorySelector from '@/components/CategorySelector';

const AdminPage = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [stats, setStats] = useState({ users: 0, posts: 0, solutions: 0, comments: 0 });
  const [posts, setPosts] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', youtube: '', spotify: '' });
  const [pageContents, setPageContents] = useState({
    about: { content: '' },
    help: { content: '' },
    privacy: { content: '' },
    terms: { content: '' },
  });
  const [homeImages, setHomeImages] = useState({
    hero: '',
    community: '',
    logo: ''
  });
  const [disclaimer, setDisclaimer] = useState('');
  const [trackingCodes, setTrackingCodes] = useState({ google_analytics_id: '', facebook_pixel_id: '' });

  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState(null);
  const fileInputRef = useRef(null);
  const heroImageRef = useRef(null);
  const communityImageRef = useRef(null);
  const logoImageRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingHomeImage, setUploadingHomeImage] = useState(null);

  const fetchData = useCallback(async () => {
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    const { count: solutionsCount } = await supabase.from('solutions').select('*', { count: 'exact', head: true });
    const { count: commentsCount } = await supabase.from('comments').select('*', { count: 'exact', head: true });
    setStats({ users: usersCount, posts: postsCount, solutions: solutionsCount, comments: commentsCount });

    const { data: postsData } = await supabase.from('posts').select('*, profiles!posts_user_id_fkey(name), categories!posts_category_id_fkey(name), subcategories:categories!posts_subcategory_id_fkey(name)').order('created_at', { ascending: false });
    setPosts(postsData || []);
    const { data: solutionsData } = await supabase.from('solutions').select('*, categories!solutions_category_id_fkey(name), subcategories:categories!solutions_subcategory_id_fkey(name)').order('created_at', { ascending: false });
    setSolutions(solutionsData || []);
    const { data: usersData } = await supabase.rpc('admin_list_profiles');
    setUsers(usersData || []);
    
    const { data: settingsData } = await supabase.from('settings').select('key, value');
    if (settingsData) {
      setSocialLinks(settingsData.find(s => s.key === 'social_links')?.value || { facebook: '', instagram: '', youtube: '', spotify: '' });
      setPageContents({
        about: settingsData.find(s => s.key === 'page_content_about')?.value || { content: '' },
        help: settingsData.find(s => s.key === 'page_content_help')?.value || { content: '' },
        privacy: settingsData.find(s => s.key === 'page_content_privacy')?.value || { content: '' },
        terms: settingsData.find(s => s.key === 'page_content_terms')?.value || { content: '' },
      });
      setHomeImages(settingsData.find(s => s.key === 'home_images')?.value || { hero: '', community: '', logo: '' });
      setDisclaimer(settingsData.find(s => s.key === 'blog_disclaimer')?.value || '');
      setTrackingCodes(settingsData.find(s => s.key === 'tracking_codes')?.value || { google_analytics_id: '', facebook_pixel_id: '' });
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== 'admin') {
        navigate('/');
        return;
      }
      fetchData();
    }
  }, [profile, authLoading, navigate, fetchData]);

  const handleCreate = (type) => {
    if (type === 'post') {
      setEditingItem({
        title: '',
        content: '',
        excerpt: '',
        category_id: null,
        subcategory_id: null,
        status: 'draft',
        image_url: '',
        seo_title: '',
        seo_description: '',
        user_id: profile.id
      });
    } else if (type === 'solution') {
      setEditingItem({
        name: '',
        excerpt: '',
        description: '',
        category_id: null,
        subcategory_id: null,
        status: 'active',
        image_url: '',
        affiliate_url: '',
        features: [],
        rating: 5,
        seo_title: '',
        seo_description: ''
      });
    }
    setFormType(type);
    setIsFormOpen(true);
  };

  const handleEdit = (item, type) => {
    setEditingItem(item);
    setFormType(type);
    setIsFormOpen(true);
  };
  
  const handleDelete = async (id, table) => {
    if (!window.confirm(`Are you sure you want to delete this item from ${table}? This cannot be undone.`)) return;
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if(error){
      toast({title: `Error deleting item from ${table}`, description: error.message, variant: 'destructive'});
    } else {
      toast({title: 'Item deleted!'});
      fetchData();
      if (table === 'posts' || table === 'solutions') {
        regenerateSeoFiles();
      }
    }
  };
  
  const handleUserRoleChange = async (userId, newRole) => {
    if (userId === profile.id) {
      toast({ title: 'Cannot change your own role', variant: 'destructive' });
      return;
    }
    
    let newRank;
    if (newRole === 'admin') {
      newRank = 'Vellio Ambassador';
    } else if (newRole === 'blogger') {
      newRank = 'Health Hero';
    }
    
    const updateData = newRank ? { role: newRole, rank: newRank } : { role: newRole };
    const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
    
    if(error) {
       toast({ title: 'Error updating user role', description: error.message, variant: 'destructive' });
    } else {
       toast({ title: `User role updated to ${newRole}${newRank ? ' with rank ' + newRank : ''}!` });
       fetchData();
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const table = formType === 'post' ? 'posts' : 'solutions';
    
    const { categories, subcategories, profiles, ...cleanedData } = editingItem;
    let postData = { ...cleanedData };
    
    if (formType === 'post' && !editingItem.id) {
      const slug = editingItem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      postData = { ...postData, slug, user_id: profile.id };
    }

    if (formType === 'solution' && !editingItem.id) {
      const slug = editingItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      postData = { ...postData, slug };
    }
    
    let response;
    if (editingItem.id) {
      response = await supabase.from(table).update(postData).eq('id', editingItem.id);
    } else {
      response = await supabase.from(table).insert(postData);
    }
    
    if (response.error) {
      toast({ title: `Error ${editingItem.id ? 'updating' : 'creating'} ${formType}`, description: response.error.message, variant: 'destructive' });
    } else {
      toast({ title: `${formType} ${editingItem.id ? 'updated' : 'created'} successfully!` });
      setIsFormOpen(false);
      setEditingItem(null);
      fetchData();
      regenerateSeoFiles();

      if (formType === 'post' && postData.status === 'published') {
        try {
          await supabase.functions.invoke('send-blog-notification', {
            body: {
              postTitle: postData.title,
              postExcerpt: postData.excerpt || '',
              postSlug: postData.slug,
              postImageUrl: postData.image_url || null,
            },
          });
        } catch (e) {
          console.warn('Blog notification send skipped:', e.message);
        }
      }
    }
  };

  const handleImageUpload = async (event) => {
    if (!event.target.files || event.target.files.length === 0 || !editingItem) return;
    const file = event.target.files[0];
    const bucket = formType === 'post' ? 'post_images' : 'solution_images';

    setUploading(true);
    
    try {
      const webpFile = await convertToWebPWithResize(file, 1920, 1080, 0.85);
      const fileName = `${profile.id}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, webpFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'image/webp'
      });

      if (uploadError) {
        toast({ title: "Image Upload Failed", description: uploadError.message, variant: "destructive" });
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

      setEditingItem({ ...editingItem, image_url: data.publicUrl });
      setUploading(false);
      toast({ title: "Image uploaded successfully!" });
    } catch (err) {
      toast({ title: "Image conversion failed", description: err.message, variant: "destructive" });
      setUploading(false);
    }
  };
  
  const handleSaveSettings = async (key, value) => {
    const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    if (error) {
      toast({ title: `Error saving ${key}`, description: error.message, variant: 'destructive' });
    } else {
      invalidateSettingsCache();
      toast({ title: "Settings updated!" });
    }
  };

  const handleHomeImageUpload = async (event, imageType) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    
    setUploadingHomeImage(imageType);
    
    try {
      const webpFile = await convertToWebPWithResize(file, 1920, 1080, 0.85);
      const fileName = `home-${imageType}-${Date.now()}.webp`;

      const { error: uploadError } = await supabase.storage.from('site_images').upload(fileName, webpFile, {
        cacheControl: '31536000',
        upsert: true,
        contentType: 'image/webp'
      });

      if (uploadError) {
        toast({ title: "Image Upload Failed", description: uploadError.message, variant: "destructive" });
        setUploadingHomeImage(null);
        return;
      }

      const { data } = supabase.storage.from('site_images').getPublicUrl(fileName);
      const newHomeImages = { ...homeImages, [imageType]: data.publicUrl };
      
      const { error: saveError } = await supabase.from('settings').upsert({ key: 'home_images', value: newHomeImages }, { onConflict: 'key' });
      
      if (saveError) {
        toast({ title: "Failed to save image settings", description: saveError.message, variant: "destructive" });
        setUploadingHomeImage(null);
        return;
      }
      
      setHomeImages(newHomeImages);
      setUploadingHomeImage(null);
      invalidateSettingsCache();
      toast({ title: `${imageType === 'hero' ? 'Hero' : 'Community'} image updated!` });
    } catch (err) {
      toast({ title: "Image conversion failed", description: err.message, variant: "destructive" });
      setUploadingHomeImage(null);
    }
  };

  const handleRemoveHomeImage = async (imageType) => {
    const newHomeImages = { ...homeImages, [imageType]: '' };
    
    const { error } = await supabase.from('settings').upsert({ key: 'home_images', value: newHomeImages }, { onConflict: 'key' });
    
    if (error) {
      toast({ title: "Failed to remove image", description: error.message, variant: "destructive" });
      return;
    }
    
    setHomeImages(newHomeImages);
    invalidateSettingsCache();
    toast({ title: `${imageType === 'hero' ? 'Hero' : 'Community'} image removed` });
  };

  const handlePageContentChange = (page, content) => {
    setPageContents(prev => ({...prev, [page]: {content}}));
  };
  
  if (authLoading || !profile || profile.role !== 'admin') {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Helmet><title>Admin Dashboard - Vellio Nation</title></Helmet>
      <div className="py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 h-auto p-1">
                <TabsTrigger value="dashboard" className="text-xs sm:text-sm w-full justify-center truncate">Dashboard</TabsTrigger>
                <TabsTrigger value="posts" className="text-xs sm:text-sm w-full justify-center truncate">Blog</TabsTrigger>
                <TabsTrigger value="solutions" className="text-xs sm:text-sm w-full justify-center truncate">Solutions</TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm w-full justify-center truncate">Users</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm w-full justify-center truncate col-span-2 sm:col-span-1">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-card p-6 rounded-xl shadow-lg flex items-center gap-4"><User className="h-8 w-8 text-primary" /><div className="flex flex-col"><span className="text-2xl font-bold">{stats.users}</span><span className="text-muted-foreground">Users</span></div></div>
                    <div className="bg-card p-6 rounded-xl shadow-lg flex items-center gap-4"><Edit className="h-8 w-8 text-primary" /><div className="flex flex-col"><span className="text-2xl font-bold">{stats.posts}</span><span className="text-muted-foreground">Blog Posts</span></div></div>
                    <div className="bg-card p-6 rounded-xl shadow-lg flex items-center gap-4"><Package className="h-8 w-8 text-primary" /><div className="flex flex-col"><span className="text-2xl font-bold">{stats.solutions}</span><span className="text-muted-foreground">Solutions</span></div></div>
                    <div className="bg-card p-6 rounded-xl shadow-lg flex items-center gap-4"><MessageSquare className="h-8 w-8 text-primary" /><div className="flex flex-col"><span className="text-2xl font-bold">{stats.comments}</span><span className="text-muted-foreground">Comments</span></div></div>
                 </div>
              </TabsContent>

              <TabsContent value="posts">
                 <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg">
                   <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                     <h2 className="text-xl font-semibold">Manage Blog Posts</h2>
                     <Button onClick={() => handleCreate('post')} size="sm" className="md:size-default"><Plus className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Create Post</span><span className="sm:hidden">New</span></Button>
                   </div>
                   
                   {/* Desktop Table View */}
                   <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase"><tr><th className="py-3 px-4">Title</th><th className="py-3 px-4">Author</th><th className="py-3 px-4">Category</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th></tr></thead>
                        <tbody>
                            {posts.map(post => (<tr key={post.id} className="border-b dark:border-gray-700">
                                <td className="py-3 px-4 font-semibold">{post.title}</td><td className="py-3 px-4">{post.profiles?.name || 'N/A'}</td>
                                <td className="py-3 px-4"><span className="bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full text-xs">{post.categories?.name || 'Uncategorized'}{post.subcategories?.name && ` → ${post.subcategories.name}`}</span></td>
                                <td className="py-3 px-4"><span className={`font-medium ${post.status === 'published' ? 'text-green-500' : 'text-yellow-500'}`}>{post.status}</span></td>
                                <td className="py-3 px-4 flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/blog/${post.slug}`)}><Eye className="h-4 w-4"/></Button>
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(post, 'post')}><Edit className="h-4 w-4"/></Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id, 'posts')}><Trash2 className="h-4 w-4"/></Button>
                                </td>
                            </tr>))}
                        </tbody></table>
                   </div>

                   {/* Mobile Card View */}
                   <div className="md:hidden space-y-3">
                     {posts.map(post => (
                       <div key={post.id} className="bg-background/50 border rounded-lg p-4 space-y-2">
                         <div className="flex justify-between items-start gap-2">
                           <h3 className="font-semibold text-sm leading-tight flex-1">{post.title}</h3>
                           <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${post.status === 'published' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>{post.status}</span>
                         </div>
                         <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                           <span>👤 {post.profiles?.name || 'N/A'}</span>
                           <span>•</span>
                           <span className="bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full">{post.categories?.name || 'Uncategorized'}{post.subcategories?.name && ` → ${post.subcategories.name}`}</span>
                         </div>
                         <div className="flex gap-2 pt-2">
                           <Button size="sm" variant="outline" onClick={() => navigate(`/blog/${post.slug}`)} className="flex-1"><Eye className="h-3 w-3 mr-1"/>View</Button>
                           <Button size="sm" variant="outline" onClick={() => handleEdit(post, 'post')} className="flex-1"><Edit className="h-3 w-3 mr-1"/>Edit</Button>
                           <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id, 'posts')}><Trash2 className="h-3 w-3"/></Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
              </TabsContent>

              <TabsContent value="solutions">
                 <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg">
                   <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                     <h2 className="text-xl font-semibold">Manage Solutions</h2>
                     <Button onClick={() => handleCreate('solution')} size="sm" className="md:size-default"><Plus className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Create Solution</span><span className="sm:hidden">New</span></Button>
                   </div>
                   
                   {/* Desktop Table View */}
                   <div className="hidden md:block overflow-x-auto">
                       <table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase"><tr><th className="py-3 px-4">Name</th><th className="py-3 px-4">Category</th><th className="py-3 px-4">Status</th><th className="py-3 px-4">Actions</th></tr></thead>
                       <tbody>
                          {solutions.map(solution => (<tr key={solution.id} className="border-b dark:border-gray-700">
                              <td className="py-3 px-4 font-semibold">{solution.name}</td>
                              <td className="py-3 px-4"><span className="bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full text-xs">{solution.categories?.name || 'Uncategorized'}{solution.subcategories?.name && ` → ${solution.subcategories.name}`}</span></td>
                              <td className="py-3 px-4"><span className={`font-medium ${solution.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>{solution.status}</span></td>
                              <td className="py-3 px-4 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEdit(solution, 'solution')}><Edit className="h-4 w-4"/></Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(solution.id, 'solutions')}><Trash2 className="h-4 w-4"/></Button>
                              </td>
                          </tr>))}
                       </tbody></table>
                   </div>

                   {/* Mobile Card View */}
                   <div className="md:hidden space-y-3">
                     {solutions.map(solution => (
                       <div key={solution.id} className="bg-background/50 border rounded-lg p-4 space-y-2">
                         <div className="flex justify-between items-start gap-2">
                           <h3 className="font-semibold text-sm leading-tight flex-1">{solution.name}</h3>
                           <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${solution.status === 'active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>{solution.status}</span>
                         </div>
                         <div className="text-xs text-muted-foreground">
                           <span className="bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded-full">{solution.categories?.name || 'Uncategorized'}{solution.subcategories?.name && ` → ${solution.subcategories.name}`}</span>
                         </div>
                         <div className="flex gap-2 pt-2">
                           <Button size="sm" variant="outline" onClick={() => handleEdit(solution, 'solution')} className="flex-1"><Edit className="h-3 w-3 mr-1"/>Edit</Button>
                           <Button size="sm" variant="destructive" onClick={() => handleDelete(solution.id, 'solutions')}><Trash2 className="h-3 w-3"/></Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
              </TabsContent>

              <TabsContent value="users">
                <div className="bg-card p-4 md:p-6 rounded-xl shadow-lg">
                   <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
                   
                   {/* Desktop Table View */}
                   <div className="hidden md:block overflow-x-auto">
                       <table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground uppercase"><tr><th className="py-3 px-4">Name</th><th className="py-3 px-4">Email</th><th className="py-3 px-4">Rank</th><th className="py-3 px-4">Role</th></tr></thead>
                       <tbody>
                          {users.map(userItem => (<tr key={userItem.id} className="border-b dark:border-gray-700">
                              <td className="py-3 px-4 font-semibold">
                                <span>{userItem.name}</span>
                                {userItem.is_founding_member && (
                                  <span className="ml-2 text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-400 px-2 py-0.5 rounded-full">⭐ Founding</span>
                                )}
                              </td>
                              <td className="py-3 px-4">{userItem.email}</td>
                              <td className="py-3 px-4">{userItem.rank}</td>
                              <td className="py-3 px-4">
                                <select value={userItem.role} onChange={(e) => handleUserRoleChange(userItem.id, e.target.value)} disabled={userItem.id === profile.id} className="p-2 rounded-lg border bg-background disabled:opacity-50">
                                  <option value="member">Member</option>
                                  <option value="blogger">Blogger</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                          </tr>))}
                       </tbody></table>
                   </div>

                   {/* Mobile Card View */}
                   <div className="md:hidden space-y-3">
                     {users.map(userItem => (
                       <div key={userItem.id} className="bg-background/50 border rounded-lg p-4 space-y-3">
                         <div>
                           <div className="flex flex-wrap items-center gap-2">
                             <h3 className="font-semibold text-sm">{userItem.name}</h3>
                             {userItem.is_founding_member && (
                               <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-400 px-2 py-0.5 rounded-full">⭐ Founding</span>
                             )}
                           </div>
                           <p className="text-xs text-muted-foreground mt-0.5">{userItem.email}</p>
                         </div>
                         <div className="flex flex-wrap gap-2 text-xs">
                           <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">Rank: {userItem.rank}</span>
                         </div>
                         <div>
                           <Label className="text-xs mb-1 block">Role</Label>
                           <select 
                             value={userItem.role} 
                             onChange={(e) => handleUserRoleChange(userItem.id, e.target.value)} 
                             disabled={userItem.id === profile.id} 
                             className="w-full p-2 rounded-lg border bg-background disabled:opacity-50 text-sm"
                           >
                             <option value="member">Member</option>
                             <option value="blogger">Blogger</option>
                             <option value="admin">Admin</option>
                           </select>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                  {/* Home Page Images */}
                  <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg space-y-4 sm:space-y-6 lg:col-span-2">
                    <div className="flex items-center gap-2"><Image className="h-5 w-5 text-primary" /><h2 className="text-lg sm:text-xl font-semibold">Home Page Images</h2></div>
                    <p className="text-sm text-muted-foreground">Upload images for the home page. For best performance, use WebP format and keep file size under 500KB.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Site Logo */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Site Logo</Label>
                        {homeImages.logo ? (
                          <div className="relative">
                            <img src={homeImages.logo} alt="Logo preview" className="w-full h-32 object-contain rounded-lg border-2 border-primary bg-white p-2" width="200" height="128" loading="lazy" />
                            <button type="button" onClick={() => handleRemoveHomeImage('logo')} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg" aria-label="Remove site logo">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No logo uploaded</span>
                          </div>
                        )}
                        <input type="file" ref={logoImageRef} onChange={(e) => handleHomeImageUpload(e, 'logo')} accept="image/*" className="hidden" aria-label="Upload site logo file" />
                        <Button type="button" size="sm" onClick={() => logoImageRef.current?.click()} disabled={uploadingHomeImage === 'logo'} className="w-full" aria-label={uploadingHomeImage === 'logo' ? 'Uploading site logo' : homeImages.logo ? 'Change site logo' : 'Upload site logo'}>
                          <Upload className="mr-2 h-4 w-4" />{uploadingHomeImage === 'logo' ? 'Uploading...' : homeImages.logo ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                      </div>

                      {/* Hero Image */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Hero Image (Main Banner)</Label>
                        {homeImages.hero ? (
                          <div className="relative">
                            <img src={homeImages.hero} alt="Hero preview" className="w-full h-32 object-cover rounded-lg border-2 border-primary" width="200" height="128" loading="lazy" />
                            <button type="button" onClick={() => handleRemoveHomeImage('hero')} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg" aria-label="Remove hero image">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No image uploaded</span>
                          </div>
                        )}
                        <input type="file" ref={heroImageRef} onChange={(e) => handleHomeImageUpload(e, 'hero')} accept="image/*" className="hidden" aria-label="Upload hero image file" />
                        <Button type="button" size="sm" onClick={() => heroImageRef.current?.click()} disabled={uploadingHomeImage === 'hero'} className="w-full" aria-label={uploadingHomeImage === 'hero' ? 'Uploading hero image' : homeImages.hero ? 'Change hero image' : 'Upload hero image'}>
                          <Upload className="mr-2 h-4 w-4" />{uploadingHomeImage === 'hero' ? 'Uploading...' : homeImages.hero ? 'Change Image' : 'Upload Image'}
                        </Button>
                      </div>

                      {/* Community Image */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Community Section Image</Label>
                        {homeImages.community ? (
                          <div className="relative">
                            <img src={homeImages.community} alt="Community preview" className="w-full h-32 object-cover rounded-lg border-2 border-primary" width="200" height="128" loading="lazy" />
                            <button type="button" onClick={() => handleRemoveHomeImage('community')} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg" aria-label="Remove community image">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                            <span className="text-muted-foreground text-sm">No image uploaded</span>
                          </div>
                        )}
                        <input type="file" ref={communityImageRef} onChange={(e) => handleHomeImageUpload(e, 'community')} accept="image/*" className="hidden" aria-label="Upload community image file" />
                        <Button type="button" size="sm" onClick={() => communityImageRef.current?.click()} disabled={uploadingHomeImage === 'community'} className="w-full" aria-label={uploadingHomeImage === 'community' ? 'Uploading community image' : homeImages.community ? 'Change community image' : 'Upload community image'}>
                          <Upload className="mr-2 h-4 w-4" />{uploadingHomeImage === 'community' ? 'Uploading...' : homeImages.community ? 'Change Image' : 'Upload Image'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* General Settings */}
                  <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg space-y-4 sm:space-y-6 lg:col-span-2">
                     <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /><h2 className="text-lg sm:text-xl font-semibold">General Settings</h2></div>
                     <div><Label htmlFor="facebook-url" className="text-sm">Facebook URL</Label><input id="facebook-url" value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" placeholder="https://facebook.com/yourpage" /></div>
                     <div><Label htmlFor="instagram-url" className="text-sm">Instagram URL</Label><input id="instagram-url" value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" placeholder="https://instagram.com/yourprofile" /></div>
                     <div><Label htmlFor="youtube-url" className="text-sm">YouTube URL</Label><input id="youtube-url" value={socialLinks.youtube} onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" placeholder="https://youtube.com/@yourchannel" /></div>
                     <div><Label htmlFor="spotify-url" className="text-sm">Spotify URL</Label><input id="spotify-url" value={socialLinks.spotify} onChange={e => setSocialLinks({...socialLinks, spotify: e.target.value})} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" placeholder="https://open.spotify.com/show/yourshow" /></div>
                     <Button onClick={() => handleSaveSettings('social_links', socialLinks)} size="sm" className="text-xs sm:text-sm"><Save className="mr-2 h-4 w-4" />Save Social Links</Button>
                  </div>

                  {/* Tracking Codes */}
                  <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg space-y-4 sm:space-y-6 lg:col-span-2">
                     <div className="flex items-center gap-2"><BarChart className="h-5 w-5 text-primary" /><h2 className="text-lg sm:text-xl font-semibold">Analytics & Tracking</h2></div>
                     <p className="text-sm text-muted-foreground">Add your tracking IDs to enable analytics on all pages. These codes will be automatically injected into every page.</p>
                     <div>
                       <Label htmlFor="google-analytics-id" className="text-sm">Google Analytics Measurement ID</Label>
                       <input id="google-analytics-id" value={trackingCodes.google_analytics_id} onChange={e => setTrackingCodes({...trackingCodes, google_analytics_id: e.target.value})} placeholder="G-XXXXXXXXXX" className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm font-mono" />
                       <p className="text-xs text-muted-foreground mt-1">Enter your Google Analytics 4 Measurement ID (starts with G-)</p>
                     </div>
                     <div>
                       <Label htmlFor="facebook-pixel-id" className="text-sm">Facebook Pixel ID</Label>
                       <input id="facebook-pixel-id" value={trackingCodes.facebook_pixel_id} onChange={e => setTrackingCodes({...trackingCodes, facebook_pixel_id: e.target.value})} placeholder="123456789012345" className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm font-mono" />
                       <p className="text-xs text-muted-foreground mt-1">Enter your Facebook Pixel ID (15-16 digit number)</p>
                     </div>
                     <Button onClick={() => handleSaveSettings('tracking_codes', trackingCodes)} size="sm" className="text-xs sm:text-sm"><Save className="mr-2 h-4 w-4" />Save Tracking Codes</Button>
                  </div>

                  {/* Blog Disclaimer - FTC Compliance */}
                  <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg space-y-4 sm:space-y-6 lg:col-span-2">
                     <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg sm:text-xl font-semibold">Blog Disclaimer</h2></div>
                     <p className="text-sm text-muted-foreground">This disclaimer will appear at the bottom of all blog posts. Use it for FTC disclosure, affiliate disclaimers, or medical advice warnings.</p>
                     <div className="prose dark:prose-invert max-w-none">
                       <RichTextEditor 
                         value={disclaimer} 
                         onChange={setDisclaimer} 
                         placeholder="Example: This post may contain affiliate links. We may earn a commission if you make a purchase through these links..."
                         className="min-h-[80px]"
                       />
                     </div>
                     <Button onClick={() => handleSaveSettings('blog_disclaimer', disclaimer)} size="sm" className="text-xs sm:text-sm"><Save className="mr-2 h-4 w-4" />Save Disclaimer</Button>
                  </div>

                  {/* Categories - Hierarchical Management */}
                  <HierarchicalCategoryManager type="blog" title="Blog Categories" />
                  <HierarchicalCategoryManager type="community" title="Community Categories" />
                  <HierarchicalCategoryManager type="solutions" title="Solutions Categories" />

                  {/* Page Content */}
                  <div className="lg:col-span-2 bg-card p-4 sm:p-6 rounded-xl shadow-lg space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="text-lg sm:text-xl font-semibold">Page Content</h2></div>
                    <div className="prose dark:prose-invert max-w-none">
                      <Label className="text-sm sm:text-lg font-medium">About Us</Label>
                      <RichTextEditor value={pageContents.about.content} onChange={(c) => handlePageContentChange('about', c)} className="mt-2"/>
                      <Button className="mt-2" size="sm" onClick={() => handleSaveSettings('page_content_about', pageContents.about)}><Save className="mr-2 h-4 w-4"/>Save About Page</Button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      <Label className="text-sm sm:text-lg font-medium">Help Center</Label>
                      <RichTextEditor value={pageContents.help.content} onChange={(c) => handlePageContentChange('help', c)} className="mt-2"/>
                      <Button className="mt-2" size="sm" onClick={() => handleSaveSettings('page_content_help', pageContents.help)}><Save className="mr-2 h-4 w-4"/>Save Help Page</Button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      <Label className="text-sm sm:text-lg font-medium">Privacy Policy</Label>
                      <RichTextEditor value={pageContents.privacy.content} onChange={(c) => handlePageContentChange('privacy', c)} className="mt-2"/>
                      <Button className="mt-2" size="sm" onClick={() => handleSaveSettings('page_content_privacy', pageContents.privacy)}><Save className="mr-2 h-4 w-4"/>Save Privacy Page</Button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      <Label className="text-sm sm:text-lg font-medium">Terms of Service</Label>
                      <RichTextEditor value={pageContents.terms.content} onChange={(c) => handlePageContentChange('terms', c)} className="mt-2"/>
                      <Button className="mt-2" size="sm" onClick={() => handleSaveSettings('page_content_terms', pageContents.terms)}><Save className="mr-2 h-4 w-4"/>Save Terms Page</Button>
                    </div>
                  </div>

                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-lg sm:text-xl">{editingItem?.id ? 'Edit' : 'Create'} {formType}</DialogTitle></DialogHeader>
          {editingItem && (
            <form onSubmit={handleFormSubmit} className="space-y-3 sm:space-y-4 pt-4">
              {formType === 'post' && (
                <>
                  <div><Label htmlFor="post-title" className="text-sm">Title</Label><input id="post-title" value={editingItem.title || ''} onChange={e => setEditingItem({ ...editingItem, title: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" required /></div>
                  <div>
                    <Label htmlFor="post-author" className="text-sm">Author</Label>
                    <select
                      id="post-author"
                      value={editingItem.user_id || ''}
                      onChange={e => setEditingItem({ ...editingItem, user_id: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm"
                    >
                      <option value="">— Select author —</option>
                      {users.filter(u => ['admin', 'blogger'].includes(u.role)).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div><Label htmlFor="post-excerpt" className="text-sm">Excerpt</Label><textarea id="post-excerpt" value={editingItem.excerpt || ''} onChange={e => setEditingItem({ ...editingItem, excerpt: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" rows={2} /></div>
                  <CategorySelector
                    type="blog"
                    categoryId={editingItem.category_id}
                    subcategoryId={editingItem.subcategory_id}
                    onCategoryChange={(id) => setEditingItem({ ...editingItem, category_id: id })}
                    onSubcategoryChange={(id) => setEditingItem({ ...editingItem, subcategory_id: id })}
                    required
                  />
                  <div className="prose dark:prose-invert max-w-none"><Label htmlFor="post-content" className="text-sm">Content</Label><RichTextEditor value={editingItem.content || ''} onChange={c => setEditingItem({...editingItem, content: c})} className="mt-1" fullWidth={true} /></div>
                  <div><Label htmlFor="post-seo-title" className="text-sm">SEO Title</Label><input id="post-seo-title" value={editingItem.seo_title || ''} onChange={e => setEditingItem({ ...editingItem, seo_title: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" /></div>
                  <div><Label htmlFor="post-seo-desc" className="text-sm">SEO Description</Label><textarea id="post-seo-desc" value={editingItem.seo_description || ''} onChange={e => setEditingItem({ ...editingItem, seo_description: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" rows={2} /></div>
                  <div className="flex items-center space-x-2"><Switch id="post-status" checked={editingItem.status === 'published'} onCheckedChange={(checked) => setEditingItem({ ...editingItem, status: checked ? 'published' : 'draft' })} /><Label htmlFor="post-status">{editingItem.status === 'published' ? 'Published' : 'Draft'}</Label></div>
                </>
              )}
              {formType === 'solution' && (
                <>
                  <div><Label htmlFor="solution-name" className="text-sm">Name</Label><input id="solution-name" value={editingItem.name || ''} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" required /></div>
                  <div className="prose dark:prose-invert max-w-none"><Label htmlFor="solution-excerpt" className="text-sm">Excerpt</Label><RichTextEditor value={editingItem.excerpt || ''} onChange={e => setEditingItem({...editingItem, excerpt: e})} className="mt-1" placeholder="Short summary for cards and previews" /></div>
                  <div className="prose dark:prose-invert max-w-none"><Label htmlFor="solution-desc" className="text-sm">Description</Label><RichTextEditor value={editingItem.description || ''} onChange={d => setEditingItem({...editingItem, description: d})} className="mt-1" /></div>
                  <CategorySelector
                    type="solutions"
                    categoryId={editingItem.category_id}
                    subcategoryId={editingItem.subcategory_id}
                    onCategoryChange={(id) => setEditingItem({ ...editingItem, category_id: id })}
                    onSubcategoryChange={(id) => setEditingItem({ ...editingItem, subcategory_id: id })}
                    required
                  />
                  <div><Label htmlFor="solution-affiliate" className="text-sm">Affiliate URL</Label><input id="solution-affiliate" value={editingItem.affiliate_url || ''} onChange={e => setEditingItem({ ...editingItem, affiliate_url: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" /></div>
                  <div><Label htmlFor="solution-rating" className="text-sm">Rating (1-5)</Label><input id="solution-rating" type="number" min="1" max="5" value={editingItem.rating || 5} onChange={e => setEditingItem({ ...editingItem, rating: Number(e.target.value) })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" /></div>
                  <div><Label htmlFor="solution-seo-title" className="text-sm">SEO Title</Label><input id="solution-seo-title" value={editingItem.seo_title || ''} onChange={e => setEditingItem({ ...editingItem, seo_title: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" /></div>
                  <div><Label htmlFor="solution-seo-desc" className="text-sm">SEO Description</Label><textarea id="solution-seo-desc" value={editingItem.seo_description || ''} onChange={e => setEditingItem({ ...editingItem, seo_description: e.target.value })} className="w-full mt-1 p-2.5 rounded-lg border bg-background text-sm" rows={2} /></div>
                  <div className="flex items-center space-x-2"><Switch id="solution-status" checked={editingItem.status === 'active'} onCheckedChange={(checked) => setEditingItem({ ...editingItem, status: checked ? 'active' : 'inactive' })} /><Label htmlFor="solution-status">{editingItem.status === 'active' ? 'Active' : 'Inactive'}</Label></div>
                </>
              )}
               <div>
                    <Label className="text-sm">Image</Label>
                    {editingItem.image_url && (
                      <div className="relative inline-block mt-2 mb-2 w-full">
                        <img src={editingItem.image_url} alt="Preview" className="w-full max-w-xs sm:max-w-sm rounded-lg object-cover border-2 border-primary" width="320" height="200" loading="lazy" />
                        <button type="button" onClick={() => setEditingItem({ ...editingItem, image_url: '' })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => fileInputRef.current.click()} disabled={uploading} className="text-xs sm:text-sm"><Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />{uploading ? "Uploading..." : editingItem.image_url ? "Change" : "Upload"}</Button>
                      <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </div>
               </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0"><DialogClose asChild><Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">Cancel</Button></DialogClose><Button type="submit" size="sm" className="w-full sm:w-auto text-xs sm:text-sm"><Save className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"/>Save</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPage;
