console.log('platform.js');

const platformApp = fin.Application.getCurrentSync();
const platformWin = fin.Window.getCurrentSync();

platformWin.on('close-requested', () => { });

let getPlatformP;
let nativeHelper;

fin.System.launchExternalProcess({ alias: 'native-helper', arguments: fin.desktop.getVersion() });
fin.InterApplicationBus.Channel.connect('native-platform-helper').then(client => {
    nativeHelper = client;

    client.onDisconnection(() => nativeHelper = undefined);
});

fin.InterApplicationBus.subscribe({ uuid: platformApp.identity.uuid }, 'window-begin-user-bounds-changing', async (evt, source) => {
    if(nativeHelper) {
        let { edges } = evt;
        let platform = await getPlatform();
        let snapshot = await platform.getSnapshot();

        nativeHelper.dispatch('dragStart', {
            source,
            snapshot,
            edges
        });
    }
});

fin.InterApplicationBus.subscribe({ uuid: platformApp.identity.uuid }, 'window-end-user-bounds-changing', async (evt, source) => {
    if(nativeHelper) {
        nativeHelper.dispatch('dragEnd', { source });
    }
});

export async function getPlatform() {
    return getPlatformP || (getPlatformP = new Promise(resolve => {
        fin.Platform.init({ overrideCallback: async (PlatformBase) => {
            console.log('Platform.init');

            class Platform extends PlatformBase {
                async createWindow(opts) {
                    let options = Object.assign({
                        name: fin.desktop.getUuid().substr(0,7),
                        frame: false,
                        resizable: false,
                        defaultHeight: 200,
                        defaultWidth: 200,
                        contextMenu: true,
                        customData: { 
                            groupId: fin.desktop.getUuid().substr(0,7),
                            edgeIds: {
                                top: fin.desktop.getUuid().substr(0,7),
                                left: fin.desktop.getUuid().substr(0,7),
                                bottom: fin.desktop.getUuid().substr(0,7),
                                right: fin.desktop.getUuid().substr(0,7)
                            },
                            canSnap: true,
                            state: { }
                        }
                    }, opts);
    
                    let win = await fin.Window.create(options);
                    return win;
                }
        
                async getSnapshot() {
                    let snapshot = await super.getSnapshot();
        
                    await Promise.all(snapshot.windows.map(async w => {
                        Object.assign(w, {
                            frame: false,
                            top: w.defaultTop,
                            left: w.defaultLeft,
                            height: w.defaultHeight,
                            width: w.defaultWidth
                        });
                        let currentWindow = fin.Window.wrapSync({ 
                            uuid: fin.me.uuid, name: w.name 
                        });
                        w.opacity = (await currentWindow.getOptions()).opacity;
                        w.nativeId = await currentWindow.getNativeId();
                    }));

                    // If available, native helper will sort windows by Z-order,
                    // obtain physical (unscaled) coordinates, perform overlap / edge detection,
                    // and supply additional unscaled monitor info.
                    if(nativeHelper) {
                        snapshot = await nativeHelper.dispatch('getSnapshotEx', snapshot);
                    }
                    
                    return snapshot;
                }
    
                async applySnapshot({ snapshot, options }){
                    let { windows, snapshotDetails } = snapshot;

                    await super.applySnapshot({ snapshot : {
                        windows: [...windows].reverse(),
                        snapshotDetails
                    }, options });

                    if(nativeHelper) {
                        await nativeHelper.dispatch('applySnapshotEx', snapshot);
                    }
                }
            }
            let platform = new Platform();
            resolve(platform)
            return platform;
        }});
    }));
}