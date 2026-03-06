// ---------------------------------------------------------------------------
// BookshelfPanel — Lessons & Knowledge Browser (furniture panel)
// Renders when the user clicks the bookshelf furniture in the office.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboard-store';
import { API_BASE } from '@/lib/api';
import {
  PARCHMENT, PIXEL_CARD, SectionHeader, ParchmentDivider, renderBriefMarkdown,
} from './panelUtils';

// ---------------------------------------------------------------------------
// Fallback lesson list when store has no data
// ---------------------------------------------------------------------------

const KNOWN_LESSONS: LessonEntry[] = [
  { id: 'orchestration', title: 'Orchestration Patterns', filePath: '.context/lessons/orchestration.md', contentSummary: 'Pipeline design, agent casting, wave execution' },
  { id: 'agent-behavior', title: 'Agent Behavior', filePath: '.context/lessons/agent-behavior.md', contentSummary: 'How agents work, common pitfalls, delegation rules' },
  { id: 'review-quality', title: 'Review Quality', filePath: '.context/lessons/review-quality.md', contentSummary: 'Code review standards, DOD verification, review failures' },
  { id: 'skill-design', title: 'Skill Design', filePath: '.context/lessons/skill-design.md', contentSummary: 'Skill structure, prompt design, routing rules' },
  { id: 'state-management', title: 'State Management', filePath: '.context/lessons/state-management.md', contentSummary: 'Dashboard state, directive JSON, context tree' },
  { id: 'scenarios', title: 'Scenarios', filePath: '.context/lessons/scenarios.md', contentSummary: 'Walkthrough scenarios and real-world failure cases' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LessonEntry {
  id: string;
  title: string;
  filePath: string;
  contentSummary?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookshelfPanel() {
  const storeLessons = useDashboardStore((s) => s.workState?.conductor?.lessons);

  const lessons: LessonEntry[] = storeLessons && storeLessons.length > 0
    ? storeLessons
    : [...KNOWN_LESSONS];

  const [selectedLesson, setSelectedLesson] = useState<LessonEntry | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Fetch content when a lesson is selected
  const fetchContent = useCallback((lesson: LessonEntry) => {
    setLoading(true);
    setContent(null);
    setFetchError(false);

    fetch(`${API_BASE}/api/state/artifact-content?path=${encodeURIComponent(lesson.filePath)}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Failed to load'))))
      .then((text) => setContent(text))
      .catch(() => { setContent(null); setFetchError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedLesson) {
      setContent(null);
      setFetchError(false);
      return;
    }
    fetchContent(selectedLesson);
  }, [selectedLesson, fetchContent]);

  const handleBack = useCallback(() => {
    setSelectedLesson(null);
  }, []);

  // -- Empty state --
  if (lessons.length === 0) {
    return (
      <div className="text-center py-8 font-mono" style={PIXEL_CARD}>
        <BookOpen
          className="h-6 w-6 mx-auto mb-2"
          style={{ color: PARCHMENT.textDim, opacity: 0.4 }}
          aria-hidden="true"
        />
        <p className="text-xs font-bold" style={{ color: PARCHMENT.text }}>
          No knowledge captured yet
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: PARCHMENT.textDim }}>
          Lessons will appear here as the team learns
        </p>
      </div>
    );
  }

  // -- Detail view --
  if (selectedLesson) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-[11px] font-mono font-bold cursor-pointer
                     px-1.5 py-0.5 rounded-sm transition-colors"
          style={{
            color: PARCHMENT.text,
            backgroundColor: 'transparent',
            border: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = PARCHMENT.card;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to topics
        </button>

        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3 w-3 shrink-0" style={{ color: PARCHMENT.text }} />
          <span
            className="text-xs font-bold font-mono truncate"
            style={{ color: PARCHMENT.text }}
          >
            {selectedLesson.title}
          </span>
        </div>

        <ParchmentDivider />

        {loading && (
          <div
            className="flex items-center gap-2 text-xs py-4 font-mono justify-center"
            style={{ color: PARCHMENT.textDim }}
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading lesson...
          </div>
        )}

        {!loading && content && (
          <div
            className="max-h-[500px] overflow-y-auto p-2"
            style={PIXEL_CARD}
          >
            {renderBriefMarkdown(content, 500)}
          </div>
        )}

        {!loading && fetchError && (
          <div className="text-center py-4 font-mono" style={PIXEL_CARD}>
            <p className="text-xs" style={{ color: PARCHMENT.textDim }}>
              Could not load lesson content.
            </p>
            <button
              onClick={() => selectedLesson && fetchContent(selectedLesson)}
              className="flex items-center gap-1 mx-auto mt-2 text-[10px] font-bold font-mono px-2 py-1 cursor-pointer transition-colors"
              style={{
                color: PARCHMENT.text,
                backgroundColor: PARCHMENT.card,
                borderRadius: '2px',
                border: `1px solid ${PARCHMENT.border}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = PARCHMENT.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = PARCHMENT.card;
              }}
            >
              <RefreshCw className="h-2.5 w-2.5" />
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // -- List view --
  return (
    <div className="space-y-2">
      <SectionHeader icon={<BookOpen className="h-3 w-3" />} count={lessons.length}>
        Knowledge Base
      </SectionHeader>

      <div className="space-y-1">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => setSelectedLesson(lesson)}
            className="flex items-center gap-2 w-full text-left px-2 py-1.5
                       cursor-pointer font-mono rounded-sm"
            style={{
              ...PIXEL_CARD,
              color: PARCHMENT.text,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = PARCHMENT.cardHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = PARCHMENT.card;
            }}
          >
            <BookOpen
              className="h-3 w-3 shrink-0"
              style={{ color: PARCHMENT.accent }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium truncate block">
                {lesson.title}
              </span>
              {lesson.contentSummary && (
                <span
                  className="text-[10px] truncate block mt-0.5"
                  style={{ color: PARCHMENT.textDim }}
                >
                  {lesson.contentSummary}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
