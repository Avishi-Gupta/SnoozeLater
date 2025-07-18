import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, badges')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: userError?.message || 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentBadges = user.badges ?? [];

    // Fetch sleep data and study data
    const { data: sleepData } = await supabase.from('sleep_data').select('duration_slept').eq('user_id', userId);
    const { data: studyData } = await supabase.from('tasks_completed').select('points_earned').eq('user_id', userId);

    // Fetch points summary
    const { data: pointsSummary } = await supabase
      .from('points')
      .select('total_points, sleep_points, task_points')
      .eq('user_id', userId)
      .single();

    // Calculate average sleep hours
    let avgSleep = null;
    if (sleepData && sleepData.length > 0) {
      const totalSleep = sleepData.reduce((sum, d) => sum + (d.duration_slept ?? 0), 0);
      avgSleep = totalSleep / sleepData.length;
    }

    // Calculate average study hours (assuming 10 points = 1 hour)
    let avgStudyHours = null;
    if (studyData && studyData.length > 0) {
      const totalPoints = studyData.reduce((sum, d) => sum + (d.points_earned ?? 0), 0);
      avgStudyHours = totalPoints / 10 / studyData.length;
    }

    // Start badge assignment as a Set for easy merge & avoid duplicates
    const badgesToAssign = new Set(currentBadges);

    // Badge rules based on averages
    if (avgSleep !== null && avgSleep >= 7) badgesToAssign.add('earlyBird');
    if (avgStudyHours !== null && avgStudyHours >= 4) badgesToAssign.add('studious');

    // Badge rules based on points thresholds
    if (pointsSummary?.sleep_points && pointsSummary.sleep_points >= 1000) {
      badgesToAssign.add('sleepMaster');
    }
    if (pointsSummary?.task_points && pointsSummary.task_points >= 2000) {
      badgesToAssign.add('taskChampion');
    }
    if (pointsSummary?.total_points && pointsSummary.total_points >= 5000) {
      badgesToAssign.add('allRounder');
    }

    // Convert Set back to array and update badges in profile
    const updatedBadges = Array.from(badgesToAssign);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ badges: updatedBadges })
      .eq('id', userId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Badges updated successfully', badges: updatedBadges }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});