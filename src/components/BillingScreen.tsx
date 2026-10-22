/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Workspace, PlanTier, User as UserType } from '../types';
import { PLAN_CONFIGS } from '../data/seedData';
import { Check, ShieldCheck, Zap, ArrowRight, AlertCircle } from 'lucide-react';

interface BillingScreenProps {
  workspace: Workspace | null;
  currentUser: UserType | null;
  onUpgradePlan: (tier: PlanTier) => Promise<void>;
  currentTaskCount: number;
  currentMemberCount: number;
}

export const BillingScreen: React.FC<BillingScreenProps> = ({
  workspace,
  currentUser,
  onUpgradePlan,
  currentTaskCount,
  currentMemberCount,
}) => {
  const [switchingTier, setSwitchingTier] = useState<PlanTier | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = currentUser?.id === workspace?.ownerId;

  const handlePlanSwitch = async (tier: PlanTier) => {
    if (!workspace) return;
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!isOwner) {
      setErrorMessage('Forbidden: Only the workspace Owner can change subscription tiers.');
      return;
    }

    try {
      setSwitchingTier(tier);
      await onUpgradePlan(tier);
      setSuccessMessage(`Workspace successfully shifted to ${PLAN_CONFIGS[tier].name} tier.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update plan tier');
    } finally {
      setSwitchingTier(null);
    }
  };

  const planTiers: PlanTier[] = ['starter', 'growth', 'scale'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Tenant Quota & Billing Simulation</span>
          <span aria-hidden="true">·</span>
          <span>SaaS Tier Provisioning</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Subscription Plans & Quota Limits
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Simulate self-serve subscription upgrades and real-time quota limit enforcement for {workspace?.name}.
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Current Quota Consumption Overview */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Active Tenant Limits ({workspace?.id})
          </div>
          <div className="text-2xl font-bold mt-1">
            Current Tier: {workspace?.planTier.toUpperCase()}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Tasks: <span className="font-mono tabular-nums text-white font-bold">{currentTaskCount}</span> / {workspace?.taskLimit} max · Members: <span className="font-mono tabular-nums text-white font-bold">{currentMemberCount}</span> / {workspace?.memberLimit} max
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-300 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div>
            <div className="text-slate-400 text-[11px]">Task Utilization</div>
            <div className="text-lg font-bold text-white tabular-nums">
              {workspace ? Math.round((currentTaskCount / workspace.taskLimit) * 100) : 0}%
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Member Capacity</div>
            <div className="text-lg font-bold text-white tabular-nums">
              {workspace ? Math.round((currentMemberCount / workspace.memberLimit) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planTiers.map((tierKey) => {
          const plan = PLAN_CONFIGS[tierKey];
          const isCurrent = workspace?.planTier === tierKey;

          return (
            <div
              key={tierKey}
              className={`bg-white rounded-xl border p-6 flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-slate-900 ring-2 ring-slate-900 shadow-md'
                  : 'border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 min-h-[32px] mb-4">
                  {plan.targetAudience}
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-1 mb-6 pb-4 border-b border-slate-100">
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    ${plan.priceMonthly}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/month</span>
                </div>

                {/* Limits & Features list (Concrete values, not vague checkmarks) */}
                <div className="space-y-2.5 text-xs text-slate-600 mb-6">
                  <div className="font-semibold text-slate-800 text-xs mb-1">
                    Definitive Quotas:
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Max <strong className="font-mono tabular-nums text-slate-900">{plan.taskLimit}</strong> active tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Max <strong className="font-mono tabular-nums text-slate-900">{plan.memberLimit}</strong> team seats
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 font-semibold text-slate-800 text-xs mb-1">
                    Features Included:
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-600 text-xs">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  disabled={isCurrent || switchingTier === tierKey}
                  onClick={() => handlePlanSwitch(tierKey)}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {switchingTier === tierKey ? (
                    'Updating Quota...'
                  ) : isCurrent ? (
                    'Active Plan'
                  ) : (
                    <>
                      <span>Simulate Switch to {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
