import React, { Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Landing } from "./routes/Landing";
import { ClientPage } from "./routes/ClientPage";
import { DeckView } from "./routes/DeckView";
import { RequirementsView } from "./routes/RequirementsView";
import { NotesView } from "./routes/NotesView";
import { PocView } from "./routes/PocView";

function PortalLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-ink-400">
              Loading...
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Portal routes render inside the sidebar + main wrapper */}
      <Route element={<PortalLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/:clientSlug" element={<ClientPage />} />
        <Route path="/:clientSlug/decks/:deckSlug" element={<DeckView />} />
        <Route
          path="/:clientSlug/requirements/:groupSlug"
          element={<RequirementsView />}
        />
        <Route
          path="/:clientSlug/requirements/:groupSlug/:docSlug"
          element={<RequirementsView />}
        />
        <Route
          path="/:clientSlug/notes/:groupSlug"
          element={<NotesView />}
        />
      </Route>

      {/* POCs render standalone, outside the portal wrapper */}
      <Route path="/:clientSlug/pocs/:pocSlug" element={<PocView />} />
    </Routes>
  );
}
