import { useQuery } from '@tanstack/react-query';
import { cadenceApi, type CadenceRunStatus } from '../cadence.api';

export function useOptOuts() {
  return useQuery({
    queryKey: ['cadence', 'optOuts'],
    queryFn: () => cadenceApi.optOuts(),
  });
}

export function useCadenceRuns(statusFilter: Set<CadenceRunStatus>) {
  return useQuery({
    queryKey: ['cadence', 'runs', Array.from(statusFilter)],
    queryFn: () => cadenceApi.runs(statusFilter.size > 0 ? Array.from(statusFilter) : undefined),
  });
}

export function useCadenceSequences() {
  return useQuery({
    queryKey: ['cadence', 'sequences'],
    queryFn: () => cadenceApi.sequences(),
  });
}

export function useCadenceJourneyTemplates() {
  return useQuery({
    queryKey: ['cadence', 'templates'],
    queryFn: () => cadenceApi.templates(),
  });
}
