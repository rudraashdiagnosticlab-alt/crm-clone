import { ModulePage } from '@/components/module-page';

export default function AiCoachingPage() {
  return (
    <ModulePage
      code="AVC"
      summary="AI voice coaching: post-call recording analysis scoring confidence, speaking speed, objection handling, and missed opportunities, with weekly reports."
      groups={[
        {
          category: 'AI Voice Coaching',
          items: [
            { id: 'AVC-001', name: 'Call Recording Analysis', desc: 'Analyze recordings within 5 minutes of call end.', priority: 'Medium' },
            { id: 'AVC-002', name: 'Confidence Level Analysis', desc: 'Confidence score 1–10 from tone and speech patterns.', priority: 'Medium' },
            { id: 'AVC-003', name: 'Speaking Speed Analysis', desc: 'Words-per-minute rating: Too Fast / Optimal / Too Slow.', priority: 'Medium' },
            { id: 'AVC-004', name: 'Objection Handling Score', desc: 'Timestamped objections rated Good / Needs Improvement.', priority: 'Medium' },
            { id: 'AVC-005', name: 'Missed Opportunities', desc: 'Flags upsell/qualify/close moments with suggestions.', priority: 'Medium' },
            { id: 'AVC-006', name: 'Coaching Report per Caller', desc: 'Weekly per-caller report with trend vs previous week.', priority: 'Medium' },
          ],
        },
      ]}
    />
  );
}
