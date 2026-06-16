import { onMount } from "solid-js";
import { Router, Route } from "@solidjs/router";
import Layout from "./components/Layout";
import Settings from "./routes/Settings";
import Plans from "./routes/Plans";
import PlanDetail from "./routes/PlanDetail";
import Today from "./routes/Today";
import Library from "./routes/Library";
import StudyDetail from "./routes/StudyDetail";
import Collections from "./routes/Collections";
import Timeline from "./routes/Timeline";
import Dashboard from "./routes/Dashboard";
import Notes from "./routes/Notes";
import NoteDetail from "./routes/NoteDetail";
import Graph from "./routes/Graph";
import Report from "./routes/Report";
import { countTables } from "./lib/db";
import { startReminderLoop } from "./lib/notify";

// Placeholders das telas — substituídos por rotas reais nos tickets M1+.
function Placeholder(props: { title: string; hint: string }) {
  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">{props.title}</h1>
      <p class="mt-2 text-sm text-neutral-500">{props.hint}</p>
    </div>
  );
}

export default function App() {
  onMount(async () => {
    try {
      const n = await countTables();
      console.log(`[db] migrations OK — ${n} tabelas no banco`);
    } catch (e) {
      console.error("[db] falha ao abrir/migrar o banco:", e);
    }
    startReminderLoop();
  });

  return (
    <Router root={Layout}>
      <Route path="/" component={Today} />
      <Route path="/biblioteca" component={Library} />
      <Route path="/biblioteca/:id" component={StudyDetail} />
      <Route path="/colecoes" component={Collections} />
      <Route path="/timeline" component={Timeline} />
      <Route path="/painel" component={Dashboard} />
      <Route path="/notas" component={Notes} />
      <Route path="/notas/:id" component={NoteDetail} />
      <Route path="/grafo" component={Graph} />
      <Route path="/relatorio" component={Report} />
      <Route path="/planos" component={Plans} />
      <Route path="/planos/:id" component={PlanDetail} />
      <Route path="/config" component={Settings} />
    </Router>
  );
}
