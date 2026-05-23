import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RankBadge from '../components/RankBadge';
import { User, BookOpen, CheckCircle, ChevronRight, Loader2, Award } from 'lucide-react';

export default function Profile({ currentUserId, currentUserEmail, groupId, onNavigate }) {
  const [members, setMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch all research group members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!groupId) return;
      try {
        const { data, error } = await supabase
          .from('group_members')
          .select('user_id, role, email')
          .eq('group_id', groupId);

        if (error) throw error;

        const formatted = (data || []).map(member => {
          if (member.email) {
            const handle = member.email.split('@')[0];
            const fullName = handle.charAt(0).toUpperCase() + handle.slice(1);
            return {
              ...member,
              email: member.email,
              fullName
            };
          }
          const hash = member.user_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const firstNames = ['Sarah', 'Alex', 'Elena', 'Marcus', 'Clara'];
          const lastNames = ['Chen', 'Smith', 'Vasiliev', 'Adebayo', 'Gomez'];
          const fallbackEmail = `${firstNames[hash % firstNames.length].toLowerCase()}.${lastNames[hash % lastNames.length].toLowerCase()}@locus.edu`;
          const fullName = `${firstNames[hash % firstNames.length]} ${lastNames[hash % lastNames.length]}`;
          return {
            ...member,
            email: fallbackEmail,
            fullName
          };
        });

        setMembers(formatted);
      } catch (err) {
        console.error('Error fetching group members:', err);
      }
    };

    fetchMembers();
  }, [groupId]);

  // Fetch reading claims (reading + completed) for the selected user
  useEffect(() => {
    const fetchClaims = async () => {
      if (!selectedUserId) return;
      try {
        setProfileLoading(true);
        const { data, error } = await supabase
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

        if (error) throw error;
        setClaims(data || []);
      } catch (err) {
        console.error('Error fetching reading claims:', err);
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    };

    fetchClaims();
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--accent-gold)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header with selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '36px', marginBottom: '8px' }}>Researcher Profiles</h1>
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
        border: '1px solid var(--accent-gold)'
      }}>
        <div style={{ 
          background: 'rgba(232, 169, 70, 0.1)', 
          border: '1px solid var(--accent-gold)', 
          borderRadius: '50%', 
          padding: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <User size={36} style={{ color: 'var(--accent-gold)' }} />
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
      </div>

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
