const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));

const CLAVE = process.env.CLAVE || 'ases';   // contraseña del conductor
const TIEMPO = 60000;                        // 60 segundos por acertijo
const PUNTOS = 200;                          // si adivinan sin pista
const PUNTOS_PISTA = 100;                    // si ya se dio la pista
const INTENTOS = 2;                          // respuestas por equipo en cada acertijo

const EQUIPOS = [
  { nombre: 'Equipo Rojo', color: '#ef4444' },
  { nombre: 'Equipo Azul', color: '#3b82f6' },
  { nombre: 'Equipo Amarillo', color: '#eab308' },
  { nombre: 'Equipo Verde', color: '#22c55e' }
];

// k = palabras que cuentan como respuesta correcta (sin importar acentos ni mayúsculas)
const ACERTIJOS = [
  { cat: 'Clásicos', q: 'Oro parece, plata no es. El que no lo adivine, bien tonto es.', h: 'Es una fruta', a: 'El plátano', k: ['platano', 'banana', 'platanos'] },
  { cat: 'Clásicos', q: 'Blanco por dentro, verde por fuera. Si quieres que te lo diga, espera.', h: 'Es una fruta', a: 'La pera', k: ['pera', 'peras'] },
  { cat: 'Clásicos', q: 'Agua pasa por mi casa, cate de mi corazón.', h: 'Es verde y se usa para el guacamole', a: 'El aguacate', k: ['aguacate', 'aguacates', 'palta'] },
  { cat: 'Clásicos', q: 'Te lo digo y te repito, y te lo vuelvo a decir.', h: 'Se toma calientito', a: 'El té', k: ['te'] },
  { cat: 'Clásicos', q: 'Lana sube, lana baja.', h: 'Junta las palabras', a: 'La navaja', k: ['navaja'] },
  { cat: 'Clásicos', q: 'Tiene dientes y no come, tiene cabeza y no es hombre.', h: 'Se usa en la cocina y huele fuerte', a: 'El ajo', k: ['ajo', 'ajos'] },
  { cat: 'Clásicos', q: 'Tengo agujas y no coso, no tengo pies y ando.', h: 'Lo traes en la muñeca o en la pared', a: 'El reloj', k: ['reloj', 'relojes'] },
  { cat: 'Clásicos', q: 'Mientras más seca, más moja.', h: 'La usas después de bañarte', a: 'La toalla', k: ['toalla'] },
  { cat: 'Clásicos', q: 'Soy alta cuando soy joven y bajita cuando soy vieja.', h: 'Me prendes cuando se va la luz', a: 'La vela', k: ['vela', 'veladora'] },
  { cat: 'Clásicos', q: 'Una vieja con un diente que llama a toda la gente.', h: 'Está en la torre de la iglesia', a: 'La campana', k: ['campana'] },
  { cat: 'Lógica', q: '¿Qué pesa más, un kilo de algodón o un kilo de fierro?', h: 'Fíjate bien en la cantidad', a: 'Pesan lo mismo', k: ['mismo', 'igual', 'iguales', 'ninguno'] },
  { cat: 'Lógica', q: 'Vas en una carrera y rebasas al que va en segundo lugar. ¿En qué lugar quedas?', h: 'No es el primero', a: 'En segundo lugar', k: ['segundo', '2', '2do', '2o'] },
  { cat: 'Lógica', q: 'El papá de María tiene cinco hijas: Lala, Lele, Lili y Lolo. ¿Cómo se llama la quinta?', h: 'Vuelve a leer el principio', a: 'María', k: ['maria'] },
  { cat: 'Lógica', q: '¿Qué meses del año tienen 28 días?', h: 'No es solo febrero', a: 'Todos', k: ['todos', '12'] },
  { cat: 'Lógica', q: 'Un gallo pone un huevo en la punta del techo. ¿Hacia qué lado cae?', h: 'Piensa en el gallo', a: 'Hacia ninguno: los gallos no ponen huevos', k: ['no ponen', 'no pone', 'ninguno', 'ningun', 'no ponen huevos'] },
  { cat: 'Lógica', q: '¿Cuántos animales de cada especie subió Moisés al arca?', h: 'Revisa quién construyó el arca', a: 'Ninguno: fue Noé', k: ['noe', 'ninguno', 'cero', '0'] },
  { cat: 'Lógica', q: 'Hay tres manzanas y te llevas dos. ¿Cuántas tienes?', h: 'Pregunta cuántas tienes tú', a: 'Dos', k: ['dos', '2'] },
  { cat: 'Lógica', q: 'Un avión se estrella justo en la frontera entre México y Estados Unidos. ¿Dónde entierran a los sobrevivientes?', h: 'Piensa en la palabra "sobrevivientes"', a: 'En ningún lado: siguen vivos', k: ['vivos', 'vivo', 'ningun', 'ninguna', 'ninguno', 'no se entierran', 'no los entierran'] },
  { cat: 'Lógica', q: 'Se rompe con solo decir su nombre.', h: 'Ahorita mismo todos lo están guardando', a: 'El silencio', k: ['silencio'] },
  { cat: 'Lógica', q: 'Tiene ciudades pero no casas, ríos pero no agua, y bosques pero no árboles.', h: 'Lo usas para no perderte', a: 'Un mapa', k: ['mapa', 'mapas'] },
  { cat: 'Lógica', q: 'Entre más hay, menos ves.', h: 'Pasa cuando apagas la luz', a: 'La oscuridad', k: ['oscuridad', 'obscuridad', 'oscuro', 'noche'] },
  { cat: 'Lógica', q: 'Cuanto más le quitas, más grande se hace.', h: 'Se hace con una pala', a: 'Un hoyo', k: ['hoyo', 'agujero', 'pozo', 'hueco'] },
  { cat: 'Oficina', q: 'Tengo teclas pero no soy piano, y sin mí no podrías escribir este correo.', h: 'Está frente a tu computadora', a: 'El teclado', k: ['teclado'] },
  { cat: 'Oficina', q: 'Tiene bandeja y no sirve comida; si se atora, toda la oficina se queja.', h: 'Necesita tinta y hojas', a: 'La impresora', k: ['impresora', 'copiadora', 'fotocopiadora'] },
  { cat: 'Oficina', q: 'Tiene cuello y no tiene cabeza, tiene brazos y no tiene manos.', h: 'La traes puesta', a: 'La camisa', k: ['camisa', 'playera', 'blusa', 'sueter', 'camiseta'] },
  { cat: 'Oficina', q: 'Sale después de cada venta, es largo y delgado, y si lo pierdes no hay factura.', h: 'Lo da la caja al cobrar', a: 'El ticket', k: ['ticket', 'tiket', 'tique', 'recibo', 'comprobante'] },
  { cat: 'Gasolinera', q: 'Entre más corre el coche, más me gasto; sin mí, el motor no arranca.', h: 'Se vende por litro', a: 'La gasolina', k: ['gasolina', 'combustible', 'gas'] },
  { cat: 'Gasolinera', q: 'Tengo manguera y no soy bombero; despacho todo el día y nunca cobro sueldo.', h: 'Tiene una pistola y un contador de litros', a: 'La bomba de gasolina', k: ['bomba', 'dispensario', 'dispensador', 'surtidor', 'despachador'] },
  { cat: 'Gasolinera', q: 'Me inflan cuando estoy bajito y me cambian cuando me poncho.', h: 'Tiene presión y el coche lleva cuatro', a: 'La llanta', k: ['llanta', 'llantas', 'neumatico', 'rueda'] },
  { cat: 'Gasolinera', q: 'Me llenas por la boca, pero nunca como; te aviso con una luz cuando estoy vacío.', h: 'Está escondido en la parte de atrás del coche', a: 'El tanque de gasolina', k: ['tanque', 'deposito'] }
];

