// Feature gate check based on subscription plan
export function canUseFeature(plan: string, feature: string): boolean {
  const featureMatrix: Record<string, Record<string, boolean>> = {
    free: {
      kanbanview: false, exportJson: false, crmFeatures: false,
      advancedFilters: false, teamManagement: false, apiAccess: false,
      customAiScoring: false, prioritySupport: false, sso: false,
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, tableview: true, cardview: true,
      mapview: true, analyticsView: true,
    },
    starter: {
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, exportJson: true, tableview: true, cardview: true,
      kanbanview: true, mapview: true, analyticsView: true,
      crmFeatures: true, advancedFilters: true, teamManagement: true,
      apiAccess: false, customAiScoring: false, prioritySupport: false, sso: false,
    },
    professional: {
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, exportJson: true, tableview: true, cardview: true,
      kanbanview: true, mapview: true, analyticsView: true,
      crmFeatures: true, advancedFilters: true, teamManagement: true,
      apiAccess: true, customAiScoring: true, prioritySupport: true, sso: false,
    },
    enterprise: {
      discovery: true, aiScoring: true, aiOutreach: true,
      exportCsv: true, exportJson: true, tableview: true, cardview: true,
      kanbanview: true, mapview: true, analyticsView: true,
      crmFeatures: true, advancedFilters: true, teamManagement: true,
      apiAccess: true, customAiScoring: true, prioritySupport: true, sso: true,
    },
  };

  return featureMatrix[plan]?.[feature] ?? false;
}