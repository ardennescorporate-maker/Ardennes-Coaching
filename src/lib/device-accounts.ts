/** "Accounts on this device": non-sensitive list kept in local storage for quick switching. */
export type DeviceAccount = { email: string; username: string; avatarColour: string };
const KEY = "sp-device-accounts";
const EMPTY: DeviceAccount[] = [];
let snapshot: DeviceAccount[] | null = null;
const listeners = new Set<() => void>();

function load(): DeviceAccount[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.slice(0, 5) : EMPTY;
  } catch {
    return EMPTY;
  }
}
function save(list: DeviceAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  snapshot = list;
  listeners.forEach((l) => l());
}

export const deviceAccountsStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot: () => (snapshot ??= load()),
  getServerSnapshot: () => EMPTY,
};

export function rememberDeviceAccount(a: DeviceAccount) {
  save([a, ...deviceAccountsStore.getSnapshot().filter((x) => x.email !== a.email)].slice(0, 5));
}
export function forgetDeviceAccount(email: string) {
  save(deviceAccountsStore.getSnapshot().filter((x) => x.email !== email));
}
