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

        const { error: insertError } = await supabase.from('points_log').insert({
          user_id: user.id,
          type: 'sleep',
          points,
          duration_slept: sleepDurationHrs,  // <--- added this here
          created_at: row.inserted_at,
        });

        if (insertError) {
          console.error('Failed to insert points_log for user', user.id, insertError);
        } else {
          console.log('Inserted points_log for user:', user.id, 'points:', points, 'duration_slept:', sleepDurationHrs);
        }
      }
    }

    console.log('✅ Import completed!');
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

(async () => {
  await importSleepPoints();
})();