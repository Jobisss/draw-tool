import { JSX } from "solid-js";
import Sidebar from "./Sidebar";

export default function Layout(props: { children?: JSX.Element }) {
  return (
    <div class="flex h-full">
      <Sidebar />
      <main class="flex-1 overflow-y-auto">{props.children}</main>
    </div>
  );
}
