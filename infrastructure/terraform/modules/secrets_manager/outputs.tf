output "secret_arn" {
  description = "ARN of the application secret"
  value       = aws_secretsmanager_secret.finflow_secret.arn
}

output "secret_name" {
  description = "Name of the application secret"
  value       = aws_secretsmanager_secret.finflow_secret.name
}
