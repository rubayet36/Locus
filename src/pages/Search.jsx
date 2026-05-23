import React, { useState } from 'react';
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

export default function Search({ currentUserId, groupId }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const data = await lookupPaperMetadata(searchQuery);
      setResult(data);
      
      // Check if this paper is already saved in this group library
      if (data.doi) {
        const { data: existing, error: existErr } = await supabase
          .from('papers')
          .select('id')
          .eq('group_id', groupId)
          .eq('doi', data.doi)
          .maybeSingle();

        if (existing) {
          setSaved(true);
          // Set ID on result so ClaimButton can use it
          data.id = existing.id;
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to retrieve paper metadata. Please check the identifier and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = async (paperData) => {
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
      const quartile = paperData.rank?.startsWith('Q') ? paperData.rank : null;
      const coreRank = !paperData.rank?.startsWith('Q') ? paperData.rank : null;

      const { error: metaErr } = await supabase
        .from('paper_meta')
        .insert({
          paper_id: paper.id,
          venue_name: paperData.venue_name,
          issn: paperData.issn,
          sjr_rank: paperData.rank,
          sjr_quartile: quartile,
          core_rank: coreRank,
          h_index: paperData.h_index
        });

      if (metaErr) throw metaErr;

      // 3. Log Activity
      const { error: logErr } = await supabase
        .from('activity_log')
        .insert({
          group_id: groupId,
          paper_id: paper.id,
          user_id: currentUserId,
          action: 'added'
        });

      if (logErr) throw logErr;

      setSaved(true);
      // Update result state with the newly inserted DB id
      setResult(prev => ({ ...prev, id: paper.id }));

    } catch (err) {
      console.error('Error saving paper:', err);
      alert('Failed to save paper to group library: ' + err.message);
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
          Paste a DOI, publisher URL, or search using a paper title. We will query Crossref, Semantic Scholar, and calculate academic ranks in real-time.
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
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Quartiles & Conference Ranks:</span> Journals are graded Q1–Q4 based on Scimago (SJR) data, whereas conference papers are graded A*, A, B, C according to the CORE rankings.
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px' }}>
          <Loader2 size={40} className="spin" style={{ color: 'var(--accent-gold)' }} />
          <p className="mono" style={{ color: 'var(--text-secondary)' }}>Querying academic registries and computing ranking quartiles...</p>
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
            onSave={handleSaveToLibrary}
            currentUserId={currentUserId}
          />
        </div>
      )}

    </div>
  );
}
