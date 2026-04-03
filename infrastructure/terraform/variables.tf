variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "List of CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnet_cidrs" {
  description = "List of CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "finflow-cluster"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "node_groups" {
  description = "Map of EKS node group configurations"
  type        = map(any)
  default = {
    app_nodes = {
      name           = "app-nodes"
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 5
      desired_size   = 3
      disk_size      = 50
      labels = {
        role = "app"
      }
    },
    db_nodes = {
      name           = "db-nodes"
      instance_types = ["r5.large"]
      min_size       = 2
      max_size       = 3
      desired_size   = 2
      disk_size      = 100
      labels = {
        role = "database"
      }
    },
    monitoring_nodes = {
      name           = "monitoring-nodes"
      instance_types = ["t3.large"]
      min_size       = 1
      max_size       = 2
      desired_size   = 1
      disk_size      = 80
      labels = {
        role = "monitoring"
      }
    }
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instances in GB"
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "14"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "finflow.example.com"
}

variable "enable_bastion" {
  description = "Whether to create a bastion host"
  type        = bool
  default     = true
}

variable "bastion_allowed_cidrs" {
  description = "CIDR blocks allowed to access the bastion host via SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

variable "kms_key_alias" {
  description = "KMS Key Alias for encryption"
  type        = string
  default     = "alias/finflow-kms-key"
}

variable "secrets_manager_prefix" {
  description = "Prefix for secrets in AWS Secrets Manager"
  type        = string
  default     = "finflow/"
}

variable "cloudtrail_s3_bucket_name" {
  description = "Base name of the S3 bucket for CloudTrail logs (environment suffix appended automatically)"
  type        = string
  default     = "finflow-cloudtrail-logs"
}
