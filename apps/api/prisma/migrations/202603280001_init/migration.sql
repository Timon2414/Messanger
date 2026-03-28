-- Initial schema generated for Dasheu Chat
CREATE TYPE "AppRole" AS ENUM ('owner', 'superadmin', 'moderator', 'support', 'user');
CREATE TYPE "ChatType" AS ENUM ('direct', 'group', 'channel');
CREATE TYPE "ChatMemberRole" AS ENUM ('owner', 'admin', 'member', 'subscriber');
CREATE TYPE "ReceiptStatus" AS ENUM ('sent', 'delivered', 'read');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "AppRole" NOT NULL DEFAULT 'user',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE "UserProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "refreshTokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "deviceName" TEXT,
  "expiresAt" TIMESTAMP NOT NULL,
  "revokedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE TABLE "Chat" (
  "id" TEXT PRIMARY KEY,
  "type" "ChatType" NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "avatarUrl" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "isDisabled" BOOLEAN NOT NULL DEFAULT false,
  "pinnedMessageId" TEXT,
  "lastMessageAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "Chat_lastMessageAt_idx" ON "Chat"("lastMessageAt");

CREATE TABLE "ChatMember" (
  "id" TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "ChatMemberRole" NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "mutedUntil" TIMESTAMP,
  "draftText" TEXT,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  UNIQUE("chatId", "userId")
);
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");

CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "text" TEXT,
  "replyToMessageId" TEXT,
  "forwardedFromId" TEXT,
  "deletedForAllAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");

CREATE TABLE "MessageEditHistory" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "editorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "previousText" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "MessageEditHistory_messageId_idx" ON "MessageEditHistory"("messageId");

CREATE TABLE "MessageReceipt" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "status" "ReceiptStatus" NOT NULL DEFAULT 'sent',
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("messageId", "userId")
);

CREATE TABLE "Reaction" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE("messageId", "userId", "emoji")
);

CREATE TABLE "Attachment" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL REFERENCES "Message"("id") ON DELETE CASCADE,
  "uploadedById" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "NotificationSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "NotificationSubscription_userId_idx" ON "NotificationSubscription"("userId");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "targetUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE "Report" (
  "id" TEXT PRIMARY KEY,
  "reporterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "targetUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "targetChatId" TEXT,
  "targetMessageId" TEXT,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "resolvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "Report_resolvedAt_idx" ON "Report"("resolvedAt");

CREATE TABLE "AppSetting" (
  "key" TEXT PRIMARY KEY,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
