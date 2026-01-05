-- CreateEnum
CREATE TYPE "property_status" AS ENUM ('PENDING', 'SCRAPING', 'ANALYZING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "location" TEXT,
    "address" TEXT,
    "coordinates" JSONB,
    "surface" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "peb" TEXT,
    "constructionYear" INTEGER,
    "photos" JSONB[],
    "roofEstimate" JSONB,
    "facadeEstimate" JSONB,
    "interiorAnalysis" JSONB,
    "workEstimate" JSONB,
    "aiScore" DOUBLE PRECISION,
    "aiAnalysis" JSONB,
    "rentabilityData" JSONB,
    "rentabilityRate" DOUBLE PRECISION,
    "nearbyServices" JSONB,
    "status" "property_status" NOT NULL DEFAULT 'PENDING',
    "customParams" JSONB,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "userNotes" TEXT,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_params" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notaryFeesPercent" DOUBLE PRECISION NOT NULL DEFAULT 12.5,
    "agencyFeesPercent" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "contingencyPercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "defaultRentPerSqm" DOUBLE PRECISION,
    "vacancyRate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "propertyTaxYearly" DOUBLE PRECISION NOT NULL DEFAULT 800.0,
    "insuranceYearly" DOUBLE PRECISION NOT NULL DEFAULT 400.0,
    "maintenancePercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "managementFeesPercent" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "renovationCostPerSqm" DOUBLE PRECISION,
    "defaultInterestRate" DOUBLE PRECISION,
    "defaultLoanDuration" INTEGER,
    "taxRegime" TEXT NOT NULL DEFAULT 'normal',
    "marginalTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "scoreWeights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculation_params_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_jobs" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scraping_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "properties_userId_createdAt_idx" ON "properties"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "properties_userId_status_idx" ON "properties"("userId", "status");

-- CreateIndex
CREATE INDEX "properties_userId_aiScore_idx" ON "properties"("userId", "aiScore");

-- CreateIndex
CREATE INDEX "properties_userId_rentabilityRate_idx" ON "properties"("userId", "rentabilityRate");

-- CreateIndex
CREATE INDEX "properties_sourceUrl_idx" ON "properties"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_params_userId_key" ON "calculation_params"("userId");

-- CreateIndex
CREATE INDEX "scraping_jobs_status_createdAt_idx" ON "scraping_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "scraping_jobs_propertyId_idx" ON "scraping_jobs"("propertyId");

-- CreateIndex
CREATE INDEX "api_usage_userId_createdAt_idx" ON "api_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "api_usage_service_createdAt_idx" ON "api_usage"("service", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_params" ADD CONSTRAINT "calculation_params_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

