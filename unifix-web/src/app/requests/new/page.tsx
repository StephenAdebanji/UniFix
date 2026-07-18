'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RequireAuth } from '@/components/RequireAuth';
import { Footer } from '@/components/Footer';
import { api, ApiError } from '@/lib/api';
import type { Category, RequestPriority } from '@/lib/types';

function NewRequestForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('MEDIUM');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let evidenceFileUrl: string | undefined;
      if (file) {
        const uploaded = await api.upload.evidence(file);
        evidenceFileUrl = uploaded.url;
      }
      const created = await api.requests.create({
        title,
        categoryId: Number(categoryId),
        priority,
        location,
        description,
        evidenceFileUrl,
      });
      router.push(`/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-xs tracking-widest text-gold">NEW SUBMISSION</p>
      <h1 className="mt-1 font-serif text-4xl text-navy">
        Report a maintenance issue
      </h1>
      <p className="mt-2 text-neutral-600">
        Give the facilities team what they need to fix it quickly. Attach a
        photo if it helps.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-lg border border-neutral-200 bg-white p-8"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary, e.g. 'Broken projector in LT-2'"
            className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="categoryId"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="categoryId"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="priority"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as RequestPriority)}
              className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="location"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Location <span className="text-red-500">*</span>
          </label>
          <input
            id="location"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Building, room number, floor…"
            className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-navy"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the fault, when it started, and any impact on classes or students."
            className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">
            Photo evidence (optional)
          </label>
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded border border-dashed border-neutral-300 py-8 text-center hover:border-gold">
            <span className="text-gold">⬆</span>
            <span className="font-medium">
              {file ? file.name : 'Attach a photo of the fault'}
            </span>
            <span className="text-xs text-neutral-500">
              JPG or PNG, up to 2 MB
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-neutral-200 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:border-gold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <RequireAuth roles={['STUDENT_STAFF']}>
      <Navbar />
      <NewRequestForm />
      <Footer />
    </RequireAuth>
  );
}
