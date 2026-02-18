import { useContext, useEffect } from "react";

import { useMemo, useState } from "react";
import { doI18n, postEmptyJson } from "pithekos-lib";
import {
  DialogContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Box,
} from "@mui/material";
import {
  PanDownload,
  i18nContext,
  PanDialog,
  debugContext,
  clientInterfacesContext,
} from "pankosmia-rcl";
import { enqueueSnackbar } from "notistack";

function findEndpoint(config, targetKey, typeContent) {
  for (const topLevelKey of Object.keys(config)) {
    const result = walk(
      config[topLevelKey],
      topLevelKey,
      null,              // parentKey (none at start)
      targetKey,
      typeContent
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
      typeContent,        // 👈 now explicit
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

  const [urlLegacyContent, setUrlLegacyContent] = useState("");

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
  };

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
          "textTranslation"
        );
        console.log(result);
        if (result) {
          setUrlLegacyContent(`/clients/${result.rootKey}#${result.url}`);
        }
      }
    }
  }, [clientInterfacesRef.current]);
  return (
    <PanDialog
      titleLabel={doI18n(
        "pages:core-remote-resources:download_from_internet",
        i18nRef.current,
      )}
      isOpen={true}
      closeFn={closeDialog}
    >
      <Tabs value={value} onChange={handleChange}>
        <Tab
          label={`${doI18n(
            "pages:core-remote-resources:currated_content",
            i18nRef.current,
          )}`}
        />
        {urlLegacyContent && (
          <Tab
            label={`${doI18n(
              "pages:core-remote-resources:legacy_content",
              i18nRef.current,
            )}`}
          />
        )}
      </Tabs>
      <DialogContent>
        {value === 0 && (
          <Box sx={{ height: "calc(100vh - 229px)", overflow: "hidden" }}>
            <PanDownload
              downloadedType="burrito"
              downloadFunction={DowloadBurrito}
              sources={sourceWhitelist}
              showColumnFilters={defaultFilterProps}
              sx={{ flex: 1 }}
            />
          </Box>
        )}
        {value === 1 && (
          <Box sx={{ height: "calc(100vh - 340px)", overflow: "hidden" }}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={username}
              sx={{ marginTop: 1 }}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <Button onClick={handleSetUsername}>Search</Button>

            {userWhitelist && (
              <PanDownload
                downloadedType="legacy"
                downloadFunction={DowloadLegacy}
                sources={userWhitelist}
                showColumnFilters={defaultFilterProps}
                sx={{ flex: 1 }}
              />
            )}
          </Box>
        )}
      </DialogContent>
    </PanDialog>
  );
}

export default App;
