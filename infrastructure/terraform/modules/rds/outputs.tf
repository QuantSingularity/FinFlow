output "db_instance_ids" {
  description = "The IDs of the RDS instances"
  value       = { for k, v in aws_db_instance.main : k => v.id }
}

output "db_instance_addresses" {
  description = "The addresses of the RDS instances"
  value       = { for k, v in aws_db_instance.main : k => v.address }
}

output "db_instance_endpoints" {
  description = "The connection endpoints of the RDS instances"
  value       = { for k, v in aws_db_instance.main : k => v.endpoint }
}

output "db_instance_ports" {
  description = "The database ports of the RDS instances"
  value       = { for k, v in aws_db_instance.main : k => v.port }
}

output "db_subnet_group_id" {
  description = "The ID of the DB subnet group"
  value       = aws_db_subnet_group.main.id
}

output "db_parameter_group_id" {
  description = "The ID of the DB parameter group"
  value       = aws_db_parameter_group.postgres.id
}

output "secret_arns" {
  description = "The ARNs of the Secrets Manager secrets"
  value       = { for k, v in aws_secretsmanager_secret.db_credentials : k => v.arn }
}

output "db_connection_strings" {
  description = "The connection strings for the databases"
  value       = { for k, v in var.databases : k => "postgresql://postgres:${random_password.db_password[k].result}@${aws_db_instance.main[k].address}:${aws_db_instance.main[k].port}/${v.name}" }
  sensitive   = true
}
