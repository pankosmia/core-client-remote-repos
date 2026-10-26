import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SpSpa } from "pankosmia-rcl";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { MaterialDesignContent, SnackbarProvider } from "notistack";
import { styled } from "@mui/material";

const typePageQuery = new URLSearchParams(window.location.search);
const returnType = typePageQuery.get("returnTypePage");
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
]);

function AppLayout() {
  const CustomSnackbarContent = styled(MaterialDesignContent)(() => ({
    "&.notistack-MuiContent-error": {
      backgroundColor: "#FDEDED",
      color: "#D32F2F",
    },
    "&.notistack-MuiContent-info": {
      backgroundColor: "#E5F6FD",
      color: "#0288D1",
    },
    "&.notistack-MuiContent-warning": {
      backgroundColor: "#FFF4E5",
      color: "#EF6C00",
    },
    "&.notistack-MuiContent-success": {
      backgroundColor: "#EDF7ED",
      color: "#2E7D32",
    },
  }));

  return (
    <>
      <SnackbarProvider
        Components={{
          error: CustomSnackbarContent,
          info: CustomSnackbarContent,
          warning: CustomSnackbarContent,
          success: CustomSnackbarContent,
        }}
        maxSnack={6}
      />
      <SpSpa
        requireNet={true}
        titleKey={
          returnType ? "pages:core-dashboard:title" : "pages:content:title"
        }
        currentId="core-remote-resources"
      >
        <RouterProvider router={router} />
      </SpSpa>
    </>
  );
}
createRoot(document.getElementById("root")).render(<AppLayout />);
