# Edumón

Juego educativo en español para peques de 4 a 6 años: explora el mundo, encuentra y atrapa a los
151 Edumón y completa tu Edudex.

An educational creature-collecting game in Spanish for children aged 4–6. All creatures, art and
music are original.

## Run it

```bash
npm install
npm run dev        # development server, open the URL it prints
npm run build      # production build in dist/
npm run preview    # serve the production build
npm test           # unit tests
npm run export-art # save every creature portrait as a PNG in src/art/ (e.g. 001-chispin.png)
npm run record-attacks # video of all 151 attacks in preview/ (needs Firefox and ffmpeg)
```

The production build is a static site (`dist/`) and can be hosted on any web server.

## How to play

- **Flechas**: caminar · **A** (Espacio): aceptar · **B** (X): volver, mantener para correr · **Q**: menú · **E**: Edudex · **T**: tabla de tipos (¿quién gana a quién?) · **M**: mapa.
- Cada acción tiene una sola tecla, y todas se pueden cambiar en *Ajustes → Teclas*; las pistas en pantalla muestran siempre la tecla elegida. Al escribir el nombre, *Intro* confirma y *Esc* vuelve.
- Para aprender a leer: *Ajustes → Letra* elige entre la letra «Fina» (clara, pensada para quien empieza a leer) y la letra «Píxel», y *Ajustes → Mayúsculas* lo escribe todo en mayúsculas.
- **Leer en voz alta**: en la página del Edudex de un Edumón atrapado, el niño pulsa «Leer» y lee su nombre al micrófono (al atraparlo por primera vez hay que leerlo una vez para seguir; después se puede practicar en el Edudex). También se pueden practicar los Edumón que solo se han visto. Si lo lee bien, gana una estrella; si no, el nombre aparece en sílabas de colores para intentarlo otra vez (con la ✕ de la esquina se deja para otro momento; después de atraparlo aparece tras 5 intentos). Funciona en Chrome, Edge y Safari; donde no se puede escuchar (Firefox, sin permiso para el micrófono) un adulto confirma con «Lo leyó bien». El navegador puede enviar la voz a Google o Apple para entenderla; se puede apagar en *Ajustes → Leer en voz alta*.
- On tablets and phones, on-screen arrows and ✓ (aceptar) / ✗ (volver) buttons appear (tap «Menú» / «Edudex» / «Tipos» / «Mapa» in the corner). Gamepads work too.
- **Modo normal**: elige un compañero, lucha con tus Edumón (un ataque cada uno, por turnos) y, si ganas, ¡atrápalo con la bola estrella! Los Edumón que más luchan salen primero en la lista, con sus victorias / combates en la esquina.
- **Modo fácil**: sin peleas, solo lanza la bola estrella. Cuanto más alto el número en el Edudex, más difícil es atraparlo.
- Al crear una partida eliges el mapa:
  - **Estaciones**: volcanes, playa, nieve, bosque, lago y río.
  - **Santiago**: un Santiago de Chile imaginario. Cada comuna tiene su tipo: Recoleta (Fantasma, el Cementerio General), Ñuñoa (Lucha, el Estadio Nacional), Pudahuel (Aire, el aeropuerto), Lo Barnechea (Hielo, Farellones), Cajón del Maipo (Fuego, el volcán San José), Estación Central (Eléctrico), Quinta Normal (Dragón, el museo), Providencia (Magia, el cerro San Cristóbal), Vitacura (Agua), La Florida (Planta), La Pintana (Bicho), Puente Alto (Roca) y Santiago Centro (Normal).
- Cuando hayas atrapado a los 150, un Edumón misterioso empieza a pasear por todo el mundo: búscalo en el mapa (**M**). ¡Es cinco veces más fuerte que los demás!
- Los Edumón aparecen por el mundo y se esconden en la hierba alta. Los legendarios esperan en lugares especiales (el cráter del volcán, la cumbre nevada…); el mapa (**M**) los marca con una estrella.
- Cada partida se guarda sola en el navegador (`localStorage`): el Edudex al momento, y el estado exacto del juego (dónde estás, los Edumón del mundo…) cada 5 pasos, después de cada combate y al salir. Al cargar la partida sigues justo donde lo dejaste.
- Una partida se puede guardar en un archivo (`.edumon`): elige la partida → «Guardar en un archivo». Para seguirla en otro navegador o aparato: «Cargar de un archivo» en la lista de partidas, ponle un nombre nuevo y listo. El archivo solo sirve para pasarla; después ya no hace falta.
