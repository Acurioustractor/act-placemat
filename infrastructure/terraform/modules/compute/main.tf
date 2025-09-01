# Compute Module - EKS Cluster and Node Groups

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "${var.name_prefix}-cluster"
  role_arn = var.cluster_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [var.cluster_security_group_id]
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  depends_on = [
    aws_cloudwatch_log_group.eks_cluster
  ]

  tags = var.tags
}

# CloudWatch Log Group for EKS
resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.name_prefix}-cluster/cluster"
  retention_in_days = 30

  tags = var.tags
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-eks-encryption-key"
  })
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.name_prefix}-eks-encryption"
  target_key_id = aws_kms_key.eks.key_id
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.name_prefix}-node-group"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.node_instance_types

  scaling_config {
    desired_size = var.node_desired_capacity
    max_size     = var.node_max_capacity
    min_size     = var.node_min_capacity
  }

  update_config {
    max_unavailable = 1
  }

  # Remote access
  remote_access {
    ec2_ssh_key = var.key_pair_name
    source_security_group_ids = [var.nodes_security_group_id]
  }

  # Launch template for advanced configuration
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }

  labels = {
    role = "worker"
    environment = var.environment
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-node-group"
    "kubernetes.io/cluster/${aws_eks_cluster.main.name}" = "owned"
  })

  depends_on = [
    aws_eks_cluster.main
  ]
}

# Launch Template for optimized node configuration
resource "aws_launch_template" "eks_nodes" {
  name_prefix   = "${var.name_prefix}-eks-nodes"
  image_id      = data.aws_ami.eks_worker.id
  instance_type = var.node_instance_types[0]

  vpc_security_group_ids = [var.nodes_security_group_id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size = 50
      volume_type = "gp3"
      iops        = 3000
      throughput  = 125
      encrypted   = true
    }
  }

  monitoring {
    enabled = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name        = aws_eks_cluster.main.name
    endpoint           = aws_eks_cluster.main.endpoint
    certificate_authority = aws_eks_cluster.main.certificate_authority[0].data
  }))

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.name_prefix}-eks-node"
      "kubernetes.io/cluster/${aws_eks_cluster.main.name}" = "owned"
    })
  }

  tags = var.tags
}

# Data source for EKS optimized AMI
data "aws_ami" "eks_worker" {
  filter {
    name   = "name"
    values = ["amazon-eks-node-${var.kubernetes_version}-v*"]
  }

  most_recent = true
  owners      = ["602401143452"] # Amazon EKS AMI Account ID
}

# EKS Add-ons
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
  
  tags = var.tags
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"
  
  depends_on = [aws_eks_node_group.main]
  
  tags = var.tags
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
  
  tags = var.tags
}

# EBS CSI Driver for persistent storage
resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"
  
  tags = var.tags
}

# OIDC Identity Provider
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = var.tags
}

# Cluster Autoscaler Service Account and IAM Role
resource "aws_iam_role" "cluster_autoscaler" {
  name = "${var.name_prefix}-cluster-autoscaler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:cluster-autoscaler"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cluster_autoscaler" {
  policy_arn = var.cluster_autoscaler_policy_arn
  role       = aws_iam_role.cluster_autoscaler.name
}