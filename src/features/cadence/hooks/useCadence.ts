import { useQuery } from '@tanstack/react-query';
import {
  cadenceApi,
  type CadenceRunDTO,
  type CadenceRunStatus,
  type CadenceSequenceDTO,
  type OptOutRecordDTO,
} from '../cadence.api';
import type { CadenceJourneyTemplate } from '../domain/cadenceTemplates';

export function useOptOuts() {
  return useQuery<OptOutRecordDTO[]>({
    queryKey: ['cadence', 'optOuts'],
    queryFn: () => cadenceApi.optOuts(),
  });
}

export function useCadenceRuns(statusFilter: Set<CadenceRunStatus>) {
  return useQuery<CadenceRunDTO[]>({
    queryKey: ['cadence', 'runs', Array.from(statusFilter)],
    queryFn: () => cadenceApi.runs(statusFilter.size > 0 ? Array.from(statusFilter) : undefined),
  });
}

export function useCadenceSequences() {
  return useQuery<CadenceSequenceDTO[]>({
    queryKey: ['cadence', 'sequences'],
    queryFn: () => cadenceApi.sequences(),
  });
}

export function useCadenceJourneyTemplates() {
  return useQuery<CadenceJourneyTemplate[]>({
    queryKey: ['cadence', 'templates'],
    queryFn: () => cadenceApi.templates(),
  });
}
