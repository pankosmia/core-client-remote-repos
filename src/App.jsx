import { useContext, useEffect, useRef } from "react";

import { useMemo, useState } from "react";
import { getJson, postEmptyJson } from "pankosmia-lib/http";
import { doI18n } from "pankosmia-lib/i18n";
import {
  DialogContent,
  TextField,
  Box,
  Chip,
  IconButton,
  Autocomplete,
  Grid2,
  Typography,
  Stack,
} from "@mui/material";
import {
  PanDownload,
  i18nContext,
  PanDialog,
  PanDialogActions,
  debugContext,
  productContext,
  ScrollableBody,
} from "pankosmia-rcl";
import { Check, CorporateFare, Description, Login } from "@mui/icons-material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

function App() {
  const { debugRef } = useContext(debugContext);
  const { i18nRef } = useContext(i18nContext);
  const { productRef } = useContext(productContext);
  let isAndroid =
    productRef && productRef.current && productRef.current.os === "android";

  /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */
  const [inputValue, setInputValue] = useState(null);
  const [searchWhitelist, setSearchWhitelist] = useState(null);
  const [selectedChips, setSelectedChips] = useState(0);
  const filterRef = useRef(null);
  const [filterHeight, setFilterHeight] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const typePageQuery = new URLSearchParams(window.location.search);
  const returnType = typePageQuery.get("returnTypePage");
  const [nameOrganisation, setNameOrganisation] = useState([]);
  const [full_name, setfull_name] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgPool, setOrgPool] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [orgMatches, setOrgMatches] = useState([]);

  const fetchAllRemoteOrgs = async () => {
    let all = [];
    let page = 1;
    const limit = 50;
    while (true) {
      const res = await getJson(
        `https://git.door43.org/api/v1/orgs?limit=${limit}&page=${page}`,
      );
      const batch = res.json || [];
      all = all.concat(batch.map((e) => e.name));
      if (batch.length < limit) break;
      page += 1;
    }
    return all;
  };

  const filterOrg = (query) => {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const normalizedNames = nameOrganisation
      .map((o) => (typeof o === "string" ? o : o?.name))
      .filter(Boolean);
    const pool = [...new Set([...normalizedNames, ...orgPool])];
    return pool.filter((name) => name.toLowerCase().includes(q)).slice(0, 5);
  };

  useEffect(() => {
    (async () => {
      try {
        const remoteOrgs = await fetchAllRemoteOrgs();
        setOrgPool((prev) => [...new Set([...prev, ...remoteOrgs])]);
      } catch (err) {
        console.error("Error fetching remote orgs:", err);
      }
    })();
  }, []);

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) return;

    setLoadingUsers(true);
    try {
      const res = await getJson(
        `https://git.door43.org/api/v1/users/search?q=${query}`,
      );
      setUserOptions((res.json?.data ?? []).map((e) => e.username).slice(0, 5));
    } catch (err) {
      console.error(err);
      setUserOptions([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    setOrgMatches(filterOrg(inputValue));
  }, [inputValue, orgPool]);

  const combinedOptions = useMemo(() => {
    return [...new Set([...orgMatches, ...userOptions])];
  }, [orgMatches, userOptions]);

  useEffect(() => {
    if (!filterRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setFilterHeight(entry.contentRect.height);
      }
    });
    observer.observe(filterRef.current);
    return () => observer.disconnect();
  }, []);

  const sourceWhitelist = useMemo(() => {
    return [["git.door43.org/uW", "uW"]];
  });
  const defaultFilterProps = useMemo(() => {
    const firstOrg = sourceWhitelist[0][0]; // "git.door43.org/uW"
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

  async function DowloadBurrito(params, remoteRepoPath, postType) {
    let branches = (
      await getJson(
        `https://git.door43.org/api/v1/repos/${remoteRepoPath
          .split("/")
          .slice(1, 3)
          .join("/")}/branches`,
      )
    ).json;

    ///search if main or scribe-main exist, make main the first elem.
    branches = branches
      .filter((e) => e.name === "main" || e.name === "scribe-main")
      .sort((a, b) => (a.name === "main" ? -1 : 1));
    for (const b of branches) {
      const fetchUrl =
        postType === "clone"
          ? `/api/git/clone-repo/${remoteRepoPath}?branch=${b.name}`
          : `/api/git/pull-repo/origin/${remoteRepoPath}`;
      return await postEmptyJson(fetchUrl, debugRef.current);
    }

    return {
      ok: false,
      error: doI18n(
        "pages:core-remote-resources:error_no_mains",
        i18nRef.current,
      ),
      status: 404,
    };
  }

  const handleChange = async (value) => {
    if (value.trim() === "") return;
    const newUrl = value.split("(");
    try {
      const endpoint = `https://git.door43.org/api/v1/users/${newUrl[0]}`;
      const res = await getJson(endpoint);
      console.log("res", res);
      const name = res.json?.username;
      setfull_name(res.json?.full_name || res.json?.username);
      setOrgDescription(res.json?.description);
      setSearchWhitelist([
        [`git.door43.org/${name || newUrl}`, `${name || newUrl} content`],
      ]);
    } catch (err) {
      setSearchWhitelist([[`git.door43.org/${newUrl}`, `${newUrl} content`]]);
    }
  };

  return (
    <ScrollableBody isAndroid={isAndroid}>
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
                    <Typography
                      sx={{ padding: "8px 0px", fontWeight: "bold" }}
                      variant="body1"
                    >
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
                    spacing={2}
                    sx={{ padding: "8px" }}
                  >
                    <Grid2 size={4}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Autocomplete
                          freeSolo
                          autoComplete={false}
                          value={inputValue || ""}
                          options={
                            inputValue ? combinedOptions : nameOrganisation
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && inputValue) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleChange(inputValue);
                              setShowTable(true);
                            }
                          }}
                          getOptionLabel={(option) => option.name || option}
                          onChange={(event, newValue) => {
                            if (!newValue) return;

                            event?.preventDefault?.();
                            event?.stopPropagation?.();

                            const value =
                              typeof newValue === "string"
                                ? newValue
                                : (newValue.name ?? newValue);

                            setInputValue(value);

                            handleChange(value);
                            setShowTable(true);
                          }}
                          onInputChange={(e, newInputValue) => {
                            setInputValue(newInputValue);

                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }

                            searchTimeoutRef.current = setTimeout(() => {
                              searchUsers(newInputValue);
                            }, 200); // ⬅️ delay in ms (adjust 300–600 is typical)
                          }}
                          sx={{ flex: 1 }}
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
                        <IconButton
                          disabled={!inputValue}
                          onClick={() => {
                            handleChange(inputValue);
                            setShowTable(true);
                          }}
                          sx={{ alignSelf: "flex-start", mt: "3px" }}
                        >
                          <SearchOutlinedIcon />
                        </IconButton>
                      </Box>
                    </Grid2>

                    {full_name && (
                      <Grid2 size={12}>
                        <Stack spacing={1}>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: "bold" }}
                          >
                            {doI18n(
                              "pages:core-remote-resources:result",
                              i18nRef.current,
                            )}
                          </Typography>
                          <Typography variant="body1">
                            {doI18n(
                              "pages:core-remote-resources:title_organisation",
                              i18nRef.current,
                            )}{" "}
                            {full_name}
                          </Typography>
                          {orgDescription && (
                            <Typography variant="body1">
                              {doI18n(
                                "pages:core-remote-resources:title_description",
                                i18nRef.current,
                              )}{" "}
                              {orgDescription}
                            </Typography>
                          )}
                        </Stack>
                      </Grid2>
                    )}
                  </Grid2>
                </Box>

                {searchWhitelist && showTable && (
                  <Box
                    sx={{
                      height: `calc(100vh - ${filterHeight + 450}px)`,
                      overflow: "auto",
                    }}
                  >
                    <PanDownload
                      downloadedType={
                        (selectedChips === 0 && "user") ||
                        (selectedChips === 1 && "org")
                      }
                      downloadFunction={DowloadBurrito}
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
    </ScrollableBody>
  );
}

export default App;
