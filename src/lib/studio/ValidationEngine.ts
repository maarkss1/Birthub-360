
export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export const validationEngine = {
  validate: (nodes: any[], edges: any[]): ValidationResult => {
    return {
      isValid: true,
      issues: []
    };
  }
};

