import { ReviewPortal } from "../../components/ReviewPortal";

export default async function ReviewPage({
  params,
  searchParams
}: {
  params: Promise<{ reviewRequestId: string }>;
  searchParams: Promise<{ reviewer?: string }>;
}) {
  const [{ reviewRequestId }, query] = await Promise.all([params, searchParams]);
  return <ReviewPortal requestId={reviewRequestId} reviewerId={query.reviewer ?? ""} />;
}

