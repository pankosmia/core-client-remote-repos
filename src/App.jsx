import { useContext } from "react";

import { useMemo } from "react";
import { doI18n } from "pithekos-lib";
import { DialogContent } from "@mui/material";
import { PanDownload, i18nContext, PanDialog } from "pankosmia-rcl";

function App() {
  const { i18nRef } = useContext(i18nContext);
  /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */

  const sourceWhitelist = useMemo(() => {
    return [
      ["git.door43.org/BurritoTruck", "Xenizo curated content (Door43)"],
      ["git.door43.org/uW", "unfoldingWord curated content (Door43)"],
      ["git.door43.org/shower", "Aquifer exported content (Door43)"],
    ];
  });

  const closeDialog = () => {
    window.location.href = "/clients/content";
  };
  const defaultFilterProps = useMemo(() => {
    const firstOrg = sourceWhitelist[0][0]; // "git.door43.org/BurritoTruck"
    return (row) => row.source.startsWith(firstOrg);
  }, [sourceWhitelist]);

  return (
    <PanDialog
      titleLabel={doI18n(
        "pages:core-remote-resources:download_from_internet",
        i18nRef.current,
      )}
      isOpen={true}
      closeFn={closeDialog}
    >
      <DialogContent>
        <PanDownload
          sources={sourceWhitelist}
          showColumnFilters={true}
          defaultFilterProps={defaultFilterProps}
          sx={{ flex: 1 }}
        />
      </DialogContent>
    </PanDialog>
  );
}

export default App;
