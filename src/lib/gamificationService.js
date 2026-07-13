import { supabase } from '@/lib/customSupabaseClient';
import { RANKS, BADGES, POINT_VALUES, getRankByPoints, checkBadgeEligibility } from './gamificationConfig';

export const awardPoints = async (userId, source, customAmount = null) => {
  const amount = customAmount || POINT_VALUES[source] || 0;
  if (amount === 0) return { success: false, error: 'Invalid point source' };

  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points, rank')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newPoints = (profile.points || 0) + amount;
    const newRank = getRankByPoints(newPoints);

    const updates = { points: newPoints };
    if (newRank.name !== profile.rank) {
      updates.rank = newRank.name;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) throw updateError;

    return { 
      success: true, 
      pointsAwarded: amount, 
      newTotal: newPoints,
      rankChanged: newRank.name !== profile.rank,
      newRank: newRank.name
    };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error: error.message };
  }
};

export const getUserStats = async (userId) => {
  try {
    const [postsResult, commentsResult, communityResult, profileResult] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'published'),
      supabase.from('community_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('profiles').select('id, name, avatar_url, bio, role, points, rank, current_streak, max_streak, last_login_date, is_founding_member, email_notifications, newsletter_subscribed, created_at, updated_at').eq('id', userId).single()
    ]);

    const profile = profileResult.data;
    const profileComplete = !!(profile?.name && profile?.bio && profile?.avatar_url);

    return {
      postCount: postsResult.count || 0,
      commentCount: commentsResult.count || 0,
      communityPostCount: communityResult.count || 0,
      points: profile?.points || 0,
      maxStreak: profile?.max_streak || 0,
      currentStreak: profile?.current_streak || 0,
      profileComplete
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      postCount: 0,
      commentCount: 0,
      communityPostCount: 0,
      points: 0,
      maxStreak: 0,
      currentStreak: 0,
      profileComplete: false
    };
  }
};

export const getUserBadges = async (userId) => {
  try {
    const { data: earnedBadges } = await supabase
      .from('user_badges')
      .select('badge_id, awarded_at')
      .eq('user_id', userId);

    const earnedBadgeIds = new Set((earnedBadges || []).map(b => b.badge_id));
    
    return BADGES.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      awardedAt: earnedBadges?.find(b => b.badge_id === badge.id)?.awarded_at
    }));
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return BADGES.map(badge => ({ ...badge, earned: false }));
  }
};

export const checkAndAwardBadges = async (userId) => {
  try {
    const stats = await getUserStats(userId);
    const { data: existingBadges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const earnedBadgeIds = new Set((existingBadges || []).map(b => b.badge_id));
    const newBadges = [];

    for (const badge of BADGES) {
      if (!earnedBadgeIds.has(badge.id) && checkBadgeEligibility(badge, stats)) {
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: userId, badge_id: badge.id, awarded_at: new Date().toISOString() });
        
        if (!error) {
          newBadges.push(badge);
        }
      }
    }

    return { success: true, newBadges };
  } catch (error) {
    console.error('Error checking badges:', error);
    return { success: false, newBadges: [], error: error.message };
  }
};

export const markArticleRead = async (userId, postId) => {
  try {
    const { count, error: checkError } = await supabase
      .from('user_read_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (checkError) throw checkError;

    if (count > 0) {
      return { alreadyRead: true };
    }

    const { error: insertError } = await supabase
      .from('user_read_articles')
      .insert({ user_id: userId, post_id: postId });

    if (insertError) throw insertError;

    await awardPoints(userId, 'ARTICLE_READ');

    return { success: true, pointsAwarded: POINT_VALUES.ARTICLE_READ };
  } catch (error) {
    console.error('Error marking article as read:', error);
    return { success: false, error: error.message };
  }
};

export const getReadArticleIds = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_read_articles')
      .select('post_id')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(row => row.post_id);
  } catch (error) {
    console.error('Error fetching read article IDs:', error);
    return [];
  }
};

export const getReadArticleCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('user_read_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching read article count:', error);
    return 0;
  }
};

export const claimDailyLogin = async (userId) => {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('last_login_date, current_streak, max_streak, points')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const today = new Date().toISOString().split('T')[0];
    const lastLogin = profile.last_login_date;

    if (lastLogin === today) {
      return { success: false, alreadyClaimed: true };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastLogin === yesterdayStr) {
      newStreak = (profile.current_streak || 0) + 1;
    }

    const streakBonus = Math.floor(POINT_VALUES.DAILY_LOGIN * (1 + (newStreak - 1) * POINT_VALUES.STREAK_BONUS_MULTIPLIER));
    const newPoints = (profile.points || 0) + streakBonus;
    const newMaxStreak = Math.max(profile.max_streak || 0, newStreak);
    const newRank = getRankByPoints(newPoints);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_login_date: today,
        current_streak: newStreak,
        max_streak: newMaxStreak,
        points: newPoints,
        rank: newRank.name
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    await checkAndAwardBadges(userId);

    return { 
      success: true, 
      streak: newStreak, 
      pointsAwarded: streakBonus,
      newTotal: newPoints
    };
  } catch (error) {
    console.error('Error claiming daily login:', error);
    return { success: false, error: error.message };
  }
};
