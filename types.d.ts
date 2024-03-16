export type UserModelType = {
  _id: string;
  email: string;
  password: string;
  friends: string[];
  files: any[];
};
export type RequestWithId = Request<
  {},
  any,
  any,
  QueryString.ParsedQs,
  Record<string, any>
> & { id: string };
