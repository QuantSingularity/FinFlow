.PHONY: help build up down restart logs ps clean test lint \
        build-infra build-ts build-py shell-auth shell-payments \
        migrate seed

# ── Variables ──────────────────────────────────────────────────
COMPOSE      := docker compose
COMPOSE_DEV  := $(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml
COMPOSE_PROD := $(COMPOSE) -f docker-compose.yml

# ── Help ───────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  FinFlow Backend — Available Commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make up           Start all services (dev mode)"
	@echo "  make up-prod      Start all services (production)"
	@echo "  make down         Stop all services"
	@echo "  make restart      Restart all services"
	@echo "  make build        Build all Docker images"
	@echo "  make logs         Tail all logs"
	@echo "  make logs s=auth-service    Tail a specific service"
	@echo "  make ps           Show running containers"
	@echo "  make clean        Remove containers, volumes, images"
	@echo "  make lint         Lint all TypeScript services"
	@echo "  make test         Run all tests"
	@echo "  make shell s=auth-service   Shell into a service"
	@echo "  make migrate      Run database migrations"
	@echo ""

# ── Core ───────────────────────────────────────────────────────
up:
	@cp -n .env.example .env 2>/dev/null || true
	$(COMPOSE_DEV) up -d
	@echo ""
	@echo "  Services started. Gateway: http://localhost:80"
	@echo "  Kafka UI: http://localhost:9090"
	@echo ""

up-prod:
	$(COMPOSE_PROD) up -d

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

build:
	$(COMPOSE) build --parallel

build-infra:
	$(COMPOSE) up -d postgres redis zookeeper kafka

build-ts:
	$(COMPOSE) build auth-service payments-service accounting-service analytics-service

build-py:
	$(COMPOSE) build credit-engine transaction-service-py ai-features-service compliance-service tax-automation

logs:
ifdef s
	$(COMPOSE) logs -f $(s)
else
	$(COMPOSE) logs -f
endif

ps:
	$(COMPOSE) ps

clean:
	$(COMPOSE) down -v --rmi local --remove-orphans

# ── Development ────────────────────────────────────────────────
shell:
ifdef s
	$(COMPOSE) exec $(s) sh
else
	@echo "Usage: make shell s=<service-name>"
endif

migrate:
	@echo "Running Prisma migrations..."
	$(COMPOSE) exec auth-service npx prisma migrate deploy
	$(COMPOSE) exec payments-service npx prisma migrate deploy
	$(COMPOSE) exec accounting-service npx prisma migrate deploy
	$(COMPOSE) exec analytics-service npx prisma migrate deploy

seed:
	@echo "Seeding database..."
	$(COMPOSE) exec auth-service npx prisma db seed

# ── Quality ────────────────────────────────────────────────────
lint:
	$(COMPOSE) exec auth-service npm run lint
	$(COMPOSE) exec payments-service npm run lint
	$(COMPOSE) exec accounting-service npm run lint
	$(COMPOSE) exec analytics-service npm run lint

test:
	$(COMPOSE) exec auth-service npm test
	$(COMPOSE) exec payments-service npm test
	$(COMPOSE) exec accounting-service npm test
	$(COMPOSE) exec analytics-service npm test
	$(COMPOSE) exec credit-engine python -m pytest tests/ -v
	$(COMPOSE) exec transaction-service-py python -m pytest tests/ -v
