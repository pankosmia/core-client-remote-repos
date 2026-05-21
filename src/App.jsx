import { useContext, useEffect, useRef } from "react";

import { useMemo, useState } from "react";
import { doI18n, postEmptyJson } from "pithekos-lib";
import {
  DialogContent,
  TextField,
  Button,
  Box,
  Chip,
  Stack,
} from "@mui/material";
import {
  PanDownload,
  i18nContext,
  PanDialog,
  PanDialogActions,
  debugContext,
  clientInterfacesContext,
} from "pankosmia-rcl";
import { enqueueSnackbar } from "notistack";
import { Check, CorporateFare, Login, PermIdentity } from "@mui/icons-material";

function findEndpoint(config, targetKey, typeContent) {
  for (const topLevelKey of Object.keys(config)) {
    const result = walk(
      config[topLevelKey],
      topLevelKey,
      null, // parentKey (none at start)
      targetKey,
      typeContent,
    );
    if (result) return result;
  }
  return null;
}

function walk(node, rootKey, parentKey, targetKey, typeContent) {
  if (!node || typeof node !== "object") return null;

  // 🎯 Found the endpoint with correct parent
  if (
    parentKey === typeContent &&
    Object.prototype.hasOwnProperty.call(node, targetKey) &&
    Array.isArray(node[targetKey]) &&
    node[targetKey][0]?.url
  ) {
    return {
      rootKey,
      typeContent, // 👈 now explicit
      endpoint: targetKey,
      url: node[targetKey][0].url,
    };
  }

  // 🔁 Recurse through children, passing current key as parent
  for (const [key, value] of Object.entries(node)) {
    const found = walk(value, rootKey, key, targetKey, typeContent);
    if (found) return found;
  }

  return null;
}

