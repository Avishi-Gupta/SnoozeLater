import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const { data: users, error: userError } = await supabase.from('profiles').select('id, badges');
    if (userError || !users) {
      return new Response(JSON.stringify({
        error: userError?.message || 'Failed to fetch users'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const user of users) {
      const userId = user.id;
      const currentBadges = user.badges ?? [];

      const { data: sleepData } = await supabase.from('sleep_data').select('duration_slept').eq('user_id', userId);
      const { data: studyData } = await supabase.from('tasks_completed').select('points_earned').eq('user_id', userId);


      const { data: pointsSummary } = await supabase
        .from('points')
        .select('total_points, sleep_points, task_points')
        .eq('user_id', userId)
        .single();

      let avgSleep = null;
      if (sleepData && sleepData.length > 0) {
        const totalSleep = sleepData.reduce((sum, d) => sum + (d.duration_slept ?? 0), 0);
        avgSleep = totalSleep / sleepData.length;
      }

      let avgStudyHours = null;
      if (studyData && studyData.length > 0) {
        const totalPoints = studyData.reduce((sum, d) => sum + (d.points_earned ?? 0), 0);
        avgStudyHours = totalPoints / 10 / studyData.length;
      }


      const badgesToAssign = new Set(currentBadges);

      if (avgSleep !== null && avgSleep >= 7) badgesToAssign.add('wellRested');
      if (avgStudyHours !== null && avgStudyHours >= 4) badgesToAssign.add('studious');

      if (pointsSummary?.sleep_points && pointsSummary.sleep_points >= 1000) {
        badgesToAssign.add('sleepMaster');
      }
      if (pointsSummary?.task_points && pointsSummary.task_points >= 2000) {
        badgesToAssign.add('taskChampion');
      }
      if (pointsSummary?.total_points && pointsSummary.total_points >= 5000) {
        badgesToAssign.add('allRounder');
      }

      const updatedBadges = Array.from(badgesToAssign);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ badges: updatedBadges })
        .eq('id', userId);

      if (updateError) {
        console.error(`Failed to update badges for user ${userId}:`, updateError.message);
      }
    }

    return new Response(JSON.stringify({
      message: 'Badges assigned and merged successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});