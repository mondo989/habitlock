// AdminView.jsx
// DEV-ONLY: This component should never be bundled in production builds
// Access via /admin route (only available in development)

import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../services/firebase';
import { getUserProfiles } from '../services/db';
import { useAuth } from '../context/AuthContext';
import styles from './AdminView.module.scss';

// Guard against production access
if (import.meta.env.PROD) {
  throw new Error('AdminView should never be imported in production');
}

function AdminView() {
  const { userInfo } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHabits: 0,
    totalCompletions: 0,
    activeToday: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActive');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all user profiles (email, displayName, etc.)
      const userProfiles = await getUserProfiles();

      // Fetch all habits (grouped by userId)
      const habitsRef = ref(database, 'habits');
      const habitsSnapshot = await get(habitsRef);
      const habitsData = habitsSnapshot.exists() ? habitsSnapshot.val() : {};

      // Fetch all calendar entries (grouped by userId)
      const entriesRef = ref(database, 'calendarEntries');
      const entriesSnapshot = await get(entriesRef);
      const entriesData = entriesSnapshot.exists() ? entriesSnapshot.val() : {};

      // Build user data from habits and entries
      const userMap = new Map();
      const today = new Date().toISOString().split('T')[0];
      
      let totalHabits = 0;
      let totalCompletions = 0;
      let activeToday = 0;

      // Process user profiles first
      Object.entries(userProfiles).forEach(([userId, profile]) => {
        userMap.set(userId, {
          id: userId,
          email: profile.email,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          lastLoginAt: profile.lastLoginAt,
          habits: [],
          entries: {},
          totalCompletions: 0,
          lastActive: null,
          createdAt: null,
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
            totalCompletions: 0,
            lastActive: null,
            createdAt: null,
          });
        }
        
        const userData = userMap.get(userId);
        userData.habits = habits;
        
        // Find earliest habit creation as user "join" date
        const earliestHabit = habits.reduce((earliest, habit) => {
          if (!earliest || (habit.createdAt && habit.createdAt < earliest)) {
            return habit.createdAt;
          }
          return earliest;
        }, null);
        
        if (earliestHabit) {
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
            totalCompletions: 0,
            lastActive: null,
            createdAt: null,
          });
        }
        
        const userData = userMap.get(userId);
        userData.entries = userEntries;
        
        // Calculate total completions and last active date
        let userCompletions = 0;
        let lastActiveDate = null;
        
        Object.entries(userEntries).forEach(([date, entry]) => {
          if (entry.completedHabits) {
            userCompletions += entry.completedHabits.length;
            
            if (!lastActiveDate || date > lastActiveDate) {
              lastActiveDate = date;
            }
            
            if (date === today) {
              activeToday++;
            }
          }
        });
        
        userData.totalCompletions = userCompletions;
        userData.lastActive = lastActiveDate;
        totalCompletions += userCompletions;
      });

      // Convert map to array
      const usersArray = Array.from(userMap.values());
      
      setUsers(usersArray);
      setStats({
        totalUsers: usersArray.length,
        totalHabits,
        totalCompletions,
        activeToday,
      });
      
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

  const sortedUsers = [...users]
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
        case 'createdAt':
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const calculateCompletionRate = (user) => {
    if (user.habits.length === 0) return 0;
    
    const entryDates = Object.keys(user.entries);
    if (entryDates.length === 0) return 0;
    
    const totalPossible = entryDates.length * user.habits.length;
    return Math.round((user.totalCompletions / totalPossible) * 100);
  };

  if (loading) {
    return (
      <div className={styles.adminView}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading admin data...</p>
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
        </div>
        <p className={styles.subtitle}>
          Viewing production Firebase data • Local access only
        </p>
      </header>

      {/* Stats Overview */}
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
          <span className={styles.statValue}>{stats.totalCompletions}</span>
          <span className={styles.statLabel}>Total Completions</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.activeToday}</span>
          <span className={styles.statLabel}>Active Today</span>
        </div>
      </section>

      {/* Controls */}
      <section className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by user ID or habit name..."
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
            <option value="createdAt">Join Date</option>
          </select>
          <button 
            className={styles.sortOrderBtn}
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
          <button className={styles.refreshBtn} onClick={fetchAllData}>
            Refresh
          </button>
        </div>
      </section>

      {/* Users Table */}
      <section className={styles.usersSection}>
        <h2>Users ({sortedUsers.length})</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Habits</th>
                <th>Days Tracked</th>
                <th>Completions</th>
                <th>Rate</th>
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

      {/* User Detail Panel */}
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
                  <dt>Joined</dt>
                  <dd>{formatDate(selectedUser.createdAt)}</dd>
                  <dt>Last Active</dt>
                  <dd>{formatDateString(selectedUser.lastActive)}</dd>
                  {selectedUser.lastLoginAt && (
                    <>
                      <dt>Last Login</dt>
                      <dd>{formatDate(selectedUser.lastLoginAt)}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3>Habits ({selectedUser.habits.length})</h3>
              <div className={styles.habitsList}>
                {selectedUser.habits.map(habit => (
                  <div key={habit.id} className={styles.habitItem}>
                    <span className={styles.habitEmoji}>{habit.emoji || '📝'}</span>
                    <div className={styles.habitInfo}>
                      <span className={styles.habitName}>{habit.name}</span>
                      <span className={styles.habitMeta}>
                        Goal: {habit.weeklyGoal || 3}x/week • Created: {formatDate(habit.createdAt)}
                      </span>
                    </div>
                    <div 
                      className={styles.habitColor} 
                      style={{ backgroundColor: habit.color || '#3b82f6' }}
                    />
                  </div>
                ))}
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
          </div>
        </section>
      )}
    </div>
  );
}

export default AdminView;
