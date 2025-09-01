# ACT Platform - Compliance Audit Cron Schedule

This document provides cron job configurations for automated compliance auditing.

## Cron Job Configuration

### Production Schedule

```bash
# Daily compliance audit at 6 AM
0 6 * * * cd /path/to/act-placemat/apps/backend && node scripts/schedule-compliance-audit.js daily >> /var/log/act-compliance-daily.log 2>&1

# Weekly compliance audit on Sundays at 7 AM  
0 7 * * 0 cd /path/to/act-placemat/apps/backend && node scripts/schedule-compliance-audit.js weekly >> /var/log/act-compliance-weekly.log 2>&1

# Monthly comprehensive audit on the 1st at 8 AM
0 8 1 * * cd /path/to/act-placemat/apps/backend && node scripts/schedule-compliance-audit.js monthly >> /var/log/act-compliance-monthly.log 2>&1
```

### Development Schedule (More Frequent)

```bash
# Daily audit every 4 hours during business hours (6 AM, 10 AM, 2 PM, 6 PM)
0 6,10,14,18 * * * cd /path/to/act-placemat/apps/backend && node scripts/schedule-compliance-audit.js daily >> /var/log/act-compliance-daily.log 2>&1

# Weekly audit twice per week (Tuesday and Friday at 8 AM)
0 8 * * 2,5 cd /path/to/act-placemat/apps/backend && node scripts/schedule-compliance-audit.js weekly >> /var/log/act-compliance-weekly.log 2>&1

# Monthly audit on 1st and 15th at 9 AM
0 9 1,15 * * cd /path/to/act-placemat/apps/backend && node scripts/schedule-compliance-audit.js monthly >> /var/log/act-compliance-monthly.log 2>&1
```

## Installation Instructions

### 1. Set up log rotation

```bash
# Create log rotation config
sudo tee /etc/logrotate.d/act-compliance << 'EOF'
/var/log/act-compliance-*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 644 act-user act-user
    postrotate
        /usr/bin/systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF
```

### 2. Install cron jobs

```bash
# Edit crontab
crontab -e

# Add the appropriate schedule from above
# For production, use the first set
# For development, use the second set with more frequent checks
```

### 3. Environment Variables

Ensure the following environment variables are available to cron:

```bash
# Add to /etc/environment or create a .env file in the project root
VALID_API_KEYS=your-api-keys-here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
DATABASE_URL=postgresql://user:pass@localhost:5432/actdb
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

### 4. Test Installation

```bash
# Test daily audit manually
cd /path/to/act-placemat/apps/backend
node scripts/schedule-compliance-audit.js daily

# Test weekly audit manually  
node scripts/schedule-compliance-audit.js weekly

# Check cron logs
tail -f /var/log/act-compliance-daily.log
```

## Alert Configuration

### Slack Integration

Set the `SLACK_WEBHOOK_URL` environment variable to receive alerts:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

### Email Integration

For email alerts, modify the scheduler to use your email service:

```javascript
// In sendCriticalAlert() method
if (process.env.EMAIL_SMTP_URL) {
  await this.sendEmailAlert(alert);
}
```

### Monitoring Integration

For integration with monitoring systems like Datadog, New Relic, or Prometheus:

```javascript
// Add to the audit completion handler
if (process.env.MONITORING_ENDPOINT) {
  await this.sendMetricsToMonitoring(auditResult);
}
```

## Exit Codes

The scheduler returns different exit codes for monitoring:

- `0`: Audit passed (COMPLIANT status)
- `1`: Audit has warnings (WARNING status) 
- `2`: Audit failed critically (CRITICAL status)
- `3`: Audit system failure (technical error)

## File Locations

### Audit Results
- **Daily audits**: `/apps/backend/data/audit-history/audit-{timestamp}-daily.json`
- **Weekly audits**: `/apps/backend/data/audit-history/audit-{timestamp}-weekly.json`
- **Monthly audits**: `/apps/backend/data/audit-history/audit-{timestamp}-monthly.json`
- **Latest results**: `/apps/backend/data/audit-history/latest-{type}.json`

### Alerts
- **Alert files**: `/apps/backend/data/audit-history/alerts/alert-{timestamp}.json`
- **Failure logs**: `/apps/backend/data/audit-history/failure-{audit-id}.json`

### System Logs
- **Daily logs**: `/var/log/act-compliance-daily.log`
- **Weekly logs**: `/var/log/act-compliance-weekly.log` 
- **Monthly logs**: `/var/log/act-compliance-monthly.log`

## Maintenance Tasks

### Weekly Maintenance

```bash
# Clean old audit files (older than 90 days)
find /path/to/act-placemat/apps/backend/data/audit-history -name "audit-*.json" -mtime +90 -delete

# Clean old alert files (older than 30 days)
find /path/to/act-placemat/apps/backend/data/audit-history/alerts -name "alert-*.json" -mtime +30 -delete

# Verify cron jobs are running
grep CRON /var/log/syslog | grep compliance-audit | tail -10
```

### Monthly Review

1. Review audit trend reports
2. Update compliance thresholds if needed
3. Review and update alert recipients
4. Verify all compliance documentation is current
5. Test disaster recovery procedures

## Security Considerations

- Ensure audit scripts run with minimal required permissions
- Store sensitive environment variables securely
- Encrypt audit result files if they contain sensitive data
- Regularly rotate API keys and credentials
- Monitor for unauthorized access to audit systems

## Troubleshooting

### Common Issues

1. **Cron jobs not running**: Check cron service status and logs
2. **Permission denied**: Ensure script is executable and user has proper permissions
3. **Module not found**: Verify Node.js path and module installation
4. **Database connection failed**: Check database connectivity and credentials
5. **Alert delivery failed**: Verify webhook URLs and API credentials

### Debug Commands

```bash
# Test audit script directly
node scripts/schedule-compliance-audit.js daily --verbose

# Check cron environment
* * * * * env > /tmp/cron-env.log

# Monitor system resources during audit
top -p $(pgrep -f compliance-audit)
```

## Performance Monitoring

Track these metrics:

- **Audit execution time**: Should complete within reasonable time limits
- **System resource usage**: CPU/memory during audit execution  
- **Database query performance**: Monitor slow queries during audits
- **Alert response time**: Time from detection to notification
- **False positive rate**: Monitor alert accuracy over time

---

*This schedule ensures continuous compliance monitoring while balancing system resources and operational requirements.*