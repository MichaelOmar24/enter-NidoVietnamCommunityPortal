import { AdminLayout } from '@/components/layout/AdminLayout';
import { CriminalRecordsManager } from '@/components/common/CriminalRecordsManager';

export function AdminCriminalRecords() {
  return (
    <AdminLayout title="Criminal Records">
      <CriminalRecordsManager />
    </AdminLayout>
  );
}
