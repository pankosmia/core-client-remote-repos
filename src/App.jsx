import {useState, useEffect, useContext} from "react"
import {Box, Button, ButtonGroup, Grid2, CircularProgress, Typography} from "@mui/material";
import {DataGrid} from '@mui/x-data-grid';
import {CloudDownload, CloudDone} from "@mui/icons-material";
import {enqueueSnackbar} from "notistack";
import {getAndSetJson, getJson, i18nContext, doI18n, typographyContext} from "pithekos-lib";
import GraphiteTest from "./GraphiteTest";


function App() {

    const { typographyRef } = useContext(typographyContext);
    const {i18nRef} = useContext(i18nContext);

    const isGraphite = GraphiteTest()
    /** adjSelectedFontClass reshapes selectedFontClass if Graphite is absent. */
    const adjSelectedFontClass = isGraphite ? typographyRef.current.font_set : typographyRef.current.font_set.replace(/Pankosmia-AwamiNastaliq(.*)Pankosmia-NotoNastaliqUrdu/ig, 'Pankosmia-NotoNastaliqUrdu');

    const sourceWhitelist = [
        ["git.door43.org/BurritoTruck", "Burrito Truck (Door43)"],
        ["git.door43.org/uW", "unfoldingWord Burritos (Door43)"],
    ];
    const [remoteSource, setRemoteSource] = useState(sourceWhitelist[0]);
    const [catalog, setCatalog] = useState([]);
    const [language, setLanguage] = useState("");
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

    const languages = Array.from(
        new Set(
            (catalog || [])
        .map(cv => cv.language_code)
        )
    )
        .filter(l => l)
        .sort();

    // Columns for the Data Grid
    const columns = [
        {
            field: 'resourceCode',
            headerName: <Typography variant="h5" >{doI18n("pages:core-remote-resources:row_resource_code", i18nRef.current)}</Typography>,
            flex: 0.5,
            headerAlign: 'left',
            align:'left'
        },
        {
            field: 'language',
            headerName: <Typography variant="h5" >{doI18n("pages:core-remote-resources:row_language", i18nRef.current)}</Typography>,
            flex: 0.5,
            headerAlign: 'left',
            align:'left'
        },
        {
            field: 'description',
            headerName: <Typography variant="h5" >{doI18n("pages:core-remote-resources:row_description", i18nRef.current)}</Typography>,
            type: "number",
            flex: 2,
            headerAlign: 'left',
            align:'left'
        },
        {
            field: 'type',
            headerName: <Typography variant="h5" >{doI18n("pages:core-remote-resources:row_type", i18nRef.current)}</Typography>,
            flex: 1.5,
            headerAlign: 'left',
            align:'left'
        },
        {
            field: 'download',
            headerName: <Typography variant="h5" >{doI18n("pages:core-remote-resources:row_download", i18nRef.current)}</Typography>,
            flex: 0.5,
            headerAlign: 'left',
            align:'left',
            
            renderCell: (params) => {

                const remoteRepoPath = `${remoteSource[0]}/${params.row.name}`;

                return localRepos.includes(remoteRepoPath) ?
                    <CloudDone color="disabled"/> :
                    <CloudDownload
                        disabled={localRepos.includes(remoteRepoPath)}
                        onClick={async () => {
                            enqueueSnackbar(
                                `${doI18n("pages:core-remote-resources:downloading", i18nRef.current)} ${params.row.abbreviation}`,
                                {variant: "info"}
                            );
                            const fetchResponse = await getJson(`/git/fetch-repo/${remoteRepoPath}`);
                            if (fetchResponse.ok) {
                                enqueueSnackbar(
                                    `${params.row.abbreviation} ${doI18n("pages:core-remote-resources:downloaded", i18nRef.current)}`,
                                    {variant: "success"}
                                );
                                setRemoteSource([...remoteSource]) // Trigger local repo check
                            } else {
                                enqueueSnackbar(
                                    `${params.row.abbreviation} ${doI18n("pages:core-remote-resources:failed", i18nRef.current)}`,
                                    {variant: "error"}
                                );
                            }
                        }
                        }
                    />;
                }
        }
    ]

    // Rows for the Data Grid
    const rows = catalog.filter(ce => ce.flavor && (language === "" || language === ce.language_code)).map((ce, n) => {
        return {
            ...ce,
            id: n,
            resourceCode: ce.abbreviation.toUpperCase(),
            language: ce.language_code,
            description: ce.description,
            type: doI18n(`flavors:names:${ce.flavor_type}/${ce.flavor}`, i18nRef.current)
        }
    })

    return (
        <Box className={adjSelectedFontClass} sx={{ mb: 2, position: 'fixed', top: '64px', bottom: 0, right: 0, overflow: 'scroll', width: '100%' }}>
            <Grid2 container spacing={1} sx={{mx:2}}>
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
                    <Grid2 item size={12}>
                        <ButtonGroup>
                            <Button
                                onClick={() => setLanguage("")}
                                variant={language === "" ? "contained": "outlined"}
                                color="secondary"
                            >
                                *
                            </Button>
                            {
                                languages
                                    .map(
                                        ce => <Button
                                            onClick={() => setLanguage(ce)}
                                            variant={language === ce ? "contained": "outlined"}
                                            color="secondary"
                                        >
                                            {ce}
                                        </Button>
                                    )
                            }
                        </ButtonGroup>
                    </Grid2>
                    {
                        catalog.length > 0 && 
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                sx={{ fontSize: "1rem" }}
                            />
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
