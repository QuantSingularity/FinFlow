output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "database_subnet_ids" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_certificate_authority_data" {
  description = "The certificate authority data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "The ARN of the EKS OIDC Provider"
  value       = module.eks.oidc_provider_arn
}

output "eks_cluster_oidc_issuer_url" {
  description = "The URL of the EKS cluster OIDC issuer"
  value       = module.eks.cluster_oidc_issuer_url
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.finflow_key.arn
}

output "secrets_manager_secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = module.secrets_manager.secret_arn
}

output "ecr_repository_urls" {
  description = "The URLs of the ECR repositories"
  value       = module.ecr.repository_urls
}

output "bastion_public_ip" {
  description = "The public IP of the bastion host"
  value       = var.enable_bastion ? module.bastion[0].public_ip : null
}

output "kubeconfig_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "rds_endpoints" {
  description = "RDS instance endpoints"
  value       = module.rds.db_instance_endpoints
  sensitive   = true
}

output "cloudtrail_arn" {
  description = "ARN of the CloudTrail trail"
  value       = module.cloudwatch_logging.cloudtrail_arn
}

output "finflow_app_irsa_role_arn" {
  description = "ARN of the IRSA role for FinFlow application pods"
  value       = aws_iam_role.finflow_app_irsa.arn
}
