/** Política de contraseñas (CU02): mínimo 8 caracteres, al menos una letra y un número. */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres e incluir una letra y un número';
export const BCRYPT_COST = 10;
