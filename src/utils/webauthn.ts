/**
 * =========================================================================
 * UTILIDADES DE WEBAUTHN / PASSKEYS PARA BIOMETRÍA DE USUARIO
 * =========================================================================
 * 
 * Implementa la autenticación biométrica delegada al navegador y sistema operativo
 * (Huella dactilar, Reconocimiento facial o PIN/bloqueo de pantalla).
 * 
 * Reglas de seguridad:
 * - NO se leen ni almacenan datos biométricos.
 * - La verificación se delega al hardware seguro del dispositivo (Android Keystore / Secure Enclave).
 * - SOLAMENTE se utiliza para el acceso de USUARIO normal a la aplicación.
 * - NUNCA otorga privilegios de Administrador.
 */

const CREDENTIAL_STORAGE_KEY = 'cm_webauthn_credential_id';
const BIOMETRIA_ACTIVA_KEY = 'cm_biometria_habilitada';
const VERSION_ACCESO_KEY = 'cm_webauthn_version_acceso';

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Determina si el navegador actual soporta WebAuthn
 */
export function soportaWebAuthn(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials !== 'undefined'
  );
}

/**
 * Verifica si el dispositivo cuenta con un autenticador de plataforma (Huella/Rostro/PIN)
 */
export async function tieneAutenticadorBiometrico(): Promise<boolean> {
  if (!soportaWebAuthn()) return false;
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Indica si ya existe una credencial biométrica registrada localmente para este usuario
 */
export function tieneBiometriaRegistrada(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(BIOMETRIA_ACTIVA_KEY) === 'true' && !!localStorage.getItem(CREDENTIAL_STORAGE_KEY);
}

/**
 * Obtiene la versión de acceso asociada a la credencial registrada
 */
export function obtenerVersionRegistrada(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VERSION_ACCESO_KEY);
}

/**
 * Registra una nueva Passkey / credencial biométrica mediante el sistema operativo
 */
export async function registrarBiometria(versionAcceso?: string): Promise<{ ok: boolean; error?: string }> {
  if (!soportaWebAuthn()) {
    return { ok: false, error: 'WebAuthn no está soportado en este navegador.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Control de Maquinaria',
          id: window.location.hostname || undefined,
        },
        user: {
          id: userId,
          name: 'usuario@controldemaquinaria',
          displayName: 'Operador / Usuario Maquinaria',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { ok: false, error: 'No se completó el registro biométrico.' };
    }

    const credIdBase64 = bufferToBase64(credential.rawId);
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credIdBase64);
    localStorage.setItem(BIOMETRIA_ACTIVA_KEY, 'true');
    if (versionAcceso) {
      localStorage.setItem(VERSION_ACCESO_KEY, versionAcceso);
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error al registrar credencial biométrica:', err);
    let msg = 'No se pudo activar el acceso con huella o rostro.';
    if (err.name === 'NotAllowedError') {
      msg = 'Operación cancelada o no permitida por el dispositivo.';
    } else if (err.message) {
      msg = err.message;
    }
    return { ok: false, error: msg };
  }
}

/**
 * Autentica al usuario usando la huella digital o rostro configurado en el teléfono
 */
export async function autenticarConBiometria(): Promise<{ ok: boolean; error?: string }> {
  if (!soportaWebAuthn()) {
    return { ok: false, error: 'WebAuthn no disponible.' };
  }

  const credIdBase64 = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  if (!credIdBase64) {
    return { ok: false, error: 'No hay credencial biométrica registrada.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredId = base64ToBuffer(credIdBase64);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: allowCredId,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { ok: false, error: 'Autenticación cancelada.' };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error durante autenticación biométrica:', err);
    let msg = 'No se pudo verificar la huella o rostro.';
    if (err.name === 'NotAllowedError') {
      msg = 'Autenticación biométrica cancelada o tiempo de espera agotado.';
    } else if (err.message) {
      msg = err.message;
    }
    return { ok: false, error: msg };
  }
}

/**
 * Elimina la credencial biométrica local
 */
export function desactivarBiometria(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
    localStorage.removeItem(BIOMETRIA_ACTIVA_KEY);
    localStorage.removeItem(VERSION_ACCESO_KEY);
  }
}
