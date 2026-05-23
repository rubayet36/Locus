import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { lookupPaperMetadata } from '../lib/rankLookup';
import PaperCard from '../components/PaperCard';
import { Search as SearchIcon, Sparkles, Loader2, Info, AlertTriangle, Check } from 'lucide-react';

const SUGGESTIONS = [
  { label: 'DOI: Journal of Pragmatics (Q1)', value: '10.1016/j.pragma.2011.10.004' },
  { label: 'DOI: Nature Machine Intelligence', value: '10.1038/s42256-020-00287-2' },
  { label: 'Topic Search: Language Models', value: 'Attention Is All You Need' },
  { label: 'Topic Search: CRISPR Gene Editing', value: 'CRISPR Cas9 gene editing efficiency' }
];

const PAPER_META_LEGACY_FIELDS = `
  venue_name,
  issn,
  sjr_rank,
  sjr_quartile,
  core_rank,
  rank_source,
  sjr,
  h_index
`;

const PAPER_META_RANKING_FIELDS = `
  ${PAPER_META_LEGACY_FIELDS},
  citation_count,
  influential_citation_count,
  openalex_cited_by_count,
  fwci,
  impact_score,
  semantic_scholar_id,
  openalex_id,
  author_metrics,
  institutions
`;

export default function Search({ currentUserId, groupId }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [saveDraft, setSaveDraft] = useState(null);
  const [manualRank, setManualRank] = useState('');
  const [initialAssignee, setInitialAssignee] = useState('');

  // Fetch group members for name resolution inside PaperCard
  const fetchMembers = async () => {
    if (!groupId) return;
    try {
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id, role, email, full_name, avatar_url')
        .eq('group_id', groupId);

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
      console.error('Error fetching group members in Search:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  // Fetch fully qualified paper details from the DB
  const fetchSavedPaperDetails = async (paperId) => {
    try {
      let { data: fullPaper, error } = await supabase
        .from('papers')
        .select(`
          *,
          paper_meta (${PAPER_META_RANKING_FIELDS}),
          reading_claims (
            user_id,
            status
          ),
          assignments (
            assigned_to,
            status
          )
        `)
        .eq('id', paperId)
        .single();

      if (error?.code === '42703') {
        const fallback = await supabase
          .from('papers')
          .select(`
            *,
            paper_meta (${PAPER_META_LEGACY_FIELDS}),
            reading_claims (
              user_id,
              status
            ),
            assignments (
              assigned_to,
              status
            )
          `)
          .eq('id', paperId)
          .single();
        fullPaper = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      
      if (fullPaper) {
        setResult(fullPaper);
      }
    } catch (err) {
      console.error('Error fetching paper details:', err);
    }
  };

  const normalizeTitle = (title) => {
    if (!title) return '';
    return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  };

  const prepareLookupResult = (paperData) => ({
    ...paperData,
    rank: '',
    rank_source: '',
    sjr: '',
    h_index: ''
  });

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    console.log('[Search] Starting search with query:', searchQuery, 'groupId:', groupId);

    try {
      const data = prepareLookupResult(await lookupPaperMetadata(searchQuery));
      setResult(data);
      console.log('[Search] Retrieved metadata:', data);
      
      // Perform case-insensitive, fuzzy DOI & normalized title match checks client-side against all accessible papers
      if (data.doi || data.title) {
        console.log('[Search] Querying existing papers (relying on RLS to security-scope records)...');
        
        const { data: existingPapers, error: queryErr } = await supabase
          .from('papers')
          .select('id, title, doi');

        if (queryErr) {
          console.error('[Search] Database query error:', queryErr);
        }
        console.log('[Search] Existing papers count:', existingPapers ? existingPapers.length : 0, existingPapers);

        if (existingPapers) {
          const match = existingPapers.find(p => {
            const doiMatch = p.doi && data.doi && p.doi.trim().toLowerCase() === data.doi.trim().toLowerCase();
            
            const normPTitle = normalizeTitle(p.title);
            const normDataTitle = normalizeTitle(data.title);
            const titleMatch = normPTitle && normDataTitle && (
              normPTitle.includes(normDataTitle) ||
              normDataTitle.includes(normPTitle)
            );
            
            console.log(`[Search] Comparing "${p.title}" / "${p.doi}" against "${data.title}" / "${data.doi}": doiMatch=${doiMatch}, titleMatch=${titleMatch}`);
            return doiMatch || titleMatch;
          });

          console.log('[Search] Matching result:', match);

          if (match) {
            setSaved(true);
            console.log('[Search] Match found! Fetching full details for paper ID:', match.id);
            // Fetch complete stored details including assignments and claims
            await fetchSavedPaperDetails(match.id);
          } else {
            console.log('[Search] No match found among existing papers.');
          }
        }
      }
    } catch (err) {
      console.error('[Search] Error in search:', err);
      setError(err.message || 'Failed to retrieve paper metadata. Please check the identifier and try again.');
    } finally {
      setLoading(false);
    }
  };

  const openSaveDialog = (paperData) => {
    setSaveDraft(paperData);
    setManualRank('');
    setInitialAssignee('');
  };

  const closeSaveDialog = () => {
    setSaveDraft(null);
    setManualRank('');
    setInitialAssignee('');
  };

  const normalizeManualRank = (rankValue) => rankValue.trim().toUpperCase();

  const handleSaveToLibrary = async () => {
    if (!saveDraft) return;

    const paperData = saveDraft;
    const selectedRank = normalizeManualRank(manualRank);

    if (!selectedRank) {
      alert('Please enter a rank before saving this paper.');
      return;
    }

    try {
      // 1. Insert Paper
      const { data: paper, error: paperErr } = await supabase
        .from('papers')
        .insert({
          group_id: groupId,
          title: paperData.title,
          doi: paperData.doi,
          url: paperData.url,
          abstract: paperData.abstract,
          authors: paperData.authors,
          year: paperData.year,
          added_by: currentUserId
        })
        .select()
        .single();

      if (paperErr) throw paperErr;

      // 2. Insert Paper Metadata Cache
      const quartile = selectedRank.startsWith('Q') ? selectedRank : null;
      const coreRank = !selectedRank.startsWith('Q') ? selectedRank : null;

      const baseMetaPayload = {
        paper_id: paper.id,
        venue_name: paperData.venue_name,
        issn: paperData.issn,
        sjr_rank: selectedRank,
        sjr_quartile: quartile,
        core_rank: coreRank,
        rank_source: 'Manually entered by group member',
        sjr: null,
        h_index: null
      };

      const rankingMetaPayload = {
        ...baseMetaPayload,
        citation_count: paperData.citation_count,
        influential_citation_count: paperData.influential_citation_count,
        openalex_cited_by_count: paperData.openalex_cited_by_count,
        fwci: paperData.fwci,
        impact_score: paperData.impact_score,
        semantic_scholar_id: paperData.semantic_scholar_id,
        openalex_id: paperData.openalex_id,
        author_metrics: paperData.author_metrics,
        institutions: paperData.institutions
      };

      let { error: metaErr } = await supabase.from('paper_meta').insert(rankingMetaPayload);

      if (metaErr?.code === '42703') {
        ({ error: metaErr } = await supabase.from('paper_meta').insert(baseMetaPayload));
      }

      if (metaErr) throw metaErr;

      // 3. Optional initial assignment
      if (initialAssignee) {
        const { error: assignErr } = await supabase
          .from('assignments')
          .insert({
            paper_id: paper.id,
            assigned_to: initialAssignee,
            assigned_by: currentUserId,
            status: 'unread'
          });

        if (assignErr) throw assignErr;
      }

      // 4. Log Activity
      const { error: logErr } = await supabase
        .from('activity_log')
        .insert({
          group_id: groupId,
          paper_id: paper.id,
          user_id: currentUserId,
          action: initialAssignee ? 'added_assigned' : 'added',
          meta: initialAssignee ? { assigned_to: initialAssignee } : {}
        });

      if (logErr) throw logErr;

      setSaved(true);
      closeSaveDialog();
      // Fetch full saved paper details to populate added_by, empty claims, assignments structure
      await fetchSavedPaperDetails(paper.id);

    } catch (err) {
      console.error('Error saving paper:', err);
      alert('Failed to save paper to group library: ' + err.message);
    }
  };

  const handleAssign = async (paperOrId, assignedToId) => {
    const paperId = typeof paperOrId === 'object' ? paperOrId.id : paperOrId;
    if (!paperId) return;
    try {
      if (!assignedToId) {
        // Delete all assignments for this paper and user
        const { error } = await supabase
          .from('assignments')
          .delete()
          .eq('paper_id', paperId)
          .eq('assigned_to', currentUserId);

        if (error) throw error;

        alert('Paper unassigned successfully!');
        await fetchSavedPaperDetails(paperId);
        return;
      }

      const { error } = await supabase
        .from('assignments')
        .insert({
          paper_id: paperId,
          assigned_to: assignedToId,
          assigned_by: currentUserId,
          status: 'unread'
        });

      if (error) throw error;
      
      await supabase.from('activity_log').insert({
        group_id: groupId,
        paper_id: paperId,
        user_id: currentUserId,
        action: 'assigned'
      });

      alert('Paper assigned successfully!');
      await fetchSavedPaperDetails(paperId);
    } catch (err) {
      console.error('Error assigning paper:', err);
      alert('Failed to assign paper: ' + err.message);
    }
  };

  const handleClaimChange = () => {
    if (result && result.id) {
      fetchSavedPaperDetails(result.id);
    }
  };

  const handleSuggestionClick = (val) => {
    setQuery(val);
    handleSearch(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ marginBottom: '8px' }}>Paper Metadata Lookup</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Paste a DOI, publisher URL, or search using a paper title. We will fetch paper metadata for your portal; rank is entered manually when saving to the library.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="search-bar-row">
          <div style={{ flex: 1, position: 'relative' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. 10.1016/j.pragma.2011.10.004 or Attention Is All You Need"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', paddingRight: '40px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <SearchIcon 
              size={18} 
              style={{ 
                position: 'absolute', 
                right: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => handleSearch()}
            disabled={loading}
            style={{ minWidth: '130px' }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : 'Lookup'}
          </button>
        </div>

        {/* Suggested Queries */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> Suggestions:
          </span>
          {SUGGESTIONS.map((sug, idx) => (
            <button 
              key={idx} 
              className="btn btn-secondary" 
              onClick={() => handleSuggestionClick(sug.value)}
              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '20px' }}
            >
              {sug.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info notice about ranking rules */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          background: 'rgba(232, 169, 70, 0.03)', 
          border: '1px solid rgba(232, 169, 70, 0.1)', 
          borderRadius: '8px', 
          padding: '16px',
          alignItems: 'flex-start'
        }}
      >
        <Info size={16} style={{ color: 'var(--accent-gold)', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Manual Ranking:</span> Lookup does not auto-rank papers. Add Q1-Q4, A*, A, B, C, or your own label when saving.
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px' }}>
          <Loader2 size={40} className="spin" style={{ color: 'var(--accent-gold)' }} />
          <p className="mono" style={{ color: 'var(--text-secondary)' }}>Querying paper metadata sources...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div 
          className="card" 
          style={{ 
            borderColor: 'rgba(239,68,68,0.2)', 
            background: 'rgba(239,68,68,0.02)', 
            display: 'flex', 
            gap: '15px', 
            alignItems: 'center' 
          }}
        >
          <AlertTriangle size={24} style={{ color: '#ef4444' }} />
          <p style={{ color: 'var(--text-primary)' }}>{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="mono" style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Lookup Result
            </h2>
            {saved && (
              <span className="rank-badge" style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: '#22c55e', color: '#4ade80', fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Already Exists in Library
              </span>
            )}
          </div>
          <PaperCard 
            paper={result} 
            saved={saved} 
            onSave={openSaveDialog}
            currentUserId={currentUserId}
            groupMembers={groupMembers}
            onAssign={handleAssign}
            onClaimChange={handleClaimChange}
          />
        </div>
      )}

      {saveDraft && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card" style={{ width: 'min(560px, 100%)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Save Paper</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                Add the rank manually and optionally assign the paper now.
              </p>
            </div>

            <div>
              <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>Paper</p>
              <p style={{ fontWeight: 800, lineHeight: 1.35 }}>{saveDraft.title}</p>
              {saveDraft.venue_name && (
                <p className="mono" style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{saveDraft.venue_name}</p>
              )}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Rank</span>
              <input
                className="input-field"
                value={manualRank}
                onChange={(e) => setManualRank(e.target.value)}
                placeholder="Q1, Q2, Q3, Q4, A*, A, B, C, or custom"
                autoFocus
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Assign to (optional)</span>
              <select
                className="input-field"
                value={initialAssignee}
                onChange={(e) => setInitialAssignee(e.target.value)}
              >
                <option value="">No assignment</option>
                {groupMembers.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_id === currentUserId
                      ? `${member.fullName || 'You'} (You)`
                      : member.fullName || member.email || 'Group member'}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button className="btn btn-secondary" onClick={closeSaveDialog}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveToLibrary}>
                Save to Library
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
