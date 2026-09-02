export type ServerGuestbookEntry = {
  id: string;
  keyring_id: string;
  visitor_name: string;
  message: string;
  author_user_id: string | null;
  created_at: string;
};

export const GUESTBOOK_ENTRY_FIELDS =
  "id,keyring_id,visitor_name,message,author_user_id,created_at";
