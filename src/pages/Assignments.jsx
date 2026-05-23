import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeftRight, Calendar, User, CheckCircle, ArrowRight, ArrowLeft, Trash2, ShieldAlert } from 'lucide-react';
import RankBadge from '../components/RankBadge';

const COLUMNS = [
  { id: 'unread', title: 'Unread / Backlog', color: '#64748b' },
  { id: 'reading', title: 'Currently Reading', color: '#3b82f6' },
  { id: 'done', title: 'Finished / Done', color: '#10b981' }
];

export default function Assignments({ currentUserId, groupId, onNavigate }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmails, setUserEmails] = useState({});

  const fetchAssignments = async () => {
    if (!groupId) return;
    try {
      setLoading(true);

      // Fetch assignments joined with papers and metadata
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          papers (
            id,
            title,
            year,
            paper_meta (
              sjr_quartile,
              core_rank,
              rank_source,
              sjr
            )
          )
        `)
        .eq('assigned_to', currentUserId);

      if (error) throw error;
      setAssignments(data || []);

      // Resolve emails to actual emails from database group_members
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id, email, full_name')
        .eq('group_id', groupId);

      const emailsMap = {};
      (membersData || []).forEach(member => {
        if (member.user_id === currentUserId) {
          emailsMap[member.user_id] = member.full_name ? `${member.full_name} (You)` : 'You';
        } else if (member.full_name) {
          emailsMap[member.user_id] = member.full_name;
        } else if (member.email) {
          const handle = member.email.split('@')[0];
          emailsMap[member.user_id] = handle.charAt(0).toUpperCase() + handle.slice(1);
        } else {
          emailsMap[member.user_id] = 'Team Scholar';
        }
      });
      setUserEmails(emailsMap);

    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    // Subscribe to assignment updates in real time
    const channel = supabase
      .channel('assignments-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => fetchAssignments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const updateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status: newStatus })
        .eq('id', assignmentId);

      if (error) throw error;
      
      // Also log activity on status change
      const assign = assignments.find(a => a.id === assignmentId);
      if (assign) {
        await supabase.from('activity_log').insert({
          group_id: groupId,
          paper_id: assign.paper_id,
          user_id: currentUserId,
          action: newStatus === 'reading' ? 'claimed' : 'commented',
          meta: { status_change: `Moved assignment to ${newStatus}` }
        });
      }

      fetchAssignments();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      fetchAssignments();
    } catch (err) {
      console.error('Error deleting assignment:', err);
    }
  };

  // Group assignments by column status
  const getColumnCards = (colId) => assignments.filter(a => a.status === colId);

  const getNextStatus = (current) => {
    if (current === 'unread') return 'reading';
    if (current === 'reading') return 'done';
    return null;
  };

  const getPrevStatus = (current) => {
    if (current === 'done') return 'reading';
    if (current === 'reading') return 'unread';
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ marginBottom: '8px' }}>Assignments Kanban</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Track reading tasks assigned to team members. Move papers through columns to indicate reading progress.
        </p>
      </div>

      {/* Kanban Grid */}
      {loading && assignments.length === 0 ? (
        <p className="mono" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px' }}>Loading board...</p>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const cards = getColumnCards(col.id);
            return (
              <div key={col.id} className="kanban-column">
                
                {/* Column Header */}
                <div className="kanban-column-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color }}></span>
                    {col.title}
                  </span>
                  <span className="kanban-count">{cards.length}</span>
                </div>

                {/* Column Cards */}
                {cards.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    color: 'var(--text-muted)', 
                    fontSize: '14px', 
                    border: '1px dashed var(--card-border)',
                    borderRadius: '8px',
                    fontStyle: 'italic'
                  }}>
                    No assignments here
                  </div>
                ) : (
                  cards.map(assign => {
                    const paper = assign.papers || {};
                    const rank = paper.paper_meta?.sjr_quartile || paper.paper_meta?.core_rank || '';
                    const assignedTo = userEmails[assign.assigned_to] || 'Researcher';
                    const assignedBy = userEmails[assign.assigned_by] || 'Researcher';
                    const nextStatus = getNextStatus(assign.status);
                    const prevStatus = getPrevStatus(assign.status);

                    return (
                      <div 
                        key={assign.id} 
                        className="card" 
                        style={{ 
                          padding: '16px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px',
                          background: 'rgba(16, 14, 20, 0.85)'
                        }}
                      >
                        {/* Paper Title */}
                        <div 
                          onClick={() => onNavigate('paper', paper.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <h4 style={{ 
                            fontSize: '15px', 
                            lineHeight: '1.4', 
                            color: 'var(--text-primary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {paper.title}
                          </h4>
                        </div>

                        {/* Rank Badge */}
                        {rank && <div style={{ alignSelf: 'flex-start' }}><RankBadge rank={rank} style={{ fontSize: '9px', padding: '2px 6px' }} /></div>}

                        {/* Assignee / Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                          <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={12} style={{ color: 'var(--accent-gold)' }} /> 
                            To: {assignedTo}
                          </span>
                          <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={12} />
                            Due: {assign.due_date ? new Date(assign.due_date).toLocaleDateString() : 'No date set'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          {/* Delete Assignment button (if current user is assigner or assignee) */}
                          {(assign.assigned_to === currentUserId || assign.assigned_by === currentUserId) ? (
                            <button 
                              className="btn btn-text"
                              onClick={() => deleteAssignment(assign.id)}
                              style={{ color: '#ef4444', padding: '4px' }}
                              title="Delete Assignment"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : <div />}

                          {/* Navigation buttons */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {prevStatus && (
                              <button 
                                className="btn btn-secondary"
                                onClick={() => updateAssignmentStatus(assign.id, prevStatus)}
                                style={{ padding: '6px 10px' }}
                                title="Move Left"
                              >
                                <ArrowLeft size={12} />
                              </button>
                            )}
                            {nextStatus && (
                              <button 
                                className="btn btn-secondary"
                                onClick={() => updateAssignmentStatus(assign.id, nextStatus)}
                                style={{ padding: '6px 10px' }}
                                title="Move Right"
                              >
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
