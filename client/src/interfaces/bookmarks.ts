// TODO: Define proper types based on the actual bookmark API response
export interface Bookmark {
  id: number;
  position: number;
  note?: string;
  insertTime: string;
}