// Usage
console.log();
function App() {
  const { debugRef } = useContext(debugContext);
  const { i18nRef } = useContext(i18nContext);
  const { clientInterfacesRef } = useContext(clientInterfacesContext);

  /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */
  const [searchValue, setSearchValue] = useState(null);
  const [inputValue, setInputValue] = useState(null);
  const [searchWhitelist, setSearchWhitelist] = useState(null);
  const [selectedChips, setSelectedChips] = useState(1);
  const [urlLegacyContent, setUrlLegacyContent] = useState("");
  const filterRef = useRef(null);
  const [filterHeight, setFilterHeight] = useState(0);
  const [showTable, setShowTable] = useState(false);

  const closeDialog = () => {
    window.location.href = "/clients/content";
  };

  useEffect(() => {
    if (selectedChips === 1) {
      const defaultOrg = "uW";

      setInputValue("uW");
      setSearchValue(defaultOrg);

      setSearchWhitelist([[`git.door43.org/${defaultOrg}`, `uW content`]]);

      setShowTable(true);
    } else {
      setInputValue("");
      setSearchValue("");
      setSearchWhitelist(null);
      setShowTable(false);
    }
  }, [selectedChips]);

  async function DowloadLegacy(params, remoteRepoPath, postType) {
    let fetchResponse;
    const downloadResponse = await fetch(params.row.url);

    if (!downloadResponse.ok) {
      throw new Error(
        doI18n("pages:core-client-rcl:failed_download", i18nRef.current),
      );
    }

    const zipBlob = await downloadResponse.blob();
    const formData = new FormData();
    formData.append("file", zipBlob);

    fetchResponse = await fetch("/temp/bytes", {
      method: "POST",
      body: formData,
    });

    if (!fetchResponse.ok) {
      throw new Error(
        doI18n("pages:core-client-rcl:upload_failed", i18nRef.current),
      );
    }

    const data = await fetchResponse.json();
    window.location.href = urlLegacyContent + `?uuid=${data.uuid}`;
    enqueueSnackbar(
      `${doI18n("pages:core-client-rcl:document_downloaded", i18nRef.current)} ${data.uuid}`,
      { variant: "success" },
    );
    return fetchResponse;
  }

  async function DowloadBurrito(params, remoteRepoPath, postType) {
    const fetchUrl =
      postType === "clone"
        ? `/git/clone-repo/${remoteRepoPath}`
        : `/git/pull-repo/origin/${remoteRepoPath}`;

    return await postEmptyJson(fetchUrl, debugRef.current);
  }

  const handleSetUsername = () => {
    if (inputValue.trim() === "") {
      return;
    }

    setSearchValue(inputValue.trim().toLowerCase());
  };

  useEffect(() => {
    if (searchValue) {
      setSearchWhitelist([
        [`git.door43.org/${searchValue}`, `${searchValue} content`],
      ]);
    }
  }, [searchValue]);

  useEffect(() => {
    if (clientInterfacesRef.current) {
      if (clientInterfacesRef.current) {
        let result = findEndpoint(
          clientInterfacesRef.current,
          "create_document",
          "textTranslation",
        );
        console.log(result);
        if (result) {
          setUrlLegacyContent(`/clients/${result.rootKey}#${result.url}`);
        }
      }
    }
  }, [clientInterfacesRef.current]);
  return (
    <Box>
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: -1,
          backgroundImage:
            'url("/app-resources/pages/content/background_blur.png")',
          backgroundRepeat: "no-repeat",
        }}
      >
        <PanDialog
          titleLabel={doI18n(
            "pages:core-remote-resources:download_from_internet",
            i18nRef.current,
          )}
          isOpen={true}
          closeFn={closeDialog}
          size="lg"
        >
          <DialogContent sx={{ overflow: "hidden" }}>
            <>
              <Box sx={{ overflow: "hidden" }} ref={filterRef}>
                <Box>
                  <Chip
                    variant={selectedChips === 0 ? "filled" : "outlined"}
                    onClick={() => {
                      if (selectedChips !== 0) {
                        setShowTable(false);
                        setSelectedChips(0);
                      }
                    }}
                    color="secondary"
                    icon={selectedChips === 0 ? <Check /> : <PermIdentity />}
                    sx={
                      selectedChips === 1
                        ? {
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            borderRightWidth: 0,
                          }
                        : {
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                          }
                    }
                    label={doI18n(
                      "pages:core-remote-resources:username",
                      i18nRef.current,
                    )}
                  />
                  <Chip
                    variant={selectedChips === 1 ? "filled" : "outlined"}
                    onClick={() => {
                      if (selectedChips !== 1) {
                        setShowTable(false);
                        setSelectedChips(1);
                      }
                    }}
                    icon={selectedChips === 1 ? <Check /> : <CorporateFare />}
                    color="secondary"
                    sx={
                      selectedChips === 0
                        ? {
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            padding: -1,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            borderRightWidth: 0,
                            borderLeftWidth: 0,
                          }
                        : {
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            borderRightWidth: 0,
                            borderLeftWidth: 0,

                            padding: -1,
                          }
                    }
                    label={doI18n(
                      "pages:core-remote-resources:organization",
                      i18nRef.current,
                    )}
                  />
                  <Chip
                    variant={selectedChips === 2 ? "filled" : "outlined"}
                    disabled={true}
                    onClick={() => {
                      setSelectedChips(2);
                    }}
                    icon={selectedChips === 2 ? <Check /> : <Login />}
                    color="secondary"
                    sx={
                      selectedChips === 1
                        ? {
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                            borderLeftWidth: 0,
                          }
                        : {
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                          }
                    }
                    label={doI18n(
                      "pages:core-remote-resources:my_account",
                      i18nRef.current,
                    )}
                  />
                </Box>
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="flex-start"
                  sx={{ mt: 2 }}
                >
                  <TextField
                    InputLabelProps={{ shrink: true }}
                    label={
                      selectedChips === 0
                        ? `${doI18n("pages:core-remote-resources:username", i18nRef.current)} *`
                        : selectedChips === 1
                          ? `${doI18n("pages:core-remote-resources:organization", i18nRef.current)} *`
                          : `${doI18n("pages:core-remote-resources:my_account", i18nRef.current)} *`
                    }
                    color="secondary"
                    size="small"
                    variant="outlined"
                    value={inputValue}
                    sx={{ marginTop: 2 }}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSetUsername();
                        setShowTable(true);
                      }
                    }}
                    helperText={`* ${doI18n("pages:core-remote-resources:required_for_results", i18nRef.current)}`}
                  />
                  <Button
                    onClick={() => {
                      handleSetUsername();
                      setShowTable(true);
                    }}
                    color="secondary"
                    sx={{ height: "40px", minWidth: "fit-content" }}
                  >
                    {doI18n(
                      "pages:core-remote-resources:search",
                      i18nRef.current,
                    )}
                  </Button>
                </Stack>
              </Box>

              {searchWhitelist && showTable && (
                <Box
                  sx={{
                    height: `calc(100vh - ${filterHeight + 208}px)`,
                    overflow: "hidden",
                  }}
                >
                  <PanDownload
                    downloadedType={
                      selectedChips === 0 || selectedChips === 2
                        ? "user"
                        : "org"
                    }
                    downloadFunction={DowloadBurrito}
                    downloadLegacyFunction={DowloadLegacy}
                    sources={searchWhitelist}
                    //showColumnFilters={defaultFilterProps}
                    showFilterButtons={false}
                    sx={{ flex: 1 }}
                  />
                </Box>
              )}
            </>
          </DialogContent>
          <PanDialogActions
            actionFn={closeDialog}
            actionLabel={doI18n(
              "pages:core-remote-resources:close",
              i18nRef.current,
            )}
            actionVariant="contained"
          />
        </PanDialog>
      </Box>
    </Box>
  );
}

export default App;
