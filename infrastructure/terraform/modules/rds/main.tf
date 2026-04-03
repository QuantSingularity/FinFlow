locals {
  common_tags = merge(
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.tags
  )
}

resource "aws_db_subnet_group" "main" {
  name        = "finflow-${var.environment}-subnet-group"
  description = "Subnet group for FinFlow RDS instances"
  subnet_ids  = var.subnet_ids

  tags = merge(
    {
      Name = "finflow-${var.environment}-subnet-group"
    },
    local.common_tags
  )
}

resource "aws_db_parameter_group" "postgres" {
  name        = "finflow-${var.environment}-postgres-params"
  family      = "postgres${var.db_engine_version}"
  description = "Parameter group for FinFlow PostgreSQL instances"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = merge(
    {
      Name = "finflow-${var.environment}-postgres-params"
    },
    local.common_tags
  )

  lifecycle {
    create_before_destroy = true
  }
}

resource "random_password" "db_password" {
  for_each = var.databases

  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "main" {
  for_each = var.databases

  identifier        = "finflow-${var.environment}-${each.value.name}"
  engine            = "postgres"
  engine_version    = var.db_engine_version
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 3
  storage_type      = "gp3"
  storage_encrypted = true
  kms_key_id        = var.kms_key_id

  db_name  = each.value.name
  username = "postgres"
  password = random_password.db_password[each.key].result
  port     = each.value.port

  vpc_security_group_ids = [var.rds_security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.postgres.name

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  multi_az                  = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "finflow-${var.environment}-${each.value.name}-final-${replace(timestamp(), ":", "-")}"
  deletion_protection       = true
  copy_tags_to_snapshot     = true

  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  monitoring_interval                   = 60
  monitoring_role_arn                   = var.rds_monitoring_role_arn

  auto_minor_version_upgrade = true

  tags = merge(
    {
      Name = "finflow-${var.environment}-${each.value.name}"
    },
    local.common_tags
  )

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  for_each = var.databases

  name                    = "finflow/${var.environment}/db/${each.value.name}"
  description             = "Credentials for FinFlow ${each.value.name} database"
  kms_key_id              = var.kms_key_id
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  for_each = var.databases

  secret_id = aws_secretsmanager_secret.db_credentials[each.key].id
  secret_string = jsonencode({
    username = "postgres"
    password = random_password.db_password[each.key].result
    engine   = "postgres"
    host     = aws_db_instance.main[each.key].address
    port     = aws_db_instance.main[each.key].port
    dbname   = each.value.name
    url      = "postgresql://postgres:${random_password.db_password[each.key].result}@${aws_db_instance.main[each.key].address}:${aws_db_instance.main[each.key].port}/${each.value.name}"
  })
}
