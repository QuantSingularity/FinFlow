resource "aws_secretsmanager_secret" "finflow_secret" {
  name                    = "${var.prefix}${var.environment}/app-config"
  description             = "FinFlow application configuration secret"
  kms_key_id              = var.kms_key_id
  recovery_window_in_days = 7

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "finflow_secret_version" {
  secret_id     = aws_secretsmanager_secret.finflow_secret.id
  secret_string = jsonencode({
    placeholder = "Replace with actual application config values"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
