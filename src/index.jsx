import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SpaContainer } from "pankosmia-rcl";
import { createHashRouter, RouterProvider } from "react-router-dom";
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
]);

createRoot(document.getElementById("root")).render(
  <SpaContainer
    requireNet={true}
    titleKey="pages:content:title"
    currentId="core-remote-resources"
  >
    <RouterProvider router={router} />
  </SpaContainer>
);
