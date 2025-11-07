import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { getBrowserTimezone, isValidTimezone } from '../lib/timezone';

/**
 * Hook to load and manage user's timezone setting
 * Automatically loads from database and falls back to browser timezone
 */
export const useUserTimezone = () => {
  const { user, userTimezone, setUserTimezone } = useStore();

  useEffect(() => {
    const loadUserTimezone = async () => {
      if (!user?.id) return;

      try {
        // Fetch user's timezone from profile
        const { data, error } = await supabase
          .from('user_profiles')
          .select('timezone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[useUserTimezone] Error loading timezone:', error);
          return;
        }

        if (data?.timezone && isValidTimezone(data.timezone)) {
          setUserTimezone(data.timezone);
          console.log(`[useUserTimezone] Loaded user timezone: ${data.timezone}`);
        } else {
          // No timezone set - try to detect from browser
          const browserTz = getBrowserTimezone();
          if (isValidTimezone(browserTz)) {
            setUserTimezone(browserTz);
            console.log(`[useUserTimezone] Using browser timezone: ${browserTz}`);

            // Save browser timezone to profile for future use
            await supabase
              .from('user_profiles')
              .upsert({
                user_id: user.id,
                timezone: browserTz,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id'
              });
          } else {
            // Fallback to EST if all else fails
            setUserTimezone('America/New_York');
            console.log('[useUserTimezone] Fallback to America/New_York (EST)');
          }
        }
      } catch (error) {
        console.error('[useUserTimezone] Error in timezone setup:', error);
        // Ensure we have a valid timezone even on error
        if (!isValidTimezone(userTimezone)) {
          setUserTimezone('America/New_York');
        }
      }
    };

    loadUserTimezone();
  }, [user?.id]);

  return userTimezone;
};
