-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tenantId" TEXT,
    "inviteToken" TEXT,
    "inviteExpiry" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "leagueName" TEXT NOT NULL DEFAULT 'IPL',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "capacityApprox" INTEGER,
    "pitchTags" JSONB,
    "boundaryAvgMeters" REAL,
    "dewFactor" REAL NOT NULL DEFAULT 0.5,
    "homeAdvantageNotes" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "displayName" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "primaryColor" TEXT,
    "logoUrl" TEXT,
    "city" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cricsheetId" TEXT,
    "espnId" TEXT,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "dob" DATETIME,
    "nationality" TEXT NOT NULL DEFAULT 'India',
    "isOverseas" BOOLEAN NOT NULL DEFAULT false,
    "battingStyle" TEXT NOT NULL,
    "bowlingStyle" TEXT NOT NULL,
    "primaryRole" TEXT NOT NULL,
    "fieldingRole" TEXT NOT NULL DEFAULT 'OUTFIELDER',
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SquadMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "contractType" TEXT,
    "basePrice" REAL,
    "soldPrice" REAL,
    "isRetained" BOOLEAN NOT NULL DEFAULT false,
    "squadNumber" INTEGER,
    "joinedDate" DATETIME,
    "leftDate" DATETIME,
    "notes" TEXT,
    CONSTRAINT "SquadMembership_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SquadMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SquadMembership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "injuryNote" TEXT,
    "workloadFlag" TEXT NOT NULL DEFAULT 'NORMAL',
    "availableFrom" DATETIME,
    "lastUpdated" DATETIME NOT NULL,
    "updatedByUserId" TEXT,
    CONSTRAINT "PlayerAvailability_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "dateTime" DATETIME NOT NULL,
    "matchNumber" INTEGER,
    "phase" TEXT NOT NULL DEFAULT 'GROUP',
    "result" TEXT,
    "winnerTeamId" TEXT,
    "tossWinnerId" TEXT,
    "tossDecision" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "cricsheetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "pitchType" TEXT NOT NULL DEFAULT 'FLAT',
    "pitchCondition" TEXT NOT NULL DEFAULT 'FRESH',
    "weatherCondition" TEXT NOT NULL DEFAULT 'CLEAR',
    "dewLikelihood" TEXT NOT NULL DEFAULT 'LOW',
    "boundaryOverride" REAL,
    "pressureTag" TEXT NOT NULL DEFAULT 'NORMAL',
    "homeAdvantage" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchContext_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT,
    "teamId" TEXT,
    "venueId" TEXT,
    "opposingTeamId" TEXT,
    "inningsBatted" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "ballsFaced" INTEGER NOT NULL DEFAULT 0,
    "battingAvg" REAL,
    "strikeRate" REAL,
    "fifties" INTEGER NOT NULL DEFAULT 0,
    "hundreds" INTEGER NOT NULL DEFAULT 0,
    "dotBallPct" REAL,
    "inningsBowled" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "oversBowled" REAL NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "economy" REAL,
    "bowlingAvg" REAL,
    "bowlingStrikeRate" REAL,
    "phase" TEXT,
    "battingVsPace" REAL,
    "battingVsSpin" REAL,
    "recentFormScore" REAL,
    "factType" TEXT NOT NULL DEFAULT 'CAREER',
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceFact_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PerformanceFact_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triggeredByUserId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'rules_v1',
    "predictedXI" JSONB NOT NULL,
    "bench" JSONB NOT NULL,
    "constraintLog" JSONB NOT NULL,
    "featureWeights" JSONB NOT NULL,
    "collapseRisk" REAL,
    "collapseFactors" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelRun_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'cricsheet',
    "seasonYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRecords" INTEGER,
    "processedRecs" INTEGER,
    "errorLog" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Season_year_key" ON "Season"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Team_shortCode_key" ON "Team"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "Player_cricsheetId_key" ON "Player"("cricsheetId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadMembership_seasonId_teamId_playerId_key" ON "SquadMembership"("seasonId", "teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAvailability_seasonId_teamId_playerId_key" ON "PlayerAvailability"("seasonId", "teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_cricsheetId_key" ON "Match"("cricsheetId");

-- CreateIndex
CREATE INDEX "Match_seasonId_dateTime_idx" ON "Match"("seasonId", "dateTime");

-- CreateIndex
CREATE INDEX "Match_teamAId_teamBId_idx" ON "Match"("teamAId", "teamBId");

-- CreateIndex
CREATE INDEX "Match_venueId_idx" ON "Match"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchContext_matchId_key" ON "MatchContext"("matchId");

-- CreateIndex
CREATE INDEX "PerformanceFact_playerId_seasonId_idx" ON "PerformanceFact"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "PerformanceFact_playerId_venueId_idx" ON "PerformanceFact"("playerId", "venueId");

-- CreateIndex
CREATE INDEX "PerformanceFact_playerId_opposingTeamId_idx" ON "PerformanceFact"("playerId", "opposingTeamId");

-- CreateIndex
CREATE INDEX "ModelRun_matchId_createdAt_idx" ON "ModelRun"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "ModelRun_tenantId_createdAt_idx" ON "ModelRun"("tenantId", "createdAt");
