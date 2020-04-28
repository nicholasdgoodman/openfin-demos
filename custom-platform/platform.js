console.log('platform.js');

const platformApp = fin.Application.getCurrentSync();
const platformWin = fin.Window.getCurrentSync();

platformWin.on('close-requested', () => { });

let getPlatformP;
let nativeHelper;

fin.System.launchExternalProcess({alias: 'native-helper', arguments: fin.desktop.getVersion()});
fin.InterApplicationBus.Channel.connect('native-platform-helper').then(client => nativeHelper = client);

export async function getPlatform() {
    return getPlatformP || (getPlatformP = new Promise(resolve => {
        fin.Platform.init({ overrideCallback: async (PlatformBase) => {
            console.log('Platform.init');

            class Platform extends PlatformBase {
                async createWindow(opts) {
                    let options = Object.assign({
                        name: fin.desktop.getUuid().substr(0,7),
                        frame: false,
                        defaultHeight: 200,
                        defaultWidth: 200,
                        contextMenu: true,
                        customData: { 
                            groupId: fin.desktop.getUuid().substr(0,7),
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
                    
                    let groups = snapshot.windows.reduce((groups, window) => {
                        let groupId = window.customData && window.customData.groupId;
                        let group = groups[groupId] || [];
    
                        group.push(window);
                        groups[groupId] = group;
                        return groups;
                    }, {});
    
                    Object.values(groups).forEach(group => {
                        if(group.length > 1) {
                            let firstWin = fin.Window.wrapSync({ uuid: fin.me.uuid, name: group[0].name });
    
                            for(var n = 1; n < group.length; n++) {
                                let otherWin = fin.Window.wrapSync({ uuid: fin.me.uuid, name: group[n].name });
                                otherWin.joinGroup(firstWin);
                            }
                        }
                    });
                }
            }
            let platform = new Platform();
            resolve(platform)
            return platform;
        }});
    }));
}