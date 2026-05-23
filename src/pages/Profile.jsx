import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RankBadge from '../components/RankBadge';
import { User, BookOpen, CheckCircle, ChevronRight, Loader2, Award } from 'lucide-react';

export default function Profile({ currentUserId, currentUserEmail, groupId, onNavigate, isFirstTimeSetup = false, onSetupComplete }) {
  const [members, setMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Profile editing states
  const [editingProfile, setEditingProfile] = useState(isFirstTimeSetup);
  const [fullNameInput, setFullNameInput] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [updating, setUpdating] = useState(false);

  // Sync selectedUserId with currentUserId when prop resolves
  useEffect(() => {
    if (currentUserId) {
      setSelectedUserId(currentUserId);
    }
  }, [currentUserId]);

  // Fetch all research group members
  const fetchMembers = async () => {
    if (!groupId) return;
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, role, email, full_name, avatar_url')
        .eq('group_id', groupId);

      if (error) throw error;

      const formatted = (data || []).map(member => {
        const handle = member.email ? member.email.split('@')[0] : 'Scholar';
        const defaultName = handle.charAt(0).toUpperCase() + handle.slice(1);
        return {
          ...member,
          fullName: member.full_name || defaultName,
          email: member.email || 'scholar@locus.edu',
          avatarUrl: member.avatar_url || ''
        };
      });

      setMembers(formatted);

      // Pre-populate editing inputs for the current user
      const currentUserMember = formatted.find(m => m.user_id === currentUserId);
      if (currentUserMember) {
        setFullNameInput(currentUserMember.full_name || '');
        setAvatarUrlInput(currentUserMember.avatar_url || '');
      }
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  // Fetch reading claims (reading + completed) and assignments for the selected user
  useEffect(() => {
    const fetchClaims = async () => {
      if (!selectedUserId) return;
      try {
        setProfileLoading(true);
        console.log('[Profile] Fetching claims & assignments for user:', selectedUserId);

        // 1. Fetch reading claims
        const { data: claimsData, error: claimsErr } = await supabase
          .from('reading_claims')
          .select(`
            *,
            papers (
              id,
              title,
              year,
              paper_meta (
                venue_name,
                sjr_quartile,
                core_rank
              )
            )
          `)
          .eq('user_id', selectedUserId);

        if (claimsErr) throw claimsErr;
        console.log('[Profile] Claims fetched:', claimsData?.length, claimsData);

        // 2. Fetch assignments
        const { data: assignsData, error: assignsErr } = await supabase
          .from('assignments')
          .select(`
            *,
            papers (
              id,
              title,
              year,
              paper_meta (
                venue_name,
                sjr_quartile,
                core_rank
              )
            )
          `)
          .eq('assigned_to', selectedUserId);

        if (assignsErr) throw assignsErr;
        console.log('[Profile] Assignments fetched:', assignsData?.length, assignsData);

        // 3. Consolidate duplicates and merge
        const unified = [];
        const paperIds = new Set();

        (claimsData || []).forEach(claim => {
          if (claim.papers) {
            paperIds.add(claim.papers.id);
            unified.push({
              id: claim.id,
              status: claim.status,
              papers: claim.papers
            });
          }
        });

        (assignsData || []).forEach(assign => {
          if (assign.papers && !paperIds.has(assign.papers.id)) {
            paperIds.add(assign.papers.id);
            if (assign.status === 'reading' || assign.status === 'done') {
              unified.push({
                id: assign.id,
                status: assign.status,
                papers: assign.papers
              });
            }
          } else if (assign.papers && paperIds.has(assign.papers.id)) {
            if (assign.status === 'done') {
              const existing = unified.find(u => u.papers.id === assign.papers.id);
              if (existing) {
                existing.status = 'done';
              }
            }
          }
        });

        console.log('[Profile] Consolidated unified list:', unified);
        setClaims(unified);
      } catch (err) {
        console.error('Error fetching reading history:', err);
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    };

    fetchClaims();

    // Subscribe to changes on assignments & reading_claims for real-time responsiveness
    const channel = supabase
      .channel(`profile-sync-${selectedUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reading_claims' },
        () => {
          console.log('[Profile] Realtime event on reading_claims, re-fetching...');
          fetchClaims();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => {
          console.log('[Profile] Realtime event on assignments, re-fetching...');
          fetchClaims();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUserId]);

  const activeClaims = claims.filter(c => c.status === 'reading');
  const completedClaims = claims.filter(c => c.status === 'done');

  // Resolve current active member details
  const selectedMember = members.find(m => m.user_id === selectedUserId);
  const selectedEmail = selectedUserId === currentUserId 
    ? (currentUserEmail || 'You') 
    : (selectedMember ? selectedMember.email : 'Team Member');
  const selectedName = selectedUserId === currentUserId 
    ? 'Your Academic Profile' 
    : (selectedMember ? `${selectedMember.fullName}'s Profile` : 'Scholar Profile');
  const selectedAvatar = selectedUserId === currentUserId
    ? (members.find(m => m.user_id === currentUserId)?.avatarUrl || '')
    : (selectedMember ? selectedMember.avatarUrl : '');

  const PRESET_AVATARS = [
    { name: 'Einstein', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Einstein' },
    { name: 'Curie', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Curie' },
    { name: 'Newton', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Newton' },
    { name: 'Ada', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ada' },
    { name: 'Darwin', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Darwin' },
    { name: 'Turing', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Turing' }
  ];

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      alert('Please enter a display name.');
      return;
    }
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('group_members')
        .update({
          full_name: fullNameInput.trim(),
          avatar_url: avatarUrlInput.trim()
        })
        .eq('group_id', groupId)
        .eq('user_id', currentUserId);

      if (error) throw error;

      await fetchMembers();
      setEditingProfile(false);
      if (onSetupComplete) {
        onSetupComplete();
      }
      alert('Scholar profile updated successfully!');
    } catch (err) {
      console.error('Error updating scholar profile:', err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--accent-gold)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Welcome Setup Alert (First-time users) */}
      {isFirstTimeSetup && (
        <div className="card" style={{ 
          background: 'rgba(184, 134, 11, 0.08)',
          border: '1px solid var(--accent-gold)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(184,134,11,0.15)',
          backdropFilter: 'blur(8px)',
          animation: 'pulse 2s infinite'
        }}>
          <h3 style={{ fontSize: '18px', color: 'var(--accent-gold)', margin: 0, fontWeight: 'bold' }}>Welcome to Locus!</h3>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            To get started, please complete your Scholar Profile by entering your display name and choosing a scientific avatar below.
          </p>
        </div>
      )}

      {/* Header with selector */}
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Researcher Profiles</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track academic activity, claim statuses, and reading achievements for your research collective.
          </p>
        </div>

        {/* Member Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>VIEW PROFILE:</span>
          <select 
            className="input-field" 
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{ padding: '8px 16px', fontSize: '14px', minWidth: '220px', background: 'rgba(16, 14, 20, 0.95)' }}
          >
            <option value={currentUserId}>You ({currentUserEmail || 'Self'})</option>
            {members.filter(m => m.user_id !== currentUserId).map(member => (
              <option key={member.user_id} value={member.user_id}>
                {member.fullName} ({member.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="card" style={{ 
        background: 'radial-gradient(circle at 0% 0%, rgba(184, 134, 11, 0.08) 0%, rgba(16, 14, 20, 0.95) 100%)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        border: '1px solid var(--accent-gold)',
        flexWrap: 'wrap'
      }}>
        {/* Scholar Avatar Circle */}
        <div style={{ 
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: 'rgba(232, 169, 70, 0.1)', 
          border: '2px solid var(--accent-gold)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {selectedAvatar ? (
            <img src={selectedAvatar} alt="Scholar Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
              {selectedName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px', fontFamily: 'var(--font-headings)' }}>{selectedName}</h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              EMAIL: <strong style={{ color: 'var(--text-primary)' }}>{selectedEmail}</strong>
            </span>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              ROLE: <span className="rank-badge" style={{ padding: '2px 8px', textTransform: 'uppercase', backgroundColor: 'rgba(184, 134, 11, 0.1)', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
                {selectedMember ? selectedMember.role : 'Member'}
              </span>
            </span>
          </div>
        </div>

        {/* Edit Button */}
        {selectedUserId === currentUserId && (
          <div style={{ marginLeft: 'auto' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setEditingProfile(!editingProfile)}
              style={{ padding: '8px 16px', gap: '6px', minWidth: '120px' }}
            >
              {editingProfile ? 'Close Edit' : 'Edit Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Edit Profile Form Panel */}
      {selectedUserId === currentUserId && editingProfile && (
        <form onSubmit={handleSaveProfile} className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px', 
          background: 'rgba(16, 14, 20, 0.85)',
          border: '1px solid var(--accent-gold)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <h3 style={{ fontSize: '20px', color: 'var(--accent-gold)', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} /> Update Scholar Credentials
          </h3>

          <div className="responsive-grid">
            {/* Input Name */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Scholar Display Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Marie Curie" 
                required
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
              />
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Your custom profile handle shown on papers and discussions.
              </span>
            </div>

            {/* Input Avatar */}
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Profile Picture URL</label>
              <input 
                type="url" 
                className="input-field" 
                placeholder="https://example.com/avatar.jpg" 
                value={avatarUrlInput}
                onChange={(e) => setAvatarUrlInput(e.target.value)}
              />
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Insert any standard image link or pick a scientific preset below.
              </span>
            </div>
          </div>

          {/* Scientific Preset Avatar selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="input-label" style={{ marginBottom: '4px' }}>Select Premium Scientific Avatar</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {PRESET_AVATARS.map((avatar) => (
                <div 
                  key={avatar.name}
                  onClick={() => setAvatarUrlInput(avatar.url)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: avatarUrlInput === avatar.url ? '2px solid var(--accent-gold)' : '1px solid var(--card-border)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'var(--transition-smooth)',
                    boxShadow: avatarUrlInput === avatar.url ? '0 0 12px rgba(184, 134, 11, 0.4)' : 'none'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = avatarUrlInput === avatar.url ? 'var(--accent-gold)' : 'var(--card-border)'}
                  title={`Preset: ${avatar.name}`}
                >
                  <img src={avatar.url} alt={avatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setEditingProfile(false)}
              disabled={updating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={updating}
              style={{ background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}
            >
              {updating ? 'Saving Changes...' : 'Save Scholar Profile'}
            </button>
          </div>
        </form>
      )}

      {profileLoading ? (
        <div style={{ display: 'flex', padding: '60px', justifyContent: 'center' }}>
          <Loader2 size={24} className="spin" style={{ color: 'var(--accent-gold)' }} />
        </div>
      ) : (
        /* Status Lists Grid */
        <div className="dashboard-grid">
          
          {/* Currently Reading (Left Panel) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={18} style={{ color: '#60a5fa' }} />
              Active Claim: Currently Reading ({activeClaims.length})
            </h3>

            {activeClaims.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '10px 0' }}>
                No active literature reviews in progress.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeClaims.map(claim => {
                  const paper = claim.papers;
                  if (!paper) return null;
                  const rank = paper.paper_meta?.sjr_quartile || paper.paper_meta?.core_rank || '';
                  return (
                    <div 
                      key={claim.id}
                      onClick={() => onNavigate('paper', paper.id)}
                      className="card"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.01)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, paddingRight: '8px' }}>
                        <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                          {paper.title}
                        </span>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {paper.paper_meta?.venue_name || 'Registry Venue'} ({paper.year})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {rank && <RankBadge rank={rank} />}
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Finished / Read Papers (Right Panel) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} style={{ color: '#4ade80' }} />
              Research Accomplished: Read ({completedClaims.length})
            </h3>

            {completedClaims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                <Award size={24} style={{ opacity: 0.2, marginBottom: '8px' }} />
                <p style={{ fontStyle: 'italic', fontSize: '13px' }}>
                  No literature reviews completed yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {completedClaims.map(claim => {
                  const paper = claim.papers;
                  if (!paper) return null;
                  const rank = paper.paper_meta?.sjr_quartile || paper.paper_meta?.core_rank || '';
                  return (
                    <div 
                      key={claim.id}
                      onClick={() => onNavigate('paper', paper.id)}
                      className="card"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '12px',
                        background: 'rgba(34,197,94,0.02)',
                        borderColor: 'rgba(34,197,94,0.1)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, paddingRight: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-primary)', textDecoration: 'line-through' }}>
                          {paper.title}
                        </span>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {paper.paper_meta?.venue_name || 'Registry Venue'} ({paper.year})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {rank && <RankBadge rank={rank} />}
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
