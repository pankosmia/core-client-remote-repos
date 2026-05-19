import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SpSpa } from "pankosmia-rcl";
import { createHashRouter, RouterProvider } from "react-router-dom";
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
]);

const typePageQuery = new URLSearchParams(window.location.search);
const returnType = typePageQuery.get("returnTypePage");

createRoot(document.getElementById("root")).render(
  <SpSpa
    requireNet={true}
    titleKey={returnType ? "pages:core-dashboard:title" : "pages:content:title"}
    currentId="core-remote-resources"
  >
    <RouterProvider router={router} />
  </SpSpa>,
);
