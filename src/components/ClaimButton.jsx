import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';

export default function ClaimButton({ paperId, currentUserId, onClaimChange }) {
  const [claim, setClaim] = useState(null); // claim for this user
  const [otherClaims, setOtherClaims] = useState([]); // claims by others
  const [loading, setLoading] = useState(true);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reading_claims')
        .select('*')
        .eq('paper_id', paperId);

      if (error) throw error;

      const userClaim = data.find(c => c.user_id === currentUserId);
      const others = data.filter(c => c.user_id !== currentUserId && c.status === 'reading');
      
      setClaim(userClaim || null);
      setOtherClaims(others);
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();

    // Subscribe to changes on reading_claims for this paper
    const channel = supabase
      .channel(`claims-${paperId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reading_claims', filter: `paper_id=eq.${paperId}` },
        () => {
          fetchClaims();
          if (onClaimChange) onClaimChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paperId, currentUserId]);

  const handleClaim = async (status) => {
    try {
      if (status === 'dropped') {
        // Delete the claim
        const { error } = await supabase
          .from('reading_claims')
          .delete()
          .eq('paper_id', paperId)
          .eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        // Insert or update claim
        const { error } = await supabase
          .from('reading_claims')
          .upsert({
            paper_id: paperId,
            user_id: currentUserId,
            status: status
          }, { onConflict: 'paper_id,user_id' });
        if (error) throw error;
      }
      fetchClaims();
      if (onClaimChange) onClaimChange();
    } catch (err) {
      console.error('Error updating claim:', err);
    }
  };

  if (loading) {
    return <button className="btn btn-secondary" disabled>Checking claims...</button>;
  }

  // If another user is reading this paper (locked)
  if (otherClaims.length > 0) {
    return (
      <div className="rank-badge" style={{ backgroundColor: '#3a1a0a', borderColor: '#f97316', color: '#fb923c', gap: '6px' }}>
        <Lock size={12} />
        <span>Locked by Colleague</span>
      </div>
    );
  }

  // Current user's claim states
  if (claim) {
    if (claim.status === 'reading') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="rank-badge" style={{ backgroundColor: '#0d1a3a', borderColor: '#60a5fa', color: '#93c5fd' }}>
            <BookOpen size={12} style={{ marginRight: '4px' }} />
            Reading
          </span>
          <button className="btn btn-text" onClick={() => handleClaim('done')} style={{ fontSize: '12px' }}>
            Done?
          </button>
          <button className="btn btn-text" onClick={() => handleClaim('dropped')} style={{ color: '#ef4444', fontSize: '12px' }}>
            Release
          </button>
        </div>
      );
    } else if (claim.status === 'done') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="rank-badge" style={{ backgroundColor: '#0f3d2a', borderColor: '#22c55e', color: '#4ade80' }}>
            <CheckCircle size={12} style={{ marginRight: '4px' }} />
            Finished
          </span>
          <button className="btn btn-text" onClick={() => handleClaim('reading')} style={{ fontSize: '12px' }}>
            Reread
          </button>
        </div>
      );
    }
  }

  return (
    <button className="btn btn-secondary" onClick={() => handleClaim('reading')} style={{ padding: '8px 16px', gap: '6px' }}>
      <BookOpen size={14} />
      Claim to Read
    </button>
  );
}
