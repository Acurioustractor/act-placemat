# ACT Placemat Infrastructure Outputs

# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

# Database Outputs
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "database_port" {
  description = "RDS instance port"
  value       = module.database.port
}

output "database_name" {
  description = "Database name"
  value       = module.database.database_name
}

# EKS Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.compute.cluster_id
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.compute.cluster_endpoint
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.compute.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.compute.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.compute.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.compute.cluster_certificate_authority_data
  sensitive   = true
}

# Node Group Outputs
output "node_groups" {
  description = "EKS node group information"
  value       = module.compute.node_groups
}

# Security Outputs
output "database_security_group_id" {
  description = "ID of the database security group"
  value       = module.security.database_security_group_id
}

output "eks_security_group_id" {
  description = "ID of the EKS security group"
  value       = module.security.eks_security_group_id
}

# Monitoring Outputs
output "cloudwatch_log_group_names" {
  description = "CloudWatch log group names"
  value       = module.monitoring.cloudwatch_log_group_names
}

# Connection Information
output "kubectl_config" {
  description = "kubectl configuration command"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.compute.cluster_id}"
}

output "psql_connection" {
  description = "PostgreSQL connection string (masked)"
  value       = "psql -h ${module.database.endpoint} -p ${module.database.port} -U act_user -d ${module.database.database_name}"
  sensitive   = true
}