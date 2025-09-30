// TODO: Define proper types based on the actual chapter API response
export interface Chapter {
  number?: number;
  title: string;
  durationInSeconds: number;
  start: number;
  end: number;
}