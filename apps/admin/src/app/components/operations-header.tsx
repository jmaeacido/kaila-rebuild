import { AdminPageHeader } from "../../components/admin-page";

/** @deprecated Prefer AdminPageHeader — kept for gradual route migration. */
export function OperationsHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <AdminPageHeader
      actions={actions}
      description={description}
      eyebrow={eyebrow}
      title={title}
    />
  );
}
