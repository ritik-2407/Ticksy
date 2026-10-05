-- One name per workspace. "bug" may exist in Acme and in Nova,
-- but not twice inside Acme. Also indexes workspaceId for label lists.
CREATE UNIQUE INDEX "Label_workspaceId_name_key" ON "Label"("workspaceId", "name");
