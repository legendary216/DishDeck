import React, { createContext, useState, useContext } from 'react';

const PlanContext = createContext<any>(null);

export const PlanProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalPlans, setGlobalPlans] = useState({ today: null, tomorrow: null });

  return (
    <PlanContext.Provider value={{ globalPlans, setGlobalPlans }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);