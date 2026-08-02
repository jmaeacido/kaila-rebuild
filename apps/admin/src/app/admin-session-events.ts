export const adminAuthenticatedEvent = "kaila:admin-authenticated";
export const adminSignedOutEvent = "kaila:admin-signed-out";

export function notifyAdminAuthenticated(): void {
  window.dispatchEvent(new Event(adminAuthenticatedEvent));
}

export function notifyAdminSignedOut(): void {
  window.dispatchEvent(new Event(adminSignedOutEvent));
}
