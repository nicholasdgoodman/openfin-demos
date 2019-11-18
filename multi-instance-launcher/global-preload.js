const currentApp = window.fin.Application.getCurrentSync();
const currentWindow = window.fin.Window.getCurrentSync();

//HACK: this belongs in the frameContentPreload
//      but is used before the load operation completes
//      so must be defined earlier
const contextListeners = [];
window._fdc3 = {
    addContextListener: function(listener) {
        contextListeners.push(listener);
    }
};

window.addEventListener('load', () => {
    if (location.protocol === 'file:' && location.href.includes('standard-frame-provider')) {
        standardFrameProviderPreload();
    }
    else if (location.protocol === 'file:' && location.href.includes('standard-frame')) {
        standardFramePreload();
    }
    else if (currentWindow.identity.name.startsWith('fdc3/')) {
        fdc3ProxyWindowPreload();
    }
    else {
        frameContentPreload();
    }
});

async function standardFrameProviderPreload() {
    console.log('Standard Frame Provider Preload');

    const windowCreate = fin.Window.create;

    fin.Window.create = function(opts) {
        if(opts.layoutConfig && opts.layoutConfig.content) {
            console.log('Patching view names...');
            autoNameViews(opts.layoutConfig.content);
            createFdc3ProxyWindows(opts.layoutConfig.content);
        }
        
        return windowCreate.call(fin.Window, opts);
    };

    function autoNameViews(content) {
        content.forEach(entry => {
            if(entry.content) {
                autoNameViews(entry.content);
            }
            if(entry.type === "component" &&
                entry.componentName === "view" &&
                entry.componentState &&
                !entry.componentState.name) {
                    entry.componentState.name = fin.desktop.getUuid();
                }
        });
    }

    function createFdc3ProxyWindows(content) {
        content.forEach(entry => {
            if(entry.content) {
                createFdc3ProxyWindows(entry.content);
            }
            if(entry.type === "component" &&
                entry.componentName === "view") {
                windowCreate.call(fin.Window, {
                    name: 'fdc3/' + entry.componentState.name,
                    url: 'about:blank',
                    autoShow: true,
                    frame: false,
                    defaultHeight: 40,
                    defaultWidth: 40,
                    defaultTop: -60,
                    defaultLeft: -60,
                    opacity: 0.01
                });
            }
        });
    }
}

async function standardFramePreload() {
    console.log('Standard Frame Preload');

    let styles = document.createElement('link');
    styles.setAttribute('rel', 'stylesheet');
    styles.setAttribute('type', 'text/css');
    styles.setAttribute('href', 'http://localhost:6001/styles.css');

    document.head.append(styles);
}

async function fdc3ProxyWindowPreload() {
    console.log('FDC3 Proxy Window Preload');

    let viewName = currentWindow.identity.name.split('/')[1];
    
    let view = fin.View.wrapSync({
        uuid: currentWindow.identity.uuid,
        name: viewName
    });

    view.on('destroyed', () => currentWindow.close());

    let fdc3Loader = document.createElement('script');
    fdc3Loader.setAttribute('src', 'https://cdn.openfin.co/services/openfin/fdc3/0.2.0/openfin-fdc3.js');
    
    let fdc3LoadPromise = new Promise(rs => {
        fdc3Loader.addEventListener('load', rs);
    });

    document.head.append(fdc3Loader);
    await fdc3LoadPromise;

    let fdc3ProxyChannel = await fin.InterApplicationBus.Channel.create(viewName);

    fdc3ProxyChannel.register('setTitle', title => {
        document.title = title;
    });
    
    fdc3ProxyChannel.register('broadcast', ctx => {
        console.log('fdc3 broadcasting');
        fdc3.broadcast(ctx);
    });

    fdc3.addContextListener(ctx => {
        console.log('fdc3 context listener');
        if(fdc3ProxyChannel.connections.length > 0) {
            fdc3ProxyChannel.dispatch(
                fdc3ProxyChannel.connections[0],
                'context-changed',
                ctx);
        }
    });

    fdc3.addEventListener('channel-changed', evt => {
        console.log('fdc3 channel changed');
        if(fdc3ProxyChannel.connections.length > 0) {
            fdc3ProxyChannel.dispatch(
                fdc3ProxyChannel.connections[0],
                'channel-changed',
                evt);
        }
    });

    console.log('FDC3 Proxy Configured');
}

async function frameContentPreload() {
    console.log('Frame Content Preload');

    let win = await fin.View.getCurrentSync().getCurrentWindow();
    await win.show();

    let launchPadChannelWindow = fin.Window.wrapSync({uuid: 'osLaunchpadMain', name: 'osLaunchpadChannels'});
    let fdc3ProxyWindow = fin.Window.wrapSync({
        uuid: currentWindow.identity.uuid,
        name: 'fdc3/' + currentWindow.identity.name
    });

    launchPadChannelWindow.on('shown', () => {
        console.log('Channel Picker Shown');
        fdc3ProxyWindow.show();
        fdc3ProxyWindow.setBounds({
            top: window.screenTop + 64,
            left: window.screenLeft + 5,
            height: window.innerHeight,
            width: window.innerWidth
        });
    });

    launchPadChannelWindow.on('hidden', () => {
        console.log('Channel Picker Hidden');
        fdc3ProxyWindow.hide();
    });

    let fdc3ProxyChannel = await fin.InterApplicationBus.Channel.connect(currentWindow.identity.name);
    //let contextListeners = [];

    window._fdc3 = {
        broadcast: function(ctx) {
            fdc3ProxyChannel.dispatch('broadcast', ctx);
        },
        addContextListener: function(listener){
            contextListeners.push(listener);
        }
    }

    fdc3ProxyChannel.register('context-changed', ctx => {
        contextListeners.forEach(listener => {
            listener(ctx);
        });
    });

    fdc3ProxyChannel.register('channel-changed', evt => {
        const styles = {
            red: 'solid 6px #df5353',
            orange: 'solid 6px #fb8772',
            yellow: 'solid 6px #ffdf92',
            green: 'solid 6px #7bd5c1',
            blue: 'solid 6px #5c78ff',
            purple: 'solid 6px #c686e5'
        }

        let style = styles[evt.channel.id];

        if(style) {
            document.body.style.borderLeft = style;
        }
        else {
            document.body.style.borderLeft = null;
        }
    });

    //HACK: Fix title loss when tabs change windows
    setInterval(() => {
        let docTitle = document.title;
        document.title = docTitle.substring(0, docTitle.length - 1);
        document.title = docTitle;
        fdc3ProxyChannel.dispatch('setTitle', docTitle);
    }, 500);
}