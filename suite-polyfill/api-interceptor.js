(async function() {
    console.log('Loading Fetch Interceptor');

    const windowFetch = window.fetch;

    window.fetch = async function(input, init = undefined) {
        const resp = await windowFetch.call(window, input, init);
        const respJson = resp.json;

        const json = async function() {
            let data = await respJson.call(resp);

            if(Array.isArray(data) && data.length > 0 && data.every(entry => entry.appId)) {
                console.log('App Directory was Fetched');

                let dataPromises = 
                    data.map(async (entry) => {
                    try {
                        const manifestResp = await windowFetch.call(window, entry.manifest);
                        const manifest = await manifestResp.json();
                        const { intents, platform } = manifest;

                        if(intents) {
                            Object.assign(entry, { intents });
                        }

                        // if(platform) {
                        //     Object.assign(entry, { customConfig: [{ name: 'appUuid', value: platform.uuid }]})
                        // }
                    } catch {
                    }

                    return entry;
                });

                console.log('awaiting data promises', dataPromises);
                data = await Promise.all(dataPromises);

                console.log('Amended directory:', data);
            }

            if(Array.isArray(data) && data.length > 0 && data.every(entry => entry.snapshot)) {
                console.log('Workspaces were Fetched');

                data.forEach(entry => {
                    let { snapshot } = entry;
                    snapshot.windows = snapshot.windows.filter(win =>
                        !(win.uuid === 'osLaunchpadMain' && win.name === 'launchbar')
                    );
                });

                console.log('Filtered launchbar from workspace');
            }

            console.log('returning data');
            return data;
        }

        return Object.assign(resp, { json });
    }
})();