export default interface userDto {
  uuid: string;
  id: number;
  email: string;
  inbox: number | null;
  friends?: number[];
}