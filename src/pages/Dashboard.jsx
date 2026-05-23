import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Plus, BookOpen, MessageSquare, User, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import RankBadge from '../components/RankBadge';

export default function Dashboard({ currentUserId, groupId, onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [recentPapers, setRecentPapers] = useState([]);
  const [activeClaims, setActiveClaims] = useState([]);
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
          paper_meta (sjr_quartile, core_rank)
        `)
        .order('created_at', { ascending: false })
        .limit(4);

      if (papersErr) throw papersErr;
      setRecentPapers(papers || []);

      // 3. Fetch active reading claims
      const { data: claims, error: claimsErr } = await supabase
        .from('reading_claims')
        .select(`
          *,
          papers (title, id)
        `)
        .eq('status', 'reading')
        .limit(5);

      if (claimsErr) throw claimsErr;
      setActiveClaims(claims || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Live subscription to activity_log
    const channel = supabase
      .channel('dashboard-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
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
      if (uid === currentUserId) return 'You';
      const firstNames = ['Dr. Sarah', 'Prof. Alex', 'Dr. Elena', 'Dr. Marcus', 'Prof. Clara'];
      const lastNames = ['Chen', 'Smith', 'Vasiliev', 'Adebayo', 'Gomez'];
      const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return `${firstNames[hash % firstNames.length]} ${lastNames[hash % lastNames.length]}`;
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
        <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>Research Portal Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Collaborate, review journal quartiles, and share academic insights with your group in real-time.
        </p>
      </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  <div style={{ flex: 1 }}>
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
                    onClick={() => onNavigate('paper', claim.papers?.id)}
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
                        {claim.papers?.title}
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
