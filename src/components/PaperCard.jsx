import React, { useState } from 'react';
import RankBadge from './RankBadge';
import ClaimButton from './ClaimButton';
import { ExternalLink, Bookmark, Check, UserPlus, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function PaperCard({ 
  paper, 
  saved = false, 
  onSave, 
  onAssign, 
  currentUserId,
  groupMembers = [],
  onClaimChange
}) {
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  const {
    id,
    title,
    authors = [],
    year,
    abstract = '',
    doi,
    url,
    paper_meta
  } = paper;

  // Retrieve rank and additional metrics from cached paper_meta if available
  const rank = paper_meta?.sjr_quartile || paper_meta?.core_rank || paper.rank || '';
  const venue = paper_meta?.venue_name || paper.venue_name || 'Unknown Venue';
  const issn = paper_meta?.issn || paper.issn || '';
  const hIndex = paper_meta?.h_index || paper.h_index || '';

  const authorText = Array.isArray(authors) ? authors.join(', ') : authors;
  
  // Truncate abstract if needed
  const shouldTruncate = abstract && abstract.length > 250;
  const displayAbstract = shouldTruncate && !showFullAbstract 
    ? `${abstract.slice(0, 250)}...` 
    : abstract;

  const handleAssignSelect = (memberId) => {
    if (onAssign) {
      onAssign(id || paper, memberId);
    }
    setShowAssignDropdown(false);
  };

  const paperAssignments = paper.assignments || [];
  const assigneeNames = paperAssignments.map(assign => {
    if (assign.assigned_to === currentUserId) return 'You';
    const member = groupMembers.find(m => m.user_id === assign.assigned_to);
    return member ? member.email : 'Team Colleague';
  });

  const pdfUrl = url || (doi ? `https://sci-hub.box/${doi}` : null);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
      
      {/* Top row: Rank badge + Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {rank && <RankBadge rank={rank} />}
          {venue && (
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {venue}
            </span>
          )}
        </div>
        {year && (
          <span 
            className="mono" 
            style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              marginRight: saved ? '32px' : '0px'
            }}
          >
            {year}
          </span>
        )}
      </div>

      {/* Main content: Title + Authors */}
      <div>
        <h3 style={{ fontSize: '20px', lineHeight: '1.4', marginBottom: '8px', fontStyle: 'normal' }}>
          {title}
        </h3>
        <p className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {authorText}
        </p>
        {saved && paper.added_by && (
          <p className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: assigneeNames.length > 0 ? '8px' : '0' }}>
            Saved by: <span style={{ color: 'var(--accent-gold)' }}>{paper.added_by === currentUserId ? 'You' : (groupMembers.find(m => m.user_id === paper.added_by)?.email || 'Team Scholar')}</span>
          </p>
        )}
        {assigneeNames.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned to:</span>
            {assigneeNames.map((name, idx) => (
              <span 
                key={idx} 
                className="mono" 
                style={{ 
                  fontSize: '11px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#60a5fa', 
                  border: '1px solid rgba(59, 130, 246, 0.2)', 
                  padding: '2px 8px', 
                  borderRadius: '4px' 
                }}
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Abstract */}
      {abstract && (
        <div style={{ fontSize: '15px', color: 'var(--text-primary)', borderLeft: '2px solid var(--text-ghost)', paddingLeft: '12px' }}>
          <p style={{ margin: 0, fontStyle: 'italic', lineHeight: '1.5' }}>
            {displayAbstract}
          </p>
          {shouldTruncate && (
            <button 
              className="btn btn-text" 
              onClick={() => setShowFullAbstract(!showFullAbstract)}
              style={{ fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {showFullAbstract ? (
                <>Hide <ChevronUp size={12} /></>
              ) : (
                <>Show more <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* DOI and Academic Metrics Grid */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '16px', 
          padding: '12px 16px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px',
          fontSize: '12px'
        }}
      >
        {doi && (
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            <strong>DOI:</strong> <span style={{ color: 'var(--text-primary)' }}>{doi}</span>
          </div>
        )}
        {issn && (
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            <strong>ISSN:</strong> <span style={{ color: 'var(--text-primary)' }}>{issn}</span>
          </div>
        )}
        {hIndex && (
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            <strong>H-INDEX:</strong> <span style={{ color: 'var(--accent-gold)' }}>{hIndex}</span>
          </div>
        )}
        {rank && (
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            <strong>RANK:</strong>{' '}
            <span style={{ color: rank.startsWith('Q') ? '#4ade80' : '#c084fc', fontWeight: 600 }}>
              {rank} ({rank.startsWith('Q') ? 'SJR Quartile' : 'CORE Conference'})
            </span>
          </div>
        )}
      </div>

      {/* Actions and status locks */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderTop: '1px solid var(--card-border)', 
        paddingTop: '16px',
        marginTop: 'auto',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Direct link to PDF */}
          {pdfUrl && (
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary" 
              style={{ padding: '8px 14px', gap: '6px' }}
            >
              <FileText size={14} />
              Open PDF
            </a>
          )}

          {/* Claim reading status (only for saved papers) */}
          {saved && id && currentUserId && (
            <ClaimButton 
              paperId={id} 
              currentUserId={currentUserId} 
              onClaimChange={onClaimChange}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          {/* Assign option (only for saved papers) */}
          {saved && id && groupMembers.length > 0 && (
            <div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                style={{ padding: '8px 12px', gap: '4px' }}
              >
                <UserPlus size={14} />
                Assign
              </button>
              {showAssignDropdown && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '8px 0',
                  minWidth: '200px',
                  zIndex: 200,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px 16px', textTransform: 'uppercase' }}>
                    Select Member
                  </div>
                  {groupMembers.map(member => (
                    <button
                      key={member.user_id}
                      onClick={() => handleAssignSelect(member.user_id)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '8px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {member.user_id === currentUserId ? 'You' : member.email || 'Group Colleague'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save to library */}
          {!saved ? (
            <button 
              className="btn btn-primary" 
              onClick={() => onSave(paper)}
              style={{ padding: '8px 16px', gap: '6px' }}
            >
              <Bookmark size={14} />
              Save to Library
            </button>
          ) : (
            <div className="rank-badge" style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: '#22c55e', color: '#4ade80' }}>
              <Check size={12} />
              Saved
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
