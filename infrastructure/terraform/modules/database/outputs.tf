output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "username" {
  description = "Database username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "secret_arn" {
  description = "ARN of the secret containing database credentials"
  value       = aws_secretsmanager_secret.database.arn
}

output "proxy_endpoint" {
  description = "RDS Proxy endpoint"
  value       = var.enable_proxy ? aws_db_proxy.main[0].endpoint : null
  sensitive   = true
}