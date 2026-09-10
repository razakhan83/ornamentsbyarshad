'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { PAKISTAN_CITIES } from '@/lib/cities';

const ALLOWED_CITIES = Array.from(
  new Set([
    'Karachi',
    'Lahore',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Hyderabad',
    'Peshawar',
    'Quetta',
    'Gujranwala',
    'Sialkot',
    ...PAKISTAN_CITIES.map((c) => {
      const trimmed = c.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }),
  ])
);


export default function ManualCustomersClient() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  const [formData, setFormData] = useState({
    _id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    city: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/manual-customers?page=${page}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.items) {
        setCustomers(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      toast.error('Failed to fetch manual customers');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (customer = null) => {
    if (customer) {
      setFormData({
        _id: customer._id,
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || ''
      });
    } else {
      setFormData({ _id: '', name: '', phone: '', email: '', address: '', city: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const method = formData._id ? 'PUT' : 'POST';
      const url = formData._id ? `/api/admin/manual-customers/${formData._id}` : '/api/admin/manual-customers';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(formData._id ? 'Customer updated' : 'Customer created');
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        toast.error(data.error || 'Failed to save customer');
      }
    } catch (error) {
      toast.error('Error saving customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/manual-customers/${deleteId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Customer deleted');
        setDeleteId(null);
        fetchCustomers();
      } else {
        toast.error(data.error || 'Failed to delete customer');
      }
    } catch (error) {
      toast.error('Error deleting customer');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 border-b border-border/40 bg-card/40 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:p-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manual Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your offline and manual order customers.</p>
        </div>
        <Button onClick={() => openModal()} className="sm:w-auto" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="flex flex-1 flex-col p-4 lg:p-6 lg:px-8">
        <div className="mb-6 flex max-w-sm items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex-1 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Phone</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">City</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date Added</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-4"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-28 bg-muted rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="p-4 text-right"><div className="h-7 w-16 bg-muted rounded ml-auto animate-pulse" /></td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center text-muted-foreground text-xs">
                      No manual customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer._id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      <td className="p-4 align-middle font-medium text-foreground">{customer.name}</td>
                      <td className="p-4 align-middle font-mono text-xs">{customer.phone}</td>
                      <td className="p-4 align-middle text-muted-foreground">{customer.city || '—'}</td>
                      <td className="p-4 align-middle text-muted-foreground text-xs">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg cursor-pointer" onClick={() => openModal(customer)}>
                            <Edit className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer" onClick={() => setDeleteId(customer._id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <div className="flex items-center px-3 text-sm font-medium text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{formData._id ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
              <DialogDescription>
                {formData._id ? 'Update customer details.' : 'Add a new manual customer.'}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 py-4">
              <Field>
                <FieldLabel>Name *</FieldLabel>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </Field>
              <Field>
                <FieldLabel>Phone *</FieldLabel>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>City</FieldLabel>
                <Input
                  list="manual-customer-cities"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Select or type city..."
                />
                <datalist id="manual-customer-cities">
                  {ALLOWED_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Spinner className="mr-2 h-4 w-4" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Spinner className="mr-2 h-4 w-4" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
