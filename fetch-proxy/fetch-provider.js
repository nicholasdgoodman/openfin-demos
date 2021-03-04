(async function() {
    await new Promise(rs => fin.desktop.main(rs));
    console.log('Starting Fetch Provider');
    
    const provider = await fin.InterApplicationBus.Channel.create('json-fetch-provider');

    provider.register('fetch', async ([resource, init = undefined]) => {
        console.log('fetching');
        let resp = await window.fetch(resource, init);
        let json = await resp.json();

        return {
            ok: resp.ok,
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
            type: resp.type,
            json
        }
    });

    console.log('Fetch Provider Running');
})();