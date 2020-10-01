(async function() {
    await new Promise(rs => fin.desktop.main(rs));
    console.log('Connecting to Fetch Provider');
    const clientP = fin.InterApplicationBus.Channel.connect('json-fetch-provider');

    window.fetch = async function(resource, init = undefined) {
        let client = await clientP;
        let result = await client.dispatch('fetch', [resource, init]);
        let { json } = result;

        result.json = async function() {
            return json;
        }

        return result;
    }

    console.log('Fetch Client Initialized');
})();