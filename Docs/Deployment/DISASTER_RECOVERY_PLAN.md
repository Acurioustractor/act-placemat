# ACT Placemat Disaster Recovery Plan

## Executive Summary

This document outlines the disaster recovery (DR) procedures for the ACT Placemat community platform. The plan ensures business continuity and minimizes downtime in the event of system failures, natural disasters, or security incidents.

### Recovery Objectives
- **Recovery Time Objective (RTO)**: 4 hours maximum
- **Recovery Point Objective (RPO)**: 1 hour maximum data loss
- **Availability Target**: 99.9% uptime (8.76 hours downtime per year)

## Disaster Scenarios

### Category 1: Infrastructure Failures
- AWS region outage
- EKS cluster failure
- Database corruption
- Storage system failure
- Network connectivity issues

### Category 2: Application Failures
- Software bugs causing system crashes
- Memory leaks leading to service degradation
- Configuration errors
- Dependency service failures

### Category 3: Security Incidents
- Data breaches
- DDoS attacks
- Unauthorized access
- Malware infections

### Category 4: Natural Disasters
- Data center destruction
- Extended power outages
- Natural catastrophes affecting infrastructure

## Recovery Strategies

### Multi-Region Architecture

#### Primary Region: ap-southeast-2 (Sydney)
- Production EKS cluster
- Primary RDS database
- ElastiCache instances
- Application load balancers

#### Secondary Region: ap-southeast-1 (Singapore)
- Standby EKS cluster (minimal resources)
- RDS read replica
- Cross-region backup storage
- DNS failover configuration

### Data Protection Strategy

#### Database Backup
```bash
# Automated daily snapshots
aws rds create-db-snapshot \
  --db-instance-identifier act-placemat-prod \
  --db-snapshot-identifier daily-snapshot-$(date +%Y%m%d)

# Cross-region snapshot copy
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier daily-snapshot-$(date +%Y%m%d) \
  --target-db-snapshot-identifier cross-region-snapshot-$(date +%Y%m%d) \
  --source-region ap-southeast-2 \
  --target-region ap-southeast-1
```

#### Application Data Backup
```bash
# Kubernetes resource backup
kubectl get all -n act-production -o yaml > /backup/k8s-resources-$(date +%Y%m%d).yaml

# Configuration backup
kubectl get configmaps,secrets -n act-production -o yaml > /backup/k8s-config-$(date +%Y%m%d).yaml
```

## Recovery Procedures

### Procedure 1: Database Recovery

#### Scenario: Primary database failure

**Assessment Phase (0-15 minutes)**
1. Verify database connectivity:
```bash
aws rds describe-db-instances --db-instance-identifier act-placemat-prod
```

2. Check monitoring dashboards for error patterns
3. Determine if issue is recoverable or requires full restore

**Recovery Phase (15 minutes - 2 hours)**

**Option A: Minor Issues (15-30 minutes)**
```bash
# Restart database instance
aws rds reboot-db-instance --db-instance-identifier act-placemat-prod

# Monitor recovery
aws rds describe-db-instances --db-instance-identifier act-placemat-prod \
  --query 'DBInstances[0].DBInstanceStatus'
```

**Option B: Major Corruption (30 minutes - 2 hours)**
```bash
# Restore from latest snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier act-placemat-restore \
  --db-snapshot-identifier $(aws rds describe-db-snapshots \
    --db-instance-identifier act-placemat-prod \
    --query 'DBSnapshots[0].DBSnapshotIdentifier' --output text)

# Update application configuration
kubectl patch secret database-credentials -n act-production \
  --type='json' -p='[{"op": "replace", "path": "/data/url", "value": "'$(echo -n $NEW_DB_URL | base64)'"}]'

# Restart application pods
kubectl rollout restart deployment -n act-production
```

### Procedure 2: Application Recovery

#### Scenario: Application service failure

**Assessment Phase (0-10 minutes)**
```bash
# Check pod status
kubectl get pods -n act-production

# Check recent events
kubectl get events -n act-production --sort-by='.lastTimestamp'

# Review application logs
kubectl logs -l app=backend -n act-production --tail=100
```

