import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PaperCard from '../components/PaperCard';
import { Grid, List, Search as SearchIcon, SlidersHorizontal, Trash2, Library as LibIcon } from 'lucide-react';

export default function Library({ currentUserId, groupId, onNavigate }) {
  const [papers, setPapers] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRank, setSelectedRank] = useState('');
  const [selectedClaimStatus, setSelectedClaimStatus] = useState('');

  const fetchLibraryData = async () => {
    if (!groupId) return;
    try {
      setLoading(true);

      // 1. Fetch papers in group with metadata and claims
      const { data: papersData, error: papersErr } = await supabase
        .from('papers')
        .select(`
          *,
          paper_meta (
            venue_name,
            issn,
            sjr_rank,
            sjr_quartile,
            core_rank,
            h_index
          ),
          reading_claims (
            user_id,
            status
          ),
          assignments (
            assigned_to,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (papersErr) throw papersErr;
      setPapers(papersData || []);

      // 2. Fetch group members for assignments
      const { data: membersData, error: membersErr } = await supabase
        .from('group_members')
        .select('user_id, role, email, full_name, avatar_url')
        .eq('group_id', groupId);

      if (membersErr) throw membersErr;
      
      const formattedMembers = (membersData || []).map(member => {
        const handle = member.email ? member.email.split('@')[0] : 'Scholar';
        const defaultName = handle.charAt(0).toUpperCase() + handle.slice(1);
        return {
          ...member,
          email: member.email || 'scholar@locus.edu',
          fullName: member.full_name || defaultName
        };
      });
      
      setGroupMembers(formattedMembers);

    } catch (err) {
      console.error('Error fetching library data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();

    // Subscribe to papers additions/removals
    const channel = supabase
      .channel('library-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'papers' },
        () => fetchLibraryData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const handleAssign = async (paperId, assignedToId) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          paper_id: paperId,
          assigned_to: assignedToId,
          assigned_by: currentUserId,
          status: 'unread'
        });

      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_log').insert({
        group_id: groupId,
        paper_id: paperId,
        user_id: currentUserId,
        action: 'assigned'
      });

      alert('Paper assigned successfully!');
      fetchLibraryData();
    } catch (err) {
      console.error('Error assigning paper:', err);
      alert('Failed to assign paper: ' + err.message);
    }
  };

  const handleDeletePaper = async (paperId) => {
    if (!window.confirm('Are you sure you want to remove this paper from the group library?')) return;
    try {
      const { error } = await supabase
        .from('papers')
        .delete()
        .eq('id', paperId);
      if (error) throw error;
      fetchLibraryData();
    } catch (err) {
      console.error('Error deleting paper:', err);
    }
  };

  // Filter logic
  const filteredPapers = papers.filter(paper => {
    const meta = paper.paper_meta || {};
    const rank = meta.sjr_quartile || meta.core_rank || '';
    
    // Fuzzy search
    const matchesSearch = 
      paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (paper.authors && paper.authors.some(auth => auth.toLowerCase().includes(searchTerm.toLowerCase())));

    // Rank filter
    const matchesRank = selectedRank === '' || rank.toUpperCase() === selectedRank.toUpperCase();

    // Claim status filter
    const claims = paper.reading_claims || [];
    const userClaim = claims.find(c => c.user_id === currentUserId);
    const claimStatus = userClaim ? userClaim.status : 'unread';
    
    const matchesClaim = selectedClaimStatus === '' || claimStatus === selectedClaimStatus;

    return matchesSearch && matchesRank && matchesClaim;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Group Library</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            All papers saved by your research team. Filter by rank quartile, assignment status, or claim locks.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('search')}>
          Add New Paper
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(16, 14, 20, 0.6)' }}>
        
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
          <SearchIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Rank Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="input-field" 
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '14px' }}
          >
            <option value="">All Ranks</option>
            <option value="Q1">Q1 Quartile</option>
            <option value="Q2">Q2 Quartile</option>
            <option value="Q3">Q3 Quartile</option>
            <option value="Q4">Q4 Quartile</option>
            <option value="A*">A* Conference</option>
            <option value="A">A Conference</option>
            <option value="B">B Conference</option>
            <option value="C">C Conference</option>
          </select>
        </div>

        {/* Claim status filter */}
        <select 
          className="input-field" 
          value={selectedClaimStatus}
          onChange={(e) => setSelectedClaimStatus(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '14px' }}
        >
          <option value="">All Claim Statuses</option>
          <option value="unread">Unclaimed / Unread</option>
          <option value="reading">Claimed (Reading)</option>
          <option value="done">Finished</option>
        </select>

      </div>

      {/* Library Count */}
      <div className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Showing {filteredPapers.length} of {papers.length} saved papers
      </div>

      {/* Paper Cards Grid */}
      {loading ? (
        <p className="mono" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px' }}>Loading library papers...</p>
      ) : filteredPapers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <LibIcon size={40} style={{ marginBottom: '16px', color: 'var(--text-muted)', opacity: 0.3 }} />
          <h3 style={{ marginBottom: '8px' }}>No papers found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Try adjusting your search criteria, or add some papers in the Search page.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {filteredPapers.map(paper => (
            <div key={paper.id} style={{ position: 'relative' }}>
              <div 
                onClick={(e) => {
                  // Only navigate if they didn't click inside an interactive button/dropdown
                  if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('select')) {
                    onNavigate('paper', paper.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <PaperCard 
                  paper={paper}
                  saved={true}
                  currentUserId={currentUserId}
                  groupMembers={groupMembers}
                  onAssign={handleAssign}
                  onClaimChange={fetchLibraryData}
                />
              </div>
              
              {/* Optional Delete Button at the very top right corner of the paper wrapper (Only for the user who saved the paper) */}
              {paper.added_by === currentUserId && (
                <button 
                  onClick={() => handleDeletePaper(paper.id)}
                  className="btn btn-text"
                  style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px', 
                    color: '#ef4444', 
                    opacity: 0.5,
                    padding: '4px',
                    zIndex: 10
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.5}
                  title="Remove Paper"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
