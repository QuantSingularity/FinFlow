variable "prefix" {
  description = "Prefix for secrets in AWS Secrets Manager"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "kms_key_id" {
  description = "KMS key ID for encrypting secrets"
  type        = string
}

variable "tags" {
  description = "Additional tags for secrets"
  type        = map(string)
  default     = {}
}