**Recovery Phase (10-60 minutes)**

**Option A: Pod-level issues**
```bash
# Restart failed pods
kubectl delete pod -l app=backend -n act-production

# Scale deployment if needed
kubectl scale deployment backend-production --replicas=10 -n act-production
```

**Option B: Image/Configuration issues**
```bash
# Rollback to previous version
kubectl rollout undo deployment/backend-production -n act-production

# Monitor rollback progress
kubectl rollout status deployment/backend-production -n act-production
```

### Procedure 3: Cross-Region Failover

#### Scenario: Complete region failure

**Phase 1: Immediate Response (0-30 minutes)**

1. **Activate Incident Response Team**
   - Notify all stakeholders
   - Establish communication channels
   - Begin status page updates

2. **DNS Failover**
```bash
# Update Route 53 records to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch file://dns-failover.json
```

**Phase 2: Data Recovery (30 minutes - 2 hours)**

1. **Restore Database in DR Region**
```bash
# Restore from cross-region snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier act-placemat-dr \
  --db-snapshot-identifier cross-region-snapshot-latest \
  --region ap-southeast-1
```

2. **Deploy Application Stack**
```bash
# Switch to DR region
export AWS_DEFAULT_REGION=ap-southeast-1

# Deploy EKS cluster
cd infrastructure/terraform
terraform workspace select dr
terraform apply -auto-approve

# Deploy applications
./infrastructure/deploy-production.sh
```

**Phase 3: Service Restoration (2-4 hours)**

1. **Verify functionality**
2. **Update monitoring and alerting**
3. **Communicate restoration to users**
4. **Begin data synchronization planning**

### Procedure 4: Security Incident Response

#### Scenario: Security breach detected

**Immediate Actions (0-15 minutes)**
1. **Isolate affected systems**
```bash
# Scale down affected deployments
kubectl scale deployment backend-production --replicas=0 -n act-production

# Block suspicious traffic
kubectl apply -f security/emergency-network-policy.yaml
```

2. **Preserve evidence**
```bash
# Capture logs
kubectl logs -l app=backend -n act-production > security-incident-logs-$(date +%Y%m%d-%H%M).txt

# Export pod configurations
kubectl get pods -n act-production -o yaml > security-incident-pods-$(date +%Y%m%d-%H%M).yaml
```

**Investigation Phase (15 minutes - 4 hours)**
1. Analyze logs and access patterns
2. Identify attack vectors
3. Assess data exposure
4. Coordinate with security team

**Recovery Phase**
1. Patch security vulnerabilities
2. Rotate all credentials
3. Deploy hardened configuration
4. Restore services gradually

## Communication Plan

### Stakeholder Notification Matrix

| Stakeholder | Contact Method | Notification Time |
|-------------|---------------|-------------------|
| Users | Status page, Email | Immediately |
| Executive Team | Phone, Email | Within 15 minutes |
| Technical Team | Slack, Phone | Immediately |
| Partners | Email | Within 30 minutes |
| Media | Press release | As needed |

### Communication Templates

#### Initial Incident Notification
```
SUBJECT: [URGENT] ACT Placemat Service Disruption

We are currently experiencing technical difficulties affecting the ACT Placemat platform. 
Our team is actively working to resolve the issue.

Estimated resolution time: [TIME]
Status updates: https://status.actplacemat.org.au

We apologize for any inconvenience and will provide updates every 30 minutes.

- ACT Placemat Operations Team
```

#### Resolution Notification
```
SUBJECT: ACT Placemat Service Restored

The technical issues affecting ACT Placemat have been resolved. All services are now fully operational.

Issue duration: [DURATION]
Root cause: [BRIEF DESCRIPTION]

We sincerely apologize for the disruption and any impact to your community activities.

- ACT Placemat Operations Team
```

## Testing and Validation

### Disaster Recovery Testing Schedule

#### Monthly Tests
- Database backup restoration
- Application deployment verification
- Monitoring system checks

