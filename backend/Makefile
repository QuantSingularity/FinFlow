.PHONY: install test build lint clean

## Install all dependencies (single root node_modules)
install:
	npm install

## Run all tests across all services
test:
	npm run test --workspaces --if-present

## Run tests for a specific service
test-%:
	npm run test --workspace=$*

## Build all services
build:
	npm run build --workspaces --if-present

## Lint all services
lint:
	npm run lint --workspaces --if-present

## Clean all build artifacts
clean:
	find . -name "dist" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.js.map" -not -path "./node_modules/*" -delete 2>/dev/null || true

## Start all services in dev mode (requires docker-compose for infra)
dev:
	docker-compose -f docker-compose.yml -f docker-compose.override.yml up

## Stop all services
stop:
	docker-compose down

## Run database migrations
migrate:
	npx prisma migrate deploy

## Generate Prisma client
prisma-generate:
	npx prisma generate