const limpiar = t => ' ' + String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const correcta = (texto, k) => { const n = limpiar(texto); return k.some(p => n.includes(limpiar(p))); };
const revolver = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const nuevo = () => ({
  fase: 'espera', qi: -1, orden: revolver(ACERTIJOS.length), pista: false, inicio: 0, fin: 0,
  puntos: EQUIPOS.map(() => 0), jug: {}, resp: [], ganador: null
});
let s = nuevo();
let reloj = null;
const actual = () => ACERTIJOS[s.orden[s.qi]];

function publico() {
  const a = s.qi >= 0 ? actual() : null;
  const visible = s.fase === 'revelada' || s.fase === 'final';
  return {
    fase: s.fase, n: s.qi + 1, total: ACERTIJOS.length, intentos: INTENTOS,
    cat: a ? a.cat : null, q: a ? a.q : null,
    pista: a && (s.pista || visible) ? a.h : null, conPista: s.pista,
    respuesta: a && visible ? a.a : null,
    vale: s.pista ? PUNTOS_PISTA : PUNTOS,
    restante: s.fase === 'abierta' ? Math.max(0, s.fin - Date.now()) : 0,
    equipos: EQUIPOS.map((e, i) => ({
      ...e, pts: s.puntos[i],
      jugadores: Object.values(s.jug).filter(j => j.eq === i).length,
      usados: s.resp.filter(r => r.eq === i).length
    })),
    ganador: s.ganador,
    todas: visible ? s.resp.map(r => ({ eq: r.eq, nombre: r.nombre, texto: r.texto, ok: r.ok })) : []
  };
}
function avisar() {
  io.emit('estado', publico());
  io.to('host').emit('respuestas', s.resp);
  EQUIPOS.forEach((_, i) => io.to('eq' + i).emit('equipo', s.resp.filter(r => r.eq === i)));
}
function ganar(r) {
  if (s.ganador) return;
  r.ok = true;
  const pts = s.pista ? PUNTOS_PISTA : PUNTOS;
  s.puntos[r.eq] += pts;
  s.ganador = { eq: r.eq, nombre: r.nombre, texto: r.texto, pts };
  s.fase = 'revelada';
  clearTimeout(reloj);
}

