import { EmbassyLayout } from '@/components/layout/EmbassyLayout';
import { CriminalRecordsManager } from '@/components/common/CriminalRecordsManager';

export function EmbassyCriminalRecords() {
  return (
    <EmbassyLayout title="Criminal Records" subtitle="Consular management of criminal cases involving Nigerian citizens in Vietnam">
      <CriminalRecordsManager />
    </EmbassyLayout>
  );
}
