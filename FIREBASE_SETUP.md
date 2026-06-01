# Configuración de Firebase para Calendario PAMM

Este documento te guiará paso a paso para configurar Firebase Authentication y Firestore Database en tu proyecto de Calendario PAMM.

## ¿Por qué Firebase?

Firebase es la solución ideal para tu proyecto porque:
- **Gratis** para proyectos pequeños con generosos límites
- **No requiere backend** - funciona perfectamente con aplicaciones estáticas
- **Autenticación segura** - maneja login/registro de forma profesional
- **Base de datos en la nube** - tus eventos se sincronizan entre dispositivos
- **Fácil de configurar** - solo requiere unos pocos pasos

## Pasos de Configuración

### 1. Crear un proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Ingresa un nombre para tu proyecto (ej: "calendario-pamm")
4. Puedes desactivar Google Analytics si no lo necesitas
5. Haz clic en "Crear proyecto"
6. Espera a que se cree el proyecto (puede tomar unos minutos)

### 2. Habilitar Authentication

1. En el menú izquierdo, ve a **Build** > **Authentication**
2. Haz clic en **Comenzar**
3. En la pestaña "Sign-in method", haz clic en **Email/Password**
4. Habilita el proveedor de Email/Password
5. Haz clic en **Guardar**

### 3. Habilitar Firestore Database

1. En el menú izquierdo, ve a **Build** > **Firestore Database**
2. Haz clic en **Crear base de datos**
3. Selecciona una ubicación (recomendado: una cerca de tus usuarios)
4. Elige **Modo de producción** o **Modo de prueba**
   - **Modo de prueba**: Solo para desarrollo (expira en 30 días)
   - **Modo de producción**: Requiere configuración de reglas de seguridad
5. Haz clic en **Crear**

### 4. Configurar reglas de seguridad de Firestore

Para que tu aplicación funcione correctamente, necesitas configurar las reglas de seguridad de Firestore:

1. En Firestore Database, ve a la pestaña **Reglas**
2. Reemplaza las reglas existentes con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo los usuarios autenticados pueden leer/escribir sus propios datos
    match /usuarios/{userId}/eventos/{eventoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Haz clic en **Publicar**

### 5. Obtener las credenciales de Firebase

1. En Firebase Console, ve a la configuración del proyecto (icono de engranaje)
2. Desplázate hasta la sección "Tus apps"
3. Haz clic en el icono **</>** (Web)
4. Ingresa un nombre para tu app (ej: "Calendario PAMM Web")
5. **NO marques** "Firebase Hosting" (ya tienes tu propio hosting)
6. Haz clic en **Registrar app**
7. Copia el objeto `firebaseConfig` que se muestra

### 6. Configurar el proyecto

1. Abre el archivo `script.js` en tu proyecto
2. Busca la sección `CONFIGURACIÓN DE FIREBASE` (líneas 30-40)
3. Reemplaza los valores de ejemplo con tus credenciales reales:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_REAL",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID_REAL",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID_REAL",
  appId: "TU_APP_ID_REAL"
};
```

4. Guarda el archivo

### 7. Probar la configuración

1. Abre tu aplicación en el navegador
2. Abre la consola del navegador (F12)
3. Deberías ver el mensaje: "Firebase inicializado correctamente"
4. Haz clic en el botón de usuario (👤) en la esquina superior derecha
5. Prueba registrarte con un email y contraseña
6. Prueba iniciar sesión
7. Agrega un evento personal y verifica que se guarde

## Funcionalidades del Sistema de Autenticación

### Características implementadas:

- ✅ **Registro de usuarios** con email y contraseña
- ✅ **Inicio de sesión** seguro
- ✅ **Cierre de sesión**
- ✅ **Persistencia de sesión** (el usuario permanece logueado al recargar)
- ✅ **Sincronización de eventos** en Firestore
- ✅ **Fallback a localStorage** si Firebase no está configurado
- ✅ **UI modal elegante** con tabs para login/registro
- ✅ **Validación de contraseñas** (mínimo 6 caracteres)
- ✅ **Mensajes de error** claros en español
- ✅ **Indicador visual** de estado de autenticación

### Cómo funciona:

1. **Sin configurar Firebase**: La app funciona con localStorage (como antes)
2. **Con Firebase configurado**: 
   - Los usuarios no autenticados usan localStorage
   - Los usuarios autenticados sincronizan eventos en Firestore
   - Los eventos se guardan automáticamente en la nube
   - Puedes acceder desde cualquier dispositivo

## Solución de Problemas

### Error: "Firebase no está configurado"

**Causa**: No has reemplazado las credenciales de ejemplo en `script.js`

**Solución**: Sigue el paso 6 para configurar las credenciales reales

### Error: "auth/user-not-found"

**Causa**: El email no está registrado

**Solución**: Regístrate primero en la pestaña "Registrarse"

### Error: "auth/wrong-password"

**Causa**: La contraseña es incorrecta

**Solución**: Verifica la contraseña o restablécela en Firebase Console

### Error: "auth/email-already-in-use"

**Causa**: El email ya está registrado

**Solución**: Inicia sesión en lugar de registrarte

### Los eventos no se guardan en Firestore

**Causa**: Las reglas de seguridad de Firestore no están configuradas correctamente

**Solución**: Verifica el paso 4 para configurar las reglas de seguridad

## Seguridad

### Importante:

- **Nunca compartas** tus credenciales de Firebase en repositorios públicos
- **Usa variables de entorno** si despliegas en producción
- **Mantén las reglas de seguridad** actualizadas
- **Habilita la verificación de email** para mayor seguridad (opcional)

## Costos

Firebase tiene un plan gratuito generoso:

- **Authentication**: 10,000 verificaciones/mes gratis
- **Firestore**: 50,000 lecturas, 20,000 escrituras/mes gratis
- **Almacenamiento**: 5 GB gratis

Para uso personal o pequeño proyecto, es completamente gratis.

## Soporte

Si tienes problemas:

1. Verifica la consola del navegador para errores
2. Revisa que las credenciales sean correctas
3. Asegúrate de que Authentication y Firestore estén habilitados
4. Verifica las reglas de seguridad de Firestore

## Recursos

- [Documentación de Firebase](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Database](https://firebase.google.com/docs/firestore)
- [Consola de Firebase](https://console.firebase.google.com/)
