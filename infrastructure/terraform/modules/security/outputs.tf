# Security Module Outputs

output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "eks_nodes_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.eks_nodes.id
}

output "database_security_group_id" {
  description = "Security group ID for database"
  value       = aws_security_group.database.id
}

output "load_balancer_security_group_id" {
  description = "Security group ID for load balancer"
  value       = aws_security_group.load_balancer.id
}

output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = aws_iam_role.eks_node_role.arn
}

output "cluster_autoscaler_policy_arn" {
  description = "ARN of the cluster autoscaler IAM policy"
  value       = aws_iam_policy.cluster_autoscaler.arn
}