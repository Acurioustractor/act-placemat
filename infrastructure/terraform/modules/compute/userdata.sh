#!/bin/bash
set -o xtrace

# Bootstrap EKS worker node
/etc/eks/bootstrap.sh ${cluster_name} \
  --apiserver-endpoint '${endpoint}' \
  --b64-cluster-ca '${certificate_authority}' \
  --use-max-pods false \
  --container-runtime containerd

# Install CloudWatch agent
yum install -y amazon-cloudwatch-agent

# Configure CloudWatch agent for container insights
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "region": "ap-southeast-2",
    "debug": false
  },
  "logs": {
    "logs_collected": {
      "kubernetes": {
        "cluster_name": "${cluster_name}",
        "log_group_name": "/aws/containerinsights/${cluster_name}/application",
        "log_stream_name": "{pod_name}",
        "multiline_start_pattern": "^\\d{4}-\\d{2}-\\d{2}",
        "timezone": "Local"
      }
    },
    "force_flush_interval": 5
  },
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# Optimize for community platform workloads
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
echo 'fs.file-max=65536' >> /etc/sysctl.conf
sysctl -p

# Configure log rotation for container logs
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 5
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF