import { createRoot } from 'react-dom/client';
import '@fontsource/jersey-10/latin.css';
import '@fontsource/jersey-10/latin-ext.css';
import './styles.css';
import { App } from './App';
import { onFirstInteraction, startInput } from './system/input';
import { unlockAudio } from './system/audio';

startInput();
// Browsers only allow sound after the first key press or touch.
onFirstInteraction(unlockAudio);

createRoot(document.getElementById('root')!).render(<App />);
