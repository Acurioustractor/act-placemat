# Monitoring Module Outputs

output "cloudwatch_log_groups" {
  description = "CloudWatch log groups created"
  value = {
    application = aws_cloudwatch_log_group.application_logs.name
    dataplane   = aws_cloudwatch_log_group.dataplane_logs.name
    host        = aws_cloudwatch_log_group.host_logs.name
    performance = aws_cloudwatch_log_group.performance_logs.name
  }
}

output "dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://ap-southeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2#dashboards:name=${aws_cloudwatch_dashboard.community_platform.dashboard_name}"
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "alarm_names" {
  description = "Names of the CloudWatch alarms created"
  value = [
    aws_cloudwatch_metric_alarm.high_cpu_utilization.alarm_name,
    aws_cloudwatch_metric_alarm.high_memory_utilization.alarm_name,
    aws_cloudwatch_metric_alarm.pod_restart_rate.alarm_name,
    aws_cloudwatch_metric_alarm.high_response_time.alarm_name
  ]
}

output "composite_alarm_name" {
  description = "Name of the composite alarm for overall platform health"
  value       = aws_cloudwatch_composite_alarm.community_platform_health.alarm_name
}