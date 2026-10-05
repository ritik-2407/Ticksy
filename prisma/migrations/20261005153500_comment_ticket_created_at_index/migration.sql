-- Thread reads are WHERE ticketId = X ORDER BY createdAt.
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt");
