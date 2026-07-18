-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "current_assignee_id" INTEGER;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_current_assignee_id_fkey" FOREIGN KEY ("current_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
