// AdminView.jsx
// DEV-ONLY: This component should never be bundled in production builds
// Access via /admin route (only available in development)

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { getUserProfiles } from '../services/supabaseDb';
import { useAuth } from '../context/AuthContext';
import styles from './AdminView.module.scss';

// Guard against production access
if (import.meta.env.PROD) {
  throw new Error('AdminView should never be imported in production');
}

const TABS = {
  OVERVIEW: 'overview',
  USERS: 'users',
  ACHIEVEMENTS: 'achievements',
  ANALYTICS: 'analytics',
  DATABASE: 'database',
};

function AdminView() {
  const { userInfo } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHabits: 0,
    totalCompletions: 0,
    totalAchievements: 0,
    activeToday: 0,
    activeThisWeek: 0,
    activeThisMonth: 0,
    avgHabitsPerUser: 0,
    avgCompletionRate: 0,
  });
  const [achievements, setAchievements] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [tableStats, setTableStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActive');
  const [sortOrder, setSortOrder] = useState('desc');
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all user profiles
      const userProfiles = await getUserProfiles();

      // Fetch all habits
      const { data: habitsArray, error: habitsError } = await supabase
        .from('habits')
        .select('*');
      
      if (habitsError) throw habitsError;
      
      // Group habits by user_id
      const habitsData = {};
      habitsArray?.forEach(habit => {
        if (!habitsData[habit.user_id]) {
          habitsData[habit.user_id] = {};
        }
        habitsData[habit.user_id][habit.id] = {
          ...habit,
          weeklyGoal: habit.weekly_goal,
          createdAt: new Date(habit.created_at).getTime(),
        };
      });

      // Fetch all calendar entries with completions
      const { data: entriesArray, error: entriesError } = await supabase
        .from('calendar_entries')
        .select(`
          *,
          habit_completions (*)
        `);
      
      if (entriesError) throw entriesError;
      
      // Fetch all achievements
      const { data: achievementsArray, error: achievementsError } = await supabase
        .from('achievements')
        .select('*');
      
      if (achievementsError) throw achievementsError;
      
      // Group entries by user_id
      const entriesData = {};
      entriesArray?.forEach(entry => {
        if (!entriesData[entry.user_id]) {
          entriesData[entry.user_id] = {};
        }
        entriesData[entry.user_id][entry.date] = {
          date: entry.date,
          completedHabits: entry.habit_completions?.map(c => c.habit_id) || [],
        };
      });

      // Build user data from habits and entries
      const userMap = new Map();
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let totalHabits = 0;
      let totalCompletions = 0;
      let activeToday = 0;
      let activeThisWeek = new Set();
      let activeThisMonth = new Set();

      // Process user profiles first
      Object.entries(userProfiles).forEach(([userId, profile]) => {
        userMap.set(userId, {
          id: userId,
          email: profile.email,
          displayName: profile.display_name || profile.displayName,
          photoURL: profile.photo_url || profile.photoURL,
          lastLoginAt: profile.last_login_at || profile.lastLoginAt,
          habits: [],
          entries: {},
          achievements: [],
          totalCompletions: 0,
          lastActive: null,
          createdAt: profile.created_at,
        });
      });

      // Process habits data
      Object.entries(habitsData).forEach(([userId, userHabits]) => {
        const habits = Object.values(userHabits);
        totalHabits += habits.length;
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            email: null,
            displayName: null,
            photoURL: null,
            lastLoginAt: null,
            habits: [],
            entries: {},
            achievements: [],
            totalCompletions: 0,
            lastActive: null,
            createdAt: null,
          });
        }
        
        const userData = userMap.get(userId);
        userData.habits = habits;
        
        const earliestHabit = habits.reduce((earliest, habit) => {
          if (!earliest || (habit.createdAt && habit.createdAt < earliest)) {
            return habit.createdAt;
          }
          return earliest;
        }, null);
        
        if (earliestHabit && (!userData.createdAt || earliestHabit < new Date(userData.createdAt).getTime())) {
          userData.createdAt = earliestHabit;
        }
      });

      // Process calendar entries
      Object.entries(entriesData).forEach(([userId, userEntries]) => {
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            email: null,
            displayName: null,
            photoURL: null,
            lastLoginAt: null,
            habits: [],
            entries: {},
            achievements: [],
            totalCompletions: 0,
            lastActive: null,
            createdAt: null,
          });
        }
        
        const userData = userMap.get(userId);
        userData.entries = userEntries;
        
        let userCompletions = 0;
        let lastActiveDate = null;
        
        Object.entries(userEntries).forEach(([date, entry]) => {
          if (entry.completedHabits?.length > 0) {
            userCompletions += entry.completedHabits.length;
            
            if (!lastActiveDate || date > lastActiveDate) {
              lastActiveDate = date;
            }
            
            if (date === today) {
              activeToday++;
            }
            if (date >= weekAgo) {
              activeThisWeek.add(userId);
            }
            if (date >= monthAgo) {
              activeThisMonth.add(userId);
            }
          }
        });
        
        userData.totalCompletions = userCompletions;
        userData.lastActive = lastActiveDate;
        totalCompletions += userCompletions;
      });

      // Process achievements
      const achievementsByUser = {};
      achievementsArray?.forEach(achievement => {
        if (!achievementsByUser[achievement.user_id]) {
          achievementsByUser[achievement.user_id] = [];
        }
        achievementsByUser[achievement.user_id].push(achievement);
        
        if (userMap.has(achievement.user_id)) {
          const userData = userMap.get(achievement.user_id);
          userData.achievements.push(achievement);
        }
      });

      // Convert map to array
      const usersArray = Array.from(userMap.values());
      
      // Calculate averages
      const avgHabitsPerUser = usersArray.length > 0 
        ? (totalHabits / usersArray.length).toFixed(1) 
        : 0;
      
      const completionRates = usersArray.map(user => {
        if (user.habits.length === 0 || Object.keys(user.entries).length === 0) return 0;
        const totalPossible = Object.keys(user.entries).length * user.habits.length;
        return (user.totalCompletions / totalPossible) * 100;
      }).filter(rate => rate > 0);
      
      const avgCompletionRate = completionRates.length > 0
        ? (completionRates.reduce((a, b) => a + b, 0) / completionRates.length).toFixed(0)
        : 0;

      // Build activity data for last 30 days
      const activityByDate = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        activityByDate[date] = { date, completions: 0, activeUsers: new Set() };
      }
      
      entriesArray?.forEach(entry => {
        if (activityByDate[entry.date]) {
          activityByDate[entry.date].completions += entry.habit_completions?.length || 0;
          activityByDate[entry.date].activeUsers.add(entry.user_id);
        }
      });
      
      const activityDataArray = Object.values(activityByDate).map(d => ({
        date: d.date,
        completions: d.completions,
        activeUsers: d.activeUsers.size,
      }));

      // Get table row counts
      const tableCounts = {
        user_profiles: Object.keys(userProfiles).length,
        habits: habitsArray?.length || 0,
        calendar_entries: entriesArray?.length || 0,
        habit_completions: entriesArray?.reduce((acc, e) => acc + (e.habit_completions?.length || 0), 0) || 0,
        achievements: achievementsArray?.length || 0,
      };

      // Aggregate achievements stats
      const achievementStats = {};
      achievementsArray?.forEach(a => {
        if (!achievementStats[a.badge_id]) {
          achievementStats[a.badge_id] = {
            badgeId: a.badge_id,
            title: a.title,
            emoji: a.emoji,
            rarity: a.rarity,
            category: a.category,
            earnedCount: 0,
            currentlyEarned: 0,
          };
        }
        achievementStats[a.badge_id].earnedCount++;
        if (a.is_currently_earned) {
          achievementStats[a.badge_id].currentlyEarned++;
        }
      });

      setUsers(usersArray);
      setAchievements(Object.values(achievementStats).sort((a, b) => b.earnedCount - a.earnedCount));
      setActivityData(activityDataArray);
      setTableStats(tableCounts);
      setStats({
        totalUsers: usersArray.length,
        totalHabits,
        totalCompletions,
        totalAchievements: achievementsArray?.length || 0,
        activeToday,
        activeThisWeek: activeThisWeek.size,
        activeThisMonth: activeThisMonth.size,
        avgHabitsPerUser,
        avgCompletionRate,
      });
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateString = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getActivityStatus = (lastActive) => {
    const daysAgo = getDaysAgo(lastActive);
    if (daysAgo === null) return { label: 'Never active', class: 'inactive' };
    if (daysAgo === 0) return { label: 'Active today', class: 'active' };
    if (daysAgo <= 7) return { label: `${daysAgo}d ago`, class: 'recent' };
    if (daysAgo <= 30) return { label: `${daysAgo}d ago`, class: 'moderate' };
    return { label: `${daysAgo}d ago`, class: 'inactive' };
  };

  const sortedUsers = useMemo(() => {
    return [...users]
      .filter(user => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return user.id.toLowerCase().includes(term) ||
               user.email?.toLowerCase().includes(term) ||
               user.displayName?.toLowerCase().includes(term) ||
               user.habits.some(h => h.name?.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'lastActive':
            const aDate = a.lastActive || '0';
            const bDate = b.lastActive || '0';
            comparison = aDate.localeCompare(bDate);
            break;
          case 'habits':
            comparison = a.habits.length - b.habits.length;
            break;
          case 'daysTracked':
            comparison = Object.keys(a.entries).length - Object.keys(b.entries).length;
            break;
          case 'completions':
            comparison = a.totalCompletions - b.totalCompletions;
            break;
          case 'achievements':
            comparison = a.achievements.length - b.achievements.length;
            break;
          case 'createdAt':
            comparison = (a.createdAt || 0) - (b.createdAt || 0);
            break;
          default:
            comparison = 0;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [users, searchTerm, sortBy, sortOrder]);

  const calculateCompletionRate = (user) => {
    if (user.habits.length === 0) return 0;
    
    const entryDates = Object.keys(user.entries);
    if (entryDates.length === 0) return 0;
    
    const totalPossible = entryDates.length * user.habits.length;
    return Math.round((user.totalCompletions / totalPossible) * 100);
  };

  const exportData = async (type) => {
    let data;
    let filename;
    
    switch (type) {
      case 'users':
        data = users.map(u => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          habitsCount: u.habits.length,
          totalCompletions: u.totalCompletions,
          daysTracked: Object.keys(u.entries).length,
          achievementsCount: u.achievements.length,
          lastActive: u.lastActive,
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
        }));
        filename = 'habitlock-users.json';
        break;
      case 'achievements':
        data = achievements;
        filename = 'habitlock-achievements.json';
        break;
      case 'activity':
        data = activityData;
        filename = 'habitlock-activity.json';
        break;
      default:
        return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRetentionRate = () => {
    if (users.length === 0) return 0;
    const retainedUsers = users.filter(u => {
      const daysAgo = getDaysAgo(u.lastActive);
      return daysAgo !== null && daysAgo <= 7;
    }).length;
    return Math.round((retainedUsers / users.length) * 100);
  };

  const getMaxActivity = () => {
    if (activityData.length === 0) return 1;
    return Math.max(...activityData.map(d => d.completions), 1);
  };

  if (loading) {
    return (
      <div className={styles.adminView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading Supabase data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.adminView}>
        <div className={styles.error}>
          <h2>Error loading admin data</h2>
          <p>{error}</p>
          <button onClick={fetchAllData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminView}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Admin Dashboard</h1>
          <span className={styles.devBadge}>DEV ONLY</span>
          <span className={styles.supabaseBadge}>Supabase</span>
        </div>
        <p className={styles.subtitle}>
          {lastRefresh && `Last refreshed: ${formatTime(lastRefresh)}`}
        </p>
      </header>

      {/* Tab Navigation */}
      <nav className={styles.tabNav}>
        {Object.entries(TABS).map(([key, value]) => (
          <button
            key={value}
            className={`${styles.tabBtn} ${activeTab === value ? styles.active : ''}`}
            onClick={() => setActiveTab(value)}
          >
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </button>
        ))}
        <button className={styles.refreshBtn} onClick={fetchAllData}>
          ↻ Refresh
        </button>
      </nav>

      {/* OVERVIEW TAB */}
      {activeTab === TABS.OVERVIEW && (
        <>
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.totalUsers}</span>
              <span className={styles.statLabel}>Total Users</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.totalHabits}</span>
              <span className={styles.statLabel}>Total Habits</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.totalCompletions.toLocaleString()}</span>
              <span className={styles.statLabel}>Total Completions</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.totalAchievements}</span>
              <span className={styles.statLabel}>Achievements Earned</span>
            </div>
          </section>

          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.activeToday}</span>
              <span className={styles.statLabel}>Active Today</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.activeThisWeek}</span>
              <span className={styles.statLabel}>Active This Week</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.avgHabitsPerUser}</span>
              <span className={styles.statLabel}>Avg Habits/User</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.avgCompletionRate}%</span>
              <span className={styles.statLabel}>Avg Completion Rate</span>
            </div>
          </section>

          <section className={styles.quickStats}>
            <h3>Quick Insights</h3>
            <div className={styles.insightGrid}>
              <div className={styles.insightCard}>
                <span className={styles.insightIcon}>📈</span>
                <div>
                  <strong>{getRetentionRate()}%</strong>
                  <span>7-day retention</span>
                </div>
              </div>
              <div className={styles.insightCard}>
                <span className={styles.insightIcon}>🎯</span>
                <div>
                  <strong>{users.filter(u => u.habits.length > 0).length}</strong>
                  <span>Users with habits</span>
                </div>
              </div>
              <div className={styles.insightCard}>
                <span className={styles.insightIcon}>🏆</span>
                <div>
                  <strong>{users.filter(u => u.achievements.length > 0).length}</strong>
                  <span>Users with badges</span>
                </div>
              </div>
              <div className={styles.insightCard}>
                <span className={styles.insightIcon}>📅</span>
                <div>
                  <strong>{stats.activeThisMonth}</strong>
                  <span>Active this month</span>
                </div>
              </div>
            </div>
          </section>

          {/* Mini Activity Chart */}
          <section className={styles.activityChart}>
            <h3>30-Day Activity</h3>
            <div className={styles.chartContainer}>
              <div className={styles.barChart}>
                {activityData.map((day, i) => (
                  <div
                    key={day.date}
                    className={styles.bar}
                    style={{ height: `${(day.completions / getMaxActivity()) * 100}%` }}
                    title={`${day.date}: ${day.completions} completions, ${day.activeUsers} users`}
                  />
                ))}
              </div>
              <div className={styles.chartLabels}>
                <span>30d ago</span>
                <span>Today</span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* USERS TAB */}
      {activeTab === TABS.USERS && (
        <>
          <section className={styles.controls}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search by user ID, email, or habit name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={styles.sortControls}>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="lastActive">Last Active</option>
                <option value="daysTracked">Days Tracked</option>
                <option value="habits">Habit Count</option>
                <option value="completions">Completions</option>
                <option value="achievements">Achievements</option>
                <option value="createdAt">Join Date</option>
              </select>
              <button 
                className={styles.sortOrderBtn}
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
              <button 
                className={styles.exportBtn}
                onClick={() => exportData('users')}
              >
                Export JSON
              </button>
            </div>
          </section>

          <section className={styles.usersSection}>
            <h2>Users ({sortedUsers.length})</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.usersTable}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Habits</th>
                    <th>Days</th>
                    <th>Completions</th>
                    <th>Rate</th>
                    <th>Badges</th>
                    <th>Last Active</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map(user => {
                    const activity = getActivityStatus(user.lastActive);
                    const daysTracked = Object.keys(user.entries).length;
                    return (
                      <tr key={user.id} className={selectedUser?.id === user.id ? styles.selected : ''}>
                        <td className={styles.userCell}>
                          <div className={styles.userInfo}>
                            {user.photoURL && (
                              <img 
                                src={user.photoURL} 
                                alt="" 
                                className={styles.userAvatar}
                              />
                            )}
                            <div className={styles.userDetails}>
                              <span className={styles.userEmail}>
                                {user.email || <span className={styles.noEmail}>No email yet</span>}
                              </span>
                              {user.displayName && (
                                <span className={styles.userName}>{user.displayName}</span>
                              )}
                              {!user.email && (
                                <span className={styles.userIdSmall}>{user.id.slice(0, 8)}...</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{user.habits.length}</td>
                        <td>{daysTracked}</td>
                        <td>{user.totalCompletions}</td>
                        <td>{calculateCompletionRate(user)}%</td>
                        <td>{user.achievements.length}</td>
                        <td>
                          <span className={`${styles.activityBadge} ${styles[activity.class]}`}>
                            {activity.label}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <button 
                            className={styles.viewBtn}
                            onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                            title="View user details"
                          >
                            {selectedUser?.id === user.id ? '−' : '+'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selectedUser && (
            <section className={styles.userDetail}>
              <div className={styles.detailHeader}>
                <h2>User Details</h2>
                <button 
                  className={styles.closeBtn}
                  onClick={() => setSelectedUser(null)}
                >
                  ×
                </button>
              </div>
              
              <div className={styles.detailContent}>
                <div className={styles.detailSection}>
                  <h3>User Info</h3>
                  <div className={styles.userProfileCard}>
                    {selectedUser.photoURL && (
                      <img 
                        src={selectedUser.photoURL} 
                        alt="" 
                        className={styles.detailAvatar}
                      />
                    )}
                    <dl>
                      {selectedUser.displayName && (
                        <>
                          <dt>Name</dt>
                          <dd>{selectedUser.displayName}</dd>
                        </>
                      )}
                      <dt>Email</dt>
                      <dd>{selectedUser.email || <span className={styles.notAvailable}>Awaiting next login</span>}</dd>
                      <dt>User ID</dt>
                      <dd><code>{selectedUser.id}</code></dd>
                      <dt>Days Tracked</dt>
                      <dd>{Object.keys(selectedUser.entries).length} days</dd>
                      <dt>Completion Rate</dt>
                      <dd>{calculateCompletionRate(selectedUser)}%</dd>
                      <dt>Badges Earned</dt>
                      <dd>{selectedUser.achievements.length}</dd>
                      <dt>Joined</dt>
                      <dd>{formatDate(selectedUser.createdAt)}</dd>
                      <dt>Last Active</dt>
                      <dd>{formatDateString(selectedUser.lastActive)}</dd>
                    </dl>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Habits ({selectedUser.habits.length})</h3>
                  <div className={styles.habitsList}>
                    {selectedUser.habits.length === 0 ? (
                      <p className={styles.noActivity}>No habits created</p>
                    ) : (
                      selectedUser.habits.map(habit => (
                        <div key={habit.id} className={styles.habitItem}>
                          <span className={styles.habitEmoji}>{habit.emoji || '📝'}</span>
                          <div className={styles.habitInfo}>
                            <span className={styles.habitName}>{habit.name}</span>
                            <span className={styles.habitMeta}>
                              Goal: {habit.weeklyGoal || 7}x/week • Created: {formatDate(habit.createdAt)}
                            </span>
                          </div>
                          <div 
                            className={styles.habitColor} 
                            style={{ backgroundColor: habit.color || '#3b82f6' }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Recent Activity</h3>
                  <div className={styles.activityList}>
                    {Object.entries(selectedUser.entries)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 10)
                      .map(([date, entry]) => (
                        <div key={date} className={styles.activityItem}>
                          <span className={styles.activityDate}>{formatDateString(date)}</span>
                          <span className={styles.activityCount}>
                            {entry.completedHabits?.length || 0} habit(s) completed
                          </span>
                        </div>
                      ))}
                    {Object.keys(selectedUser.entries).length === 0 && (
                      <p className={styles.noActivity}>No activity recorded</p>
                    )}
                  </div>
                </div>

                {selectedUser.achievements.length > 0 && (
                  <div className={styles.detailSection}>
                    <h3>Achievements ({selectedUser.achievements.length})</h3>
                    <div className={styles.achievementsList}>
                      {selectedUser.achievements.map(a => (
                        <div key={a.badge_id} className={`${styles.achievementItem} ${!a.is_currently_earned ? styles.lost : ''}`}>
                          <span className={styles.achievementEmoji}>{a.emoji}</span>
                          <div className={styles.achievementInfo}>
                            <span className={styles.achievementTitle}>{a.title}</span>
                            <span className={styles.achievementMeta}>
                              {a.rarity} • {a.is_currently_earned ? 'Active' : 'Lost'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === TABS.ACHIEVEMENTS && (
        <>
          <section className={styles.achievementsHeader}>
            <h2>Achievements Overview</h2>
            <button 
              className={styles.exportBtn}
              onClick={() => exportData('achievements')}
            >
              Export JSON
            </button>
          </section>

          <section className={styles.achievementsGrid}>
            {achievements.length === 0 ? (
              <p className={styles.noData}>No achievements earned yet</p>
            ) : (
              achievements.map(badge => (
                <div key={badge.badgeId} className={styles.achievementCard}>
                  <span className={styles.badgeEmoji}>{badge.emoji}</span>
                  <div className={styles.badgeInfo}>
                    <h4>{badge.title}</h4>
                    <span className={styles.badgeRarity}>{badge.rarity}</span>
                    <span className={styles.badgeCategory}>{badge.category}</span>
                  </div>
                  <div className={styles.badgeStats}>
                    <div>
                      <strong>{badge.earnedCount}</strong>
                      <span>Total Earned</span>
                    </div>
                    <div>
                      <strong>{badge.currentlyEarned}</strong>
                      <span>Currently Active</span>
                    </div>
                    <div>
                      <strong>{stats.totalUsers > 0 ? Math.round((badge.earnedCount / stats.totalUsers) * 100) : 0}%</strong>
                      <span>% of Users</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === TABS.ANALYTICS && (
        <>
          <section className={styles.analyticsHeader}>
            <h2>Activity Analytics</h2>
            <button 
              className={styles.exportBtn}
              onClick={() => exportData('activity')}
            >
              Export JSON
            </button>
          </section>

          <section className={styles.fullChart}>
            <h3>Daily Completions (Last 30 Days)</h3>
            <div className={styles.chartLarge}>
              <div className={styles.yAxis}>
                <span>{getMaxActivity()}</span>
                <span>{Math.round(getMaxActivity() / 2)}</span>
                <span>0</span>
              </div>
              <div className={styles.barChartLarge}>
                {activityData.map((day) => (
                  <div key={day.date} className={styles.barGroup}>
                    <div
                      className={styles.barLarge}
                      style={{ height: `${(day.completions / getMaxActivity()) * 100}%` }}
                    />
                    <span className={styles.barLabel}>
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={styles.analyticsTable}>
            <h3>Daily Breakdown</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.analyticsDataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Completions</th>
                    <th>Active Users</th>
                    <th>Avg/User</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activityData].reverse().slice(0, 14).map(day => (
                    <tr key={day.date}>
                      <td>{formatDateString(day.date)}</td>
                      <td>{day.completions}</td>
                      <td>{day.activeUsers}</td>
                      <td>{day.activeUsers > 0 ? (day.completions / day.activeUsers).toFixed(1) : '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* DATABASE TAB */}
      {activeTab === TABS.DATABASE && (
        <>
          <section className={styles.databaseHeader}>
            <h2>Database Overview</h2>
            <span className={styles.dbBadge}>Supabase PostgreSQL</span>
          </section>

          <section className={styles.tableStatsGrid}>
            {Object.entries(tableStats).map(([table, count]) => (
              <div key={table} className={styles.tableStatCard}>
                <span className={styles.tableName}>{table}</span>
                <span className={styles.tableCount}>{count.toLocaleString()}</span>
                <span className={styles.tableLabel}>rows</span>
              </div>
            ))}
          </section>

          <section className={styles.schemaInfo}>
            <h3>Schema Structure</h3>
            <div className={styles.schemaGrid}>
              <div className={styles.schemaCard}>
                <h4>user_profiles</h4>
                <code>id, email, display_name, photo_url, legacy_firebase_uid, last_login_at, created_at, updated_at</code>
              </div>
              <div className={styles.schemaCard}>
                <h4>habits</h4>
                <code>id, user_id, name, description, emoji, color, weekly_goal, category, frequency, legacy_firebase_id, created_at, updated_at</code>
              </div>
              <div className={styles.schemaCard}>
                <h4>calendar_entries</h4>
                <code>id, user_id, date, created_at, updated_at</code>
              </div>
              <div className={styles.schemaCard}>
                <h4>habit_completions</h4>
                <code>id, calendar_entry_id, habit_id, completed_at</code>
              </div>
              <div className={styles.schemaCard}>
                <h4>achievements</h4>
                <code>id, user_id, badge_id, title, description, category, rarity, emoji, type, first_completed_at, last_completed_at, completion_count, is_currently_earned, is_backfilled, timezone</code>
              </div>
            </div>
          </section>

          <section className={styles.rlsInfo}>
            <h3>Row Level Security</h3>
            <p>All tables have RLS enabled. Users can only access their own data.</p>
            <div className={styles.rlsPolicies}>
              <span className={styles.rlsBadge}>✓ user_profiles</span>
              <span className={styles.rlsBadge}>✓ habits</span>
              <span className={styles.rlsBadge}>✓ calendar_entries</span>
              <span className={styles.rlsBadge}>✓ habit_completions</span>
              <span className={styles.rlsBadge}>✓ achievements</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminView;