io.on('connection', sock => {
  sock.emit('estado', publico());

  sock.on('unirse', ({ id, nombre, eq }) => {
    if (!id || !nombre || !(eq >= 0 && eq < EQUIPOS.length)) return;
    const j = s.jug[id];
    const equipo = j && s.fase !== 'espera' ? j.eq : eq; // el equipo solo se cambia antes de empezar
    s.jug[id] = { nombre: String(nombre).trim().slice(0, 20), eq: equipo };
    EQUIPOS.forEach((_, i) => sock.leave('eq' + i));
    sock.join('eq' + equipo);
    sock.emit('yo', { eq: equipo });
    avisar();
  });

  sock.on('responder', ({ id, texto }) => {
    const j = s.jug[id];
    texto = String(texto || '').trim().slice(0, 60);
    if (s.fase !== 'abierta' || !j || !texto || s.ganador) return;
    if (s.resp.filter(r => r.eq === j.eq).length >= INTENTOS) return;
    const r = { eq: j.eq, nombre: j.nombre, texto, ok: correcta(texto, actual().k), t: Date.now() - s.inicio };
    s.resp.push(r);
    if (r.ok) ganar(r);
    avisar();
  });

  sock.on('host', ({ clave, acc, i }) => {
    if (clave !== CLAVE) return sock.emit('clave', false);
    sock.emit('clave', true);
    sock.join('host');
    if (acc === 'siguiente' && s.qi < ACERTIJOS.length - 1 && s.fase !== 'final') {
      s.qi++; s.fase = 'abierta'; s.pista = false; s.resp = []; s.ganador = null;
      s.inicio = Date.now(); s.fin = s.inicio + TIEMPO;
      clearTimeout(reloj);
      reloj = setTimeout(() => { if (s.fase === 'abierta') { s.fase = 'cerrada'; avisar(); } }, TIEMPO);
    }
    if (acc === 'pista' && s.fase === 'abierta') s.pista = true;
    if (acc === 'revelar' && (s.fase === 'abierta' || s.fase === 'cerrada')) { s.fase = 'revelada'; clearTimeout(reloj); }
    if (acc === 'otorgar' && s.resp[i] && !s.ganador) ganar(s.resp[i]); // para respuestas buenas que el juego no reconoció
    if (acc === 'terminar') { s.fase = 'final'; clearTimeout(reloj); }
    if (acc === 'reiniciar') { clearTimeout(reloj); s = nuevo(); }
    avisar();
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Listo'));
