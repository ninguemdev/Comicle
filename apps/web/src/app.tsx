import { strings } from './strings/pt-BR';

export function App() {
  return (
    <main>
      <h1>
        {strings.app.title} — {strings.app.underConstruction}
      </h1>
    </main>
  );
}
