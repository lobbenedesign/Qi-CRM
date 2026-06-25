import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repo } from '../lib/repo';
import { useCompaniesStore } from '../store/companiesStore';
import { logAudit } from '../lib/audit';
import type { Company } from '../types/crm';

const COMPANIES_KEY = ['companies'];

export function useCompanies() {
  const { setCompanies, setLoading } = useCompaniesStore();

  return useQuery({
    queryKey: COMPANIES_KEY,
    queryFn: async () => {
      setLoading(true);
      const companies = (await repo.listCompanies()) as Company[];
      setCompanies(companies);
      setLoading(false);
      return companies;
    },
    staleTime: 60_000,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (company: Partial<Company>) => repo.createCompany(company),
    onSuccess: (created) => {
      logAudit('create', 'company', created.name);
      qc.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  const { updateCompany } = useCompaniesStore();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Company> }) =>
      repo.updateCompany(id, patch),
    onMutate: ({ id, patch }) => updateCompany(id, patch),
    onSuccess: (updated) => logAudit('update', 'company', updated.name),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: COMPANIES_KEY });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  const { removeCompany } = useCompaniesStore();

  return useMutation({
    mutationFn: async (id: string) => repo.deleteCompany(id),
    onMutate: (id) => {
      const c = useCompaniesStore.getState().companies.find((x) => x.id === id);
      removeCompany(id);
      logAudit('delete', 'company', c?.name ?? 'Azienda');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: COMPANIES_KEY }),
  });
}
