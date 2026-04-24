import { useContext, useEffect, useRef } from "react";

import { useMemo, useState } from "react";
import { doI18n, postEmptyJson } from "pithekos-lib";
import {
  DialogContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Box,
  Chip,
  Stack,
  Autocomplete,
  CircularProgress,
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

function App() {
  const { debugRef } = useContext(debugContext);
  const { i18nRef } = useContext(i18nContext);
  const { clientInterfacesRef } = useContext(clientInterfacesContext);

  /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */
  const [value, setValue] = useState(0);
  const [username, setUsername] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [userWhitelist, setUserWhitelist] = useState(null);
  const [selectedChips, setSelectedChips] = useState(0);
  const [urlLegacyContent, setUrlLegacyContent] = useState("");
  const filterRef = useRef(null);
  const [filterHeight, setFilterHeight] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [options, setOptions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  useEffect(() => {
    if (!filterRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setFilterHeight(entry.contentRect.height);
      }
    });
    observer.observe(filterRef.current);
    return () => observer.disconnect();
  }, [value]);

  const sourceWhitelist = useMemo(() => {
    return [
      ["git.door43.org/BurritoTruck", "Xenizo "],
      ["git.door43.org/uW", "UnfoldingWord"],
      ["git.door43.org/shower", "Aquifer"],
    ];
  });

  const defaultFilterProps = useMemo(() => {
    const firstOrg = sourceWhitelist[0][0]; // "git.door43.org/BurritoTruck"
    return (row) => row.source.startsWith(firstOrg);
  }, [sourceWhitelist]);

  const closeDialog = () => {
    window.location.href = "/clients/content";
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
    setShowTable(false);
  };
  console.log(inputValue);
  useEffect(() => {
    setUsername("");
    setInputValue("");
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

    setUsername(inputValue);
  };

  useEffect(() => {
    if (username) {
      setUserWhitelist([[`git.door43.org/${username}`, `${username} content`]]);
    }
  }, [username]);

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

  useEffect(() => {
    const search = async () => {
      if (inputValue.length <= 2) {
        setOptions([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const endpoint = selectedChips === 1 ? "org" : "users/search";
        const res = await fetch(
          `https://git.door43.org/api/v1/${endpoint}?q=${inputValue}`,
        );
        const data = await res.json();

        setOptions(selectedChips === 1 ? data : data.data || []);
      } catch (err) {
        console.error(err);
        setOptions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [inputValue, selectedChips]);

  return (
    <PanDialog
      titleLabel={doI18n(
        "pages:core-remote-resources:download_from_internet",
        i18nRef.current,
      )}
      isOpen={true}
      closeFn={closeDialog}
      size="lg"
    >
      <Tabs
        value={value}
        onChange={handleChange}
        textColor="secondary"
        indicatorColor="secondary"
        sx={{ mt: 2, mx: 2 }}
      >
        <Tab
          label={`${doI18n(
            "pages:core-remote-resources:curated_content",
            i18nRef.current,
          )}`}
        />
        {urlLegacyContent && (
          <Tab
            label={`${doI18n(
              "pages:core-remote-resources:browse_door43",
              i18nRef.current,
            )}`}
          />
        )}
      </Tabs>
      <DialogContent sx={{ overflow: "hidden" }}>
        {value === 0 && (
          <Box sx={{ height: "calc(100vh - 208px)", overflow: "hidden" }}>
            <PanDownload
              downloadedType="org"
              downloadFunction={DowloadBurrito}
              sources={sourceWhitelist}
              showColumnFilters={defaultFilterProps}
              sx={{ flex: 1 }}
            />
          </Box>
        )}
        {value === 1 && (
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
                      : { borderTopRightRadius: 0, borderBottomRightRadius: 0 }
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
                <Autocomplete
                  size="small"
                  color="secondary"
                  options={options}
                  loading={isSearching}
                  getOptionLabel={(option) => option.username || ""}
                  inputValue={inputValue}
                  onInputChange={(e, newInputValue, reason) => {
                    if (reason === "input") {
                      setInputValue(newInputValue);
                    }
                    if (newInputValue.length > 2) {
                      setIsAutocompleteOpen(true);
                    } else {
                      setIsAutocompleteOpen(false);
                    }
                  }}
                  freeSolo
                  open={isAutocompleteOpen}
                  onOpen={() => {
                    if (inputValue.length > 2) setIsAutocompleteOpen(true);
                  }}
                  onClose={(event, reason) => {
                    if (reason === "toggleInput") return;
                    setIsAutocompleteOpen(false);
                  }}
                  onChange={(event, selection) => {
                    if (!selection) return;

                    const exactName =
                      typeof selection === "string"
                        ? selection
                        : selection.username;
                    setInputValue(exactName);
                    handleSetUsername(exactName);
                    setShowTable(true);
                    setIsAutocompleteOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.defaultMuiPrevented = true;
                      e.stopPropagation();
                      e.preventDefault();

                      const valueFromDom = e.target.value;

                      if (!valueFromDom || valueFromDom.length <= 2) return;

                      const validOption = options.find((opt) => {
                        const name =
                          typeof opt === "string" ? opt : opt.username;
                        return (
                          name?.toLowerCase() === valueFromDom?.toLowerCase()
                        );
                      });

                      if (validOption) {
                        const finalName =
                          typeof validOption === "string"
                            ? validOption
                            : validOption.username;

                        setIsAutocompleteOpen(false);
                        setInputValue(finalName);
                        handleSetUsername(finalName);
                        setShowTable(true);
                      } else {
                        console.error(
                          doI18n(
                            "pages:core-remote-resources:no_matches",
                            i18nRef.current,
                          ),
                        );
                        //This snackbar won't show up for some reason
                        enqueueSnackbar(
                          `${doI18n("pages:core-remote-resources:no_matches", i18nRef.current)}`,
                          { variant: "error" },
                        );
                      }
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      color="secondary"
                      sx={{ marginTop: 2 }}
                      label={
                        selectedChips === 0
                          ? `${doI18n("pages:core-remote-resources:username", i18nRef.current)} *`
                          : selectedChips === 1
                            ? `${doI18n("pages:core-remote-resources:organization", i18nRef.current)} *`
                            : `${doI18n("pages:core-remote-resources:my_account", i18nRef.current)} *`
                      }
                      helperText={`* ${doI18n("pages:core-remote-resources:required_for_results", i18nRef.current)}`}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isSearching ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Stack>
            </Box>
            {userWhitelist && showTable && (
              <Box
                sx={{
                  height: `calc(100vh - ${filterHeight + 208}px)`,
                  overflow: "hidden",
                }}
              >
                <PanDownload
                  downloadedType={
                    selectedChips === 0 || selectedChips === 2 ? "user" : "org"
                  }
                  downloadFunction={DowloadBurrito}
                  downloadLegacyFunction={DowloadLegacy}
                  sources={userWhitelist}
                  showColumnFilters={defaultFilterProps}
                  showFilterButtons={false}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}
          </>
        )}
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
  );
}

export default App;
