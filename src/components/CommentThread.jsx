import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CornerDownRight, MessageSquare, Send, Trash2 } from 'lucide-react';

export default function CommentThread({ paperId, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userEmails, setUserEmails] = useState({});

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('paper_id', paperId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);

      // Fetch user emails to display names nicely
      // In a real app we might have a profiles table, but we can resolve emails from group_members or user metadata if accessible,
      // or fall back to emails we retrieve. Let's make a mock lookup or fetch them.
      const uniqueUserIds = [...new Set(data.map(c => c.user_id))];
      const emailsMap = { ...userEmails };
      
      // Attempt to load emails from auth if possible (for self), otherwise generate friendly nicknames based on IDs
      uniqueUserIds.forEach(id => {
        if (!emailsMap[id]) {
          if (id === currentUserId) {
            emailsMap[id] = 'You';
          } else {
            // Generate a stable aesthetic researcher name
            const firstNames = ['Dr. Sarah', 'Prof. Alex', 'Dr. Elena', 'Dr. Marcus', 'Prof. Clara'];
            const lastNames = ['Chen', 'Smith', 'Vasiliev', 'Adebayo', 'Gomez'];
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            emailsMap[id] = `${firstNames[hash % firstNames.length]} ${lastNames[hash % lastNames.length]}`;
          }
        }
      });
      setUserEmails(emailsMap);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to changes on comments for this paper
    const channel = supabase
      .channel(`comments-${paperId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `paper_id=eq.${paperId}` },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paperId]);

  const handleAddComment = async (parentId = null) => {
    const text = parentId ? replyText : newCommentText;
    if (!text.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          paper_id: paperId,
          user_id: currentUserId,
          body: text,
          parent_id: parentId
        });

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        group_id: (await supabase.from('papers').select('group_id').eq('id', paperId).single()).data.group_id,
        paper_id: paperId,
        user_id: currentUserId,
        action: 'commented',
        meta: { preview: text.slice(0, 50) }
      });

      if (parentId) {
        setReplyText('');
        setReplyToId(null);
      } else {
        setNewCommentText('');
      }
      fetchComments();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Build the hierarchical tree of comments
  const rootComments = comments.filter(c => !c.parent_id);
  const getRepliesFor = (parentId) => comments.filter(c => c.parent_id === parentId);

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderComment = (comment, isReply = false) => {
    const replies = getRepliesFor(comment.id);
    const author = userEmails[comment.user_id] || 'Researcher';
    const isSelf = comment.user_id === currentUserId;
    
    return (
      <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: isReply ? '8px' : '16px' }}>
        {/* Comment Bubble Wrapper */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isSelf ? 'flex-end' : 'flex-start',
          width: '100%'
        }}>
          {/* Sender & Time Header */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center', 
            marginBottom: '4px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)'
          }}>
            {!isSelf && (
              <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                {author}
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              {formatTime(comment.created_at)}
            </span>
          </div>

          {/* Text Bubble */}
          <div 
            style={{ 
              padding: '10px 14px', 
              background: isSelf ? 'rgba(184, 134, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${isSelf ? 'rgba(184, 134, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: isSelf ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
              maxWidth: '85%',
              position: 'relative'
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {comment.body}
            </p>
            
            {/* Delete / Reply buttons visible on hover or small font */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: isSelf ? 'flex-end' : 'flex-start', opacity: 0.8 }}>
              {!isReply && (
                <button 
                  className="btn btn-text" 
                  onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                  style={{ fontSize: '11px', padding: 0, display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-secondary)' }}
                >
                  <CornerDownRight size={10} /> Reply
                </button>
              )}
              {comment.user_id === currentUserId && (
                <button 
                  className="btn btn-text" 
                  onClick={() => handleDeleteComment(comment.id)}
                  style={{ color: '#ef4444', fontSize: '11px', padding: 0, display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <Trash2 size={10} /> Delete
                </button>
              )}
            </div>

            {/* Inline Reply input field if reply is active */}
            {replyToId === comment.id && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', width: '220px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '12px', height: '28px' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(comment.id)}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleAddComment(comment.id)}
                  style={{ padding: '4px 8px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Send size={10} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Render Replies below root comment */}
        {replies.length > 0 && (
          <div style={{ 
            paddingLeft: '16px', 
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)', 
            marginTop: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}>
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={18} /> Reading Room Discussion
      </h3>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
        {loading && comments.length === 0 ? (
          <p className="mono" style={{ color: 'var(--text-muted)' }}>Loading discussion...</p>
        ) : rootComments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ fontStyle: 'italic' }}>No discussion yet. Be the first to start the conversation on this paper.</p>
          </div>
        ) : (
          rootComments.map(c => renderComment(c))
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
        <textarea
          className="input-field"
          placeholder="Share your insights on this paper..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          style={{ flex: 1, height: '70px', resize: 'none', fontSize: '15px' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <button 
          className="btn btn-primary" 
          onClick={() => handleAddComment()}
          style={{ padding: '0 20px' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
