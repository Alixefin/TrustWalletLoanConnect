-- CreateTable
CREATE TABLE "wallet_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletAddress" TEXT NOT NULL,
    "connectedWalletName" TEXT,
    "chainId" INTEGER NOT NULL,
    "chainName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "domain" TEXT,
    "userAgent" TEXT,
    "nativeBalanceEth" TEXT,
    "tokens" JSONB,
    "nftsDetected" BOOLEAN NOT NULL DEFAULT false,
    "totalWalletValueUsd" TEXT,
    "mostExpensiveTokenSymbol" TEXT,
    "mostExpensiveTokenValueUsd" TEXT,
    "mostExpensiveTokenContractAddress" TEXT,
    "mostExpensiveTokenChainName" TEXT,

    CONSTRAINT "wallet_logs_pkey" PRIMARY KEY ("id")
);
