const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gfcnhjvmizcoxxreyife.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmY25oanZtaXpjb3h4cmV5aWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYyNjM4MiwiZXhwIjoyMDY0MjAyMzgyfQ.zE7SIRAvUth8eA9Nj2RLtzQTJynffB15e_Qmf0DqNc0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function importSleepPoints() {
  try {
    const { data: userData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    const users = userData?.users || [];
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }

    for (const user of users) {
      console.log('Processing user:', user.id);

      const { data: sleepRows, error: sleepError } = await supabase
        .from('sleep_data')
        .select('id, sleep_time, wake_time, target_sleep_time, target_wake_time, inserted_at')
        .eq('user_id', user.id);

      if (sleepError) {
        console.error(`Error fetching sleep_data for user ${user.id}:`, sleepError);
        continue;
      }

      if (!sleepRows || sleepRows.length === 0) {
        console.log('No sleep data for user:', user.id);
        continue;
      }

      for (const row of sleepRows) {
        if (!row.sleep_time || !row.wake_time || !row.target_sleep_time || !row.target_wake_time) {
          console.log('Skipping incomplete row:', row);
          continue;
        }

        const actualSleep = new Date(row.sleep_time);
        const actualWake = new Date(row.wake_time);
        const targetSleep = new Date(row.target_sleep_time);
        const targetWake = new Date(row.target_wake_time);

        const sleepDiffMins = Math.abs(Math.floor((actualSleep.getTime() - targetSleep.getTime()) / 60000));
        const wakeDiffMins = Math.abs(Math.floor((actualWake.getTime() - targetWake.getTime()) / 60000));

        let points = 0;
        const totalDeviation = sleepDiffMins + wakeDiffMins;

        if (totalDeviation <= 10) {
          points = 500;
        } else {
          points = Math.max(0, 500 - (totalDeviation / 10) * 10);
        }

        const sleepDurationHrs = (actualWake.getTime() - actualSleep.getTime()) / 3600000;
        if (sleepDurationHrs < 7.5 || sleepDurationHrs > 9) {
          points -= 200;
        }

        points = Math.max(0, points);

        const { data: existingPointsData, error: existingPointsError } = await supabase
          .from('points')
          .select('sleep_points, task_points, total_points')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingPointsError) {
          console.error(`Failed to fetch points row for user ${user.id}:`, existingPointsError);
          continue;
        }

        if (existingPointsData) {
          const newSleepPoints = (existingPointsData.sleep_points || 0) + points;
          const newTotalPoints = (existingPointsData.task_points || 0) + newSleepPoints;

          const { error: updateError } = await supabase
            .from('points')
            .update({
              sleep_points: newSleepPoints,
              total_points: newTotalPoints,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

          if (updateError) {
            console.error(`Failed to update points for user ${user.id}:`, updateError);
          } else {
            console.log(`✅ Updated points for user ${user.id} with +${points} sleep points.`);
          }

        } else {
          // Insert new row
          const { error: insertError } = await supabase
            .from('points')
            .insert({
              user_id: user.id,
              sleep_points: points,
              task_points: 0,
              total_points: points,
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`Failed to insert new points row for user ${user.id}:`, insertError);
          } else {
            console.log(`✅ Inserted new points for user ${user.id} with ${points} sleep points.`);
          }
        }
      }
    }

    console.log('🎉 All sleep points imported successfully!');
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

(async () => {
  await importSleepPoints();
})();