# Compute Module Variables

variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  type        = string
}

variable "nodes_security_group_id" {
  description = "Security group ID for EKS nodes"
  type        = string
}

variable "cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  type        = string
}

variable "node_role_arn" {
  description = "ARN of the EKS node group IAM role"
  type        = string
}

variable "cluster_autoscaler_policy_arn" {
  description = "ARN of the cluster autoscaler IAM policy"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "node_max_capacity" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 5
}

variable "node_min_capacity" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "node_instance_types" {
  description = "Instance types for worker nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "key_pair_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}