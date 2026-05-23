import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function useRealtime(table, callback, filter = '') {
  useEffect(() => {
    if (!supabase) return;

    let channelName = `${table}-changes`;
    if (filter) {
      channelName += `-${filter}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter || undefined
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, filter]);
}
