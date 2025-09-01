# Monitoring Module - CloudWatch, Container Insights, and Logging

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/containerinsights/${var.name_prefix}/application"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "dataplane_logs" {
  name              = "/aws/containerinsights/${var.name_prefix}/dataplane"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "host_logs" {
  name              = "/aws/containerinsights/${var.name_prefix}/host"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "performance_logs" {
  name              = "/aws/containerinsights/${var.name_prefix}/performance"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# CloudWatch Insights Queries for Community Platform
resource "aws_cloudwatch_query_definition" "community_errors" {
  name = "${var.name_prefix}-community-errors"

  log_group_names = [
    aws_cloudwatch_log_group.application_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @logStream, @log
| filter @message like /ERROR/
| filter @message like /community/
| sort @timestamp desc
| limit 100
EOF
}

resource "aws_cloudwatch_query_definition" "performance_metrics" {
  name = "${var.name_prefix}-performance-metrics"

  log_group_names = [
    aws_cloudwatch_log_group.performance_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /response_time/
| stats avg(response_time) by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "community_scaling" {
  name = "${var.name_prefix}-community-scaling"

  log_group_names = [
    aws_cloudwatch_log_group.application_logs.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /scaling/ or @message like /community_count/
| sort @timestamp desc
| limit 50
EOF
}

# CloudWatch Dashboards
resource "aws_cloudwatch_dashboard" "community_platform" {
  dashboard_name = "${var.name_prefix}-community-platform"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/EKS", "cluster_node_count", "ClusterName", var.eks_cluster_id],
            ["AWS/EKS", "cluster_failed_request_count", "ClusterName", var.eks_cluster_id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "ap-southeast-2"
          title   = "EKS Cluster Health"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ContainerInsights", "pod_cpu_utilization", "ClusterName", var.eks_cluster_id],
            ["AWS/ContainerInsights", "pod_memory_utilization", "ClusterName", var.eks_cluster_id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "ap-southeast-2"
          title   = "Pod Resource Utilization"
          period  = 300
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          query   = "SOURCE '${aws_cloudwatch_log_group.application_logs.name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = "ap-southeast-2"
          title   = "Recent Application Errors"
        }
      }
    ]
  })
}

# Custom CloudWatch Metrics for Community Platform
resource "aws_cloudwatch_metric_alarm" "high_cpu_utilization" {
  alarm_name          = "${var.name_prefix}-high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "pod_cpu_utilization"
  namespace           = "AWS/ContainerInsights"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors EKS pod CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.eks_cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "high_memory_utilization" {
  alarm_name          = "${var.name_prefix}-high-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "pod_memory_utilization"
  namespace           = "AWS/ContainerInsights"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors EKS pod memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.eks_cluster_id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "pod_restart_rate" {
  alarm_name          = "${var.name_prefix}-pod-restart-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "pod_number_of_container_restarts"
  namespace           = "AWS/ContainerInsights"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors pod restart rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.eks_cluster_id
  }

  tags = var.tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.name_prefix}-monitoring-alerts"

  tags = var.tags
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.alert_email != null ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Composite Alarms for Community Platform Health
resource "aws_cloudwatch_composite_alarm" "community_platform_health" {
  alarm_name        = "${var.name_prefix}-community-platform-health"
  alarm_description = "Overall health of the ACT Community Platform"
  
  alarm_rule = join(" OR ", [
    "ALARM(${aws_cloudwatch_metric_alarm.high_cpu_utilization.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.high_memory_utilization.alarm_name})",
    "ALARM(${aws_cloudwatch_metric_alarm.pod_restart_rate.alarm_name})"
  ])

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = var.tags
}

# Application Performance Monitoring with custom metrics
resource "aws_cloudwatch_log_metric_filter" "response_time" {
  name           = "${var.name_prefix}-response-time"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, request_id, response_time_ms=*ms*]"

  metric_transformation {
    name      = "ResponseTime"
    namespace = "ACT/CommunityPlatform"
    value     = "$response_time_ms"
  }
}

resource "aws_cloudwatch_log_metric_filter" "community_count" {
  name           = "${var.name_prefix}-active-communities"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, ..., active_communities=*]"

  metric_transformation {
    name      = "ActiveCommunities"
    namespace = "ACT/CommunityPlatform"
    value     = "$active_communities"
  }
}

resource "aws_cloudwatch_log_metric_filter" "story_processing_rate" {
  name           = "${var.name_prefix}-story-processing-rate"
  log_group_name = aws_cloudwatch_log_group.application_logs.name
  pattern        = "[timestamp, ..., stories_processed=*]"

  metric_transformation {
    name      = "StoriesProcessed"
    namespace = "ACT/CommunityPlatform"
    value     = "$stories_processed"
  }
}

# Custom alarm for response time
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.name_prefix}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ResponseTime"
  namespace           = "ACT/CommunityPlatform"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000"
  alarm_description   = "Average response time is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = var.tags
}