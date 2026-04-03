output "cloudtrail_log_group_arn" {
  description = "ARN of the CloudTrail log group"
  value       = aws_cloudwatch_log_group.cloudtrail_log_group.arn
}

output "cloudwatch_logs_role_arn" {
  description = "ARN of the IAM role for CloudWatch Logs"
  value       = aws_iam_role.cloudwatch_logs_role.arn
}

output "cloudtrail_s3_bucket_name" {
  description = "Name of the S3 bucket for CloudTrail logs"
  value       = aws_s3_bucket.cloudtrail_bucket.id
}

output "cloudtrail_arn" {
  description = "ARN of the CloudTrail trail"
  value       = aws_cloudtrail.finflow_trail.arn
}
