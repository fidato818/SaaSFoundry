/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Workspace, WorkspaceMember, User as UserType } from '../types';
import { Users, UserPlus, Shield, ShieldCheck, Mail, AlertCircle, X, Check } from 'lucide-react';

interface MembersScreenProps {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  currentUser: UserType | null;
  onInviteMember: (email: string, role: 'owner' | 'member') => Promise<void>;
}

export const MembersScreen: React.FC<MembersScreenProps> = ({
  workspace,
  members,
  currentUser,
  onInviteMember,
}) => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUser?.id === workspace?.ownerId;
  const isAtQuota = workspace ? members.length >= workspace.memberLimit : false;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      await onInviteMember(email.trim(), role);
      setEmail('');
      setRole('member');
      setIsInviteOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Access Control & Multi-Tenancy</span>
            <span aria-hidden="true">·</span>
            <span>Role-Based Access (Owner vs Member)</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Team Members in {workspace?.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setError(null);
              setIsInviteOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Permission Callout */}
      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Member Access Level</span>
            You are currently signed in as a Member. Only Workspace Owners have permission to invite new members or modify team roles.
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Active Members ({members.length} / {workspace?.memberLimit} seats)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Tier limit: {workspace?.memberLimit}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => {
                const isMemberOwner = member.role === 'owner';
                const isCurrentUser = member.userId === currentUser?.id;

                return (
                  <tr key={member.userId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                          {member.user?.displayName?.charAt(0) || member.userId.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {member.user?.displayName || member.userId}
                            {isCurrentUser && (
                              <span className="text-slate-400 font-normal ml-1.5">(You)</span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{member.userId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {member.user?.email || `${member.userId}@saasfoundry.io`}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 capitalize">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {isMemberOwner ? (
                        <span className="text-slate-700 font-medium">Full Admin & Billing</span>
                      ) : (
                        <span>Task CRUD & Status update</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Invite Workspace Member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              {isAtQuota && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  Seat quota limit reached ({workspace?.memberLimit}). Upgrading plan required for more seats.
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'owner' | 'member')}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="member">Member (View & Update assigned tasks)</option>
                  <option value="owner">Owner (Full admin rights & invite control)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
