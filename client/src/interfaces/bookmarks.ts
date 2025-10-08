// TODO: Define proper types based on the actual bookmark API response
export interface Bookmark {
  id: number;
  position: number;
  note?: string;
  insertTime: string;
}

export interface BookmarkPositional{
    consumableId: string
    type: string
    position: number
    kidsMode: boolean
    updatedTime: string
    locator?: string
}
