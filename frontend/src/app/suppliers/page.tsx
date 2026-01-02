'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useSuppliers, useCreateSupplier } from '@/lib/hooks';
import { PageHeader, SearchInput, Button, Skeleton, Input, Card, CardHeader, CardTitle } from '@/components/ui';
import { toast } from 'sonner';
import type { Supplier } from '@/types';

function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex-1 min-w-0">
          <CardTitle className="truncate">{supplier.name}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}

function NewSupplierForm({ onClose }: { onClose: () => void }) {
  const createSupplier = useCreateSupplier();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    createSupplier.mutate(
      {
        name: name.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Supplier created');
          onClose();
        },
        onError: () => toast.error('Failed to create supplier'),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Supplier Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter supplier name"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createSupplier.isPending}>
          Add Supplier
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function SuppliersPage() {
  const { data: suppliers, isLoading, error } = useSuppliers();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];

    return suppliers.filter((supplier) => {
      if (search && !supplier.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [suppliers, search]);

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4 text-red-600 dark:text-red-400">
          Failed to load suppliers. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Suppliers"
          description="Manage your ingredient suppliers"
        >
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Supplier</span>
          </Button>
        </PageHeader>

        {showForm && (
          <div className="w-full d-flex justify-items-end">
            <div className="w-fit mb-3">
              <NewSupplierForm onClose={() => setShowForm(false)} />
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSuppliers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 dark:text-zinc-400">
              {search ? 'No suppliers match your search' : 'No suppliers yet'}
            </p>
          </div>
        )}

        {/* Suppliers List */}
        {!isLoading && filteredSuppliers.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSuppliers.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
