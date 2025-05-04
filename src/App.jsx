import {useState, useEffect, useCallback, useContext} from "react"
import {Box, Button, ButtonGroup, Grid2, CircularProgress} from "@mui/material";
import {CloudDownload, CloudDone} from "@mui/icons-material";
import {enqueueSnackbar} from "notistack";
import {getAndSetJson, getJson, i18nContext, doI18n} from "pithekos-lib";

function App() {

    const {i18nRef} = useContext(i18nContext);

    const [maxWindowHeight, setMaxWindowHeight] = useState(window.innerHeight - 80);

    const handleWindowResize = useCallback(() => {
        setMaxWindowHeight(window.innerHeight - 80);
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleWindowResize);
        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [handleWindowResize]);

    const sourceWhitelist = [
        ["git.door43.org/BurritoTruck", "Burrito Truck (Door43)"],
        ["git.door43.org/uW", "unfoldingWord Burritos (Door43)"],
    ];
    const [remoteSource, setRemoteSource] = useState(sourceWhitelist[0]);
    const [catalog, setCatalog] = useState([]);
    useEffect(
        () => {
            getAndSetJson({
                url: `/gitea/remote-repos/${remoteSource[0]}`,
                setter: setCatalog
            }).then()
        },
        [remoteSource]
    );

    const [localRepos, setLocalRepos] = useState([]);

    useEffect(
        () => {
            getAndSetJson({
                url: "/git/list-local-repos",
                setter: setLocalRepos
            }).then()
        },
        [remoteSource]
    );

    return (
        <Box sx={{p: 0, m:0, maxHeight: maxWindowHeight}}>
            <Grid2 container spacing={1} sx={{m:0}}>
                <Grid2 container>
                    <Grid2 item size={12} sx={{m:0}}>
                        <ButtonGroup>
                            {
                                sourceWhitelist.map(
                                    s => <Button
                                        variant={s[0] === remoteSource[0] ? "contained" : "outlined"}
                                        onClick={() => setRemoteSource(s)}
                                    >
                                        {s[1]}
                                    </Button>
                                )
                            }
                        </ButtonGroup>
                    </Grid2>
                    {
                        catalog.length > 0 && catalog
                            .filter(ce => ce.flavor)
                            .map(
                                ce => {
                                    const remoteRepoPath = `${remoteSource[0]}/${ce.name}`;
                                    return <>
                                        <Grid2 item size={1}>
                                            {ce.abbreviation.toUpperCase()}
                                        </Grid2>
                                        <Grid2 item size={1}>
                                            {ce.language_code}
                                        </Grid2>
                                        <Grid2 item size={6}>
                                            {ce.description}
                                        </Grid2>
                                        <Grid2 item size={3}>
                                            {
                                                doI18n(`flavors:names:${ce.flavor_type}/${ce.flavor}`, i18nRef.current)
                                            }
                                        </Grid2>
                                        <Grid2 item size={1}>
                                            {
                                                localRepos.includes(remoteRepoPath) ?
                                                    <CloudDone color="disabled"/> :
                                                    <CloudDownload
                                                        disabled={localRepos.includes(remoteRepoPath)}
                                                        onClick={async () => {
                                                            enqueueSnackbar(
                                                                `${doI18n("pages:core-remote-resources:downloading", i18nRef.current)} ${ce.abbreviation}`,
                                                                {variant: "info"}
                                                            );
                                                            const fetchResponse = await getJson(`/git/fetch-repo/${remoteRepoPath}`);
                                                            if (fetchResponse.ok) {
                                                                enqueueSnackbar(
                                                                    `${ce.abbreviation} ${doI18n("pages:core-remote-resources:downloaded", i18nRef.current)}`,
                                                                    {variant: "success"}
                                                                );
                                                                setRemoteSource([...remoteSource]) // Trigger local repo check
                                                            } else {
                                                                enqueueSnackbar(
                                                                    `${ce.abbreviation} ${doI18n("pages:core-remote-resources:failed", i18nRef.current)}`,
                                                                    {variant: "error"}
                                                                );
                                                            }
                                                        }
                                                        }
                                                    />
                                            }
                                        </Grid2>
                                    </>
                                }
                            )
                    }
                    {
                        catalog.length === 0 && <CircularProgress/>
                    }
                </Grid2>
            </Grid2>
        </Box>
    );
}

export default App;
