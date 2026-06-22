export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ContactsStackParamList = {
  ContactsList: undefined;
  ContactDetail: { contactId?: string };
};

export type AppTabParamList = {
  Home: undefined;
  Contacts: undefined;
  Settings: undefined;
};
