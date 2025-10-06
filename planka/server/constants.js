const AccessTokenSteps = {
  ACCEPT_TERMS: 'accept-terms',
};

const CustomFieldTypes = {
  TEXT: 'text',
  CHECKLIST: 'checklist',
  DROPDOWN: 'dropdown',
  NUMBER: 'number',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
};

const POSITION_GAP = 65536;

const MAX_SIZE_TO_GET_ENCODING = 8 * 1024 * 1024;

module.exports = {
  AccessTokenSteps,
  CustomFieldTypes,
  POSITION_GAP,
  MAX_SIZE_TO_GET_ENCODING,
};
