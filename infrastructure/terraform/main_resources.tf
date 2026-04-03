# ── VPC ──────────────────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr              = var.vpc_cidr
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  availability_zones    = var.availability_zones
  environment           = var.environment
  bastion_allowed_cidrs = var.bastion_allowed_cidrs

  tags = merge(var.tags, {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  })
}

# ── IAM (base roles – no OIDC dependency) ────────────────────────────────────
module "iam" {
  source                  = "./modules/iam"
  environment             = var.environment
  tags                    = var.tags
  aws_region              = var.aws_region
  secrets_manager_prefix  = var.secrets_manager_prefix
}

# ── EKS ──────────────────────────────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  cluster_name              = var.cluster_name
  cluster_version           = var.cluster_version
  vpc_id                    = module.vpc.vpc_id
  private_subnet_ids        = module.vpc.private_subnets
  node_groups               = var.node_groups
  environment               = var.environment
  eks_cluster_role_arn      = module.iam.eks_cluster_role_arn
  eks_node_group_role_arn   = module.iam.eks_node_group_role_arn
  cluster_security_group_id = module.vpc.eks_nodes_security_group_id

  tags = var.tags
}


# ── RDS ──────────────────────────────────────────────────────────────────────
module "rds" {
  source = "./modules/rds"

  vpc_id                  = module.vpc.vpc_id
  subnet_ids              = module.vpc.database_subnets
  environment             = var.environment
  db_instance_class       = var.db_instance_class
  db_allocated_storage    = var.db_allocated_storage
  db_engine_version       = var.db_engine_version
  kms_key_id              = aws_kms_key.finflow_key.id
  rds_security_group_id   = module.vpc.rds_security_group_id
  rds_monitoring_role_arn = module.iam.rds_enhanced_monitoring_role_arn

  databases = {
    auth = {
      name = "auth"
      port = 5432
    },
    payments = {
      name = "payments"
      port = 5432
    },
    accounting = {
      name = "accounting"
      port = 5432
    },
    analytics = {
      name = "analytics"
      port = 5432
    }
  }

  tags = var.tags
}

# ── ECR ──────────────────────────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  environment = var.environment

  repositories = [
    "frontend",
    "api-gateway",
    "auth-service",
    "payments-service",
    "accounting-service",
    "analytics-service",
    "credit-engine"
  ]

  enable_scan_on_push   = true
  image_retention_count = 10

  tags = var.tags
}

# ── Route53 ──────────────────────────────────────────────────────────────────
module "route53" {
  source = "./modules/route53"

  domain_name = var.domain_name
  environment = var.environment

  record_sets = {
    main = {
      name = ""
      type = "A"
      alias = {
        name                   = module.eks.load_balancer_hostname
        zone_id                = module.eks.load_balancer_zone_id
        evaluate_target_health = true
      }
    },
    api = {
      name = "api"
      type = "A"
      alias = {
        name                   = module.eks.load_balancer_hostname
        zone_id                = module.eks.load_balancer_zone_id
        evaluate_target_health = true
      }
    }
  }

  tags = var.tags
}

# ── Bastion ───────────────────────────────────────────────────────────────────
module "bastion" {
  source = "./modules/bastion"
  count  = var.enable_bastion ? 1 : 0

  vpc_id       = module.vpc.vpc_id
  subnet_id    = module.vpc.public_subnets[0]
  environment  = var.environment
  ssh_key_name = "finflow-${var.environment}"
  allowed_cidr = var.bastion_allowed_cidrs

  tags = var.tags
}

# ── CloudWatch / CloudTrail ──────────────────────────────────────────────────
module "cloudwatch_logging" {
  source         = "./modules/cloudwatch_logging"
  environment    = var.environment
  s3_bucket_name = "${var.cloudtrail_s3_bucket_name}-${var.environment}"
  tags           = var.tags
}

# ── Kubernetes Namespaces ────────────────────────────────────────────────────
resource "kubernetes_namespace" "finflow" {
  metadata {
    name = "finflow-${var.environment}"

    labels = {
      name        = "finflow-${var.environment}"
      environment = var.environment
    }
  }

  depends_on = [module.eks]
}

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"

    labels = {
      name        = "monitoring"
      environment = var.environment
    }
  }

  depends_on = [module.eks]
}

# ── Prometheus / Grafana via Helm ────────────────────────────────────────────
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "55.5.0"

  values = [
    file("${path.module}/helm-values/prometheus-values.yaml")
  ]

  timeout = 600

  depends_on = [kubernetes_namespace.monitoring, module.eks]
}
