import { useContext, useEffect, useRef } from "react";

import { useMemo, useState } from "react";
import { doI18n, getJson, postEmptyJson } from "pithekos-lib";
import {
  DialogContent,
  TextField,
  Box,
  Chip,
  IconButton,
  Autocomplete,
  Grid2,
  Typography,
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
import { Check, CorporateFare, Login } from "@mui/icons-material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
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

function App() {
  const { debugRef } = useContext(debugContext);
  const { i18nRef } = useContext(i18nContext);
  const { clientInterfacesRef } = useContext(clientInterfacesContext);

  /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */
  const [searchValue, setSearchValue] = useState(null);
  const [inputValue, setInputValue] = useState(null);
  const [searchWhitelist, setSearchWhitelist] = useState(null);
  const [selectedChips, setSelectedChips] = useState(0);
  const [urlLegacyContent, setUrlLegacyContent] = useState("");
  const filterRef = useRef(null);
  const [filterHeight, setFilterHeight] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const typePageQuery = new URLSearchParams(window.location.search);
  const returnType = typePageQuery.get("returnTypePage");
  const [nameOrganisation, setNameOrganisation] = useState([]);

  const sourceWhitelist = useMemo(() => {
    return [["git.door43.org/uW", "uW"]];
  });

  const defaultFilterProps = useMemo(() => {
    const firstOrg = sourceWhitelist[0][0]; // "git.door43.org/BurritoTruck"
    return (row) => row.source.startsWith(firstOrg);
  }, [sourceWhitelist]);

  const closeDialog = () => {
    if (returnType === "dashboard") {
      setTimeout(() => {
        window.location.href = "/clients/main";
      });
    } else {
      setTimeout(() => {
        window.location.href = "/clients/content";
      });
    }
  };
  useEffect(() => {
    getJson(
      "/api/content-utils/product?resource_path=core-client-remote-repos/organizations/organization.json",
    )
      .then((res) => res.json)
      .then((data) => {
        setNameOrganisation(data.organizations);
      })
      .catch((err) => console.error("Error :", err));
  }, []);

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

    fetchResponse = await fetch("/api/temp/bytes", {
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
        ? `/api/git/clone-repo/${remoteRepoPath}`
        : `/api/git/pull-repo/origin/${remoteRepoPath}`;

    return await postEmptyJson(fetchUrl, debugRef.current);
  }

  const handleSetUsername = () => {
    if (inputValue.trim() === "") {
      return;
    }

    setSearchValue(inputValue.trim().toLowerCase());
  };

  const handleChange = (value) => {
    setInputValue(value);
    console.log(inputValue);
    const selectedOrg = nameOrganisation?.find((o) => o.name === value);
    if (selectedOrg) {
      setSearchWhitelist([[selectedOrg.url, `${selectedOrg.name} content`]]);
    } else {
      setSearchWhitelist([[`git.door43.org/${value}`, `${value} content`]]);
    }
  };
  useEffect(() => {
    if (clientInterfacesRef.current) {
      if (clientInterfacesRef.current) {
        let result = findEndpoint(
          clientInterfacesRef.current,
          "create_document",
          "textTranslation",
        );
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
            'url("/api/app-resources/pages/content/background_blur.png")',
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
                  <Typography sx={{ padding: "8px 0px" }} variant="body1">
                    {doI18n(
                      "pages:core-remote-resources:title_search_door43",
                      i18nRef.current,
                    )}
                  </Typography>
                  <Chip
                    variant={selectedChips === 0 ? "filled" : "outlined"}
                    onClick={() => {
                      if (selectedChips !== 0) {
                        setShowTable(false);
                        setSelectedChips(0);
                      }
                    }}
                    icon={selectedChips === 0 ? <Check /> : <CorporateFare />}
                    color="secondary"
                    sx={{
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRightWidth: 0,
                      padding: -1,
                    }}
                    label={`${doI18n(
                      "pages:core-remote-resources:organization&username",
                      i18nRef.current,
                    )}`}
                  />
                  <Chip
                    variant={selectedChips === 1 ? "filled" : "outlined"}
                    disabled={true}
                    onClick={() => {
                      setSelectedChips(2);
                    }}
                    icon={selectedChips === 1 ? <Check /> : <Login />}
                    color="secondary"
                    sx={
                      selectedChips === 0
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
                <Grid2
                  container
                  direction="row"
                  alignItems="flex-start"
                  size={8}
                  sx={{ paddingTop: "8px" }}
                >
                  <Grid2 item size={6}>
                    <Autocomplete
                      freeSolo
                      options={nameOrganisation || []}
                      getOptionLabel={(option) => option.name || option}
                      onChange={(e, newValue) => {
                        if (newValue?.url) {
                          handleChange(newValue.name);
                        }
                      }}
                      onInputChange={(e, newInputValue) => {
                        handleChange(newInputValue);
                      }}
                      sx={{ padding: "8px 0px" }}
                      renderInput={(params) => (
                        <TextField
                          required
                          {...params}
                          label="Search"
                          size="small"
                          color="secondary"
                          variant="outlined"
                          helperText={doI18n(
                            "pages:core-remote-resources:required_for_results",
                            i18nRef.current,
                          )}
                        />
                      )}
                    />
                  </Grid2>
                  <Grid2 item size={2}>
                    <Box sx={{ marginTop: "8px" }}>
                      <IconButton
                        disabled={!inputValue}
                        onClick={() => {
                          handleSetUsername();
                          setShowTable(true);
                        }}
                      >
                        <SearchOutlinedIcon />
                      </IconButton>
                    </Box>
                  </Grid2>
                </Grid2>
              </Box>

              {searchWhitelist && showTable && (
                <Box
                  sx={{
                    height: `calc(100vh - ${filterHeight + 190}px)`,
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
                    showColumnFilters={defaultFilterProps}
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
