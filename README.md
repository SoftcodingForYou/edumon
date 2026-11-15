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
```

The production build is a static site (`dist/`) and can be hosted on any web server.

## How to play

- **Flechas**: caminar · **A** (Z): aceptar / menú · **B** (X): volver, mantener para correr · **E**: Edudex · **T**: tabla de tipos (¿quién gana a quién?) · **M**: mapa.
- Todas las teclas se pueden cambiar en *Ajustes → Teclas*; las pistas en pantalla muestran siempre la tecla elegida.
- Para aprender a leer: *Ajustes → Letra* elige entre la letra «Fina» (clara, pensada para quien empieza a leer) y la letra «Píxel», y *Ajustes → Mayúsculas* lo escribe todo en mayúsculas.
- On tablets and phones, on-screen arrows and A/B buttons appear (tap «Menú» / «Edudex» / «Tipos» / «Mapa» in the corner). Gamepads work too.
- **Modo normal**: elige un compañero, lucha con tus Edumón (un ataque cada uno, por turnos) y, si ganas, ¡atrápalo con la bola estrella!
- **Modo fácil**: sin peleas, solo lanza la bola estrella. Cuanto más alto el número en el Edudex, más difícil es atraparlo.
- Los Edumón aparecen por el mundo y se esconden en la hierba alta. Los legendarios esperan en lugares especiales: el cráter del gran volcán, la cumbre nevada, la meseta de la montaña, el santuario del bosque, la isla del lago y la isla volcánica.
- Cada partida se guarda sola en el navegador (`localStorage`): el Edudex al momento, y el estado exacto del juego (dónde estás, los Edumón del mundo…) cada 5 pasos, después de cada combate y al salir. Al cargar la partida sigues justo donde lo dejaste.
