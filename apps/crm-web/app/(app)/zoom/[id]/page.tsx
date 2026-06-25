'use client';

import { useParams } from 'next/navigation';
import { MeetingDetail } from '@/components/zoom/meeting-detail';

// Deep-link route for a single meeting — reuses the shared MeetingDetail
// (same component the dashboard renders in its right-side drawer).
export default function ZoomMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <MeetingDetail id={id} />;
}
