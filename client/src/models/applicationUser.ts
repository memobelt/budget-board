export interface IApplicationUserResponse {
  id: string;
  simpleFinAccessToken: boolean;
  lunchFlowApiKey: boolean;
  lastSync: Date;
  /** Synced transactions added after this time are shown as new. */
  newTransactionsSince: string;
  /** Problems from the most recent SimpleFIN connection; empty when it succeeded. */
  simpleFinConnectionErrors: string[];
  /** When (UTC) the current SimpleFIN connection problem was first seen. */
  simpleFinConnectionErrorDate: string | null;
  twoFactorEnabled: boolean;
  hasOidcLogin: boolean;
  hasLocalLogin: boolean;
}

export interface IApplicationUserVisitResponse {
  /** Synced transactions added after this time are shown as new. */
  newTransactionsSince: string;
}

export const defaultGuid: string = "00000000-0000-0000-0000-000000000000";
