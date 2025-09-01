# Database Module for ACT Placemat

# Random password for database
resource "random_password" "database" {
  length  = 16
  special = true
}

# Parameter group for PostgreSQL
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.name_prefix}-postgres-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = var.tags
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier     = "${var.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "act_placemat"
  username = "act_user"
  password = random_password.database.result

  vpc_security_group_ids = [var.security_group_id]
  db_subnet_group_name   = var.database_subnet_group_name
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  maintenance_window     = var.maintenance_window

  skip_final_snapshot       = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  deletion_protection = var.environment == "prod" ? true : false

  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-postgres"
  })
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Store database password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.name_prefix}/database/credentials"
  description             = "Database credentials for ACT Placemat"
  recovery_window_in_days = var.environment == "dev" ? 0 : 7

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.database.result
    endpoint = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}

# RDS Proxy for connection pooling (optional for production)
resource "aws_db_proxy" "main" {
  count = var.enable_proxy ? 1 : 0

  name                   = "${var.name_prefix}-rds-proxy"
  engine_family          = "POSTGRESQL"
  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.database.arn
  }

  role_arn               = aws_iam_role.proxy[0].arn
  vpc_subnet_ids         = var.private_subnet_ids
  vpc_security_group_ids = [var.security_group_id]

  target {
    db_instance_identifier = aws_db_instance.main.identifier
  }

  tags = var.tags
}

# IAM role for RDS Proxy
resource "aws_iam_role" "proxy" {
  count = var.enable_proxy ? 1 : 0

  name = "${var.name_prefix}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "proxy" {
  count = var.enable_proxy ? 1 : 0

  name = "${var.name_prefix}-rds-proxy-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.database.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "proxy" {
  count = var.enable_proxy ? 1 : 0

  role       = aws_iam_role.proxy[0].name
  policy_arn = aws_iam_policy.proxy[0].arn
}