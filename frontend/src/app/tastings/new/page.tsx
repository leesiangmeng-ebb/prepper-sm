'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCreateTastingSession } from '@/lib/hooks/useTastings';
import { PageHeader, Button, Input, Textarea } from '@/components/ui';

export default function NewTastingSessionPage() {
  const router = useRouter();
  const createSession = useCreateTastingSession();

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [attendeesText, setAttendeesText] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !date) return;

    const attendees = attendeesText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    try {
      const session = await createSession.mutateAsync({
        name: name.trim(),
        date,
        location: location.trim() || null,
        attendees: attendees.length > 0 ? attendees : null,
        notes: notes.trim() || null,
      });

      router.push(`/tastings/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/tastings"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tasting Sessions
          </Link>
        </div>

        <PageHeader
          title="New Tasting Session"
          description="Create a new session to track recipe tastings and feedback"
        />

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Session Name *
            </label>
            <Input
              id="name"
              placeholder="e.g., December Menu Tasting"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Date *
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Location
            </label>
            <Input
              id="location"
              placeholder="e.g., Main Kitchen"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="attendees"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Attendees
            </label>
            <Input
              id="attendees"
              placeholder="e.g., Chef Marco, Sarah, James (comma-separated)"
              value={attendeesText}
              onChange={(e) => setAttendeesText(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Separate multiple names with commas
            </p>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Session Notes
            </label>
            <Textarea
              id="notes"
              placeholder="Any general notes about this tasting session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" disabled={!name.trim() || !date || createSession.isPending}>
              {createSession.isPending ? 'Creating...' : 'Create Session'}
            </Button>
            <Link href="/tastings">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
