import {useState, useEffect, useContext, useCallback} from "react"
import {Box, Button, ButtonGroup, Grid2, CircularProgress, Dialog, DialogContent, DialogActions, AppBar, Toolbar, Typography} from "@mui/material";
import {DataGrid} from '@mui/x-data-grid';
import CloudDownload from "@mui/icons-material/CloudDownload";
import CloudDone from "@mui/icons-material/CloudDone";
import Update from "@mui/icons-material/Update";
import {enqueueSnackbar} from "notistack";
import {getAndSetJson, getJson, i18nContext, doI18n, typographyContext, debugContext, postEmptyJson} from "pithekos-lib";
import GraphiteTest from "./GraphiteTest";


function App() {

    const {typographyRef} = useContext(typographyContext);
    const {i18nRef} = useContext(i18nContext);
    const {debugRef} = useContext(debugContext);

    const isGraphite = GraphiteTest()
    /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */
    const adjSelectedFontClass = isGraphite ? typographyRef.current.font_set : typographyRef.current.font_set.replace(/Pankosmia-AwamiNastaliq(.*)Pankosmia-NotoNastaliqUrdu/ig, 'Pankosmia-NotoNastaliqUrdu');

    const sourceWhitelist = [
        ["git.door43.org/BurritoTruck", "Burrito Truck (Door43)"],
        ["git.door43.org/uW", "unfoldingWord Burritos (Door43)"],
    ];
    const [remoteSource, setRemoteSource] = useState(sourceWhitelist[0]);
    const [catalog, setCatalog] = useState([]);
    const [localRepos, setLocalRepos] = useState([]);
    const [isDownloading, setIsDownloading] = useState(null);

    useEffect(
        () => {
            const doCatalog = async () => {
                if (catalog.length === 0) {
                    let newCatalog = [];
                    for (const source of sourceWhitelist) {
                        const response = await getJson(`/gitea/remote-repos/${source[0]}`, debugRef.current);
                        if (response.ok) {
                            const newResponse = response.json.map(r => {
                                return {...r, source: source[0]}
                            })
                            newCatalog = [...newCatalog, ...newResponse];
                        }
                    }
                    setCatalog(newCatalog);
                }
            }
            doCatalog().then();
        },
        [catalog, remoteSource]
    );

    useEffect(
        () => {
            getAndSetJson({
                url: "/git/list-local-repos",
                setter: setLocalRepos
            }).then()
        },
        [remoteSource]
    );

    useEffect(() => {
        if (!isDownloading && (catalog.length > 0) && localRepos) {
            const downloadStatus = async () => {
                const newIsDownloading = {};
                for (const e of catalog) {
                    if (localRepos.includes(`${e.source}/${e.name}`)) {
                        const metadataUrl = `/burrito/metadata/summary/${e.source}/${e.name}`;
                        let metadataResponse = await getJson(metadataUrl, debugRef.current);
                        if (metadataResponse.ok) {
                            const metadataTime = metadataResponse.json.timestamp;
                            const remoteUpdateTime = Date.parse(e.updated_at)/1000;
                            newIsDownloading[`${e.source}/${e.name}`] = (remoteUpdateTime - metadataTime > 0) ? "updatable" : "downloaded"
                        } else {
                            newIsDownloading[`${e.source}/${e.name}`] = "downloaded";
                        }
                    } else {
                        newIsDownloading[`${e.source}/${e.name}`] = "notDownloaded";
                    }
                }
                setIsDownloading(newIsDownloading);
            }
            downloadStatus().then();
        }
    }, [isDownloading, remoteSource, catalog, localRepos])

    const handleDownloadClick = useCallback(async (params, remoteRepoPath, postType) => {
        setIsDownloading((isDownloadingCurrent) => ({...isDownloadingCurrent, [remoteRepoPath]: 'downloading'}));
        enqueueSnackbar(
            `${doI18n("pages:core-remote-resources:downloading", i18nRef.current)} ${params.row.abbreviation}`,
            {variant: "info"}
        );
        const fetchUrl = postType === "clone" ? `/git/clone-repo/${remoteRepoPath}` : `/git/pull-repo/origin/${remoteRepoPath}`;
        const fetchResponse = await postEmptyJson(fetchUrl, debugRef.current);
        if (fetchResponse.ok) {
            enqueueSnackbar(
                `${params.row.abbreviation} ${doI18n(postType === "clone" ? "pages:core-remote-resources:downloaded" : "pages:core-remote-resources:updated", i18nRef.current)}`,
                {variant: "success"}
            );
            setRemoteSource([...remoteSource]); // Trigger local repo check
            setIsDownloading((isDownloadingCurrent) => ({...isDownloadingCurrent, [remoteRepoPath]: 'downloaded'}));
        } else {
            enqueueSnackbar(
                `${params.row.abbreviation} ${doI18n("pages:core-remote-resources:failed", i18nRef.current)} : ${fetchResponse.error} (${fetchResponse.status})`,
                {variant: "error"}
            );
            setIsDownloading((isDownloadingCurrent) => ({...isDownloadingCurrent, [remoteRepoPath]: 'notDownloaded'}))
        }
    }, [remoteSource]);

    // Columns for the Data Grid
    const columns = [
        {
            field: 'resourceCode',
            headerName: doI18n("pages:core-remote-resources:row_resource_code", i18nRef.current),
            flex: 0.5,
            minWidth: 140,
            headerAlign: 'left',
            align: 'left'
        },
        {
            field: 'language',
            headerName: doI18n("pages:core-remote-resources:row_language", i18nRef.current),
            flex: 0.5,
            minWidth: 120,
            headerAlign: 'left',
            align: 'left'
        },
        {
            field: 'description',
            headerName: doI18n("pages:core-remote-resources:row_description", i18nRef.current),
            flex: 2,
            minWidth: 130,
            headerAlign: 'left',
            align: 'left'
        },
        {
            field: 'type',
            headerName: doI18n("pages:core-remote-resources:row_type", i18nRef.current),
            flex: 1.5,
            minWidth: 80,
            headerAlign: 'left',
            align: 'left'
        },
        {
            field: 'download',
            sortable: false,
            headerName: doI18n("pages:core-remote-resources:row_download", i18nRef.current),
            flex: 0.5,
            minWidth: 120,
            headerAlign: 'left',
            align: 'left',

            renderCell: (params) => {
                const remoteRepoPath = `${remoteSource[0]}/${params.row.name}`;
                if (!isDownloading) {
                    return <CloudDownload disabled/>
                }
                if (isDownloading[remoteRepoPath] === "notDownloaded") {
                    return <CloudDownload onClick={() => handleDownloadClick(params, remoteRepoPath, "clone")}/>;
                }
                if (isDownloading[remoteRepoPath] === "updatable") {
                    return <Update onClick={() => handleDownloadClick(params, remoteRepoPath, "fetch")}/>;
                }
                if (isDownloading[remoteRepoPath] === "downloading") {
                    return <CircularProgress size="30px" color="secondary"/>;
                }
                return <CloudDone color="disabled"/>;
            }
        }
    ]

    // Rows for the Data Grid
    const rows = catalog
        .filter(ce => ce.source.startsWith(remoteSource[0]))
        .filter(ce => ce.flavor)
        .map((ce, n) => {
            return {
                ...ce,
                id: n,
                resourceCode: ce.abbreviation.toUpperCase(),
                language: ce.language_code,
                description: ce.description,
                type: doI18n(`flavors:names:${ce.flavor_type}/${ce.flavor}`, i18nRef.current)
            }
        })

    const closeDialog = () => {
        window.location.href = "/clients/content"
    }

    return (
        <Box className={adjSelectedFontClass}
             sx={{mb: 2, position: 'fixed', top: '64px', bottom: 0, right: 0, overflow: 'scroll', width: '100%'}}
        >
            <Dialog
                fullWidth={true}
                maxWidth={false}
                open={true} 
                onClose={closeDialog}
                sx={{
                    '& .MuiDialog-paper': {
                      maxHeight: '95vh',
                      minHeight: '95vh'
                    },
                  }}
                slotProps={{
                    paper: {
                        component: 'form',
                    },
                }}
            >
                <AppBar color='secondary' sx={{ position: 'relative', borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
                    <Toolbar>
                        <Typography variant="h6" component="div">
                            {doI18n("pages:core-remote-resources:download_from_internet", i18nRef.current)}
                        </Typography>
                    </Toolbar>
                </AppBar>
                <DialogContent>
                    <Grid2 container spacing={1} sx={{mx: 2}}>
                        <Grid2 container>
                            <Grid2 item size={12} sx={{m: 0}}>
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
                                catalog.length > 0 &&
                                <DataGrid
                                    initialState={{
                                        sorting: {
                                            sortModel: [{ field: 'resourceCode', sort: 'asc' }],
                                        }
                                    }}
                                    rows={rows}
                                    columns={columns}
                                    sx={{fontSize: "1rem"}}
                                />
                            }
                            {
                                catalog.length === 0 && <CircularProgress/>
                            }
                        </Grid2>
                    </Grid2>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" onClick={closeDialog}>
                        {doI18n("pages:core-remote-resources:cancel", i18nRef.current)}
                    </Button>
                    <Button
                        variant='contained'
                        color="primary"
                        onClick={closeDialog}
                    >{doI18n("pages:core-remote-resources:accept", i18nRef.current)}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default App;
