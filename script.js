// =============================================================================
// CALENDARIO PAMM - Post Alexander Magnus Mortem
// Sistema de calendario alternativo con 13 meses de 28 días cada uno
// =============================================================================

// =============================================================================
// IMPORTS DE FIREBASE
// =============================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

// =============================================================================
// CONFIGURACIÓN DE FIREBASE
// =============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDquU-cs7o_gILNlFvCNdns1UpsqklJHuY",
  authDomain: "calendario-pamm.firebaseapp.com",
  projectId: "calendario-pamm",
  storageBucket: "calendario-pamm.firebasestorage.app",
  messagingSenderId: "242881217833",
  appId: "1:242881217833:web:86b9b5d50f18ae4de76338",
  measurementId: "G-V9LGPBHMMX"
};

// =============================================================================
// CONFIGURACIÓN BÁSICA
// =============================================================================

// Nombres de los 13 meses del calendario PAMM
const MESES_PAMM = [
  "Primus", "Secundus", "Tertius", "Quartus", "Quintus", "Sextus",
  "Septimus", "Octavus", "Nonus", "Decimus", "Undecimus", "Duodecimus", "Ultimus"
];

// Nombres de los días de la semana
const DIAS_SEMANA = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
];

// =============================================================================
// SISTEMA MULTI-ZONA HORARIA
// =============================================================================

// Base de datos de zonas horarias principales
const ZONAS_HORARIAS = [
  { id: 'UTC', nombre: 'UTC (Tiempo Universal Coordinado)', offset: 0, region: 'Global' },
  { id: 'GMT', nombre: 'GMT (Greenwich Mean Time)', offset: 0, region: 'Europa' },
  { id: 'EST', nombre: 'EST (Eastern Standard Time)', offset: -5, region: 'América Norte' },
  { id: 'EDT', nombre: 'EDT (Eastern Daylight Time)', offset: -4, region: 'América Norte', dst: true },
  { id: 'CET', nombre: 'CET (Central European Time)', offset: 1, region: 'Europa' },
  { id: 'CEST', nombre: 'CEST (Central European Summer Time)', offset: 2, region: 'Europa', dst: true },
  { id: 'JST', nombre: 'JST (Japan Standard Time)', offset: 9, region: 'Asia' },
  { id: 'IST', nombre: 'IST (India Standard Time)', offset: 5.5, region: 'Asia' },
  { id: 'AEST', nombre: 'AEST (Australian Eastern Standard Time)', offset: 10, region: 'Oceanía' },
  { id: 'PST', nombre: 'PST (Pacific Standard Time)', offset: -8, region: 'América Norte' }
];

// Zona horaria actual del sistema
let zonaHorariaActual = 'UTC';
let offsetActual = 0;

// Inicializar zona horaria
function inicializarZonaHoraria() {
  const zonaGuardada = localStorage.getItem('zonaHorariaPAMM');
  if (zonaGuardada) {
    zonaHorariaActual = zonaGuardada;
    const zona = ZONAS_HORARIAS.find(z => z.id === zonaGuardada);
    if (zona) {
      offsetActual = zona.offset;
    }
  } else {
    // Detectar zona horaria del navegador
    const offset = -new Date().getTimezoneOffset() / 60;
    const zona = ZONAS_HORARIAS.find(z => z.offset === offset);
    if (zona) {
      zonaHorariaActual = zona.id;
      offsetActual = zona.offset;
    }
  }
}

// Convertir fecha a zona horaria específica
function convertirZonaHoraria(fecha, zonaDestino) {
  const zona = ZONAS_HORARIAS.find(z => z.id === zonaDestino);
  if (!zona) return fecha;
  
  const offsetDestino = zona.offset;
  const diferencia = offsetDestino - offsetActual;
  
  const nuevaFecha = new Date(fecha);
  nuevaFecha.setHours(nuevaFecha.getHours() + diferencia);
  
  return nuevaFecha;
}

// =============================================================================
// FUNCIONES DE CÁLCULO DE FECHAS
// =============================================================================

// Determina si un año es bisiesto (misma regla que calendario gregoriano)
function es_bisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || (anio % 400 === 0);
}

// Calcula el número de días en un año PAMM (365 normal, 366 bisiesto)
function dias_en_anio_pamm(anio) {
  return es_bisiesto(anio) ? 366 : 365;
}

// Calcula los días acumulados desde el año 1 hasta el inicio del año dado
function dias_hasta_inicio_anio(anio) {
  // Fórmula: 365 días por año + cantidad de años bisiestos ANTERIORES
  // Restamos 1 porque contamos desde el año 1, no desde el año 0
  const anios_completos = anio - 1;
  return 365 * anios_completos
    + Math.floor(anios_completos / 4)      // Cada 4 años es bisiesto
    - Math.floor(anios_completos / 100)   // Excepto cada 100 años
    + Math.floor(anios_completos / 400);  // Pero cada 400 años sí es bisiesto
}

// Convierte fecha PAMM a día absoluto (número de días desde el inicio)
function pamm_a_dia_absoluto(anio, mes, dia) {
  let dias_acumulados = dias_hasta_inicio_anio(anio);
  
  // Sumar días de los meses completos anteriores
  if (mes > 1) {
    if (mes <= 13) {
      // Para los primeros 12 meses: (mes-1) * 28 días
      // Para Ultimus (mes 13): 12 * 28 = 336 días de los meses anteriores
      const meses_completos = Math.min(mes - 1, 12);
      dias_acumulados += meses_completos * 28;
    }
  }
  
  // Sumar días del mes actual
  dias_acumulados += dia;
  
  return dias_acumulados;
}

// =============================================================================
// CONVERSIÓN ENTRE CALENDARIOS
// =============================================================================

// Referencia fija: 1 de enero de 2026 = día 857,250 PAMM
const DIA_ABS_REF = 857250;
const FECHA_GREG_REF = new Date(2026, 0, 1, 12, 0, 0);

// Convierte fecha gregoriana a PAMM
function gregoriano_a_pamm(fecha) {
  // Normalizar fecha a mediodía para evitar problemas de zona horaria
  const fechaNorm = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0);
  
  // Calcular diferencia de días con la fecha de referencia
  const diff_ms = fechaNorm - FECHA_GREG_REF;
  const diff_dias = Math.round(diff_ms / (1000 * 60 * 60 * 24));
  const d_abs = DIA_ABS_REF + diff_dias;

  // Encontrar el año PAMM correspondiente
  let anio = Math.floor((d_abs - 1) / 365.2425); // Estimación inicial
  
  // Ajuste preciso del año
  while (dias_hasta_inicio_anio(anio + 1) < d_abs) anio++;
  while (dias_hasta_inicio_anio(anio) >= d_abs) anio--;

  // Calcular mes y día dentro del año
  const dia_en_anio = d_abs - dias_hasta_inicio_anio(anio);
  let mes = Math.ceil(dia_en_anio / 28) || 1;
  // Asegurar que el mes no sea mayor a 13
  if (mes > 13) mes = 13;
  const dia = dia_en_anio - (mes - 1) * 28;

  return {
    anio,
    mes,
    nombreMes: MESES_PAMM[mes - 1],
    dia
  };
}

// Convierte fecha PAMM a gregoriana
function pamm_a_gregoriano(anio, mes, dia) {
  const d_abs = pamm_a_dia_absoluto(anio, mes, dia);
  const diff = d_abs - DIA_ABS_REF;
  const fecha = new Date(2026, 0, 1, 12, 0, 0);
  fecha.setDate(fecha.getDate() + diff);
  return fecha;
}

// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  
  // =============================================================================
  // INICIALIZACIÓN DE FIREBASE
  // =============================================================================
  
  let app, auth, db, analytics;
  let firebaseInitialized = false;
  let currentUser = null;

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    firebaseInitialized = true;
    console.log('Firebase inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar Firebase:', error);
    console.warn('La aplicación funcionará en modo localStorage hasta que configures Firebase');
  }

  // Función para actualizar la UI según estado de autenticación
  function actualizarUIAutenticacion(autenticado) {
    const authButton = document.getElementById('auth-button');
    const authIcon = document.querySelector('.auth-icon');
    
    if (autenticado) {
      authIcon.textContent = '✓';
      authButton.title = 'Usuario autenticado';
    } else {
      authIcon.textContent = '👤';
      authButton.title = 'Iniciar sesión';
    }
  }

  // =============================================================================
  // FECHA ACTUAL Y MOSTRADO INICIAL
  // =============================================================================
  
  const hoy = new Date();
  const pamm = gregoriano_a_pamm(hoy);

  // Mostrar la fecha actual en formato PAMM
  const fechaPammElement = document.getElementById("fecha-pamm");
  if (fechaPammElement) {
    fechaPammElement.textContent = `${pamm.dia} de ${pamm.nombreMes} de ${pamm.anio} PAMM`;
  }

  // =============================================================================
  // CONVERSOR GREGORIANO → PAMM (con conversión automática)
  // =============================================================================
  
  const btnConvertir = document.getElementById("btn-convertir");
  const fechaInput = document.getElementById("fecha-input");
  const resultadoPammElement = document.getElementById("resultado-pamm");
  const resultadoElement = document.getElementById("resultado");
  
  // Función que realiza la conversión gregoriana → PAMM
  function convertirGregorianoAPamm() {
    const input = fechaInput.value;

    // Si no hay fecha, ocultar resultado
    if (!input) {
      if (resultadoElement) resultadoElement.classList.add("oculto");
      return;
    }

    // Parsear fecha gregoriana
    const partes = input.split("-");
    const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    
    // Validar que la fecha sea válida
    if (isNaN(fecha.getTime())) {
      if (resultadoElement) resultadoElement.classList.add("oculto");
      return;
    }
    
    // Realizar conversión y mostrar resultado
    const resultado = gregoriano_a_pamm(fecha);
    
    if (resultadoPammElement) {
      resultadoPammElement.textContent = `${resultado.dia} de ${resultado.nombreMes} de ${resultado.anio} PAMM`;
    }
    if (resultadoElement) {
      resultadoElement.classList.remove("oculto");
    }
  }
  
  // Event listeners para conversión automática y manual
  if (btnConvertir) {
    btnConvertir.addEventListener("click", convertirGregorianoAPamm);
  }
  if (fechaInput) {
    fechaInput.addEventListener("input", convertirGregorianoAPamm);
  }

  // =============================================================================
  // BOTÓN COPIAR
  // =============================================================================
  
  const btnCopiar = document.getElementById("btn-copiar");
  if (btnCopiar) {
    btnCopiar.addEventListener("click", function () {
      const texto = document.getElementById("resultado-pamm").textContent;
      navigator.clipboard.writeText(texto).then(function () {
        const btn = document.getElementById("btn-copiar");
        btn.textContent = "¡Copiado!";
        setTimeout(function () {
          btn.textContent = "Copiar";
        }, 2000);
      });
    });
  }

  // Eventos científicos y tecnológicos
  const fechas_culturales = [
    { nombre: "Lanzamiento del Sputnik",         mes: 9,  dia: 4,   categoria: "historico" },
    { nombre: "Primer paso en la Luna",          mes: 6,  dia: 20,  categoria: "historico" },
    { nombre: "Caída del Muro de Berlín",        mes: 10, dia: 9,   categoria: "historico" },
    { nombre: "Nacimiento de Einstein",           mes: 2,  dia: 14,  categoria: "historico" },
    { nombre: "Nacimiento de Newton",             mes: 11, dia: 25,  categoria: "historico" },
    { nombre: "Nacimiento de Marie Curie",        mes: 10, dia: 7,   categoria: "historico" },
    { nombre: "Nacimiento de Darwin",             mes: 1,  dia: 12,  categoria: "historico" },
    { nombre: "Nacimiento de Galileo",           mes: 1,  dia: 15,  categoria: "historico" },

    // Entretenimiento y cultura popular
    { nombre: "Día de Star Wars",                mes: 4,  dia: 4,   categoria: "entretenimiento" },
    { nombre: "Día del Señor de los Anillos",    mes: 8,  dia: 22,  categoria: "entretenimiento" },
    { nombre: "Día de Harry Potter",             mes: 6,  dia: 31,  categoria: "entretenimiento" },
    { nombre: "Día del Videojuego",              mes: 8,  dia: 29,  categoria: "entretenimiento" },
    { nombre: "Día del Anime",                   mes: 4,  dia: 15,  categoria: "entretenimiento" },
    { nombre: "Día del Manga",                   mes: 4,  dia: 15,  categoria: "entretenimiento" },
    { nombre: "Día del Cómic Americano",          mes: 4,  dia: 28,  categoria: "entretenimiento" },
    { nombre: "Día del Cómic Japonés",           mes: 4,  dia: 28,  categoria: "entretenimiento" },
    { nombre: "Día Mundial del Emoji",           mes: 6,  dia: 17,  categoria: "entretenimiento" },
    { nombre: "Día Internacional del Gato",      mes: 7,  dia: 8,   categoria: "entretenimiento" },
    { nombre: "Día del Perro",                   mes: 6,  dia: 26,  categoria: "entretenimiento" },
    { nombre: "Día del Pinguino",                 mes: 4,  dia: 25,  categoria: "entretenimiento" },

    // COMERCIALES Y ECONÓMICOS
    { nombre: "Prime Day",                       mes: 6,  dia: 15,  categoria: "comercial" },
    { nombre: "Cyber Monday",                    mes: 10, dia: 28,  categoria: "comercial" },
    { nombre: "Día sin Compras",                 mes: 10, dia: 25,  categoria: "comercial" },
    { nombre: "Viernes Negro",                   mes: 10, dia: 27,  categoria: "comercial" },
    { nombre: "Día del Consumidor",              mes: 2,  dia: 15,  categoria: "comercial" },
    { nombre: "Día del Banquero",                mes: 10, dia: 3,   categoria: "comercial" },
    { nombre: "Día del Emprendedor",             mes: 7,  dia: 21,  categoria: "comercial" }
  ];

  // Paleta de colores por categoría de festividad
  const coloresPorCategoria = {
    "festivo": "#e74c3c",        // Rojo - Festividades principales
    "civil": "#3498db",          // Azul - Días civiles/nacionales
    "social": "#9b59b6",        // Morado - Días sociales/conciencia
    "astronomico": "#f39c12",    // Naranja - Eventos astronómicos
    "cultural": "#27ae60",       // Verde - Eventos culturales
    "entretenimiento": "#e67e22", // Naranja oscuro - Entretenimiento
    "ambiental": "#16a085",      // Verde azulado - Ambiental
    "historico": "#34495e",      // Gris oscuro - Histórico
    "comercial": "#95a5a6"       // Gris - Comercial
  };

  // Generar tabla de equivalencias culturales
  const cuerpo = document.getElementById("tabla-cuerpo");
  if (cuerpo) {
    fechas_culturales.forEach(function (item) {
      const p = gregoriano_a_pamm(new Date(2026, item.mes, item.dia));
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${item.nombre}</td>
        <td>${p.dia} de ${p.nombreMes}</td>
      `;
      cuerpo.appendChild(fila);
    });
  }

  // =============================================================================
  // CUENTA REGRESIVA AL PRÓXIMO AÑO PAMM
  // =============================================================================
  
  function dias_para_proximo_anio() {
    const hoyNorm = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0);
    const anioActual = gregoriano_a_pamm(hoyNorm).anio;
    let contador = 0;
    let fecha = new Date(hoyNorm);

    // Contar días hasta que cambie el año PAMM
    while (true) {
      fecha = new Date(hoyNorm.getTime() + contador * 24 * 60 * 60 * 1000);
      if (gregoriano_a_pamm(fecha).anio > anioActual) break;
      contador++;
    }

    return { dias: contador, proximoAnio: gregoriano_a_pamm(fecha).anio };
  }

  const countdown = dias_para_proximo_anio();
  const diasRestantesElement = document.getElementById("dias-restantes");
  const proximoAnioElement = document.getElementById("proximo-anio");
  
  if (diasRestantesElement) diasRestantesElement.textContent = countdown.dias;
  if (proximoAnioElement) proximoAnioElement.textContent = countdown.proximoAnio;

  // =============================================================================
  // CALENDARIO INTERACTIVO
  // =============================================================================
  
  // Configuración del calendario
  const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MIN_ANIO = 0;
  const MAX_ANIO = 3000;

  let calAnio = pamm.anio;  // Año actual mostrado
  let calMes = pamm.mes;    // Mes actual mostrado

  // Guardar fecha de hoy para resaltarla
  const anioHoy = pamm.anio;
  const mesHoy = pamm.mes;
  const diaHoy = pamm.dia;

  // Calcula días en un mes PAMM (28 días normales, 29/30 en Ultimus)
  function dias_en_mes(anio, mes) {
    if (mes < 13) return 28;
    return es_bisiesto(anio) ? 30 : 29;
  }

  // Formatea fecha gregoriana para mostrar
  function formato_greg(fecha) {
    return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
  }

  // =============================================================================
  // RENDERIZADO DEL CALENDARIO
  // =============================================================================
  
  function renderCalendario() {
    const calAnioElement = document.getElementById("cal-anio");
    const calMesElement = document.getElementById("cal-mes");
    const grid = document.getElementById("cal-grid");
    
    if (!calAnioElement || !calMesElement || !grid) return;
    
    // Actualizar controles de navegación
    calAnioElement.value = calAnio;
    calMesElement.textContent = MESES_PAMM[calMes - 1];

    // Calcular información del mes
    const total_dias = dias_en_mes(calAnio, calMes);
    const fecha_dia1 = pamm_a_gregoriano(calAnio, calMes, 1);
    const dia_semana_inicio = fecha_dia1.getDay();

    // Limpiar y reconstruir grid
    grid.innerHTML = "";

    // Agregar encabezados de días de la semana
    DIAS_SEMANA.forEach(function (nombre) {
      const th = document.createElement("div");
      th.className = "cal-header-dia";
      th.textContent = nombre;
      grid.appendChild(th);
    });

    // Agregar celdas vacías antes del primer día del mes
    for (let i = 0; i < dia_semana_inicio; i++) {
      const vacio = document.createElement("div");
      vacio.className = "cal-celda vacia";
      grid.appendChild(vacio);
    }

    // Agregar días del mes
    for (let d = 1; d <= total_dias; d++) {
      const fecha_greg = pamm_a_gregoriano(calAnio, calMes, d);
      const celda = document.createElement("div");
      celda.className = "cal-celda";

      // Resaltar día actual
      if (calAnio === anioHoy && calMes === mesHoy && d === diaHoy) {
        celda.classList.add("hoy");
      }
      
      // Buscar festividad en este día
      const festividad = fechas_culturales.find(function (f) {
        return f.dia === fecha_greg.getDate() &&
               f.mes === fecha_greg.getMonth();
      });
      
      // Contenido de la celda
      celda.innerHTML = `
        <span class="cal-dia-num">${d}</span>
        <span class="cal-dia-greg">${formato_greg(fecha_greg)}</span>
      `;

      // Aplicar estilos de festividad si corresponde
      if (festividad) {
        celda.classList.add("festividad");
        if (festividad.categoria) {
          celda.classList.add(`festividad-${festividad.categoria}`);
          // Aplicar borde de color según categoría
          celda.style.borderLeft = `4px solid ${coloresPorCategoria[festividad.categoria] || "#95a5a6"}`;
        }
        // Agregar tooltip con nombre de festividad
        const tooltip = document.createElement("span");
        tooltip.className = "cal-tooltip";
        tooltip.textContent = festividad.nombre;
        celda.appendChild(tooltip);
      }

      grid.appendChild(celda);
    }
  }

  // =============================================================================
  // NAVEGACIÓN DEL CALENDARIO
  // =============================================================================
  
  function cambiarAnio(nuevo) {
    calAnio = Math.min(MAX_ANIO, Math.max(MIN_ANIO, nuevo));
    renderCalendario();
  }

  // Event listeners para botones de navegación
  const btnMesAnt = document.getElementById("btn-mes-ant");
  const btnMesSig = document.getElementById("btn-mes-sig");
  const btnAnioAnt = document.getElementById("btn-anio-ant");
  const btnAnioSig = document.getElementById("btn-anio-sig");
  const calAnioInput = document.getElementById("cal-anio");

  if (btnMesAnt) {
    btnMesAnt.addEventListener("click", function () {
      calMes--;
      if (calMes < 1) { 
        calMes = 13; 
        cambiarAnio(calAnio - 1); 
      } else {
        renderCalendario();
      }
    });
  }
  
  if (btnMesSig) {
    btnMesSig.addEventListener("click", function () {
      calMes++;
      if (calMes > 13) { 
        calMes = 1; 
        cambiarAnio(calAnio + 1); 
      } else {
        renderCalendario();
      }
    });
  }
  
  if (btnAnioAnt) {
    btnAnioAnt.addEventListener("click", function () { 
      cambiarAnio(calAnio - 1); 
    });
  }
  
  if (btnAnioSig) {
    btnAnioSig.addEventListener("click", function () { 
      cambiarAnio(calAnio + 1); 
    });
  }

  if (calAnioInput) {
    calAnioInput.addEventListener("change", function () {
      const valor = parseInt(this.value);
      if (!isNaN(valor)) cambiarAnio(Math.max(MIN_ANIO, valor));
    });
  }

  // Renderizar calendario inicial
  renderCalendario();

  // =============================================================================
  // ATAJOS DE TECLADO
  // =============================================================================
  
  document.addEventListener("keydown", function(event) {
    // Los atajos no funcionan cuando estamos escribiendo en inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    switch(event.key) {
      case 'ArrowLeft':
        // Navegar al mes anterior
        calMes--;
        if (calMes < 1) { 
          calMes = 13; 
          cambiarAnio(calAnio - 1); 
        } else {
          renderCalendario();
        }
        event.preventDefault();
        break;
        
      case 'ArrowRight':
        // Navegar al mes siguiente
        calMes++;
        if (calMes > 13) { 
          calMes = 1; 
          cambiarAnio(calAnio + 1); 
        } else {
          renderCalendario();
        }
        event.preventDefault();
        break;
        
      case 'ArrowUp':
        // Navegar al año anterior
        cambiarAnio(calAnio - 1);
        event.preventDefault();
        break;
        
      case 'ArrowDown':
        // Navegar al año siguiente
        cambiarAnio(calAnio + 1);
        event.preventDefault();
        break;
        
      case 'Home':
        // Volver al año actual
        const hoyPamm = gregoriano_a_pamm(new Date());
        calAnio = hoyPamm.anio;
        calMes = hoyPamm.mes;
        renderCalendario();
        event.preventDefault();
        break;
        
      case 't':
      case 'T':
        // Ir a la fecha de hoy y hacer scroll al calendario
        const hoyPamm2 = gregoriano_a_pamm(new Date());
        calAnio = hoyPamm2.anio;
        calMes = hoyPamm2.mes;
        renderCalendario();
        document.getElementById('calendario').scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
        break;
        
      case 'c':
      case 'C':
        // Ir al conversor
        document.getElementById('conversor').scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
        break;
        
      case 'h':
      case 'H':
        // Ir al inicio de la página
        document.getElementById('hoy').scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
        break;
    }
  });

  // =============================================================================
  // NAVBAR ACTIVO AL HACER SCROLL
  // =============================================================================
  
  const secciones = document.querySelectorAll("section[id], header");
  const enlaces = document.querySelectorAll("#navbar a");

  window.addEventListener("scroll", function () {
    let actual = "";
    secciones.forEach(function (seccion) {
      if (window.scrollY >= seccion.offsetTop - 100) actual = seccion.id;
    });
    enlaces.forEach(function (enlace) {
      enlace.classList.remove("activo");
      if (enlace.getAttribute("href") === "#" + actual) enlace.classList.add("activo");
    });
  });

  // =============================================================================
  // FOOTER
  // =============================================================================
  
  const pammFooter = gregoriano_a_pamm(new Date());
  const footerAnioElement = document.getElementById("footer-anio");
  if (footerAnioElement) {
    footerAnioElement.textContent = `${pammFooter.anio} PAMM`;
  }

  // =============================================================================
  // CONVERSOR PAMM → GREGORIANO (con conversión automática)
  // =============================================================================
  
  const btnConvertirInv = document.getElementById("btn-convertir-inv");
  const anioInput = document.getElementById("pamm-anio-in");
  const mesInput = document.getElementById("pamm-mes-in");
  const diaInput = document.getElementById("pamm-dia-in");
  const resultadoDiv = document.getElementById("resultado-greg");
  const resultadoInv = document.getElementById("resultado-inv");
  
  // Función que realiza la conversión PAMM → gregoriano
  function convertirPammAGregoriano() {
    const anio = parseInt(anioInput?.value || "");
    const mes = parseInt(mesInput?.value || "");
    const dia = parseInt(diaInput?.value || "");
    
    // Si faltan datos, ocultar resultado
    if (isNaN(anio) || isNaN(mes) || isNaN(dia)) {
      if (resultadoInv) resultadoInv.classList.add("oculto");
      return;
    }
    
    // Validar mes
    if (mes < 1 || mes > 13) {
      if (resultadoInv) resultadoInv.classList.add("oculto");
      return;
    }
    
    // Validar día según el mes y año bisiesto
    const diasEnMes = mes < 13 ? 28 : (es_bisiesto(anio) ? 30 : 29);
    if (dia < 1 || dia > diasEnMes) {
      if (resultadoInv) resultadoInv.classList.add("oculto");
      return;
    }

    // Realizar conversión y mostrar resultado
    const fechaResult = pamm_a_gregoriano(anio, mes, dia);
    const opciones = { day: "numeric", month: "long", year: "numeric" };
    const textoResultado = fechaResult.toLocaleDateString("es-ES", opciones);
    
    if (resultadoDiv && resultadoInv) {
      resultadoDiv.textContent = textoResultado;
      resultadoInv.classList.remove("oculto");
    }
  }
  
  // Event listeners para conversión automática y manual
  if (btnConvertirInv) {
    btnConvertirInv.addEventListener("click", convertirPammAGregoriano);
  }
  
  // Eventos para conversión automática mientras escribe
  if (anioInput) anioInput.addEventListener("input", convertirPammAGregoriano);
  if (mesInput) mesInput.addEventListener("change", convertirPammAGregoriano);
  if (diaInput) diaInput.addEventListener("input", convertirPammAGregoriano);

  // =============================================================================
  // CALCULADORA DE FECHAS PAMM
  // =============================================================================
  
  // Función para convertir día absoluto PAMM de vuelta a fecha PAMM
  function dia_absoluto_a_pamm(dia_abs) {
    // Encontrar el año
    let anio = Math.floor((dia_abs - 1) / 365.2425);
    while (dias_hasta_inicio_anio(anio + 1) < dia_abs) anio++;
    while (dias_hasta_inicio_anio(anio) >= dia_abs) anio--;

    const dia_en_anio = dia_abs - dias_hasta_inicio_anio(anio);
  
    // Determinar el mes y día considerando que Ultimus tiene longitud variable
    let mes, dia;
  
    // Los primeros 12 meses siempre tienen 28 días cada uno (336 días totales)
    if (dia_en_anio <= 336) {
      // Está en los primeros 12 meses
      mes = Math.ceil(dia_en_anio / 28);
      dia = dia_en_anio - (mes - 1) * 28;
    } else {
      // Está en Ultimus (mes 13)
      mes = 13;
      dia = dia_en_anio - 336; // Restar los 336 días de los primeros 12 meses
    
      // Validar que el día no exceda el máximo permitido en Ultimus
      const dias_en_ultimus = es_bisiesto(anio) ? 30 : 29;
      if (dia > dias_en_ultimus) {
        // Si excede, ajustar al siguiente año
        dia -= dias_en_ultimus;
        mes = 1;
        anio++;
      }
    }

    return {
      anio,
      mes,
      dia,
      nombreMes: MESES_PAMM[mes - 1]
    };
  };

  // =============================================================================
  // CÁLCULO DE DIFERENCIA ENTRE FECHAS
  // =============================================================================
  
  const btnCalcularDiferencia = document.getElementById("btn-calcular-diferencia");
  const resultadoCalculadora = document.getElementById("resultado-calculadora");
  const difDias = document.getElementById("dif-dias");
  const difDetalles = document.getElementById("dif-detalles");

  if (btnCalcularDiferencia) {
    btnCalcularDiferencia.addEventListener("click", function () {
      // Obtener valores de la primera fecha
      const anio1 = parseInt(document.getElementById("calc-anio1").value);
      const mes1 = parseInt(document.getElementById("calc-mes1").value);
      const dia1 = parseInt(document.getElementById("calc-dia1").value);

      // Obtener valores de la segunda fecha
      const anio2 = parseInt(document.getElementById("calc-anio2").value);
      const mes2 = parseInt(document.getElementById("calc-mes2").value);
      const dia2 = parseInt(document.getElementById("calc-dia2").value);

      // Validar entradas
      if (isNaN(anio1) || isNaN(mes1) || isNaN(dia1) || 
          isNaN(anio2) || isNaN(mes2) || isNaN(dia2)) {
        alert("Por favor, completa todas las fechas.");
        return;
      }

      // Validar rangos
      if (mes1 < 1 || mes1 > 13 || mes2 < 1 || mes2 > 13) {
        alert("Los meses deben estar entre 1 y 13.");
        return;
      }

      const diasEnMes1 = mes1 < 13 ? 28 : (es_bisiesto(anio1) ? 30 : 29);
      const diasEnMes2 = mes2 < 13 ? 28 : (es_bisiesto(anio2) ? 30 : 29);

      if (dia1 < 1 || dia1 > diasEnMes1 || dia2 < 1 || dia2 > diasEnMes2) {
        alert("Los días están fuera del rango válido para los meses seleccionados.");
        return;
      }

      // Convertir ambas fechas a días absolutos
      const diaAbs1 = pamm_a_dia_absoluto(anio1, mes1, dia1);
      const diaAbs2 = pamm_a_dia_absoluto(anio2, mes2, dia2);

      // Calcular diferencia
      const diferencia = Math.abs(diaAbs2 - diaAbs1);
      const esPositivo = diaAbs2 >= diaAbs1;

      // Calcular años, meses, días
      const años = Math.floor(diferencia / 365.2425);
      const diasRestantes = diferencia % 365.2425;
      const meses = Math.floor(diasRestantes / 28);
      const dias = Math.round(diasRestantes % 28);

      // Mostrar resultados
      difDias.textContent = `${diferencia.toLocaleString('es-ES')} días`;
      
      let detallesTexto = `Equivale aproximadamente a:\n`;
      if (años > 0) detallesTexto += `• ${años} año${años !== 1 ? 's' : ''}\n`;
      if (meses > 0) detallesTexto += `• ${meses} mes${meses !== 1 ? 'es' : ''}\n`;
      if (dias > 0) detallesTexto += `• ${dias} día${dias !== 1 ? 's' : ''}\n`;

      if (años === 0 && meses === 0 && dias === 0) {
        detallesTexto = "Las fechas son idénticas";
      }

      difDetalles.textContent = detallesTexto;
      resultadoCalculadora.classList.remove("oculto");
    });
  }

  // =============================================================================
  // AGREGAR/RESTAR DÍAS A UNA FECHA
  // =============================================================================
  
  const btnCalcularFecha = document.getElementById("btn-calcular-fecha");
  const resultadoFecha = document.getElementById("resultado-fecha");
  const fechaResultado = document.getElementById("fecha-resultado");

  if (btnCalcularFecha) {
    btnCalcularFecha.addEventListener("click", function () {
      // Obtener fecha base
      const anioBase = parseInt(document.getElementById("calc-anio-base").value);
      const mesBase = parseInt(document.getElementById("calc-mes-base").value);
      const diaBase = parseInt(document.getElementById("calc-dia-base").value);

      // Obtener días y operación
      const dias = parseInt(document.getElementById("calc-dias").value);
      const operacion = document.getElementById("calc-operacion").value;

      // Validar entradas
      if (isNaN(anioBase) || isNaN(mesBase) || isNaN(diaBase) || isNaN(dias)) {
        alert("Por favor, completa todos los campos.");
        return;
      }

      if (mesBase < 1 || mesBase > 13) {
        alert("El mes debe estar entre 1 y 13.");
        return;
      }

      const diasEnMes = mesBase < 13 ? 28 : (es_bisiesto(anioBase) ? 30 : 29);
      if (diaBase < 1 || diaBase > diasEnMes) {
        alert("El día está fuera del rango válido para el mes seleccionado.");
        return;
      }

      // Convertir fecha base a día absoluto
      const diaAbsBase = pamm_a_dia_absoluto(anioBase, mesBase, diaBase);

      // Calcular nuevo día absoluto
      let diaAbsResultado;
      if (operacion === "sumar") {
        diaAbsResultado = diaAbsBase + dias;
      } else {
        diaAbsResultado = diaAbsBase - dias;
        if (diaAbsResultado < 1) {
          alert("No se puede restar esa cantidad de días (resultaría en una fecha antes del año 0).");
          return;
        }
      }

      // Convertir de vuelta a fecha PAMM
      const fechaPammResultado = dia_absoluto_a_pamm(diaAbsResultado);

      // Mostrar resultado
      const operacionTexto = operacion === "sumar" ? "sumados" : "restados";
      fechaResultado.innerHTML = `
        <strong>${dias} día${dias !== 1 ? 's' : ''} ${operacionTexto}</strong> a 
        <strong>${diaBase} de ${MESES_PAMM[mesBase - 1]} de ${anioBase}</strong>
        <br><br>
        Resultado: <strong>${fechaPammResultado.dia} de ${fechaPammResultado.nombreMes} de ${fechaPammResultado.anio}</strong>
        <br><br>
        <small>Fecha gregoriana equivalente: ${pamm_a_gregoriano(fechaPammResultado.anio, fechaPammResultado.mes, fechaPammResultado.dia).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
      `;

      resultadoFecha.classList.remove("oculto");
    });
  }

  // =============================================================================
  // ATAJO DE TECLADO PARA CALCULADORA
  // =============================================================================
  
  document.addEventListener("keydown", function(event) {
    // Los atajos no funcionan cuando estamos escribiendo en inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    // Atajo para ir a la calculadora
    if (event.key === 'k' || event.key === 'K') {
      document.getElementById('calculadora').scrollIntoView({ behavior: 'smooth' });
      event.preventDefault();
    }
    
    // Atajo para ir a eventos personales
    if (event.key === 'e' || event.key === 'E') {
      document.getElementById('eventos').scrollIntoView({ behavior: 'smooth' });
      event.preventDefault();
    }
  });

  // =============================================================================
  // SISTEMA DE EVENTOS PERSONALES
  // =============================================================================
  
  // Colores para categorías de eventos personales
  const coloresEventosPersonales = {
    "personal": "#f1c40f",
    "trabajo": "#3498db", 
    "familia": "#27ae60",
    "salud": "#e74c3c",
    "educacion": "#e67e22",
    "viaje": "#9b59b6",
    "otro": "#34495e"
  };

  // Cargar eventos desde localStorage
  function cargarEventosPersonales() {
    const eventosGuardados = localStorage.getItem('eventosPamm');
    return eventosGuardados ? JSON.parse(eventosGuardados) : [];
  }

  // Validar evento PAMM (mejorado)
  function validarEventoPAMM(evento) {
    if (!evento.nombre || !evento.anio || !evento.mes || !evento.dia) {
      return false;
    }
    
    if (evento.anio < 0 || evento.anio > 3000) return false;
    if (evento.mes < 1 || evento.mes > 13) return false;
    
    const diasEnMes = evento.mes < 13 ? 28 : (es_bisiesto(evento.anio) ? 30 : 29);
    if (evento.dia < 1 || evento.dia > diasEnMes) return false;
    
    if (!Object.keys(coloresEventosPersonales).includes(evento.categoria)) {
      evento.categoria = 'otro';
    }
    
    return true;
  }

  // Generar ID único mejorado
  function generarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Calcular edad desde fecha PAMM
  function calcularEdadPAMM(anio, mes, dia) {
    const now = new Date();
    const birthDate = pamm_a_gregoriano(anio, mes, dia);
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Generar eventos recurrentes
  function generarEventosRecurrentes(anioBase, mesBase, diaBase, nombre, categoria, tipoRecurrencia, maxOcurrencias, fechaFin) {
    const eventos = [];
    let anio = anioBase;
    let mes = mesBase;
    let dia = diaBase;
    let contador = 0;
    
    // Convertir fecha fin a día absoluto PAMM si existe
    let diaAbsolutoFin = null;
    if (fechaFin) {
      const fechaGregFin = new Date(fechaFin + 'T12:00:00');
      const fechaPammFin = gregoriano_a_pamm(fechaGregFin);
      diaAbsolutoFin = pamm_a_dia_absoluto(fechaPammFin.anio, fechaPammFin.mes, fechaPammFin.dia);
    }
    
    while (true) {
      contador++;
      
      // Verificar límite de ocurrencias
      if (maxOcurrencias && contador > maxOcurrencias) break;
      
      // Verificar límite de fecha
      if (diaAbsolutoFin) {
        const diaAbsolutoActual = pamm_a_dia_absoluto(anio, mes, dia);
        if (diaAbsolutoActual > diaAbsolutoFin) break;
      }
      
      // Verificar que la fecha sea válida
      const eventoRecurrente = {
        anio,
        mes,
        dia,
        nombre,
        categoria,
        id: generarIdUnico() + contador,
        esRecurrente: true,
        tipoRecurrencia,
        anioBase,
        mesBase,
        diaBase
      };
      
      // Validar evento recurrente
      if (validarEventoPAMM(eventoRecurrente)) {
        eventos.push(eventoRecurrente);
      }
      
      // Calcular siguiente fecha según tipo de recurrencia
      switch (tipoRecurrencia) {
        case 'anual':
          anio++;
          break;
        case 'mensual':
          mes++;
          if (mes > 13) {
            mes = 1;
            anio++;
          }
          break;
        case 'semanal':
          // Avanzar 7 días (1 semana)
          let diaAbsoluto = pamm_a_dia_absoluto(anio, mes, dia);
          diaAbsoluto += 7;
          
          // Convertir de vuelta a fecha PAMM
          let nuevoAnio = Math.floor((diaAbsoluto - 1) / 365.2425);
          while (dias_hasta_inicio_anio(nuevoAnio + 1) < diaAbsoluto) nuevoAnio++;
          while (dias_hasta_inicio_anio(nuevoAnio) >= diaAbsoluto) nuevoAnio--;
          
          const diaEnAnio = diaAbsoluto - dias_hasta_inicio_anio(nuevoAnio);
          mes = Math.ceil(diaEnAnio / 28) || 1;
          dia = diaEnAnio - (mes - 1) * 28;
          anio = nuevoAnio;
          break;
      }
      
      // Límite de seguridad para evitar bucles infinitos
      if (contador > 1000) break;
    }
    
    return eventos;
  }

  // Guardar eventos en localStorage
  function guardarEventosPersonales(eventos) {
    localStorage.setItem('eventosPamm', JSON.stringify(eventos));
  }

  // Renderizar la lista de eventos
  function renderizarEventos() {
    const eventos = cargarEventosPersonales();
    const listaEventos = document.getElementById('lista-eventos');
    
    if (!listaEventos) return;
    
    if (eventos.length === 0) {
      listaEventos.innerHTML = '<p class="sin-eventos">No tienes eventos personales guardados. Agrega tu primer evento arriba.</p>';
      return;
    }
    
    // Ordenar eventos por fecha
    eventos.sort((a, b) => {
      const fechaA = pamm_a_dia_absoluto(a.anio, a.mes, a.dia);
      const fechaB = pamm_a_dia_absoluto(b.anio, b.mes, b.dia);
      return fechaA - fechaB;
    });
    
    listaEventos.innerHTML = '';
    
    eventos.forEach((evento, index) => {
      const eventoDiv = document.createElement('div');
      eventoDiv.className = `evento-item ${evento.categoria}`;
      
      // Determinar si es parte de una serie recurrente
      const esParteDeSerie = evento.esRecurrente && evento.anioBase !== undefined;
      const indicadorRecurrente = esParteDeSerie ? 
        `<span class="evento-recurrente-badge">${getTipoRecurrenciaLabel(evento.tipoRecurrencia)}</span>` : '';
      
      eventoDiv.innerHTML = `
        <div class="evento-header">
          <div class="evento-nombre-texto">
            ${evento.nombre}
            ${indicadorRecurrente}
          </div>
          <button class="evento-eliminar" data-index="${index}">Eliminar</button>
        </div>
        <div class="evento-fecha">
          ${evento.dia} de ${MESES_PAMM[evento.mes - 1]} de ${evento.anio} PAMM
          <br>
          <small>Equivalente gregoriano: ${pamm_a_gregoriano(evento.anio, evento.mes, evento.dia).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
        </div>
        <div class="evento-categoria">${getCategoriaLabel(evento.categoria)}</div>
      `;
      
      listaEventos.appendChild(eventoDiv);
    });
    
    // Agregar event listeners para botones de eliminar
    document.querySelectorAll('.evento-eliminar').forEach(boton => {
      boton.addEventListener('click', function() {
        const index = parseInt(this.dataset.index);
        eliminarEvento(index);
      });
    });
  }

  // Obtener etiqueta de categoría
  function getCategoriaLabel(categoria) {
    const labels = {
      "personal": "🟡 Personal",
      "trabajo": "🔵 Trabajo",
      "familia": "🟢 Familia", 
      "salud": "🔴 Salud",
      "educacion": "🟠 Educación",
      "viaje": "🟣 Viaje",
      "otro": "⚫ Otro"
    };
    return labels[categoria] || categoria;
  }

  // Obtener etiqueta de tipo de recurrencia
  function getTipoRecurrenciaLabel(tipo) {
    const labels = {
      "anual": "🗓️ Anual",
      "mensual": "📅 Mensual",
      "semanal": "📆 Semanal"
    };
    return labels[tipo] || tipo;
  }

  // Agregar nuevo evento
  function agregarEvento() {
    const anio = parseInt(document.getElementById('evento-anio').value);
    const mes = parseInt(document.getElementById('evento-mes').value);
    const dia = parseInt(document.getElementById('evento-dia').value);
    const nombre = document.getElementById('evento-nombre').value.trim();
    const categoria = document.getElementById('evento-categoria').value;
    
    // Validar campos
    if (isNaN(anio) || isNaN(mes) || isNaN(dia) || !nombre) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }
    
    // Validar rangos
    if (anio < 0 || anio > 3000) {
      alert('El año debe estar entre 0 y 3000.');
      return;
    }
    
    if (mes < 1 || mes > 13) {
      alert('El mes debe estar entre 1 y 13.');
      return;
    }
    
    const diasEnMes = mes < 13 ? 28 : (es_bisiesto(anio) ? 30 : 29);
    if (dia < 1 || dia > diasEnMes) {
      alert(`El día debe estar entre 1 y ${diasEnMes} para el mes seleccionado.`);
      return;
    }
    
    // Verificar si es un evento recurrente
    const esRecurrente = document.getElementById('evento-recurrente').checked;
    let eventosAgregar = [];
    
    if (esRecurrente) {
      const tipoRecurrencia = document.getElementById('evento-tipo-recurrencia').value;
      const maxOcurrencias = parseInt(document.getElementById('recurrencia-max-ocurrencias').value) || null;
      const fechaFin = document.getElementById('recurrencia-fecha-fin').value;
      
      // Generar eventos recurrentes
      eventosAgregar = generarEventosRecurrentes(anio, mes, dia, nombre, categoria, tipoRecurrencia, maxOcurrencias, fechaFin);
    } else {
      // Crear evento único
      const eventoUnico = {
        anio,
        mes,
        dia,
        nombre,
        categoria,
        id: generarIdUnico(),
        esRecurrente: false
      };
      
      // Validar evento mejorado
      if (!validarEventoPAMM(eventoUnico)) {
        alert('Por favor, verifica que los datos del evento sean correctos.');
        return;
      }
      
      eventosAgregar = [eventoUnico];
    }
    
    // Cargar eventos existentes y agregar los nuevos
    const eventos = cargarEventosPersonales();
    eventos.push(...eventosAgregar);
    
    // Guardar y renderizar
    guardarEventosPersonales(eventos);
    renderizarEventos();
    
    // Limpiar formulario
    document.getElementById('evento-anio').value = '';
    document.getElementById('evento-dia').value = '';
    document.getElementById('evento-nombre').value = '';
    document.getElementById('evento-mes').value = '1';
    document.getElementById('evento-categoria').value = 'personal';
    document.getElementById('evento-recurrente').checked = false;
    document.getElementById('opciones-recurrencia').classList.add('oculto');
    document.getElementById('recurrencia-max-ocurrencias').value = '';
    document.getElementById('recurrencia-fecha-fin').value = '';
    
    // Actualizar calendario para mostrar el nuevo evento
    renderCalendario();
    
    // Mostrar mensaje de éxito
    const btn = document.getElementById('btn-agregar-evento');
    const textoOriginal = btn.textContent;
    btn.textContent = '✓ Evento agregado';
    btn.style.backgroundColor = '#27ae60';
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.style.backgroundColor = '';
    }, 2000);
  }

  // Eliminar evento
  function eliminarEvento(index) {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      return;
    }
    
    const eventos = cargarEventosPersonales();
    eventos.splice(index, 1);
    guardarEventosPersonales(eventos);
    renderizarEventos();
    renderCalendario();
  }

  // Limpiar todos los eventos
  function limpiarEventos() {
    if (!confirm('¿Estás seguro de que quieres eliminar todos tus eventos personales? Esta acción no se puede deshacer.')) {
      return;
    }
    
    localStorage.removeItem('eventosPamm');
    renderizarEventos();
    renderCalendario();
  }

  // Modificar la función renderCalendario para incluir eventos personales
  const renderCalendarioOriginal = renderCalendario;
  renderCalendario = function() {
    renderCalendarioOriginal();
    
    // Agregar eventos personales al calendario
    const eventos = cargarEventosPersonales();
    const grid = document.getElementById('cal-grid');
    
    if (!grid) return;
    
    // Obtener todas las celdas del calendario
    const celdas = grid.querySelectorAll('.cal-celda:not(.vacia)');
    
    celdas.forEach(celda => {
      const diaNum = celda.querySelector('.cal-dia-num');
      if (!diaNum) return;
      
      const dia = parseInt(diaNum.textContent);
      const fechaGreg = pamm_a_gregoriano(calAnio, calMes, dia);
      
      // Buscar eventos personales en este día
      const eventosDelDia = eventos.filter(evento => 
        evento.anio === calAnio && 
        evento.mes === calMes && 
        evento.dia === dia
      );
      
      if (eventosDelDia.length > 0) {
        // Agregar clase de evento personal
        celda.classList.add('evento-personal');
        
        // Usar el color del primer evento (o combinar colores si hay múltiples)
        const colorEvento = coloresEventosPersonales[eventosDelDia[0].categoria] || '#95a5a6';
        celda.style.borderRight = `4px solid ${colorEvento}`;
        
        // Crear tooltip para eventos personales
        const tooltip = document.createElement('span');
        tooltip.className = 'cal-tooltip evento-personal-tooltip';
        tooltip.innerHTML = eventosDelDia.map(e => `📅 ${e.nombre}`).join('<br>');
        celda.appendChild(tooltip);
        
        // Agregar indicador visual de eventos personales
        const indicador = document.createElement('div');
        indicador.className = 'evento-indicador';
        indicador.style.backgroundColor = colorEvento;
        celda.appendChild(indicador);
      }
    });
  };

  // Event listeners para eventos personales
  const btnAgregarEvento = document.getElementById('btn-agregar-evento');
  const btnLimpiarEventos = document.getElementById('btn-limpiar-eventos');
  const chkRecurrente = document.getElementById('evento-recurrente');
  
  if (btnAgregarEvento) {
    btnAgregarEvento.addEventListener('click', agregarEvento);
  }
  
  if (btnLimpiarEventos) {
    btnLimpiarEventos.addEventListener('click', limpiarEventos);
  }
  
  // Event listener para mostrar/ocultar opciones de recurrencia
  if (chkRecurrente) {
    chkRecurrente.addEventListener('change', function() {
      const opcionesRecurrencia = document.getElementById('opciones-recurrencia');
      if (this.checked) {
        opcionesRecurrencia.classList.remove('oculto');
      } else {
        opcionesRecurrencia.classList.add('oculto');
      }
    });
  }
  
  // Event listener para Enter en el campo de nombre
  const eventoNombre = document.getElementById('evento-nombre');
  if (eventoNombre) {
    eventoNombre.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        agregarEvento();
      }
    });
  }
  
  // Renderizar eventos al cargar la página
  renderizarEventos();

  // =============================================================================
  // BÚSQUEDA RÁPIDA DE FECHAS
  // =============================================================================
  
  const busquedaInput = document.getElementById("busqueda-input");
  const btnBuscar = document.getElementById("btn-buscar");
  const resultadosBusqueda = document.getElementById("resultados-busqueda");
  const listaResultados = document.getElementById("lista-resultados");
  
  // Realizar búsqueda
  function realizarBusqueda() {
    const termino = busquedaInput.value.trim().toLowerCase();
    const tipoBusqueda = document.querySelector('input[name="tipo-busqueda"]:checked').value;
    
    if (!termino) {
      resultadosBusqueda.classList.add("oculto");
      return;
    }
    
    let resultados = [];
    
    // Buscar en festividades
    if (tipoBusqueda === "todo" || tipoBusqueda === "festividades") {
      const resultadosFestividades = fechas_culturales.filter(festividad =>
        festividad.nombre.toLowerCase().includes(termino)
      ).map(festividad => ({
        tipo: "festividad",
        titulo: festividad.nombre,
        fecha: `${festividad.dia} de ${MESES_PAMM[gregoriano_a_pamm(new Date(2026, festividad.mes, festividad.dia)).mes - 1]} de ${gregoriano_a_pamm(new Date(2026, festividad.mes, festividad.dia)).anio}`,
        fechaGreg: `${festividad.dia}/${festividad.mes + 1}`,
        categoria: festividad.categoria,
        color: coloresPorCategoria[festividad.categoria] || "#95a5a6"
      }));
      
      resultados = resultados.concat(resultadosFestividades);
    }
    
    // Buscar en eventos personales
    if (tipoBusqueda === "todo" || tipoBusqueda === "eventos") {
      const eventos = cargarEventosPersonales();
      const resultadosEventos = eventos.filter(evento =>
        evento.nombre.toLowerCase().includes(termino)
      ).map(evento => ({
        tipo: "evento-personal",
        titulo: evento.nombre,
        fecha: `${evento.dia} de ${MESES_PAMM[evento.mes - 1]} de ${evento.anio}`,
        fechaGreg: pamm_a_gregoriano(evento.anio, evento.mes, evento.dia).toLocaleDateString('es-ES'),
        categoria: evento.categoria,
        color: coloresEventosPersonales[evento.categoria] || "#95a5a6",
        eventoData: evento
      }));
      
      resultados = resultados.concat(resultadosEventos);
    }
    
    // Mostrar resultados
    mostrarResultados(resultados);
  }
  
  // Mostrar resultados de búsqueda
  function mostrarResultados(resultados) {
    if (resultados.length === 0) {
      listaResultados.innerHTML = '<div class="sin-resultados">No se encontraron resultados para tu búsqueda.</div>';
      resultadosBusqueda.classList.remove("oculto");
      return;
    }
    
    listaResultados.innerHTML = '';
    
    resultados.forEach(resultado => {
      const resultadoDiv = document.createElement('div');
      resultadoDiv.className = `resultado-item ${resultado.tipo}`;
      resultadoDiv.style.borderLeftColor = resultado.color;
      
      resultadoDiv.innerHTML = `
        <div class="resultado-titulo">${resultado.titulo}</div>
        <div class="resultado-fecha">
          📅 ${resultado.fecha}
          <br>
          <small>📆 ${resultado.fechaGreg}</small>
        </div>
        <div class="resultado-tipo">${resultado.tipo === 'festividad' ? '🎉 Festividad' : '📋 Evento Personal'}</div>
      `;
      
      // Agregar evento click para ir al calendario
      resultadoDiv.addEventListener('click', function() {
        if (resultado.tipo === 'evento-personal') {
          // Ir a la fecha del evento personal
          const evento = resultado.eventoData;
          calAnio = evento.anio;
          calMes = evento.mes;
          renderCalendario();
          document.getElementById('calendario').scrollIntoView({ behavior: 'smooth' });
        } else {
          // Para festividades, ir a la fecha correspondiente
          const partesFecha = resultado.fecha.split(' ');
          const dia = parseInt(partesFecha[0]);
          const mesNombre = partesFecha[2];
          const mesIndex = MESES_PAMM.indexOf(mesNombre) + 1;
          const año = parseInt(partesFecha[4]);
          
          if (mesIndex > 0) {
            calAnio = año;
            calMes = mesIndex;
            renderCalendario();
            document.getElementById('calendario').scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
      
      listaResultados.appendChild(resultadoDiv);
    });
    
    resultadosBusqueda.classList.remove("oculto");
  }
  
  // Event listeners para búsqueda
  if (btnBuscar) {
    btnBuscar.addEventListener("click", realizarBusqueda);
  }
  
  if (busquedaInput) {
    // Búsqueda en tiempo real mientras escribe
    let debounceTimer;
    busquedaInput.addEventListener("input", function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(realizarBusqueda, 300);
    });
    
    // Búsqueda con Enter
    busquedaInput.addEventListener("keypress", function(e) {
      if (e.key === 'Enter') {
        realizarBusqueda();
      }
    });
  }
  
  // Event listeners para radio buttons
  document.querySelectorAll('input[name="tipo-busqueda"]').forEach(radio => {
    radio.addEventListener("change", realizarBusqueda);
  });
  
  // Atajo de teclado para búsqueda (Ctrl+F o Cmd+F)
  document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      busquedaInput.focus();
      busquedaInput.select();
    }
  });

  // =============================================================================
  // MODO OSCURO/CLARO (TOGGLE DE TEMA)
  // =============================================================================
  
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle?.querySelector(".theme-icon");
  
  // Función para cargar el tema guardado
  function cargarTema() {
    const temaGuardado = localStorage.getItem('temaCalendarioPamm');
    if (temaGuardado) {
      document.documentElement.setAttribute('data-theme', temaGuardado);
      actualizarIconoTema(temaGuardado);
    } else {
      // Detectar preferencia del sistema
      const temaSistema = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', temaSistema);
      actualizarIconoTema(temaSistema);
    }
  }
  
  // Función para actualizar el icono del tema
  function actualizarIconoTema(tema) {
    if (themeIcon) {
      themeIcon.textContent = tema === 'light' ? '☀️' : '🌙';
    }
  }
  
  // Función para cambiar el tema
  function cambiarTema() {
    const temaActual = document.documentElement.getAttribute('data-theme');
    const nuevoTema = temaActual === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', nuevoTema);
    localStorage.setItem('temaCalendarioPamm', nuevoTema);
    actualizarIconoTema(nuevoTema);
    
    // Agregar animación de transición
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }
  
  // Event listener para el botón de toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", cambiarTema);
    
    // Soporte de teclado
    themeToggle.addEventListener("keypress", function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cambiarTema();
      }
    });
  }
  
  // Escuchar cambios en preferencia del sistema
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(e) {
    // Solo cambiar si el usuario no ha guardado una preferencia
    if (!localStorage.getItem('temaCalendarioPamm')) {
      const nuevoTema = e.matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nuevoTema);
      actualizarIconoTema(nuevoTema);
    }
  });
  
  // Atajo de teclado para cambiar tema (Ctrl+Shift+T o Cmd+Shift+T)
  document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      cambiarTema();
    }
  });
  
  // Cargar tema al iniciar
  cargarTema();

  // =============================================================================
  // SISTEMA DE BACKUP DE EVENTOS
  // =============================================================================
  
  const btnExportarEventos = document.getElementById("btn-exportar-eventos");
  const btnImportarEventos = document.getElementById("btn-importar-eventos");
  const importarArchivo = document.getElementById("importar-archivo");
  
  // Exportar eventos a archivo JSON
  function exportarEventos() {
    try {
      const eventos = cargarEventosPersonales();
      
      if (eventos.length === 0) {
        alert('No tienes eventos para exportar.');
        return;
      }
      
      // Crear objeto con metadatos
      const backup = {
        version: "1.0",
        fechaExportacion: new Date().toISOString(),
        aplicacion: "Calendario PAMM",
        totalEventos: eventos.length,
        eventos: eventos
      };
      
      // Convertir a JSON
      const json = JSON.stringify(backup, null, 2);
      
      // Crear blob y descargar
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendario-pamm-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      // Mostrar mensaje de éxito
      const btn = btnExportarEventos;
      const textoOriginal = btn.textContent;
      btn.textContent = '✓ Exportado';
      btn.style.backgroundColor = 'var(--color-success)';
      setTimeout(() => {
        btn.textContent = textoOriginal;
        btn.style.backgroundColor = '';
      }, 2000);
      
    } catch (error) {
      console.error('Error exportando eventos:', error);
      alert('Error al exportar eventos. Por favor, intenta nuevamente.');
    }
  }

  // Exportar eventos a archivo JSON (mejorado)
  function exportarEventosMejorado() {
    try {
      const eventos = cargarEventosPersonales();
      
      if (eventos.length === 0) {
        alert('No tienes eventos para exportar.');
        return;
      }
      
      // Crear backup en formato v2.0
      const backup = {
        metadata: {
          version: "2.0",
          aplicacion: "Calendario PAMM",
          fechaExportacion: new Date().toISOString(),
          totalEventos: eventos.length
        },
        eventos: eventos
      };
      
      // Crear y descargar archivo
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendario-pamm-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      mostrarMensajeExito(`${eventos.length} eventos exportados correctamente`);
      
    } catch (error) {
      console.error('Error exportando eventos:', error);
      alert('Error al exportar eventos. Por favor, intenta nuevamente.');
    }
  }

  // Mostrar mensaje de éxito - Global
  window.mostrarMensajeExito = function(mensaje) {
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = 'mensaje-exito';
    mensajeDiv.textContent = '✓ ' + mensaje;
    mensajeDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--color-success);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(mensajeDiv);
    
    setTimeout(() => {
      mensajeDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (mensajeDiv.parentNode) {
          mensajeDiv.parentNode.removeChild(mensajeDiv);
        }
      }, 300);
    }, 3000);
  }
  
  // Importar eventos desde archivo JSON
  function importarEventos(evento) {
    try {
      const archivo = evento.target.files[0];
      
      if (!archivo) return;
      
      if (!archivo.name.endsWith('.json')) {
        alert('Por favor, selecciona un archivo JSON válido.');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const contenido = e.target.result;
          const backup = JSON.parse(contenido);
          
          let eventosImportados = [];
          
          // Soportar ambos formatos (v1.0 y v2.0)
          if (backup.metadata && backup.metadata.version === "2.0") {
            // Formato v2.0
            eventosImportados = backup.eventos || [];
          } else if (backup.eventos && Array.isArray(backup.eventos)) {
            // Formato v1.0
            eventosImportados = backup.eventos;
          } else {
            throw new Error('Formato de backup inválido');
          }
          
          // Validar que sea de Calendario PAMM
          const appNombre = backup.metadata?.aplicacion || backup.aplicacion;
          if (appNombre && appNombre !== "Calendario PAMM") {
            if (!confirm('Este archivo no parece ser un backup de Calendario PAMM. ¿Deseas continuar importando?')) {
              return;
            }
          }
          
          // Validar eventos
          const eventosValidos = eventosImportados.filter(evento => {
            // Eliminar campos adicionales si existen
            const eventoLimpio = {
              nombre: evento.nombre,
              anio: evento.anio,
              mes: evento.mes,
              dia: evento.dia,
              categoria: evento.categoria || 'otro',
              descripcion: evento.descripcion || '',
              esRecurrente: evento.esRecurrente || false,
              tipoRecurrencia: evento.tipoRecurrencia,
              anioBase: evento.anioBase,
              mesBase: evento.mesBase,
              diaBase: evento.diaBase
            };
            
            return validarEventoPAMM(eventoLimpio);
          });
          
          if (eventosValidos.length === 0) {
            alert('No se encontraron eventos válidos en el archivo JSON.');
            return;
          }
          
          // Mostrar vista previa y confirmar
          const confirmar = confirm(
            `Se encontraron ${eventosValidos.length} eventos válidos de ${eventosImportados.length} totales.\n\n` +
            `¿Deseas importar estos eventos?\n\n` +
            `Nota: Esto agregará los eventos a tu lista actual.`
          );
          
          if (!confirmar) return;
          
          // Importar eventos
          const eventosActuales = cargarEventosPersonales();
          const nuevosEventos = [...eventosActuales, ...eventosValidos];
          guardarEventosPersonales(nuevosEventos);
          
          // Actualizar interfaz
          renderizarEventos();
          renderCalendario();
          
          mostrarMensajeExito(`${eventosValidos.length} eventos importados desde JSON`);
          
        } catch (error) {
          console.error('Error procesando backup:', error);
          alert('Error al procesar el archivo. Verifica que sea un backup válido de Calendario PAMM.');
        }
      };
      
      reader.onerror = function() {
        alert('Error al leer el archivo. Por favor, intenta nuevamente.');
      };
      
      reader.readAsText(archivo);
      
      // Limpiar input
      evento.target.value = '';
      
    } catch (error) {
      console.error('Error importando eventos:', error);
      alert('Error al importar eventos. Por favor, intenta nuevamente.');
    }
  }
  
  // Add CSS animations for success messages
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(styleSheet);

  // Event listeners para backup
  if (btnExportarEventos) {
    btnExportarEventos.addEventListener("click", exportarEventosMejorado);
  }
  
  if (btnImportarEventos && importarArchivo) {
    btnImportarEventos.addEventListener("click", function() {
      importarArchivo.click();
    });
    
    importarArchivo.addEventListener("change", importarEventos);
  }

  // =============================================================================
  // LÓGICA DEL MODAL DE AUTENTICACIÓN
  // =============================================================================
  
  const authButton = document.getElementById('auth-button');
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.querySelector('.auth-modal-close');
  const authTabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');

  // Abrir modal de autenticación
  if (authButton) {
    authButton.addEventListener('click', function() {
      if (currentUser) {
        // Si ya está autenticado, mostrar info de usuario
        mostrarInfoUsuario();
      } else {
        // Si no está autenticado, mostrar login/registro
        authModal.classList.remove('oculto');
      }
    });
  }

  // Cerrar modal
  if (authModalClose) {
    authModalClose.addEventListener('click', function() {
      authModal.classList.add('oculto');
      limpiarErrores();
    });
  }

  // Cerrar modal al hacer clic fuera
  if (authModal) {
    authModal.addEventListener('click', function(e) {
      if (e.target === authModal) {
        authModal.classList.add('oculto');
        limpiarErrores();
      }
    });
  }

  // Tabs de login/registro
  authTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabType = this.dataset.tab;
      
      // Actualizar tabs activos
      authTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Mostrar formulario correspondiente
      if (tabType === 'login') {
        loginForm.classList.remove('oculto');
        registerForm.classList.add('oculto');
        userInfo.classList.add('oculto');
      } else if (tabType === 'register') {
        loginForm.classList.add('oculto');
        registerForm.classList.remove('oculto');
        userInfo.classList.add('oculto');
      }
      
      limpiarErrores();
    });
  });

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!firebaseInitialized) {
        loginError.textContent = 'Firebase no está configurado. Contacta al administrador.';
        return;
      }
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      try {
        await signInWithEmailAndPassword(auth, email, password);
        authModal.classList.add('oculto');
        loginForm.reset();
        mostrarMensajeExito('Sesión iniciada correctamente');
      } catch (error) {
        console.error('Error de login:', error);
        switch (error.code) {
          case 'auth/user-not-found':
            loginError.textContent = 'Usuario no encontrado';
            break;
          case 'auth/wrong-password':
            loginError.textContent = 'Contraseña incorrecta';
            break;
          case 'auth/invalid-email':
            loginError.textContent = 'Email inválido';
            break;
          default:
            loginError.textContent = 'Error al iniciar sesión: ' + error.message;
        }
      }
    });
  }

  // Registro
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!firebaseInitialized) {
        registerError.textContent = 'Firebase no está configurado. Contacta al administrador.';
        return;
      }
      
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      
      // Validar contraseñas
      if (password !== confirmPassword) {
        registerError.textContent = 'Las contraseñas no coinciden';
        return;
      }
      
      if (password.length < 6) {
        registerError.textContent = 'La contraseña debe tener al menos 6 caracteres';
        return;
      }
      
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        authModal.classList.add('oculto');
        registerForm.reset();
        mostrarMensajeExito('Cuenta creada correctamente');
      } catch (error) {
        console.error('Error de registro:', error);
        switch (error.code) {
          case 'auth/email-already-in-use':
            registerError.textContent = 'Este email ya está registrado';
            break;
          case 'auth/invalid-email':
            registerError.textContent = 'Email inválido';
            break;
          case 'auth/weak-password':
            registerError.textContent = 'La contraseña es muy débil';
            break;
          default:
            registerError.textContent = 'Error al crear cuenta: ' + error.message;
        }
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      try {
        await signOut(auth);
        authModal.classList.add('oculto');
        mostrarMensajeExito('Sesión cerrada correctamente');
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('Error al cerrar sesión');
      }
    });
  }

  // Función para mostrar info de usuario
  function mostrarInfoUsuario() {
    if (currentUser) {
      userEmail.textContent = currentUser.email;
      loginForm.classList.add('oculto');
      registerForm.classList.add('oculto');
      userInfo.classList.remove('oculto');
      authModal.classList.remove('oculto');
    }
  }

  // Función para limpiar errores
  function limpiarErrores() {
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
  }

  // =============================================================================
  // FUNCIONES DE FIREBASE PARA EVENTOS
  // =============================================================================
  
  // Cargar eventos desde Firebase
  async function cargarEventosDesdeFirebase() {
    if (!firebaseInitialized || !currentUser) {
      return cargarEventosPersonales(); // Fallback a localStorage
    }
    
    try {
      const eventosRef = collection(db, 'usuarios', currentUser.uid, 'eventos');
      const querySnapshot = await getDocs(eventosRef);
      const eventos = [];
      
      querySnapshot.forEach((doc) => {
        eventos.push({ id: doc.id, ...doc.data() });
      });
      
      // Guardar en localStorage como backup
      localStorage.setItem('eventosPamm', JSON.stringify(eventos));
      
      return eventos;
    } catch (error) {
      console.error('Error cargando eventos desde Firebase:', error);
      return cargarEventosPersonales(); // Fallback a localStorage
    }
  }

  // Guardar evento en Firebase
  async function guardarEventoEnFirebase(evento) {
    if (!firebaseInitialized || !currentUser) {
      return false; // Usar localStorage como fallback
    }
    
    try {
      const eventosRef = collection(db, 'usuarios', currentUser.uid, 'eventos');
      await addDoc(eventosRef, evento);
      return true;
    } catch (error) {
      console.error('Error guardando evento en Firebase:', error);
      return false;
    }
  }

  // Eliminar evento de Firebase
  async function eliminarEventoDeFirebase(eventoId) {
    if (!firebaseInitialized || !currentUser) {
      return false;
    }
    
    try {
      const eventoRef = doc(db, 'usuarios', currentUser.uid, 'eventos', eventoId);
      await deleteDoc(eventoRef);
      return true;
    } catch (error) {
      console.error('Error eliminando evento de Firebase:', error);
      return false;
    }
  }

  // Modificar la función agregarEvento para usar Firebase
  const agregarEventoOriginal = agregarEvento;
  agregarEvento = async function() {
    const anio = parseInt(document.getElementById('evento-anio').value);
    const mes = parseInt(document.getElementById('evento-mes').value);
    const dia = parseInt(document.getElementById('evento-dia').value);
    const nombre = document.getElementById('evento-nombre').value.trim();
    const categoria = document.getElementById('evento-categoria').value;
    
    // Validar campos
    if (isNaN(anio) || isNaN(mes) || isNaN(dia) || !nombre) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }
    
    // Validar rangos
    if (anio < 0 || anio > 3000) {
      alert('El año debe estar entre 0 y 3000.');
      return;
    }
    
    if (mes < 1 || mes > 13) {
      alert('El mes debe estar entre 1 y 13.');
      return;
    }
    
    const diasEnMes = mes < 13 ? 28 : (es_bisiesto(anio) ? 30 : 29);
    if (dia < 1 || dia > diasEnMes) {
      alert(`El día debe estar entre 1 y ${diasEnMes} para el mes seleccionado.`);
      return;
    }
    
    // Verificar si es un evento recurrente
    const esRecurrente = document.getElementById('evento-recurrente').checked;
    let eventosAgregar = [];
    
    if (esRecurrente) {
      const tipoRecurrencia = document.getElementById('evento-tipo-recurrencia').value;
      const maxOcurrencias = parseInt(document.getElementById('recurrencia-max-ocurrencias').value) || null;
      const fechaFin = document.getElementById('recurrencia-fecha-fin').value;
      
      // Generar eventos recurrentes
      eventosAgregar = generarEventosRecurrentes(anio, mes, dia, nombre, categoria, tipoRecurrencia, maxOcurrencias, fechaFin);
    } else {
      // Crear evento único
      const eventoUnico = {
        anio,
        mes,
        dia,
        nombre,
        categoria,
        id: generarIdUnico(),
        esRecurrente: false
      };
      
      // Validar evento mejorado
      if (!validarEventoPAMM(eventoUnico)) {
        alert('Por favor, verifica que los datos del evento sean correctos.');
        return;
      }
      
      eventosAgregar = [eventoUnico];
    }
    
    // Si Firebase está configurado y usuario autenticado, guardar en Firebase
    if (firebaseInitialized && currentUser) {
      for (const evento of eventosAgregar) {
        // Eliminar el ID temporal para que Firestore genere uno propio
        const eventoParaGuardar = { ...evento };
        delete eventoParaGuardar.id;
        
        const guardado = await guardarEventoEnFirebase(eventoParaGuardar);
        if (!guardado) {
          console.warn('No se pudo guardar en Firebase, usando localStorage');
          break;
        }
      }
      
      // Recargar eventos desde Firebase
      await cargarEventosDesdeFirebase();
    } else {
      // Usar localStorage
      const eventos = cargarEventosPersonales();
      eventos.push(...eventosAgregar);
      guardarEventosPersonales(eventos);
    }
    
    // Renderizar
    renderizarEventos();
    
    // Limpiar formulario
    document.getElementById('evento-anio').value = '';
    document.getElementById('evento-dia').value = '';
    document.getElementById('evento-nombre').value = '';
    document.getElementById('evento-mes').value = '1';
    document.getElementById('evento-categoria').value = 'personal';
    document.getElementById('evento-recurrente').checked = false;
    document.getElementById('opciones-recurrencia').classList.add('oculto');
    document.getElementById('recurrencia-max-ocurrencias').value = '';
    document.getElementById('recurrencia-fecha-fin').value = '';
    
    // Actualizar calendario para mostrar el nuevo evento
    renderCalendario();
    
    // Mostrar mensaje de éxito
    const btn = document.getElementById('btn-agregar-evento');
    const textoOriginal = btn.textContent;
    btn.textContent = '✓ Evento agregado';
    btn.style.backgroundColor = '#27ae60';
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.style.backgroundColor = '';
    }, 2000);
  };

  // Modificar la función eliminarEvento para usar Firebase
  const eliminarEventoOriginal = eliminarEvento;
  eliminarEvento = async function(index) {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      return;
    }
    
    const eventos = cargarEventosPersonales();
    const eventoAEliminar = eventos[index];
    
    // Si Firebase está configurado y usuario autenticado, eliminar de Firebase
    if (firebaseInitialized && currentUser && eventoAEliminar.id) {
      const eliminado = await eliminarEventoDeFirebase(eventoAEliminar.id);
      if (eliminado) {
        await cargarEventosDesdeFirebase();
      } else {
        // Fallback a localStorage
        eventos.splice(index, 1);
        guardarEventosPersonales(eventos);
      }
    } else {
      // Usar localStorage
      eventos.splice(index, 1);
      guardarEventosPersonales(eventos);
    }
    
    renderizarEventos();
    renderCalendario();
  };

  // Modificar la función limpiarEventos para usar Firebase
  const limpiarEventosOriginal = limpiarEventos;
  limpiarEventos = async function() {
    if (!confirm('¿Estás seguro de que quieres eliminar todos tus eventos personales? Esta acción no se puede deshacer.')) {
      return;
    }
    
    // Si Firebase está configurado y usuario autenticado, eliminar todos de Firebase
    if (firebaseInitialized && currentUser) {
      try {
        const eventosRef = collection(db, 'usuarios', currentUser.uid, 'eventos');
        const querySnapshot = await getDocs(eventosRef);
        
        const batch = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(batch);
        
        await cargarEventosDesdeFirebase();
      } catch (error) {
        console.error('Error eliminando eventos de Firebase:', error);
        localStorage.removeItem('eventosPamm');
      }
    } else {
      localStorage.removeItem('eventosPamm');
    }
    
    renderizarEventos();
    renderCalendario();
  };

  // =============================================================================
  // ESTADO DE AUTENTICACIÓN (al final para que todas las funciones estén definidas)
  // =============================================================================
  
  // Definir cargarEventosPersonales aquí para que esté disponible para onAuthStateChanged
  function cargarEventosPersonales() {
    const eventosGuardados = localStorage.getItem('eventosPamm');
    return eventosGuardados ? JSON.parse(eventosGuardados) : [];
  }
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      console.log('Usuario autenticado:', user.email);
      actualizarUIAutenticacion(true);
      cargarEventosDesdeFirebase();
    } else {
      currentUser = null;
      console.log('Usuario no autenticado');
      actualizarUIAutenticacion(false);
      cargarEventosPersonales(); // Cargar desde localStorage
    }
  });

}); // Fin de DOMContentLoaded
