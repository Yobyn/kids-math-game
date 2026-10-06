import { Words } from '../services/language.service';

/**
 * The title and sign-up screens' own words, fetched with them rather than in the first load (app-routing.module.ts).
 * Each screen that shows one of them hands them to the service as it opens
 * (`extend`, first thing in its constructor).
 */
export type LoginKey =
  | 'play-as-guest'
  | 'password-reset-sent'
  | 'password-reset-failed'
  | 'reset-password'
  | 'cancel'
  | 'invalid-form'
  | 'username-requirements'
  | 'password-requirements'
  | 'email-requirements'
  | 'enter-valid-email'
  | 'registration-success'
  | 'password'
  | 'have-account'
  | 'fill-all-fields'
  | 'registration-failed'
  | 'need-account'
  | 'email'
  | 'register'
  | 'login'
  | 'login-failed'
  | 'submit'
  | 'forgot-password';

export const LOGIN_WORDS: Words<LoginKey> = {
  en: {
    'play-as-guest': 'Play without an account',
    'password-reset-sent': 'Password reset instructions have been sent to your email',
    'password-reset-failed': 'Failed to send password reset email. Please try again.',
    'reset-password': 'Reset Password',
    'cancel': 'Cancel',
    'invalid-form': 'Please fix the errors in the form',
    'username-requirements': 'Username must be at least 3 characters',
    'password-requirements': 'Password must be at least 6 characters',
    'email-requirements': 'Please enter a valid email address',
    'enter-valid-email': 'Please enter a valid email address',
    'registration-success': 'Registration successful! You can now log in.',
    'password': 'Password',
    'have-account': 'Already have an account? Login',
    'fill-all-fields': 'Please fill in all fields',
    'registration-failed': 'Registration failed',
    'need-account': 'Need an account? Register',
    'email': 'Email',
    'register': 'Register',
    'login': 'Login',
    'login-failed': 'Login failed',
    'submit': 'Submit',
    'forgot-password': 'Forgot Password'
  },
  nl: {
    'play-as-guest': 'Spelen zonder account',
    'password-reset-sent': 'Instructies voor het opnieuw instellen van uw wachtwoord zijn naar uw e-mail verzonden',
    'password-reset-failed': 'Kon geen wachtwoord reset e-mail verzenden. Probeer het opnieuw.',
    'reset-password': 'Wachtwoord opnieuw instellen',
    'cancel': 'Annuleren',
    'invalid-form': 'Corrigeer de fouten in het formulier',
    'username-requirements': 'Gebruikersnaam moet minimaal 3 tekens bevatten',
    'password-requirements': 'Wachtwoord moet minimaal 6 tekens bevatten',
    'email-requirements': 'Voer een geldig e-mailadres in',
    'enter-valid-email': 'Voer een geldig e-mailadres in',
    'registration-success': 'Registratie succesvol! Je kunt nu inloggen.',
    'password': 'Wachtwoord',
    'have-account': 'Heb je al een account? Log in',
    'fill-all-fields': 'Vul alle velden in',
    'registration-failed': 'Registratie mislukt',
    'need-account': 'Nog geen account? Registreer',
    'email': 'E-mailadres',
    'register': 'Registreren',
    'login': 'Inloggen',
    'login-failed': 'Inloggen mislukt',
    'submit': 'Verstuur',
    'forgot-password': 'Wachtwoord vergeten'
  },
  es: {
    'play-as-guest': 'Jugar sin cuenta',
    'password-reset-sent': 'Se han enviado instrucciones para restablecer tu contraseña a tu correo electrónico',
    'password-reset-failed': 'No se pudo enviar el correo electrónico de restablecimiento de contraseña. Por favor, inténtalo de nuevo.',
    'reset-password': 'Restablecer contraseña',
    'cancel': 'Cancelar',
    'invalid-form': 'Por favor, corrige los errores en el formulario',
    'username-requirements': 'El nombre de usuario debe tener al menos 3 caracteres',
    'password-requirements': 'La contraseña debe tener al menos 6 caracteres',
    'email-requirements': 'Por favor, ingresa una dirección de correo electrónico válida',
    'enter-valid-email': 'Por favor, ingresa una dirección de correo electrónico válida',
    'registration-success': 'Registro exitoso! Ahora puedes iniciar sesión.',
    'password': 'Contraseña',
    'have-account': '¿Ya tienes una cuenta? Inicia sesión',
    'fill-all-fields': 'Por favor, rellene todos los campos',
    'registration-failed': 'Registro fallido',
    'need-account': '¿Necesitas una cuenta? Regístrate',
    'email': 'Correo electrónico',
    'register': 'Registro',
    'login': 'Iniciar sesión',
    'login-failed': 'Inicio de sesión fallido',
    'submit': 'Enviar',
    'forgot-password': '¿Olvidaste tu contraseña?'
  }
};
