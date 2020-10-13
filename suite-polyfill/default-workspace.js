window.applyDefaultWorkspace = async function() {
    console.log('Apply Default Workspace');
    await new Promise(rs => fin.desktop.main(rs));
    await new Promise(rs => setTimeout(rs, 2000));

    console.log('Fetching user workspaces');
    let resp = await fetch('/api/user/snapshots');
    let workspaces = await resp.json();

    console.log('workspaces: ', workspaces);
    let defaultWorkspace = workspaces.find(workspace => workspace.name.includes('Default'));

    if(defaultWorkspace) {
        console.log('Applying default workspace');
        fin.Platform.getCurrentSync().applySnapshot(defaultWorkspace.snapshot);
    }
}

if(fin.me.identity.uuid === 'osLaunchpadMain' && fin.me.identity.name === 'launchbar') {
    console.log('Launchbar subscribing to shown event');
    fin.me.addListener('shown', () => window.applyDefaultWorkspace())
    window.applyDefaultWorkspace();
}