#### Quarterly Tests
- Cross-region failover simulation
- Full disaster recovery drill
- Communication plan execution

#### Annual Tests
- Complete disaster scenario simulation
- Third-party security assessment
- Business continuity validation

### Test Procedures

#### Database Recovery Test
```bash
# Create test environment
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier act-placemat-test \
  --db-snapshot-identifier latest-production-snapshot

# Verify data integrity
kubectl run --rm -i --tty postgres-client \
  --image=postgres:13 --restart=Never -- \
  psql -h test-database-endpoint -U username -d act_placemat

# Cleanup
aws rds delete-db-instance \
  --db-instance-identifier act-placemat-test \
  --skip-final-snapshot
```

#### Application Recovery Test
```bash
# Deploy to test environment
helm install act-placemat-test ./helm-chart \
  --namespace test \
  --set image.tag=latest \
  --set environment=test

# Run smoke tests
kubectl exec -it deployment/backend-test -n test -- npm run test:smoke

# Cleanup
helm uninstall act-placemat-test -n test
```

## Maintenance and Updates

### Recovery Plan Maintenance

#### Monthly Reviews
- Update contact information
- Review and test procedures
- Update recovery time estimates
- Validate backup integrity

#### Quarterly Updates
- Revise based on infrastructure changes
- Update communication templates
- Review and update RTO/RPO targets
- Conduct stakeholder training

#### Annual Overhaul
- Complete plan review and rewrite
- Infrastructure architecture assessment
- Third-party audit of procedures
- Executive review and approval

### Change Management

All changes to the disaster recovery plan must:
1. Be reviewed by the technical team
2. Be approved by the operations manager
3. Include updated testing procedures
4. Be communicated to all stakeholders

## Training and Awareness

### Training Program

#### New Employee Onboarding
- DR plan overview
- Role-specific responsibilities
- Emergency contact procedures
- Basic recovery commands

#### Regular Team Training
- Monthly DR scenario discussions
- Quarterly hands-on exercises
- Annual comprehensive drills
- Lessons learned sessions

#### Executive Briefings
- Quarterly business impact reviews
- Annual plan effectiveness assessment
- Budget planning for DR capabilities
- Regulatory compliance updates

## Compliance and Audit

### Regulatory Requirements
- Australian Privacy Principles (APP)
- ISO 27001 standards
- SOC 2 Type II compliance
- GDPR for international users

### Audit Trail
- All recovery actions logged
- Decision points documented
- Communication records maintained
- Cost tracking for incidents

### Documentation Requirements
- Incident reports within 24 hours
- Root cause analysis within 1 week
- Lessons learned documentation
- Plan updates based on incidents

## Appendix

### Emergency Contact List
```
Primary On-Call: +61 XXX XXX XXX
Secondary On-Call: +61 XXX XXX XXX
AWS Support: Case Priority: High
Database Administrator: dba@actplacemat.org.au
Security Team: security@actplacemat.org.au
Communications Lead: comms@actplacemat.org.au
```

### Key System Information
```
Primary Region: ap-southeast-2
DR Region: ap-southeast-1
EKS Cluster: act-placemat-production
Database: act-placemat-prod.xyz.ap-southeast-2.rds.amazonaws.com
Status Page: https://status.actplacemat.org.au
```

### Recovery Checklist

#### Database Recovery
- [ ] Verify backup availability
- [ ] Restore from latest snapshot
- [ ] Update connection strings
- [ ] Restart application services
- [ ] Verify data integrity
- [ ] Update monitoring

#### Application Recovery
- [ ] Assess failure scope
- [ ] Deploy/restart services
- [ ] Verify functionality
- [ ] Check dependencies
- [ ] Monitor performance
- [ ] Update status page

#### Cross-Region Failover
- [ ] Activate DR team
- [ ] Update DNS records
- [ ] Restore database
- [ ] Deploy applications
- [ ] Test functionality
- [ ] Communicate status
- [ ] Plan failback

---

*Document Version: 1.0*
*Last Updated: $(date)*
*Next Review Date: $(date -d '+3 months')*