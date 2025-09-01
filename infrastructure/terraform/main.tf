# ACT Placemat Infrastructure Configuration
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }

  # Configure your backend here
  # backend "s3" {
  #   bucket = "act-placemat-terraform-state"
  #   key    = "infrastructure/terraform.tfstate"
  #   region = "ap-southeast-2"
  # }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project      = "act-placemat"
      Environment  = var.environment
      ManagedBy    = "terraform"
      Owner        = "act-team"
    }
  }
}

# Local variables
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project      = var.project_name
    Environment  = var.environment
    ManagedBy    = "terraform"
    Owner        = "act-team"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Networking Module
module "networking" {
  source = "./modules/networking"
  
  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  
  tags = local.common_tags
}

# Security Module  
module "security" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.networking.vpc_id
  
  tags = local.common_tags
}

# Database Module
module "database" {
  source = "./modules/database"
  
  name_prefix           = local.name_prefix
  vpc_id               = module.networking.vpc_id
  private_subnet_ids   = module.networking.private_subnet_ids
  database_subnet_group_name = module.networking.database_subnet_group_name
  security_group_id    = module.security.database_security_group_id
  
  # Database configuration
  engine_version       = var.db_engine_version
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  
  # Backup configuration
  backup_retention_period = var.db_backup_retention_period
  backup_window           = var.db_backup_window
  maintenance_window      = var.db_maintenance_window
  
  tags = local.common_tags
}

# Compute Module (EKS)
module "compute" {
  source = "./modules/compute"
  
  name_prefix                   = local.name_prefix
  vpc_id                       = module.networking.vpc_id
  private_subnet_ids           = module.networking.private_subnet_ids
  public_subnet_ids            = module.networking.public_subnet_ids
  cluster_security_group_id    = module.security.eks_cluster_security_group_id
  nodes_security_group_id      = module.security.eks_nodes_security_group_id
  cluster_role_arn             = module.security.eks_cluster_role_arn
  node_role_arn                = module.security.eks_node_role_arn
  cluster_autoscaler_policy_arn = module.security.cluster_autoscaler_policy_arn
  
  # EKS configuration
  kubernetes_version    = var.kubernetes_version
  node_desired_capacity = var.node_desired_capacity
  node_max_capacity     = var.node_max_capacity
  node_min_capacity     = var.node_min_capacity
  node_instance_types   = var.node_instance_types
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix    = local.name_prefix
  eks_cluster_id = module.compute.cluster_id
  
  # Monitoring configuration
  enable_cloudwatch_logs    = var.enable_cloudwatch_logs
  enable_container_insights = var.enable_container_insights
  log_retention_days       = var.log_retention_days
  
  tags = local.common_tags
}