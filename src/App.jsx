import {useState, useEffect} from "react"
import {Button, ButtonGroup, Grid2} from "@mui/material";
import {CloudDownload, CloudDone} from "@mui/icons-material";
import {enqueueSnackbar} from "notistack";
import {getAndSetJson, getJson} from "pithekos-lib";

function App() {
    const sourceWhitelist = [
        ["git.door43.org/BurritoTruck", "Burrito Truck (Door43)"],
        ["git.door43.org/uW", "unfoldingWord Burritos (Door43)"],
    ];
    const [remoteSource, setRemoteSource] = useState(sourceWhitelist[0]);
    console.log(remoteSource);
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
        <Grid2 container spacing={2}>
            <Grid2 container>
                <Grid2 item size={12}>
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
                    catalog
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
                                        {`${ce.flavor_type}/${ce.flavor}`}
                                    </Grid2>
                                    <Grid2 item size={1}>
                                        {
                                            localRepos.includes(remoteRepoPath) ?
                                                <CloudDone color="disabled"/> :
                                                <CloudDownload
                                                    disabled={localRepos.includes(remoteRepoPath)}
                                                    onClick={async () => {
                                                        enqueueSnackbar(
                                                            `Downloading ${ce.abbreviation}`,
                                                            {variant: "info"}
                                                        );
                                                        const fetchResponse = await getJson(`/git/fetch-repo/${remoteRepoPath}`);
                                                        if (fetchResponse.ok) {
                                                            enqueueSnackbar(
                                                                `${ce.abbreviation} downloaded`,
                                                                {variant: "success"}
                                                            );
                                                            setRemoteSource([...remoteSource]) // Trigger local repo check
                                                        } else {
                                                            enqueueSnackbar(
                                                                `${ce.abbreviation} failed`,
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
            </Grid2>
        </Grid2>
    );
}

export default App;
