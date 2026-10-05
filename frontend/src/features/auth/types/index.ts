/** Where to go after login: the free check to save (?snapshot=) or the page that asked for login (?next=). */
export interface LoginTarget {
  snapshot?: string;
  next?: string;
}
