# Laravel production queue worker

KAILA runs Laravel queue jobs through a continuously supervised systemd service. The worker consumes `outbox`, `default`, and `maintenance`; push-notification delivery uses the `default` queue.

## Install

Run these commands as an authorized production operator:

```bash
sudo install -m 0644 deploy/systemd/kaila-rebuild-queue.service /etc/systemd/system/kaila-rebuild-queue.service
sudo systemctl daemon-reload
sudo systemctl enable --now kaila-rebuild-queue.service
```

The unit uses `Restart=always`, starts at boot, exits hourly through Laravel's `--max-time` safeguard, and is then restarted by systemd. `SIGTERM` and the 90-second stop timeout allow an in-progress job to finish cleanly.

## Deploy and verify

After deploying application code, restart the worker gracefully and verify its health:

```bash
cd /var/www/kaila-rebuild/apps/api
php artisan queue:restart
systemctl is-enabled kaila-rebuild-queue.service
systemctl is-active kaila-rebuild-queue.service
php artisan queue:monitor outbox,default,maintenance --max=100
```

Review recent worker logs with:

```bash
journalctl -u kaila-rebuild-queue.service --since "15 minutes ago" --no-pager
```

An inactive service, repeated restarts, failed jobs, or a queue exceeding the monitor threshold requires investigation. Do not run a second unmanaged worker against the same queues as a substitute for repairing the service.
