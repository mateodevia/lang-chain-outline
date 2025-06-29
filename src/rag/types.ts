import { OutlineDocument } from "../outline-api/types";

export interface ExtendedOutlineDocument extends OutlineDocument {
  parentDocument: string;
  collectionName: string;
}