# ACT Placemat Production Operations Runbook

## Overview

This runbook provides comprehensive guidance for deploying, monitoring, and maintaining the ACT Placemat production environment on AWS EKS.

## Architecture Overview

### Infrastructure Components
- **AWS EKS Cluster**: Kubernetes orchestration platform
- **Auto Scaling Groups**: Dynamic node scaling based on workload
- **Application Load Balancer**: Traffic distribution and SSL termination
- **RDS PostgreSQL**: Primary database with automated backups
- **ElastiCache Redis**: Session storage and caching
- **CloudWatch**: Logging and basic monitoring
- **Prometheus + Grafana**: Advanced monitoring and alerting

### Application Components
- **Frontend**: React application serving the user interface
- **Backend**: Node.js API server handling business logic
- **Community Insights Engine**: AI-powered community analysis
- **Benefit Sharing Processor**: Economic transaction processing
- **Community Scaling Manager**: Dynamic resource allocation

## Pre-Deployment Checklist

### Prerequisites
- [ ] AWS CLI configured with appropriate permissions
- [ ] kubectl installed and configured
- [ ] Terraform installed (>= 1.0)
- [ ] Helm installed (>= 3.0)
- [ ] Docker images built and pushed to registry
- [ ] Environment variables configured
- [ ] SSL certificates ready (or Let's Encrypt configured)
- [ ] DNS configuration planned

### Security Requirements
- [ ] IAM roles and policies configured
- [ ] Security groups configured with least privilege
- [ ] Network policies defined
- [ ] Secrets management strategy implemented
- [ ] Database encryption enabled
- [ ] Pod security standards configured

## Deployment Process

### Step 1: Infrastructure Deployment

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=production" -out=tfplan

# Apply infrastructure
terraform apply tfplan

# Update kubeconfig
aws eks update-kubeconfig --region ap-southeast-2 --name act-placemat-production
```

### Step 2: Cluster Configuration

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.10.0 \
  --set installCRDs=true
```

### Step 3: Application Deployment

```bash
# Run the complete deployment script
./infrastructure/deploy-production.sh
```

## Configuration Management

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes |
| `PERPLEXITY_API_KEY` | Perplexity research API key | No |
| `JWT_SECRET` | JWT signing secret | Yes |
| `STRIPE_API_KEY` | Payment processing API key | Yes |
| `SENDGRID_API_KEY` | Email service API key | Yes |

### Secrets Management

All sensitive configuration is stored in Kubernetes secrets:

```bash
# View existing secrets
kubectl get secrets -n act-production

# Update database credentials
kubectl create secret generic database-credentials \
  --namespace=act-production \
  --from-literal=url="postgresql://user:pass@host:5432/db" \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Monitoring and Alerting

### Accessing Monitoring Dashboards

- **Grafana**: https://monitoring.actplacemat.org.au/grafana
- **Prometheus**: https://monitoring.actplacemat.org.au/prometheus
- **Alertmanager**: https://monitoring.actplacemat.org.au/alertmanager

### Key Metrics to Monitor

#### Application Metrics
- Response time (p95 < 2s)
- Error rate (< 1%)
- Throughput (requests/second)
- Active user sessions
- Community engagement rates

#### Infrastructure Metrics
- CPU utilization (< 80%)
- Memory utilization (< 85%)
- Disk space usage (< 90%)
- Network throughput
- Pod restart rate

#### Business Metrics
- Active communities count
- Stories processed per hour
- Benefit sharing transactions
- User registration rate

### Alert Configuration

Critical alerts are sent via:
- Email to ops@actplacemat.org.au
- Slack #critical-alerts channel
- PagerDuty (for 24/7 coverage)

## Scaling Operations

### Horizontal Pod Autoscaling

The application uses HPA based on:
- CPU utilization (70% threshold)
- Memory utilization (80% threshold)
- Custom metrics (requests per second)

```bash
# View HPA status
kubectl get hpa -n act-production

# Scale manually if needed
kubectl scale deployment backend-production --replicas=10 -n act-production
```

### Cluster Autoscaling

Node groups scale between 2-20 nodes based on:
- Pod resource requests
- Pending pod scheduling
- Node utilization

```bash
# View cluster autoscaler status
kubectl logs -f deployment/cluster-autoscaler -n kube-system
```

## Backup and Recovery

### Database Backups

- **Automated**: Daily RDS snapshots with 30-day retention
- **Point-in-time**: 7-day recovery window
- **Cross-region**: Weekly snapshots to disaster recovery region

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier act-placemat-prod \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier act-placemat-restore \
  --db-snapshot-identifier snapshot-name
```

### Application Data Backup

```bash
# Backup Kubernetes resources
kubectl get all -n act-production -o yaml > backup-$(date +%Y%m%d).yaml

# Backup secrets (encrypted)
kubectl get secrets -n act-production -o yaml > secrets-backup-$(date +%Y%m%d).yaml
```

## Troubleshooting Guide

### Common Issues and Solutions

#### High Memory Usage

1. Check memory consumption:
```bash
kubectl top pods -n act-production --sort-by=memory
```

2. Investigate memory leaks:
```bash
kubectl logs -f deployment/backend-production -n act-production | grep -i memory
```

3. Scale horizontally if needed:
```bash
kubectl scale deployment backend-production --replicas=8 -n act-production
```

#### Database Connection Issues

1. Check database connectivity:
```bash
kubectl exec -it deployment/backend-production -n act-production -- curl -I $DATABASE_URL
```

2. Verify secret configuration:
```bash
kubectl get secret database-credentials -n act-production -o yaml
```

3. Check RDS instance status:
```bash
aws rds describe-db-instances --db-instance-identifier act-placemat-prod
```

#### SSL Certificate Issues

1. Check certificate status:
```bash
kubectl get certificate -n act-production
kubectl describe certificate act-placemat-tls -n act-production
```

2. Force certificate renewal:
```bash
kubectl delete certificate act-placemat-tls -n act-production
kubectl apply -f infrastructure/kubernetes/production-deployment.yaml
```

#### Pod Scheduling Issues

1. Check node resources:
```bash
kubectl describe nodes
kubectl top nodes
```

2. Check pending pods:
```bash
kubectl get pods -n act-production | grep Pending
kubectl describe pod <pending-pod-name> -n act-production
```

3. Scale cluster if needed:
```bash
# Cluster autoscaler should handle this automatically
# Manual intervention may be needed for urgent cases
```

## Security Procedures

### Security Scanning

```bash
# Scan for vulnerabilities
kubectl get pods -n act-production -o jsonpath='{.items[*].spec.containers[*].image}' | xargs -n1 trivy image

# Check security policies
kubectl get psp,networkpolicy -A
```

### Access Management

```bash
# View current RBAC
kubectl get rolebindings,clusterrolebindings -A

# Audit access logs
kubectl logs -n kube-system $(kubectl get pods -n kube-system -l component=kube-apiserver -o name)
```

### Incident Response

1. **Immediate Response**:
   - Assess impact and scope
   - Document incident start time
   - Notify stakeholders

2. **Investigation**:
   - Collect logs and metrics
   - Identify root cause
   - Implement temporary fixes

3. **Resolution**:
   - Apply permanent fixes
   - Verify system stability
   - Document lessons learned

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check system health dashboards
- [ ] Review error logs
- [ ] Monitor resource utilization
- [ ] Verify backup completion

#### Weekly
- [ ] Review security alerts
- [ ] Update monitoring thresholds
- [ ] Analyze performance trends
- [ ] Test disaster recovery procedures

#### Monthly
- [ ] Security patching
- [ ] Performance optimization
- [ ] Capacity planning review
- [ ] Update documentation

### Kubernetes Updates

```bash
# Check current version
kubectl version

# Plan cluster upgrade
eksctl get cluster
eksctl upgrade cluster --name act-placemat-production

# Update node groups
eksctl upgrade nodegroup --cluster act-placemat-production --name standard-workers
```

### Application Updates

```bash
# Rolling update deployment
kubectl set image deployment/backend-production backend=act-placemat/backend:v1.1.0 -n act-production

# Monitor rollout
kubectl rollout status deployment/backend-production -n act-production

# Rollback if needed
kubectl rollout undo deployment/backend-production -n act-production
```

## Performance Optimization

### Database Optimization

```bash
# Monitor slow queries
kubectl exec -it <postgres-pod> -- psql -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM communities WHERE status = 'active';
```

### Application Optimization

```bash
# Profile Node.js application
kubectl exec -it deployment/backend-production -n act-production -- node --prof app.js

# Monitor garbage collection
kubectl logs deployment/backend-production -n act-production | grep "gc"
```

### Infrastructure Optimization

```bash
# Right-size resources based on usage
kubectl top pods -n act-production --containers
kubectl describe limitrange production-limits -n act-production
```

## Disaster Recovery

### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

### DR Procedures

1. **Data Recovery**:
   - Restore from latest RDS snapshot
   - Replay transaction logs if needed
   - Verify data integrity

2. **Application Recovery**:
   - Deploy to DR region
   - Update DNS records
   - Verify functionality

3. **Failback Procedures**:
   - Sync data changes
   - Switch DNS back
   - Validate systems

## Contact Information

### Escalation Matrix

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | ops@actplacemat.org.au | 15 minutes |
| L2 | senior-ops@actplacemat.org.au | 30 minutes |
| L3 | cto@actplacemat.org.au | 1 hour |

### Emergency Contacts

- **Primary On-call**: +61 XXX XXX XXX
- **Secondary On-call**: +61 XXX XXX XXX
- **Infrastructure Team**: infrastructure@actplacemat.org.au
- **Security Team**: security@actplacemat.org.au

## Appendix

### Useful Commands

```bash
# Quick health check
kubectl get pods -A | grep -v Running

# Resource usage summary
kubectl top nodes && kubectl top pods -A --sort-by=cpu

# Logs from all backend pods
kubectl logs -l app=backend -n act-production --tail=100

# Port forward for debugging
kubectl port-forward service/backend-service 8080:80 -n act-production

# Emergency scale down
kubectl scale deployment --all --replicas=0 -n act-production
```

### Configuration Files

- Terraform: `infrastructure/terraform/`
- Kubernetes: `infrastructure/kubernetes/`
- Monitoring: `infrastructure/kubernetes/monitoring-stack.yaml`
- Deployment: `infrastructure/deploy-production.sh`

### External Dependencies

- AWS EKS
- AWS RDS PostgreSQL
- AWS ElastiCache Redis
- Let's Encrypt (SSL certificates)
- Docker Hub (container registry)
- GitHub (source code)
- Anthropic API (AI services)
- Stripe (payments)

---

*Last updated: $(date)*
*Version: 1.0*