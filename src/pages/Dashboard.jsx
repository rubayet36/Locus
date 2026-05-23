import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Plus, BookOpen, MessageSquare, User, AlertCircle, FileText, ArrowRight, Award } from 'lucide-react';
import RankBadge from '../components/RankBadge';

export default function Dashboard({ currentUserId, groupId, onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [recentPapers, setRecentPapers] = useState([]);
  const [activeClaims, setActiveClaims] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ totalSaved: 0, totalRead: 0, scholarStats: [] });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!groupId) return;
    try {
      setLoading(true);

      // 1. Fetch recent activities
      const { data: acts, error: actsErr } = await supabase
        .from('activity_log')
        .select(`
          *,
          papers (title)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (actsErr) throw actsErr;
      setActivities(acts || []);

      // 2. Fetch recent papers in group library
      const { data: papers, error: papersErr } = await supabase
        .from('papers')
        .select(`
          *,
          paper_meta (sjr_quartile, core_rank, rank_source, sjr)
        `)
        .order('created_at', { ascending: false })
        .limit(4);

      if (papersErr) throw papersErr;
      setRecentPapers(papers || []);

      // 3. Fetch active reading claims, assignments, group members, and finished stats in parallel
      const [claimsRes, assignsRes, membersRes, doneClaimsRes, doneAssignsRes, papersCountRes] = await Promise.all([
        supabase
          .from('reading_claims')
          .select(`
            *,
            papers (title, id)
          `)
          .eq('status', 'reading'),
        supabase
          .from('assignments')
          .select(`
            *,
            papers (title, id)
          `)
          .eq('status', 'reading'),
        supabase
          .from('group_members')
          .select('user_id, role, email, full_name, avatar_url')
          .eq('group_id', groupId),
        supabase
          .from('reading_claims')
          .select('paper_id, user_id')
          .eq('status', 'done'),
        supabase
          .from('assignments')
          .select('paper_id, assigned_to')
          .eq('status', 'done'),
        supabase
          .from('papers')
          .select('*', { count: 'exact', head: true })
      ]);

      if (claimsRes.error) throw claimsRes.error;
      if (assignsRes.error) throw assignsRes.error;
      if (membersRes.error) throw membersRes.error;
      if (doneClaimsRes.error) throw doneClaimsRes.error;
      if (doneAssignsRes.error) throw doneAssignsRes.error;
      if (papersCountRes.error) throw papersCountRes.error;

      const claims = claimsRes.data || [];
      const assigns = assignsRes.data || [];
      const dbMembers = membersRes.data || [];
      const doneClaims = doneClaimsRes.data || [];
      const doneAssigns = doneAssignsRes.data || [];
      const totalSavedCount = papersCountRes.count || 0;

      setMembers(dbMembers);

      // Helper to extract a display name from member email or fallback
      const getDisplayName = (uid) => {
        if (uid === currentUserId) {
          const selfMember = dbMembers.find(m => m.user_id === currentUserId);
          return selfMember?.full_name ? selfMember.full_name : 'You';
        }
        const member = dbMembers.find(m => m.user_id === uid);
        if (member) {
          if (member.full_name) return member.full_name;
          if (member.email) {
            const handle = member.email.split('@')[0];
            return handle.charAt(0).toUpperCase() + handle.slice(1);
          }
        }
        return 'Team Scholar';
      };

      // 4. Calculate Unified Active Claims
      const unifiedClaims = [];
      const activePaperIds = new Set();

      claims.forEach(c => {
        if (c.papers) {
          activePaperIds.add(c.papers.id);
          unifiedClaims.push({
            id: c.id,
            paperId: c.papers.id,
            title: c.papers.title,
            readerName: getDisplayName(c.user_id)
          });
        }
      });

      assigns.forEach(a => {
        if (a.papers && !activePaperIds.has(a.papers.id)) {
          activePaperIds.add(a.papers.id);
          unifiedClaims.push({
            id: a.id,
            paperId: a.papers.id,
            title: a.papers.title,
            readerName: getDisplayName(a.assigned_to)
          });
        }
      });

      setActiveClaims(unifiedClaims);

      // 5. Calculate Statistics (Total Read, Scholar read counts)
      const userReadSet = {};
      const uniqueReadPapers = new Set();

      doneClaims.forEach(c => {
        uniqueReadPapers.add(c.paper_id);
        if (!userReadSet[c.user_id]) userReadSet[c.user_id] = new Set();
        userReadSet[c.user_id].add(c.paper_id);
      });

      doneAssigns.forEach(a => {
        uniqueReadPapers.add(a.paper_id);
        if (!userReadSet[a.assigned_to]) userReadSet[a.assigned_to] = new Set();
        userReadSet[a.assigned_to].add(a.paper_id);
      });

      const totalReadCount = uniqueReadPapers.size;

      const scholarStats = dbMembers.map(m => {
        const readSet = userReadSet[m.user_id] || new Set();
        const handle = m.email ? m.email.split('@')[0] : 'Scholar';
        const defaultName = handle.charAt(0).toUpperCase() + handle.slice(1);
        let displayName = m.full_name || defaultName;
        if (m.user_id === currentUserId) {
          displayName = m.full_name ? `${m.full_name} (You)` : 'You';
        }
        return {
          userId: m.user_id,
          name: displayName,
          email: m.email || '',
          count: readSet.size
        };
      }).sort((a, b) => b.count - a.count);

      setStats({
        totalSaved: totalSavedCount,
        totalRead: totalReadCount,
        scholarStats
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Live subscription to activity_log, reading_claims and assignments
    const channel = supabase
      .channel('dashboard-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log' },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reading_claims' },
        () => {
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Convert raw action strings to rich descriptive elements
  const renderActivityText = (act) => {
    const paperTitle = act.papers?.title || 'a paper';
    const metadata = act.meta || {};
    
    // Stable pseudo-name mapping for researchers
    const getPseudoName = (uid) => {
      if (uid === currentUserId) {
        const selfMember = members.find(m => m.user_id === currentUserId);
        return selfMember?.full_name ? selfMember.full_name : 'You';
      }
      const member = members.find(m => m.user_id === uid);
      if (member) {
        if (member.full_name) return member.full_name;
        if (member.email) {
          const handle = member.email.split('@')[0];
          return handle.charAt(0).toUpperCase() + handle.slice(1);
        }
      }
      return 'Team Scholar';
    };

    const userName = getPseudoName(act.user_id);

    switch (act.action) {
      case 'added':
        return (
          <>
            <span style={{ color: 'var(--accent-gold)' }}>{userName}</span> saved{' '}
            <span style={{ color: 'var(--text-primary)' }}>"{paperTitle}"</span> to the library.
          </>
        );
      case 'claimed':
        return (
          <>
            <span style={{ color: 'var(--accent-gold)' }}>{userName}</span> claimed{' '}
            <span style={{ color: 'var(--text-primary)' }}>"{paperTitle}"</span> for reading.
          </>
        );
      case 'commented':
        return (
          <>
            <span style={{ color: 'var(--accent-gold)' }}>{userName}</span> commented on{' '}
            <span style={{ color: 'var(--text-primary)' }}>"{paperTitle}"</span>:{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{metadata.preview}"</span>
          </>
        );
      case 'assigned':
        return (
          <>
            <span style={{ color: 'var(--accent-gold)' }}>{userName}</span> assigned{' '}
            <span style={{ color: 'var(--text-primary)' }}>"{paperTitle}"</span>.
          </>
        );
      default:
        return (
          <>
            <span style={{ color: 'var(--accent-gold)' }}>{userName}</span> triggered action: {act.action} on{' '}
            <span style={{ color: 'var(--text-primary)' }}>"{paperTitle}"</span>.
          </>
        );
    }
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case 'added':
        return <Plus size={16} style={{ color: '#4ade80' }} />;
      case 'claimed':
        return <BookOpen size={16} style={{ color: '#60a5fa' }} />;
      case 'commented':
        return <MessageSquare size={16} style={{ color: '#e8a946' }} />;
      default:
        return <Activity size={16} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ marginBottom: '8px' }}>Research Portal Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Collaborate, review journal quartiles, and share academic insights with your group in real-time.
        </p>
      </div>

      {/* Statistics Row */}
      {loading ? (
        <div className="stats-grid">
          <div className="card" style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="mono" style={{ color: 'var(--text-muted)' }}>Calculating stats...</span>
          </div>
        </div>
      ) : (
        <div className="stats-grid">
          {/* Stat 1: Total Saved Papers */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--card-border)', minHeight: '110px' }}>
            <div style={{ background: 'rgba(232, 169, 70, 0.1)', border: '1px solid var(--accent-gold)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={28} style={{ color: 'var(--accent-gold)' }} />
            </div>
            <div>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Library Volume</span>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', margin: '4px 0 2px 0', color: 'var(--text-primary)', fontFamily: 'var(--font-headings)' }}>{stats.totalSaved}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Total papers added by team</p>
            </div>
          </div>

          {/* Stat 2: Total Read Papers */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--card-border)', minHeight: '110px' }}>
            <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid #4ade80', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={28} style={{ color: '#4ade80' }} />
            </div>
            <div>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Research Progress</span>
              <h2 style={{ fontSize: '36px', fontWeight: 'bold', margin: '4px 0 2px 0', color: '#4ade80', fontFamily: 'var(--font-headings)' }}>{stats.totalRead}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Completed literature reviews</p>
            </div>
          </div>

          {/* Stat 3: Scholar Contributions list */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--card-border)', justifySelf: 'stretch', minHeight: '110px' }}>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} style={{ color: 'var(--accent-gold)' }} /> Scholar Achievements
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '72px', paddingRight: '4px' }}>
              {stats.scholarStats.length === 0 ? (
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No scholars listed</span>
              ) : (
                stats.scholarStats.map((scholar, idx) => (
                  <div key={scholar.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: scholar.name === 'You' ? 'var(--accent-gold)' : 'var(--text-secondary)', fontWeight: scholar.name === 'You' ? 'bold' : 'normal' }}>
                      {scholar.name}
                    </span>
                    <span className="rank-badge" style={{ 
                      fontSize: '9px', 
                      padding: '2px 8px', 
                      backgroundColor: scholar.count > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.02)',
                      borderColor: scholar.count > 0 ? '#4ade80' : 'rgba(255,255,255,0.05)',
                      color: scholar.count > 0 ? '#4ade80' : 'var(--text-muted)'
                    }}>
                      {scholar.count} {scholar.count === 1 ? 'paper' : 'papers'} read
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout: Activities Feed (2/3) + Stats/Claims (1/3) */}
      <div className="dashboard-grid">
        
        {/* Left Side: Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '22px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} style={{ color: 'var(--accent-gold)' }} />
            Collaboration Feed
          </h2>

          {loading ? (
            <p className="mono" style={{ color: 'var(--text-muted)' }}>Updating feed...</p>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>No activity logged yet. Try searching and saving some papers!</p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px', 
              maxHeight: '480px', 
              overflowY: 'auto', 
              paddingRight: '6px' 
            }}>
              {activities.map((act) => (
                <div 
                  key={act.id} 
                  style={{ 
                    display: 'flex', 
                    gap: '15px', 
                    alignItems: 'flex-start',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--card-border)', 
                    borderRadius: '8px', 
                    padding: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {getActivityIcon(act.action)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {renderActivityText(act)}
                    </p>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatTime(act.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Active Claims & Recent Additions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Active Claims Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--accent-gold)' }} />
              Who is Reading What
            </h3>

            {loading ? (
              <p className="mono" style={{ color: 'var(--text-muted)' }}>Loading claims...</p>
            ) : activeClaims.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px' }}>
                No active reading claims at the moment.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeClaims.map(claim => (
                  <div 
                    key={claim.id} 
                    onClick={() => onNavigate('paper', claim.paperId)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '8px 12px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--card-hover-border)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '14px', 
                        color: 'var(--text-primary)', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden' 
                      }}>
                        <span style={{ color: 'var(--accent-gold)' }}>{claim.readerName}</span> {claim.readerName === 'You' ? 'are' : 'is'} reading <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>"{claim.title}"</span>
                      </p>
                    </div>
                    <span className="rank-badge" style={{ backgroundColor: '#0d1a3a', borderColor: '#60a5fa', color: '#93c5fd', fontSize: '9px', padding: '2px 6px' }}>
                      Reading
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Papers Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--accent-gold)' }} />
              Recently Saved
            </h3>

            {loading ? (
              <p className="mono" style={{ color: 'var(--text-muted)' }}>Loading papers...</p>
            ) : recentPapers.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px' }}>
                The library is empty.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentPapers.map(paper => {
                  const rank = paper.paper_meta?.sjr_quartile || paper.paper_meta?.core_rank || '';
                  return (
                    <div 
                      key={paper.id}
                      onClick={() => onNavigate('paper', paper.id)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, paddingRight: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          {paper.title}
                        </span>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {paper.year}
                        </span>
                      </div>
                      {rank && <RankBadge rank={rank} style={{ fontSize: '9px', padding: '2px 6px' }} />}
                    </div>
                  );
                })}
                <button 
                  className="btn btn-text" 
                  onClick={() => onNavigate('library')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', alignSelf: 'flex-start', marginTop: '8px' }}
                >
                  View full library <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
