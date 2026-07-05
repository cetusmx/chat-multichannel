-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE INDEX "group_vendors_group_id_idx" ON "group_vendors"("group_id");

-- CreateIndex
CREATE INDEX "group_vendors_user_id_idx" ON "group_vendors"("user_id");

-- CreateIndex
CREATE INDEX "groups_branch_id_idx" ON "groups"("branch_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
