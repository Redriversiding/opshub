const webpush = require('web-push');
const { query } = require('../db');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send push to a specific user
async function pushToUser(userId, title, body, data = {}) {
  try {
    const result = await query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    if (!result.rows.length) return;

    const payload = JSON.stringify({ title, body, data, icon: '/icon-192.png' });
    await webpush.sendNotification(result.rows[0].subscription, payload);
  } catch (err) {
    // Subscription expired — clean it up
    if (err.statusCode === 410) {
      await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    }
  }
}

// Send push to all users with a given role
async function pushToRole(role, title, body, data = {}) {
  const result = await query(
    `SELECT ps.user_id, ps.subscription FROM push_subscriptions ps
     JOIN users u ON u.id = ps.user_id
     WHERE u.role = $1 AND u.active = true`,
    [role]
  );
  const payload = JSON.stringify({ title, body, data, icon: '/icon-192.png' });
  for (const row of result.rows) {
    try {
      await webpush.sendNotification(row.subscription, payload);
    } catch (err) {
      if (err.statusCode === 410) {
        await query('DELETE FROM push_subscriptions WHERE user_id = $1', [row.user_id]);
      }
    }
  }
}

// Check reminders and fire notifications
async function checkReminders() {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(
    `SELECT r.*, u.name as user_name,
            j.title as job_title, t.name as task_name
     FROM reminders r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN jobs j ON j.id = r.job_id
     LEFT JOIN tasks t ON t.id = r.task_id
     WHERE r.trigger_date <= $1
     AND r.fired = false
     AND r.dismissed = false`,
    [today]
  );

  for (const r of result.rows) {
    let title = 'OpsHub Reminder';
    let body = r.label || 'Task reminder';
    if (r.trigger_type === 'before') title = `Upcoming: ${r.task_name}`;
    if (r.trigger_type === 'overdue') title = `Overdue: ${r.task_name}`;
    if (r.trigger_type === 'on') title = `Starts today: ${r.task_name}`;
    body = `${r.job_title || ''}`;

    await pushToUser(r.user_id, title, body, { jobId: r.job_id, taskId: r.task_id });
    await query('UPDATE reminders SET fired = true WHERE id = $1', [r.id]);
  }
}

module.exports = { pushToUser, pushToRole, checkReminders };
