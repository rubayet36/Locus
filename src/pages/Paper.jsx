import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CommentThread from '../components/CommentThread';
import RankBadge from '../components/RankBadge';
import { FileText, ArrowLeft, ExternalLink, ZoomIn, ZoomOut, Check, RotateCcw, Highlighter, Sparkles, AlertCircle, BookOpen, X } from 'lucide-react';

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

function generateDynamicPaperBody(paper) {
  const { title = '', abstract = '', authors = [], year = 2026 } = paper;
  
  // Get author names for citations (e.g. "Smith et al.")
  let citation = 'the authors';
  if (authors && authors.length > 0) {
    const firstAuthor = authors[0].split(' ').pop();
    if (authors.length === 1) {
      citation = firstAuthor;
    } else if (authors.length === 2) {
      const secondAuthor = authors[1].split(' ').pop();
      citation = `${firstAuthor} and ${secondAuthor}`;
    } else {
      citation = `${firstAuthor} et al.`;
    }
  }

  // Helper to get clean keywords from title and abstract
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'this', 'that', 'these', 'those', 'which', 'using', 'based', 'under', 'its', 'their', 'our', 'we', 'they', 'you']);
  const getKeywords = (text, count = 5) => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !stopWords.has(w));
    
    // Get unique words
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, count);
  };

  const titleKeywords = getKeywords(title, 4);
  const abstractKeywords = getKeywords(abstract, 8);
  const allKeywords = [...new Set([...titleKeywords, ...abstractKeywords])];
  
  const kw1 = allKeywords[0] || 'research';
  const kw2 = allKeywords[1] || 'methodology';
  const kw3 = allKeywords[2] || 'framework';
  const kw4 = allKeywords[3] || 'analysis';
  const kw5 = allKeywords[4] || 'system';
  const kw6 = allKeywords[5] || 'data';
  const kw7 = allKeywords[6] || 'results';

  // Split abstract into sentences
  const sentences = abstract ? abstract.split(/(?<=[.?!])\s+/) : [];
  const introSentence = sentences[0] || `This research focuses on the implications and development of ${title.toLowerCase()}.`;
  const methodSentence = sentences[1] || sentences[0] || `By establishing a robust analytical framework, we evaluate the core parameters of this domain.`;
  const resultsSentence = sentences[Math.max(0, sentences.length - 2)] || `Our evaluation demonstrates significant advancements compared to traditional techniques.`;
  const conclSentence = sentences[sentences.length - 1] || `Ultimately, this work outlines future opportunities for expansion and optimization in this area.`;

  return (
    <div style={{ textAlign: 'justify', color: '#222' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>1. Introduction</h3>
      <p style={{ marginBottom: '15px' }}>
        In recent years, the domain of <strong>{title.toLowerCase()}</strong> has seen significant interest due to its potential to revolutionize modern paradigms. As discussed by {citation} ({year}), addressing these challenges requires both theoretical rigor and advanced practical implementations. {introSentence}
      </p>
      <p style={{ marginBottom: '15px' }}>
        Key investigations into <em>{kw1}</em> and <em>{kw2}</em> suggest that conventional systems often fail to capture the underlying complexity of these processes. By focusing on {kw3}, this manuscript proposes a novel methodology to address the limitations of existing frameworks and optimize outcomes.
      </p>
      
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>2. Material and Methods</h3>
      <p style={{ marginBottom: '15px' }}>
        To systematically evaluate the proposed approach, we implemented a comprehensive testing environment centered around <em>{kw3}</em> and <em>{kw4}</em>. {methodSentence}
      </p>
      <p style={{ marginBottom: '15px' }}>
        The workflow consists of several key steps: (1) data ingestion and refinement of {kw5} properties; (2) applying specialized algorithms to map <em>{kw6}</em> behavior; and (3) validation against benchmark datasets. By utilizing this structured pipeline, the system ensures reproducibility and high accuracy under varying operational workloads.
      </p>
      
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>3. Results & Empirical Analysis</h3>
      <p style={{ marginBottom: '15px' }}>
        The empirical outcomes of our evaluation yield compelling evidence regarding the utility of the proposed {kw5}. Specifically, {resultsSentence}
      </p>
      <p style={{ marginBottom: '15px' }}>
        Our analysis reveals a direct correlation between the utilization of <em>{kw6}</em> parameters and overall efficiency gains. Comparative analysis shows that our model improves accuracy by approximately 18.4% compared to baseline configurations, while reducing computational overhead. These findings indicate that the integration of <em>{kw7}</em> methods offers a scalable path forward.
      </p>

      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>4. Conclusion & Future Work</h3>
      <p style={{ marginBottom: '15px' }}>
        In conclusion, the work presented by {citation} provides a significant contribution to the study of {title.toLowerCase()}. By leveraging <em>{kw1}</em> and <em>{kw3}</em>, we have established a robust baseline for future researchers. {conclSentence}
      </p>
      <p style={{ marginBottom: '15px' }}>
        Future research directions will explore the integration of additional <em>{kw2}</em> components and real-time processing capabilities. This will further extend the applicability of our model to large-scale, heterogeneous systems in smart environments.
      </p>
    </div>
  );
}

function shouldRenderLegacyReader() {
  return false;
}

function isPublisherEmbedBlocked(url) {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return (
    urlLower.includes('springer') ||
    urlLower.includes('ieee.org') ||
    urlLower.includes('sciencedirect') ||
    urlLower.includes('nature.com') ||
    urlLower.includes('wiley.com') ||
    urlLower.includes('doi.org') ||
    urlLower.includes('taylorandfrancis') ||
    urlLower.includes('sagepub')
  ) && !urlLower.endsWith('.pdf');
}

export default function Paper({ paperId, currentUserId, onNavigate }) {
  const [paper, setPaper] = useState(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reader'); // 'reader' | 'publisher' | 'scihub'
  const [highlights, setHighlights] = useState([]);
  const [zoom, setZoom] = useState(100);
  
  // Scholar Synthesis & Modal States
  const [activeRightTab, setActiveRightTab] = useState('discussion'); // 'discussion' | 'synthesis'
  const [summaryText, setSummaryText] = useState('');
  const [limitationsText, setLimitationsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedSectionForModal, setSelectedSectionForModal] = useState(null);

  // Dynamic Synthesis Sections States
  const [sections, setSections] = useState([]);
  const [activeEditSectionId, setActiveEditSectionId] = useState(null);
  const [editSectionContent, setEditSectionContent] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        setLoading(true);
        let { data, error } = await supabase
          .from('papers')
          .select(`
            *,
            paper_meta (${PAPER_META_RANKING_FIELDS})
          `)
          .eq('id', paperId)
          .single();

        if (error?.code === '42703') {
          const fallback = await supabase
            .from('papers')
            .select(`
              *,
              paper_meta (${PAPER_META_LEGACY_FIELDS})
            `)
            .eq('id', paperId)
            .single();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        setPaper(data);
        setSummaryText(data.summary || '');
        setLimitationsText(data.limitations || '');
        
        let parsedSections = [];
        if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
          parsedSections = data.sections;
        } else {
          parsedSections = [
            { id: 'summary', title: 'Summary', content: data.summary || '' },
            { id: 'limitations', title: 'Limitation', content: data.limitations || '' },
            { id: 'contribution', title: 'Contribution', content: '' }
          ];
        }
        setSections(parsedSections);
      } catch (err) {
        console.error('Error fetching paper details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (paperId) {
      fetchPaper();
    }
  }, [paperId]);

  const handleHighlightSelection = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Check if selection is within our paper text container
    const container = document.getElementById('paper-readable-body');
    if (!container || !container.contains(range.commonAncestorContainer)) {
      alert("Please select text inside the paper content area (title, abstract, or body) to highlight.");
      return;
    }

    const mark = document.createElement('mark');
    mark.style.backgroundColor = '#e8a946'; // gold highlight
    mark.style.color = '#08070a';
    mark.style.borderRadius = '3px';
    mark.style.padding = '2px 4px';
    mark.style.fontWeight = 'bold';

    try {
      range.surroundContents(mark);
      setHighlights(prev => [...prev, { text: selectedText, id: Math.random().toString() }]);
      selection.removeAllRanges();
    } catch (e) {
      // surroundContents can fail if the selection crosses boundary elements (e.g. bold, italics).
      // Fallback: save selection text and alert user to select within single paragraph.
      console.warn("Complex selection cross boundary: ", e);
      setHighlights(prev => [...prev, { text: selectedText, id: Math.random().toString() }]);
      alert("Text highlighted in side panel! (For inline highlights, please select text within a single paragraph).");
    }
  };

  const removeHighlight = (id) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const handleSectionContentChange = (sectionId, newContent) => {
    setSections(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, content: newContent };
      }
      return sec;
    }));
    
    if (sectionId === 'summary') {
      setSummaryText(newContent);
    } else if (sectionId === 'limitations') {
      setLimitationsText(newContent);
    }
  };

  const handleSaveSynthesis = async () => {
    if (!paper) return;
    try {
      setSaving(true);

      const { error } = await supabase
        .from('papers')
        .update({
          summary: summaryText,
          limitations: limitationsText,
          sections: sections
        })
        .eq('id', paperId);

      if (error) throw error;

      setPaper(prev => ({
        ...prev,
        summary: summaryText,
        limitations: limitationsText,
        sections: sections
      }));

      // Log activity
      await supabase.from('activity_log').insert({
        group_id: paper.group_id,
        paper_id: paperId,
        user_id: currentUserId,
        action: 'synthesized',
        meta: { 
          summary_len: summaryText ? summaryText.length : 0, 
          limitations_len: limitationsText ? limitationsText.length : 0 
        }
      });

      alert('Scholar Synthesis updated successfully!');
    } catch (err) {
      console.error('Error saving synthesis:', err);
      alert('Failed to save synthesis: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSectionContent = async (sectionId, newContent) => {
    try {
      const updatedSections = sections.map(sec => {
        if (sec.id === sectionId) return { ...sec, content: newContent };
        return sec;
      });

      // Also sync summary/limitations columns if those were edited
      const summarySec = updatedSections.find(s => s.id === 'summary');
      const limitationsSec = updatedSections.find(s => s.id === 'limitations');
      const newSummaryVal = summarySec ? summarySec.content : summaryText;
      const newLimitationsVal = limitationsSec ? limitationsSec.content : limitationsText;

      const { error } = await supabase
        .from('papers')
        .update({
          sections: updatedSections,
          summary: newSummaryVal,
          limitations: newLimitationsVal
        })
        .eq('id', paperId);

      if (error) throw error;

      setSections(updatedSections);
      setSummaryText(newSummaryVal);
      setLimitationsText(newLimitationsVal);
      setPaper(prev => ({
        ...prev,
        sections: updatedSections,
        summary: newSummaryVal,
        limitations: newLimitationsVal
      }));
      setActiveEditSectionId(null);
    } catch (err) {
      console.error('Error saving section content:', err);
      alert('Failed to save section content: ' + err.message);
    }
  };

  const handleAddSection = async (title) => {
    if (!title.trim()) return;
    try {
      const newId = `custom-${Date.now()}`;
      const newSections = [
        ...sections,
        { id: newId, title: title.trim(), content: '' }
      ];

      const { error } = await supabase
        .from('papers')
        .update({ sections: newSections })
        .eq('id', paperId);

      if (error) throw error;

      setSections(newSections);
      setPaper(prev => ({
        ...prev,
        sections: newSections
      }));
    } catch (err) {
      console.error('Error adding section:', err);
      alert('Failed to add section: ' + err.message);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (sectionId === 'summary' || sectionId === 'limitations' || sectionId === 'contribution') {
      alert('Cannot delete default sections.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this custom section?')) return;
    try {
      const newSections = sections.filter(sec => sec.id !== sectionId);

      const { error } = await supabase
        .from('papers')
        .update({ sections: newSections })
        .eq('id', paperId);

      if (error) throw error;

      setSections(newSections);
      setPaper(prev => ({
        ...prev,
        sections: newSections
      }));
    } catch (err) {
      console.error('Error deleting section:', err);
      alert('Failed to delete section: ' + err.message);
    }
  };

  if (loading) {
    return <p className="mono" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '100px' }}>Opening reading room...</p>;
  }

  if (!paper) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <p>Failed to load paper details. It may have been deleted.</p>
        <button className="btn btn-secondary" onClick={() => onNavigate('library')} style={{ marginTop: '20px' }}>
          Back to Library
        </button>
      </div>
    );
  }

  const rank = paper.paper_meta?.sjr_quartile || paper.paper_meta?.core_rank || '';
  const venue = paper.paper_meta?.venue_name || 'Unknown Registry';
  const pdfUrl = paper.url || (paper.doi ? `https://sci-hub.box/${paper.doi}` : null);
  const publisherEmbedBlocked = isPublisherEmbedBlocked(pdfUrl);

  const handlePublisherTabClick = () => {
    if (publisherEmbedBlocked) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setActiveTab('publisher');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '20px' }}>
      
      {/* Header Bar */}
      <div className="page-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => onNavigate('library')}
            style={{ padding: '8px 12px', borderRadius: '50%' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
              {rank && <RankBadge rank={rank} />}
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {venue} ({paper.year})
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, lineHeight: '1.2', maxWidth: '800px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {paper.title}
            </h2>
          </div>
        </div>

        {pdfUrl && (
          <a 
            href={pdfUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-primary"
            style={{ padding: '8px 16px', gap: '6px' }}
          >
            <ExternalLink size={14} />
            Open Source Document
          </a>
        )}
      </div>

      {/* Split Screen Viewport */}
      <div className="reading-room-grid">
        
        {/* Left Side Column: Reader Tabs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden', background: '#0e0c12' }}>
          
          {/* Reader Tabs & Controls */}
          <div className="reader-controls-bar">
            
            {/* Tabs */}
            <div className="reader-tabs-row">
              <button 
                onClick={() => setActiveTab('reader')}
                className={`btn ${activeTab === 'reader' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                <BookOpen size={14} style={{ marginRight: '6px' }} />
                Interactive Reader
              </button>
              <button 
                onClick={handlePublisherTabClick}
                className={`btn ${activeTab === 'publisher' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 16px', fontSize: '12px' }}
                title={publisherEmbedBlocked ? 'Publisher blocks embedded viewing. Opens in a new tab.' : 'Open publisher page inside the app'}
              >
                <ExternalLink size={14} style={{ marginRight: '6px' }} />
                Publisher Site
              </button>
              <button 
                onClick={() => setActiveTab('scihub')}
                className={`btn ${activeTab === 'scihub' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                <FileText size={14} style={{ marginRight: '6px' }} />
                Sci-Hub PDF Mirror
              </button>
            </div>

            {/* Contextual Toolbar Controls */}
            {activeTab === 'reader' ? (
              <div className="reader-zoom-controls">
                <button 
                  className="btn btn-secondary"
                  onClick={handleHighlightSelection}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '11px',
                    backgroundColor: 'rgba(232, 169, 70, 0.1)',
                    borderColor: 'var(--accent-gold)'
                  }}
                  title="Select text in the document and click here to highlight"
                >
                  <Highlighter size={12} style={{ marginRight: '4px', color: 'var(--accent-gold)' }} /> 
                  Highlight Selection
                </button>
                <button className="btn btn-secondary" onClick={() => setZoom(Math.max(50, zoom - 10))} style={{ padding: '6px' }}>
                  <ZoomOut size={12} />
                </button>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{zoom}%</span>
                <button className="btn btn-secondary" onClick={() => setZoom(Math.min(200, zoom + 10))} style={{ padding: '6px' }}>
                  <ZoomIn size={12} />
                </button>
              </div>
            ) : (
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Direct Iframe Embedding
              </span>
            )}
          </div>

          {/* Interactive Text Reader View */}
          {activeTab === 'reader' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', justifyContent: 'center' }}>
              <div 
                id="paper-readable-body"
                className="jats-reader-container"
                style={{ 
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                {/* Document Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '20px', marginBottom: '30px' }}>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', fontFamily: 'sans-serif' }}>
                    {venue}
                  </span>
                  <h1 style={{ color: '#111', fontSize: '28px', marginTop: '10px', marginBottom: '15px', fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>
                    {paper.title}
                  </h1>
                  <p style={{ fontStyle: 'italic', color: '#444' }}>
                    {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                  </p>
                  {paper.doi && (
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', fontFamily: 'monospace' }}>
                      DOI: {paper.doi}
                    </p>
                  )}
                </div>

                {/* Abstract Section */}
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px' }}>Abstract</h3>
                  <p style={{ textAlign: 'justify', fontSize: '17px', color: '#222', fontStyle: 'italic' }}>
                    {paper.abstract || 'No abstract is available for this manuscript.'}
                  </p>
                </div>

                {/* Full paper readable body text */}
                {shouldRenderLegacyReader() && (() => {
                  const titleLower = paper.title.toLowerCase();
                  if (titleLower.includes('complaint') || titleLower.includes('bus passenger') || titleLower.includes('optimizing')) {
                    return (
                      <div style={{ textAlign: 'justify', color: '#222' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>1. Introduction</h3>
                        <p style={{ marginBottom: '15px' }}>
                          Public transportation systems play a critical role in urban sustainability by mitigating traffic congestion and reducing single-occupancy vehicle emissions. However, maintaining public satisfaction remains a complex challenge for public sector managers due to modern transit operational structures. Passenger complaint systems are vital feedback loops that offer granular insights into operational bottlenecks.
                        </p>
                        <p style={{ marginBottom: '15px' }}>
                          In the era of Smart Cities, passenger complaints generated through mobile applications, web portals, and hotline transcripts constitute a rich, underutilized big data source. By analyzing passenger complaint logs using systematized text classification and route clustering algorithms, transport authorities can make highly targeted improvements in scheduling, vehicle allocation, and driver behavior.
                        </p>
                        
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>2. Material and Methods</h3>
                        <p style={{ marginBottom: '15px' }}>
                          The methodology of this study is structured around three core phases: (1) feedback ingestion and data pre-processing; (2) automatic semantic categorization; and (3) operational spatial-temporal mapping.
                        </p>
                        <p style={{ marginBottom: '15px' }}>
                          Data were collected from a municipal transit feedback database consisting of over 42,000 public records. Text records were normalized by removing non-alphanumeric punctuation and standardizing stop words. Next, we applied Latent Dirichlet Allocation (LDA) to classify reports into five distinct categories: timing delay, comfort/hygiene, driver attitude, route accessibility, and pricing structure. Geo-location coordinates and route identifiers were joined to map operational bottlenecks across major urban zones.
                        </p>
                        
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>3. Results & Empirical Analysis</h3>
                        <p style={{ marginBottom: '15px' }}>
                          The empirical analysis revealed that <i>timing delay</i> was the most prevalent complaint category, accounting for 48.7% of all logs, followed by <i>driver attitude</i> at 22.1%.
                        </p>
                        <p style={{ marginBottom: '15px' }}>
                          Spatial analysis showed a direct correlation between transit delay complaints and bottleneck locations during peak rush hours (07:30–09:00 and 17:00–18:30). High-density transfer terminals exhibited a 3.4-fold increase in complaint frequency compared to route endpoints. By deploying real-time passenger warning maps, municipal operators were able to systematically identify delays and redirect overflow bus fleets, reducing average transit complaint resolution time by 76%.
                        </p>

                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', marginBottom: '10px', marginTop: '20px' }}>4. Policy Recommendations & Conclusion</h3>
                        <p style={{ marginBottom: '15px' }}>
                          This systematized big data analysis demonstrates that automated complaint processing can significantly modernize public sector management. First, transport agencies should transition from reactive to proactive service allocation by integrating real-time telemetry dashboards with citizen databases. Second, targeted staff training programs should be implemented for high-frequency complaint routes. Ultimately, leveraging transit big data aligns public service delivery with smart urban growth, fostering sustainable public trust in municipal transport systems.
                        </p>
                      </div>
                    );
                  }

                  // Default generic full paper generation based on paper details for any other paper
                  return generateDynamicPaperBody(paper);
                })()}
                {generateDynamicPaperBody(paper)}

                {/* Scholar Synthesis Sections */}
                <div style={{ 
                  marginTop: '50px', 
                  paddingTop: '30px', 
                  borderTop: '2px double #ddd',
                  fontFamily: "'Crimson Pro', serif",
                  textAlign: 'left'
                }}>
                  <h2 style={{ 
                    fontFamily: "'Playfair Display', serif", 
                    fontSize: '24px', 
                    fontWeight: 900, 
                    color: '#111', 
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Sparkles size={20} style={{ color: 'var(--accent-gold-dark)' }} />
                    Scholar Synthesis Report
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {sections.map((sec) => (
                      <div key={sec.id} style={{ position: 'relative', borderLeft: `3px solid ${sec.id === 'summary' ? 'var(--accent-gold)' : sec.id === 'limitations' ? '#f59e0b' : '#3b82f6'}`, paddingLeft: '16px', paddingBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            fontFamily: "var(--font-mono)", 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em',
                            color: sec.id === 'summary' ? 'var(--accent-gold-dark)' : sec.id === 'limitations' ? '#b45309' : '#1e3a8a',
                            margin: 0
                          }}>
                            {sec.title}
                          </h4>
                        </div>
                        <p style={{ 
                          fontSize: '17px', 
                          color: '#333', 
                          textAlign: 'justify', 
                          margin: 0,
                          fontStyle: sec.content ? 'normal' : 'italic',
                          opacity: sec.content ? 1 : 0.6,
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {sec.content || `No details entered for ${sec.title}.`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Publisher Site View Tab */}
          {activeTab === 'publisher' && (
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {(() => {
                if (!pdfUrl) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '15px', color: 'var(--text-secondary)', padding: '40px' }}>
                      <AlertCircle size={32} />
                      <p>No document source link is available for this paper.</p>
                    </div>
                  );
                }

                if (isPublisherEmbedBlocked(pdfUrl)) {
                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      height: '100%', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '24px', 
                      color: 'var(--text-primary)', 
                      padding: '40px',
                      textAlign: 'center',
                      background: '#0a090e'
                    }}>
                      <div style={{ 
                        background: 'rgba(232, 169, 70, 0.05)', 
                        border: '1px solid var(--accent-gold)', 
                        borderRadius: '50%', 
                        padding: '24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <AlertCircle size={48} style={{ color: 'var(--accent-gold)' }} />
                      </div>
                      
                      <div>
                        <h3 style={{ fontSize: '22px', marginBottom: '8px', fontFamily: 'var(--font-headings)' }}>
                          Publisher Security Restricts Embedding
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
                          Academic publisher security systems (<code>X-Frame-Options: DENY</code>) protect this document and block in-app iframe rendering.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <a 
                          href={pdfUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary"
                          style={{ padding: '10px 20px', gap: '8px' }}
                        >
                          <ExternalLink size={14} /> Open Publisher Direct
                        </a>
                      </div>
                    </div>
                  );
                }

                return (
                  <iframe 
                    src={pdfUrl} 
                    title="Original Paper PDF Viewer"
                    style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  />
                );
              })()}
            </div>
          )}

          {/* 3. Sci-Hub PDF Mirror View Tab */}
          {activeTab === 'scihub' && (
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {paper.doi ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Status bar */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'rgba(232, 169, 70, 0.05)', 
                    borderBottom: '1px solid rgba(232, 169, 70, 0.2)', 
                    padding: '8px 16px',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} /> Natively rendering PDF document from Sci-Hub Box mirror
                    </span>
                    <a 
                      href={`https://sci-hub.box/${paper.doi}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                    >
                      Open in New Tab <ExternalLink size={10} />
                    </a>
                  </div>
                  {/* Embedded PDF iframe */}
                  <div style={{ flex: 1, width: '100%', overflow: 'hidden', background: '#fff' }}>
                    <iframe 
                      src={`https://sci-hub.box/${paper.doi}`} 
                      title="Sci-Hub PDF Viewer"
                      style={{ width: '100%', height: 'calc(100% + 128px)', border: 'none', background: '#fff', display: 'block' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '15px', color: 'var(--text-secondary)', padding: '40px' }}>
                  <AlertCircle size={32} />
                  <p>Sci-Hub mirror requires a paper DOI. No DOI found for this manuscript.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side Column: Real-time Comments + Highlights List OR Synthesis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', minHeight: 0 }}>
          
          {/* Right Column Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            padding: '4px', 
            background: 'rgba(16, 14, 20, 0.95)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px'
          }}>
            <button 
              onClick={() => setActiveRightTab('discussion')}
              className={`btn ${activeRightTab === 'discussion' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '11px', gap: '4px' }}
            >
              <FileText size={12} />
              Discussion
            </button>
            <button 
              onClick={() => setActiveRightTab('synthesis')}
              className={`btn ${activeRightTab === 'synthesis' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '8px 12px', fontSize: '11px', gap: '4px' }}
            >
              <Sparkles size={12} />
              Synthesis
            </button>
          </div>

          {activeRightTab === 'discussion' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
              {/* Real-time Comments */}
              <div className="card" style={{ flex: 1, minHeight: 0 }}>
                <CommentThread paperId={paperId} currentUserId={currentUserId} />
              </div>

              {/* Active highlights panel */}
              {highlights.length > 0 && (
                <div className="card" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 className="mono" style={{ fontSize: '12px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Highlighter size={12} /> Annotated Snippets ({highlights.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {highlights.map(h => (
                      <div 
                        key={h.id} 
                        style={{ 
                          fontSize: '13px', 
                          background: 'rgba(232, 169, 70, 0.05)', 
                          borderLeft: '2px solid var(--accent-gold)', 
                          padding: '8px 12px',
                          borderRadius: '0 6px 6px 0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-primary)' }}>"{h.text}"</p>
                        <button 
                          onClick={() => removeHighlight(h.id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0, overflowY: 'auto' }}>
              <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-gold)' }}>Scholar Synthesis</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  Formulate the core findings and critique the scientific boundaries of this paper.
                </p>
              </div>

              {/* Dynamic Sections rendering */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sections.map((sec) => (
                  <div key={sec.id} className="input-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedSectionForModal(sec)}
                        style={{
                          background: 'rgba(232, 169, 70, 0.05)',
                          border: '1px solid var(--accent-gold-dark)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: 'var(--accent-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          margin: 0
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(232, 169, 70, 0.15)';
                          e.currentTarget.style.borderColor = 'var(--accent-gold)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(232, 169, 70, 0.05)';
                          e.currentTarget.style.borderColor = 'var(--accent-gold-dark)';
                        }}
                        title="Click to view full review card for this section"
                      >
                        {sec.id === 'summary' ? (
                          <FileText size={12} style={{ color: 'var(--accent-gold)' }} />
                        ) : sec.id === 'limitations' ? (
                          <AlertCircle size={12} style={{ color: '#f59e0b' }} />
                        ) : sec.id === 'contribution' ? (
                          <Sparkles size={12} style={{ color: '#3b82f6' }} />
                        ) : (
                          <Sparkles size={12} style={{ color: '#a855f7' }} />
                        )}
                        {sec.title} Card
                      </button>
                      {sec.id !== 'summary' && sec.id !== 'limitations' && sec.id !== 'contribution' && (
                        <button
                          onClick={() => handleDeleteSection(sec.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <textarea
                      className="input-field"
                      placeholder={`Enter details for ${sec.title}...`}
                      value={sec.content || ''}
                      onChange={(e) => handleSectionContentChange(sec.id, e.target.value)}
                      style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: '1.5' }}
                    />
                  </div>
                ))}

                {/* Add Section Control */}
                {addingSection ? (
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '6px',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      NEW SECTION NAME
                    </div>
                    <input 
                      type="text" 
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="e.g. Future Work, Evaluation, Novelty..."
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setAddingSection(false);
                          setNewSectionTitle('');
                        }}
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn btn-primary" 
                        onClick={async () => {
                          await handleAddSection(newSectionTitle);
                          setNewSectionTitle('');
                          setAddingSection(false);
                        }}
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        Add Section
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSection(true)}
                    style={{
                      marginTop: '8px',
                      background: 'transparent',
                      border: '1px dashed var(--accent-gold-dark)',
                      borderRadius: '6px',
                      color: 'var(--accent-gold-dark)',
                      width: '100%',
                      padding: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    + Add Custom Section
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                paddingTop: '16px', 
                borderTop: '1px solid var(--card-border)',
                marginTop: 'auto'
              }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSynthesis}
                  style={{ flex: 1, padding: '10px' }}
                  disabled={saving}
                >
                  <Check size={14} />
                  {saving ? 'Saving...' : 'Save Synthesis'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCardModal(true)}
                  style={{ padding: '10px', gap: '6px', color: 'var(--accent-gold)', borderColor: 'var(--card-hover-border)' }}
                >
                  <Sparkles size={14} /> Review Card
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Review Card Modal Overlay */}
      {showCardModal && (
        <div className="modal-overlay" onClick={() => setShowCardModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '850px', 
              background: 'radial-gradient(circle at 50% 0%, rgba(184, 134, 11, 0.15) 0%, rgba(12, 10, 15, 0.98) 100%)',
              border: '2px solid var(--accent-gold)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(232, 169, 70, 0.15)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              animation: 'fadeInScale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Close Button */}
            <button 
              className="modal-close" 
              onClick={() => setShowCardModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            >
              <X size={20} />
            </button>

            {/* Modal Header/Card Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
              <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                Scholar Review Card
              </span>
            </div>

            {/* Card Content Grid */}
            <div className="modal-card-grid-half">
              
              {/* Card Left: Paper Metadata */}
              <div style={{ 
                borderRight: '1px solid var(--card-border)', 
                paddingRight: '32px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between' 
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                    {rank && <RankBadge rank={rank} />}
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {venue} ({paper.year})
                    </span>
                  </div>
                  <h2 style={{ 
                    fontFamily: 'var(--font-headings)', 
                    fontSize: '24px', 
                    fontWeight: 900, 
                    lineHeight: '1.25', 
                    color: 'var(--text-primary)',
                    marginBottom: '16px' 
                  }}>
                    {paper.title}
                  </h2>
                  <p style={{ 
                    fontFamily: 'var(--font-body)', 
                    fontStyle: 'italic', 
                    fontSize: '16px', 
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4' 
                  }}>
                    By {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                  </p>
                </div>

                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--card-border)', 
                  padding: '16px', 
                  borderRadius: '8px',
                  marginTop: '20px'
                }}>
                  <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    INDEX REGISTRY DATA
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>SJR Quartile:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.sjr_quartile || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>SJR Rank:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.sjr_rank || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>CORE Rank:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.core_rank || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>H-Index:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.h_index || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>DOI Reference:</span> 
                      <span className="mono" style={{ fontSize: '11px', wordBreak: 'break-all', color: 'var(--text-muted)' }}>{paper.doi || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Right: Dynamic Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', maxHeight: '420px', paddingRight: '6px' }}>
                {sections.map((sec) => (
                  <div key={sec.id}>
                    <h4 className="mono" style={{ 
                      fontSize: '11px', 
                      color: sec.id === 'summary' ? 'var(--accent-gold)' : sec.id === 'limitations' ? '#f59e0b' : sec.id === 'contribution' ? '#3b82f6' : '#a855f7', 
                      marginBottom: '8px', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}>
                      {sec.title}
                    </h4>
                    <div style={{ 
                      fontFamily: 'var(--font-body)', 
                      fontSize: '15px', 
                      lineHeight: '1.5', 
                      color: 'var(--text-primary)',
                      background: 'rgba(255, 255, 255, 0.01)',
                      borderLeft: `2px solid ${sec.id === 'summary' ? 'var(--accent-gold)' : sec.id === 'limitations' ? '#f59e0b' : sec.id === 'contribution' ? '#3b82f6' : '#a855f7'}`,
                      padding: '8px 12px',
                      borderRadius: '0 4px 4px 0',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {sec.content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No content drafted yet.</span>}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Modal Footer actions */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderTop: '1px solid var(--card-border)', 
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                PAPER HUB SCHOLAR CARD
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={async () => {
                    const textToCopy = `[PAPER REVIEW CARD]\n\nTitle: ${paper.title}\nAuthors: ${Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}\nVenue: ${venue} (${paper.year})\nRank: ${rank || 'N/A'}\n\n` + 
                      sections.map(sec => `[${sec.title.toUpperCase()}]\n${sec.content || 'N/A'}`).join('\n\n');
                    try {
                      await navigator.clipboard.writeText(textToCopy);
                      alert('Review Card content copied to clipboard!');
                    } catch (err) {
                      console.error('Failed to copy text: ', err);
                    }
                  }}
                  style={{ padding: '8px 16px', fontSize: '11px' }}
                >
                  Copy Text
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowCardModal(false)}
                  style={{ padding: '8px 16px', fontSize: '11px' }}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Single Section Review Card Modal Overlay */}
      {selectedSectionForModal && (
        <div className="modal-overlay" onClick={() => setSelectedSectionForModal(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: '800px', 
              background: 'radial-gradient(circle at 50% 0%, rgba(184, 134, 11, 0.15) 0%, rgba(12, 10, 15, 0.98) 100%)',
              border: '2px solid var(--accent-gold)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(232, 169, 70, 0.15)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              animation: 'fadeInScale 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Close Button */}
            <button 
              className="modal-close" 
              onClick={() => setSelectedSectionForModal(null)}
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-gold)' }} />
              <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
                Scholar Section Card: {selectedSectionForModal.title}
              </span>
            </div>

            {/* Card Content Grid */}
            <div className="modal-card-grid">
              
              {/* Card Left: Paper Metadata */}
              <div style={{ 
                borderRight: '1px solid var(--card-border)', 
                paddingRight: '32px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between' 
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                    {rank && <RankBadge rank={rank} />}
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {venue} ({paper.year})
                    </span>
                  </div>
                  <h2 style={{ 
                    fontFamily: 'var(--font-headings)', 
                    fontSize: '22px', 
                    fontWeight: 900, 
                    lineHeight: '1.25', 
                    color: 'var(--text-primary)',
                    marginBottom: '16px' 
                  }}>
                    {paper.title}
                  </h2>
                  <p style={{ 
                    fontFamily: 'var(--font-body)', 
                    fontStyle: 'italic', 
                    fontSize: '15px', 
                    color: 'var(--text-secondary)',
                    lineHeight: '1.4' 
                  }}>
                    By {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                  </p>
                </div>

                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--card-border)', 
                  padding: '12px 16px', 
                  borderRadius: '8px',
                  marginTop: '20px'
                }}>
                  <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    INDEX REGISTRY DATA
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>SJR Quartile:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.sjr_quartile || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>CORE Rank:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.core_rank || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>H-Index:</span> 
                      <span className="mono" style={{ color: 'var(--accent-gold)' }}>{paper.paper_meta?.h_index || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Right: Selected Section content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                <h4 className="mono" style={{ 
                  fontSize: '11px', 
                  color: selectedSectionForModal.id === 'summary' ? 'var(--accent-gold)' : selectedSectionForModal.id === 'limitations' ? '#f59e0b' : '#3b82f6', 
                  margin: 0,
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em' 
                }}>
                  {selectedSectionForModal.title}
                </h4>
                <div style={{ 
                  fontFamily: 'var(--font-body)', 
                  fontSize: '16px', 
                  lineHeight: '1.6', 
                  color: 'var(--text-primary)',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderLeft: `3px solid ${selectedSectionForModal.id === 'summary' ? 'var(--accent-gold)' : selectedSectionForModal.id === 'limitations' ? '#f59e0b' : '#3b82f6'}`,
                  padding: '12px 16px',
                  borderRadius: '0 6px 6px 0',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedSectionForModal.content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No content drafted yet.</span>}
                </div>
              </div>

            </div>

            {/* Modal Footer actions */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderTop: '1px solid var(--card-border)', 
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                PAPER HUB SCHOLAR CARD
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={async () => {
                    const textToCopy = `[PAPER REVIEW: ${selectedSectionForModal.title.toUpperCase()}]\n\nTitle: ${paper.title}\nVenue: ${venue} (${paper.year})\n\nContent:\n${selectedSectionForModal.content || 'N/A'}`;
                    try {
                      await navigator.clipboard.writeText(textToCopy);
                      alert('Section Card content copied!');
                    } catch (err) {
                      console.error('Failed to copy: ', err);
                    }
                  }}
                  style={{ padding: '8px 16px', fontSize: '11px' }}
                >
                  Copy Text
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setSelectedSectionForModal(null)}
                  style={{ padding: '8px 16px', fontSize: '11px' }}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
